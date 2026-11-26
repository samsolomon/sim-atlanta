"""Watch the public GTFS feeds the pipeline builds from (.github/workflows/feeds.yml).

  record RAW_DIR   write pipeline/feeds.json from the zips `pnpm data` downloaded; commit it
                   with the release that ships that data
  check            compare the published feeds with that record and print the report
  issue            check, then open, update or close the one GitHub issue (needs `gh`)

`check` and `issue` take --raw DIR (use zips already downloaded) and --today YYYY-MM-DD.
Standard library only. Feed text is untrusted: little of it reaches the issue, and sanitised.
"""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
RECORD = ROOT / 'pipeline/feeds.json'
TITLE = 'MARTA feed: new / expiring'
EXPIRY_DAYS = 21
MAX_DOWNLOAD = 200 * 1024 * 1024
MAX_TABLE = 100 * 1024 * 1024
# The URLs and the raw file names are the pipeline's (pipeline/src/main.rs).
FEEDS = {
    'marta': {'name': 'MARTA', 'url': 'https://itsmarta.com/google_transit_feed/google_transit.zip', 'file': 'marta_gtfs.zip'},
    'amtrak': {'name': 'Amtrak', 'url': 'https://content.amtrak.com/content/gtfs/GTFS.zip', 'file': 'amtrak_gtfs.zip'},
}


def clean(text):
    """Feed text safe to put in an issue: no mentions, links or markdown."""
    return re.sub(r'[^A-Za-z0-9 _.-]', '', text or '')[:24]


def summarize(path, feed):
    """What matters about one feed. Amtrak is cut to what the pipeline keeps: the Crescent."""
    with zipfile.ZipFile(path) as z:
        def rows(name):
            if name not in z.namelist():
                return []
            if z.getinfo(name).file_size > MAX_TABLE:
                raise ValueError(f'{name} is too large')
            with z.open(name) as f:
                return list(csv.DictReader(io.TextIOWrapper(f, 'utf-8-sig')))
        routes = rows('routes.txt')
        used = [r for r in routes if feed != 'amtrak' or r.get('route_long_name') == 'Crescent']
        ids = {r['route_id'] for r in used}
        trips = [t for t in rows('trips.txt') if t['route_id'] in ids]
        services = {t['service_id'] for t in trips}
        calendar = [c for c in rows('calendar.txt') if c['service_id'] in services]
        added = [d['date'] for d in rows('calendar_dates.txt') if d['service_id'] in services and d['exception_type'] == '1']
        info = rows('feed_info.txt')
    starts = [c['start_date'] for c in calendar] + added
    ends = [c['end_date'] for c in calendar] + added
    declared = info[0].get('feed_end_date', '') if info else ''
    if not trips or not ends:
        raise ValueError(f'{feed}: no trips with service dates; the feed layout may have changed')
    types = {}
    for r in used:
        key = clean(r.get('route_type', ''))
        types[key] = types.get(key, 0) + 1
    return {
        'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        'start': min(starts),
        # The last day with service, as the pipeline reads it, or an earlier declared feed end.
        'end': min([max(ends)] + ([declared] if re.fullmatch(r'\d{8}', declared) else [])),
        'routes': dict(sorted(types.items())),
        'routeIds': sorted(clean(i) for i in ids),
        'trips': len(trips),
        'trains': sorted({clean(t.get('trip_short_name', '')) for t in trips}) if feed == 'amtrak' else [],
    }


def changed(feed, was, now):
    """Amtrak republishes every day with its calendar rolled forward, so its bytes and its end date
    always differ: it counts as changed when the Crescent's train numbers do, or when its end
    date moves earlier. MARTA counts by its bytes."""
    if feed == 'amtrak':
        return was['trains'] != now['trains'] or now['end'] < was['end']
    return was['sha256'] != now['sha256']


def day(ymd):
    return dt.date(int(ymd[:4]), int(ymd[4:6]), int(ymd[6:]))


def shown(ymd):
    return day(ymd).isoformat()


