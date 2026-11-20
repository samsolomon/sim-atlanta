//! GTFS → compact routes, paths and timetables (see web/src/model/types.ts).

use crate::geo;
use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::io::Read;

/// A CSV row with header-name lookup. Fields are trimmed (MARTA pads times with spaces).
pub struct Row<'a> {
    idx: &'a HashMap<String, usize>,
    rec: &'a csv::StringRecord,
}

impl Row<'_> {
    pub fn get(&self, k: &str) -> &str {
        self.idx.get(k).and_then(|&i| self.rec.get(i)).map(str::trim).unwrap_or("")
    }
}

pub struct Archive {
    zip: zip::ZipArchive<std::fs::File>,
}

impl Archive {
    pub fn open(path: &std::path::Path) -> Result<Self> {
        let f = std::fs::File::open(path).with_context(|| format!("open {}", path.display()))?;
        Ok(Self { zip: zip::ZipArchive::new(f)? })
    }

    pub fn has(&mut self, name: &str) -> bool {
        self.zip.by_name(name).is_ok()
    }

    pub fn each(&mut self, name: &str, mut f: impl FnMut(&Row)) -> Result<()> {
        let mut s = String::new();
        self.zip
            .by_name(name)
            .map_err(|e| anyhow!("{name}: {e}"))?
            .read_to_string(&mut s)?;
        let s = s.trim_start_matches('\u{feff}');
        let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(s.as_bytes());
        let idx: HashMap<String, usize> = rdr
            .headers()?
            .iter()
            .enumerate()
            .map(|(i, h)| (h.trim().to_string(), i))
            .collect();
        let mut rec = csv::StringRecord::new();
        while rdr.read_record(&mut rec)? {
            f(&Row { idx: &idx, rec: &rec });
        }
        Ok(())
    }
}

