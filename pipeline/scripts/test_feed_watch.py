"""The feed watcher (feed_watch.py) on small made-up feeds and a made-up GitHub."""
import datetime as dt
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

import feed_watch as watch

TODAY = dt.date(2026, 11, 1)


def feed(folder, name, end='20270301', start='20261001', trips=2, train='19', route='RED', extra=None):
    long = 'Crescent' if name == 'amtrak' else 'Red Line'
    files = {
        'routes.txt': f'route_id,route_long_name,route_type\n{route},{long},1\nOTHER,Elsewhere,2\n',
        'trips.txt': 'route_id,service_id,trip_id,trip_short_name\n' + ''.join(f'{route},wk,t{i},{train}\n' for i in range(trips)) + 'OTHER,far,x,99\n',
        'calendar.txt': f'service_id,start_date,end_date\nwk,{start},{end}\nfar,20260101,20300101\n',
    }
    if name == 'marta':
        files['routes.txt'] = f'route_id,route_long_name,route_type\n{route},{long},1\n'
        files['trips.txt'] = files['trips.txt'].replace('OTHER,far,x,99\n', '')
    files.update(extra or {})
    path = Path(folder) / watch.FEEDS[name]['file']
    with zipfile.ZipFile(path, 'w') as z:
        for entry, text in files.items():
            z.writestr(zipfile.ZipInfo(entry, (2026, 1, 1, 0, 0, 0)), text)
    return watch.summarize(path, name)


class GitHub:
    def __init__(self):
        self.issues, self.calls = [], []

    def __call__(self, args):
        self.calls.append(args[1])
        if args[1] == 'list':
            return json.dumps(self.issues)
        if args[1] == 'create':
            self.issues.append({'number': len(self.issues) + 1, 'state': 'OPEN', 'title': args[3], 'body': args[5]})
        else:
            issue = self.issues[int(args[2]) - 1]
            if args[1] == 'edit':
                issue['body'] = args[4]
            else:
                issue['state'] = 'CLOSED'
        return ''


class FeedWatch(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.record = {n: feed(self.dir.name, n) for n in watch.FEEDS}

    def report(self, today=TODAY, **changes):
        now = {n: feed(self.dir.name, n, **changes.get(n, {})) for n in watch.FEEDS}
        return watch.compare(self.record, now, today)

    def test_unchanged_feeds_far_from_their_end_report_nothing(self):
        github = GitHub()
        self.assertEqual(self.report()['reasons'], [])
        self.assertEqual(watch.sync(self.report(), github), 'nothing to report')
        self.assertEqual(github.issues, [])

    def test_only_the_crescent_counts_for_amtrak(self):
        s = self.record['amtrak']
        self.assertEqual((s['trips'], s['trains'], s['end'], s['start']), (2, ['19'], '20270301', '20261001'))

    def test_a_daily_amtrak_republish_is_not_a_new_feed(self):
        self.assertEqual(self.report(amtrak={'start': '20261031', 'trips': 1, 'end': '20270302'})['reasons'], [])

    def test_new_crescent_trains_or_a_shorter_amtrak_calendar_are_a_new_feed(self):
        self.assertIn('Amtrak: a new feed', self.report(amtrak={'train': '21'})['reasons'][0])
        self.assertIn('Amtrak: a new feed', self.report(amtrak={'end': '20270201'})['reasons'][0])

    def test_any_change_to_the_marta_file_is_a_new_feed(self):
        reasons = self.report(marta={'trips': 3})['reasons']
        self.assertEqual(reasons, ['MARTA: a new feed is published.'])

    def test_expiry_starts_21_days_before_the_end_and_then_expires(self):
        end = dt.date(2027, 3, 1)
        self.assertEqual(self.report(end - dt.timedelta(days=22))['reasons'], [])
        near = self.report(end - dt.timedelta(days=21))
        self.assertIn('within 21 days', near['reasons'][0])
        self.assertIn('within 21 days', self.report(end)['reasons'][0])
        past = self.report(end + dt.timedelta(days=1))
        self.assertIn('ended on 2027-03-01', past['reasons'][0])
        self.assertNotEqual(near['key'], past['key'])

    def test_a_declared_feed_end_wins(self):
        s = feed(self.dir.name, 'marta', extra={'feed_info.txt': 'feed_publisher_name,feed_end_date\nx,20261120\n'})
        self.assertEqual(s['end'], '20261120')

    def test_one_issue_is_opened_then_updated_not_repeated(self):
        github = GitHub()
        end = dt.date(2027, 3, 1)
        self.assertEqual(watch.sync(self.report(end - dt.timedelta(days=20)), github), 'created')
        self.assertEqual(watch.sync(self.report(end - dt.timedelta(days=20)), github), 'unchanged')
        self.assertEqual(watch.sync(self.report(end - dt.timedelta(days=13)), github), 'updated')
        self.assertEqual(watch.sync(self.report(marta={'trips': 3}), github), 'updated')
        self.assertEqual([i['state'] for i in github.issues], ['OPEN'])

    def test_a_closed_issue_stays_closed_until_the_state_changes(self):
        github = GitHub()
        near = dt.date(2027, 2, 20)
        watch.sync(self.report(near), github)
        github.issues[0]['state'] = 'CLOSED'
        self.assertEqual(watch.sync(self.report(near + dt.timedelta(days=7)), github), 'already handled')
        self.assertEqual(watch.sync(self.report(dt.date(2027, 3, 5)), github), 'created')

    def test_the_issue_closes_once_the_record_catches_up(self):
        github = GitHub()
        watch.sync(self.report(marta={'trips': 3}), github)
        self.assertEqual(watch.sync(self.report(), github), 'closed')
        self.assertEqual(github.issues[0]['state'], 'CLOSED')

    def test_other_issues_are_left_alone(self):
        github = GitHub()
        github.issues.append({'number': 1, 'state': 'OPEN', 'title': 'Something else', 'body': ''})
        watch.sync(self.report(marta={'trips': 3}), github)
        self.assertEqual(watch.sync(self.report(), github), 'closed')
        self.assertEqual(github.issues[0]['state'], 'OPEN')

    def test_feed_text_cannot_mention_anyone(self):
        report = self.report(marta={'route': '@someone [x](y)'})
        self.assertNotIn('@', report['body'])
        self.assertNotIn('](', report['body'])

    def test_a_feed_without_dated_trips_fails_loudly(self):
        with self.assertRaises(ValueError):
            feed(self.dir.name, 'marta', trips=0)


if __name__ == '__main__':
    unittest.main()