def compare(record, current, today):
    """The report: why anything needs attention, an issue body, and a key naming that state."""
    reasons, state, sections = [], [], []
    for feed, info in FEEDS.items():
        was, now = record[feed], current[feed]
        name, left = info['name'], (day(now['end']) - today).days
        if changed(feed, was, now):
            reasons.append(f'{name}: a new feed is published.')
            state.append([feed, 'new', now['sha256'] if feed == 'marta' else [now['trains'], min(now['end'], was['end'])]])
        if left < 0:
            reasons.append(f"{name}: the published feed ended on {shown(now['end'])}.")
            state.append([feed, 'expired', now['end']])
        elif left <= EXPIRY_DAYS:
            reasons.append(f"{name}: the published feed ends on {shown(now['end'])}, within {EXPIRY_DAYS} days.")
            state.append([feed, 'expiring', now['end']])
        types = lambda s: ', '.join(f'type {k}: {v}' for k, v in s['routes'].items())
        added = sorted(set(now['routeIds']) - set(was['routeIds']))
        gone = sorted(set(was['routeIds']) - set(now['routeIds']))
        table = [
            ('First service date', shown(was['start']), shown(now['start'])),
            ('Last service date', shown(was['end']), f"{shown(now['end'])} ({left} days from the check)"),
            ('Routes', types(was), types(now)),
            ('Trips', str(was['trips']), str(now['trips'])),
        ]
        if feed == 'amtrak':
            table.append(('Crescent trains', ' '.join(was['trains']), ' '.join(now['trains'])))
        table.append(('File', was['sha256'][:12], now['sha256'][:12]))
        lines = [f'### {name}' + (' (the Crescent only)' if feed == 'amtrak' else ''), '',
                 '| | In releases | Published now |', '| --- | --- | --- |', *(f'| {a} | {b} | {c} |' for a, b, c in table)]
        if added or gone:
            lines += ['', f"Route ids added: {' '.join(added[:30]) or 'none'}. Removed: {' '.join(gone[:30]) or 'none'}."]
        sections.append('\n'.join(lines))
    key = hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()[:16]
    body = '\n\n'.join([
        f'<!-- feed-watch key={key} -->',
        '\n'.join(f'- {r}' for r in reasons),
        *sections,
        'New data ships with the next release: package from `main` (`pnpm data`), then run '
        '`python3 pipeline/scripts/feed_watch.py record data/raw` and commit `pipeline/feeds.json`. '
        'This issue is kept up to date by `.github/workflows/feeds.yml`.',
    ])
    return {'reasons': reasons, 'key': key, 'body': body}


def sync(report, gh):
    """Keep at most one open issue. A closed issue for the same state stays closed: someone has
    dealt with it. `gh` runs one GitHub CLI command and returns its output."""
    issues = [i for i in json.loads(gh(['issue', 'list', '--state', 'all', '--limit', '200', '--json', 'number,state,title,body']))
              if i['title'] == TITLE]
    live = sorted((i for i in issues if i['state'] == 'OPEN'), key=lambda i: i['number'])
    if not report['reasons']:
        for i in live:
            gh(['issue', 'close', str(i['number']), '--comment', 'The feeds match the record and none ends within 21 days.'])
        return 'closed' if live else 'nothing to report'
    if live:
        issue = live[0]
        if (issue['body'] or '').replace('\r\n', '\n').strip() == report['body'].strip():
            return 'unchanged'
        gh(['issue', 'edit', str(issue['number']), '--body', report['body']])
        return 'updated'
    if any(f"feed-watch key={report['key']} " in (i['body'] or '') for i in issues):
        return 'already handled'
    gh(['issue', 'create', '--title', TITLE, '--body', report['body']])
    return 'created'


def download(url, dest):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; feed-watch)'})
    with urllib.request.urlopen(request, timeout=120) as response, open(dest, 'wb') as out:
        total = 0
        while chunk := response.read(1 << 20):
            total += len(chunk)
            if total > MAX_DOWNLOAD:
                raise ValueError(f'{url}: more than {MAX_DOWNLOAD} bytes')
            out.write(chunk)


def read(raw):
    if raw:
        return {f: summarize(Path(raw) / i['file'], f) for f, i in FEEDS.items()}
    with tempfile.TemporaryDirectory() as d:
        for info in FEEDS.values():
            download(info['url'], Path(d) / info['file'])
        return {f: summarize(Path(d) / i['file'], f) for f, i in FEEDS.items()}


def run_gh(args):
    return subprocess.run(['gh', *args], check=True, capture_output=True, text=True).stdout


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('record').add_argument('raw')
    for command in ('check', 'issue'):
        p = sub.add_parser(command)
        p.add_argument('--raw')
        p.add_argument('--today')
    args = parser.parse_args(argv)
    if args.command == 'record':
        RECORD.write_text(json.dumps(read(args.raw), indent=1, sort_keys=True) + '\n')
        print(f'wrote {RECORD.relative_to(ROOT)}')
        return
    today = dt.date.fromisoformat(args.today) if args.today else dt.datetime.now(ZoneInfo('America/New_York')).date()
    report = compare(json.loads(RECORD.read_text()), read(args.raw), today)
    print(report['body'] if report['reasons'] else 'Nothing to report.')
    if args.command == 'issue':
        print(f'issue: {sync(report, run_gh)}')


if __name__ == '__main__':
    main(sys.argv[1:])