/// Parse GTFS "H:MM:SS" (hours may exceed 23; leading space allowed) to seconds.
pub fn parse_time(s: &str) -> Option<u32> {
    let s = s.trim();
    if s.is_empty() {
        return None;
    }
    let mut it = s.split(':');
    let h: u32 = it.next()?.trim().parse().ok()?;
    let m: u32 = it.next()?.parse().ok()?;
    let sec: u32 = it.next()?.parse().ok()?;
    Some(h * 3600 + m * 60 + sec)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RouteOut {
    pub id: String,
    pub operator: String,
    pub short_name: String,
    pub long_name: String,
    pub mode: String,
    pub color: String,
    pub vehicle_type: String,
    pub source: String,
}

#[derive(Serialize, Clone)]
pub struct StopOut {
    pub id: String,
    pub name: String,
    pub lon: f64,
    pub lat: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathOut {
    pub id: String,
    pub route_id: String,
    pub coords: Vec<f64>,
    pub cum: Vec<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatternOut {
    pub id: String,
    pub route_id: String,
    pub path_id: String,
    pub headsign: String,
    pub stops: Vec<String>,
    pub dist: Vec<f64>,
    pub arr: Vec<u32>,
    pub dep: Vec<u32>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct ServiceOut {
    pub id: String,
    pub days: u8,
    pub start: u32,
    pub end: u32,
    pub added: Vec<u32>,
    pub removed: Vec<u32>,
}

#[derive(Serialize)]
pub struct TimetableOut {
    pub feed: String,
    pub timezone: String,
    pub patterns: Vec<PatternOut>,
    pub services: Vec<ServiceOut>,
    pub trips: Vec<(usize, usize, u32, String)>,
}

pub struct FeedResult {
    pub routes: Vec<RouteOut>,
    pub stops: Vec<StopOut>,
    pub paths: Vec<PathOut>,
    pub timetable: TimetableOut,
    pub feed_version: String,
}

/// Per-feed decisions: which routes to keep and how to name them.
pub struct FeedSpec {
    pub feed: &'static str,
    pub source: &'static str,
    pub operator: &'static str,
    /// Given (route_id, short, long, type), return (stable name, mode, vehicle type) to keep it.
    pub keep: fn(&str, &str, &str, &str) -> Option<(String, &'static str, &'static str)>,
}

pub fn load(path: &std::path::Path, spec: &FeedSpec) -> Result<FeedResult> {
    let mut z = Archive::open(path)?;
    let feed = spec.feed;

    let mut timezone = String::from("America/New_York");
    z.each("agency.txt", |r| {
        let tz = r.get("agency_timezone");
        if !tz.is_empty() {
            timezone = tz.to_string();
        }
    })?;
    let mut feed_version = String::new();
    if z.has("feed_info.txt") {
        z.each("feed_info.txt", |r| feed_version = r.get("feed_version").to_string())?;
    }

    // Routes
    let mut routes: HashMap<String, RouteOut> = HashMap::new();
    z.each("routes.txt", |r| {
        let (rid, short, long, ty) =
            (r.get("route_id"), r.get("route_short_name"), r.get("route_long_name"), r.get("route_type"));
        if let Some((name, mode, vt)) = (spec.keep)(rid, short, long, ty) {
            let color = r.get("route_color");
            routes.insert(
                rid.to_string(),
                RouteOut {
                    id: format!("{feed}:route:{name}"),
                    operator: spec.operator.to_string(),
                    short_name: if short.is_empty() { long.to_string() } else { short.to_string() },
                    long_name: long.to_string(),
                    mode: mode.to_string(),
                    color: if color.is_empty() { "#888888".into() } else { format!("#{color}") },
                    vehicle_type: vt.to_string(),
                    source: spec.source.to_string(),
                },
            );
        }
    })?;

    // Trips
    struct Trip {
        route: String,
        service: String,
        shape: String,
        headsign: String,
        short: String,
    }
    let mut trips: HashMap<String, Trip> = HashMap::new();
    z.each("trips.txt", |r| {
        let rid = r.get("route_id");
        if routes.contains_key(rid) {
            trips.insert(
                r.get("trip_id").to_string(),
                Trip {
                    route: rid.to_string(),
                    service: r.get("service_id").to_string(),
                    shape: r.get("shape_id").to_string(),
                    headsign: r.get("trip_headsign").to_string(),
                    short: r.get("trip_short_name").to_string(),
                },
            );
        }
    })?;
    if trips.values().any(|t| t.shape.is_empty()) {
        return Err(anyhow!("{feed}: some kept trips have no shape_id"));
    }

    // Stop times for kept trips
    let mut st: HashMap<String, Vec<(u32, String, Option<u32>, Option<u32>)>> = HashMap::new();
    z.each("stop_times.txt", |r| {
        let tid = r.get("trip_id");
        if trips.contains_key(tid) {
            st.entry(tid.to_string()).or_default().push((
                r.get("stop_sequence").parse().unwrap_or(0),
                r.get("stop_id").to_string(),
                parse_time(r.get("arrival_time")),
                parse_time(r.get("departure_time")),
            ));
        }
    })?;

    // Stops
    let used_stops: HashSet<&str> = st.values().flatten().map(|x| x.1.as_str()).collect();
    let mut stops: BTreeMap<String, StopOut> = BTreeMap::new();
    z.each("stops.txt", |r| {
        let sid = r.get("stop_id");
        if used_stops.contains(sid) {
            stops.insert(
                sid.to_string(),
                StopOut {
                    id: format!("{feed}:stop:{sid}"),
                    name: r.get("stop_name").to_string(),
                    lon: geo::round5(r.get("stop_lon").parse().unwrap_or(0.0)),
                    lat: geo::round5(r.get("stop_lat").parse().unwrap_or(0.0)),
                },
            );
        }
    })?;

    // Shapes for kept trips
    let used_shapes: HashSet<&str> = trips.values().map(|t| t.shape.as_str()).collect();
    let mut raw_shapes: HashMap<String, Vec<(u32, f64, f64)>> = HashMap::new();
    z.each("shapes.txt", |r| {
        let sid = r.get("shape_id");
        if used_shapes.contains(sid) {
            raw_shapes.entry(sid.to_string()).or_default().push((
                r.get("shape_pt_sequence").parse().unwrap_or(0),
                r.get("shape_pt_lon").parse().unwrap_or(0.0),
                r.get("shape_pt_lat").parse().unwrap_or(0.0),
            ));
        }
    })?;
    let mut shapes: HashMap<String, (Vec<(f64, f64)>, Vec<f64>, String)> = HashMap::new();
    for (sid, mut pts) in raw_shapes {
        pts.sort_by_key(|p| p.0);
        let coords: Vec<(f64, f64)> = pts.iter().map(|p| (geo::round5(p.1), geo::round5(p.2))).collect();
        let coords = geo::thin(&coords, 8.0);
        let cum = geo::cumulative(&coords);
        let route = trips.values().find(|t| t.shape == sid).map(|t| t.route.clone()).unwrap_or_default();
        shapes.insert(sid, (coords, cum, route));
    }

    // Patterns
    let mut patterns: Vec<PatternOut> = Vec::new();
    let mut pattern_idx: HashMap<String, usize> = HashMap::new();
    let mut dist_cache: HashMap<String, Vec<f64>> = HashMap::new();
    let mut service_ids: Vec<String> = Vec::new();
    let mut service_idx: HashMap<String, usize> = HashMap::new();
    let mut trips_out: Vec<(usize, usize, u32, String)> = Vec::new();

    let mut trip_ids: Vec<&String> = st.keys().collect();
    trip_ids.sort();
    for tid in trip_ids {
        let mut seq = st[tid].clone();
        seq.sort_by_key(|x| x.0);
        if seq.len() < 2 {
            continue;
        }
        let t = &trips[tid];
        let (coords, cum, _) = &shapes[&t.shape];
        let stop_ids: Vec<String> = seq.iter().map(|x| x.1.clone()).collect();
        let dkey = format!("{}|{}", t.shape, stop_ids.join(","));
        let dist = dist_cache
            .entry(dkey)
            .or_insert_with(|| {
                let mut seg = 0;
                stop_ids
                    .iter()
                    .map(|sid| {
                        let s = stops.get(sid).map(|s| (s.lon, s.lat)).unwrap_or((0.0, 0.0));
                        let (d, i) = geo::locate(s, coords, cum, seg);
                        seg = i;
                        (d * 10.0).round() / 10.0
                    })
                    .collect()
            })
            .clone();

        let (arr, dep) = match fill_times(&seq, &dist) {
            Some(x) => x,
            None => continue,
        };
        let start = arr[0];
        let arr: Vec<u32> = arr.iter().map(|a| a - start).collect();
        let dep: Vec<u32> = dep.iter().map(|d| d - start).collect();

        let pkey = format!("{}|{}|{}|{:?}|{:?}", t.route, t.shape, stop_ids.join(","), arr, dep);
        let pi = *pattern_idx.entry(pkey).or_insert_with(|| {
            let r = &routes[&t.route];
            patterns.push(PatternOut {
                id: format!("{feed}:pattern:{}", patterns.len()),
                route_id: r.id.clone(),
                path_id: format!("{feed}:path:{}", t.shape),
                headsign: t.headsign.clone(),
                stops: stop_ids.iter().map(|s| format!("{feed}:stop:{s}")).collect(),
                dist: dist.clone(),
                arr: arr.clone(),
                dep: dep.clone(),
            });
            patterns.len() - 1
        });
        let si = *service_idx.entry(t.service.clone()).or_insert_with(|| {
            service_ids.push(t.service.clone());
            service_ids.len() - 1
        });
        trips_out.push((pi, si, start, t.short.clone()));
    }
    trips_out.sort_by_key(|t| (t.0, t.2));

    // Services
    let mut svc: HashMap<String, ServiceOut> = service_ids
        .iter()
        .map(|id| {
            (id.clone(), ServiceOut { id: id.clone(), days: 0, start: 0, end: 0, added: vec![], removed: vec![] })
        })
        .collect();
    if z.has("calendar.txt") {
        z.each("calendar.txt", |r| {
            if let Some(s) = svc.get_mut(r.get("service_id")) {
                let names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                s.days = names
                    .iter()
                    .enumerate()
                    .fold(0u8, |acc, (i, d)| if r.get(d) == "1" { acc | (1 << i) } else { acc });
                s.start = r.get("start_date").parse().unwrap_or(0);
                s.end = r.get("end_date").parse().unwrap_or(0);
            }
        })?;
    }
    if z.has("calendar_dates.txt") {
        z.each("calendar_dates.txt", |r| {
            if let Some(s) = svc.get_mut(r.get("service_id")) {
                let d: u32 = r.get("date").parse().unwrap_or(0);
                match r.get("exception_type") {
                    "1" => s.added.push(d),
                    "2" => s.removed.push(d),
                    _ => {}
                }
            }
        })?;
    }
    let services: Vec<ServiceOut> = service_ids.iter().map(|id| svc.remove(id).unwrap()).collect();

    // Paths and outputs
    let mut paths: Vec<PathOut> = shapes
        .into_iter()
        .map(|(sid, (coords, cum, route))| PathOut {
            id: format!("{feed}:path:{sid}"),
            route_id: routes[&route].id.clone(),
            coords: coords.iter().flat_map(|c| [c.0, c.1]).collect(),
            cum: cum.iter().map(|c| c.round()).collect(),
        })
        .collect();
    paths.sort_by(|a, b| a.id.cmp(&b.id));
    let mut routes_out: Vec<RouteOut> = routes.into_values().collect();
    routes_out.sort_by(|a, b| a.id.cmp(&b.id));

    Ok(FeedResult {
        routes: routes_out,
        stops: stops.into_values().collect(),
        paths,
        timetable: TimetableOut { feed: feed.to_string(), timezone, patterns, services, trips: trips_out },
        feed_version,
    })
}

/// Fill missing arrival/departure times: copy across within a stop, then interpolate
/// by distance between known stops. Returns None if the first or last stop is untimed.
pub fn fill_times(seq: &[(u32, String, Option<u32>, Option<u32>)], dist: &[f64]) -> Option<(Vec<u32>, Vec<u32>)> {
    let n = seq.len();
    let mut arr: Vec<Option<u32>> = seq.iter().map(|x| x.2.or(x.3)).collect();
    let mut dep: Vec<Option<u32>> = seq.iter().map(|x| x.3.or(x.2)).collect();
    arr[0]?;
    arr[n - 1]?;
    let mut last = 0;
    for i in 1..n {
        if arr[i].is_some() {
            if i - last > 1 {
                let (t0, t1) = (dep[last].unwrap() as f64, arr[i].unwrap() as f64);
                let (d0, d1) = (dist[last], dist[i]);
                for j in last + 1..i {
                    let f = if d1 > d0 { (dist[j] - d0) / (d1 - d0) } else { (j - last) as f64 / (i - last) as f64 };
                    let t = (t0 + f * (t1 - t0)).round() as u32;
                    arr[j] = Some(t);
                    dep[j] = Some(t);
                }
            }
            last = i;
        }
    }
    Some((arr.into_iter().map(Option::unwrap).collect(), dep.into_iter().map(Option::unwrap).collect()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_gtfs_times() {
        assert_eq!(parse_time(" 8:17:00"), Some(8 * 3600 + 17 * 60));
        assert_eq!(parse_time("25:30:00"), Some(25 * 3600 + 30 * 60));
        assert_eq!(parse_time("08:00:05"), Some(8 * 3600 + 5));
        assert_eq!(parse_time(""), None);
        assert_eq!(parse_time("bad"), None);
    }

    #[test]
    fn fills_untimed_stops_by_distance() {
        let seq = vec![
            (1, "a".into(), Some(100), Some(100)),
            (2, "b".into(), None, None),
            (3, "c".into(), Some(300), Some(310)),
        ];
        let (arr, dep) = fill_times(&seq, &[0.0, 250.0, 1000.0]).unwrap();
        assert_eq!(arr, vec![100, 150, 300]);
        assert_eq!(dep, vec![100, 150, 310]);
    }

    #[test]
    fn rejects_untimed_endpoints() {
        let seq = vec![(1, "a".into(), None, None), (2, "b".into(), Some(5), Some(5))];
        assert!(fill_times(&seq, &[0.0, 1.0]).is_none());
    }
}
