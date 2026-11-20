//! Freight network: NARN track arcs + FRA crossings → reported/inferred trains per day.

use crate::geo;
use anyhow::Result;
use serde_json::{json, Value};
use std::collections::{HashMap, VecDeque};

pub struct Arc {
    pub id: i64,
    pub from: i64,
    pub to: i64,
    pub owner: String,
    pub rights: Vec<String>,
    pub subdiv: Option<String>,
    pub tracks: Option<i64>,
    pub passenger: bool,
    /// NARN network class: M main, S passing siding, I major industrial lead,
    /// O other/minor industrial, Y yard, F ferry connection.
    pub net: String,
    pub lines: Vec<Vec<(f64, f64)>>,
}

pub struct Crossing {
    pub id: String,
    pub code: String,
    pub railroad: String,
    pub street: String,
    pub city: String,
    pub position: String,
    pub day: u32,
    pub night: u32,
    pub passenger: u32,
    pub max_speed: Option<u32>,
    pub lon: f64,
    pub lat: f64,
}

/// FRA uses "CSX" where NARN uses "CSXT"; everything else we've seen matches.
pub fn normalize_code(c: &str) -> String {
    match c.trim() {
        "CSX" => "CSXT".into(),
        other => other.to_string(),
    }
}

/// NARN classes we drop (from the dataset's coded values): out of service "X",
/// abandoned "A", removed "R", rail-trail "T", transit-only/museum "Z".
const SKIP_NET: [&str; 5] = ["X", "A", "R", "T", "Z"];

/// Through traffic is only inferred onto main line and passing sidings; yards and
/// industry leads see a fraction of a main line's trains, so they stay unknown.
fn carries_through_traffic(net: &str) -> bool {
    net == "M" || net == "S"
}

pub fn parse_arcs(pages: &[Value]) -> Vec<Arc> {
    let mut out = Vec::new();
    for page in pages {
        let Some(features) = page["features"].as_array() else { continue };
        for f in features {
            let p = &f["properties"];
            let net = p["NET"].as_str().unwrap_or("");
            if SKIP_NET.contains(&net) {
                continue;
            }
            let lines: Vec<Vec<(f64, f64)>> = match f["geometry"]["type"].as_str() {
                Some("LineString") => vec![line(&f["geometry"]["coordinates"])],
                Some("MultiLineString") => f["geometry"]["coordinates"]
                    .as_array()
                    .map(|ls| ls.iter().map(line).collect())
                    .unwrap_or_default(),
                _ => continue,
            };
            let rights = (1..=9)
                .filter_map(|i| p[format!("TRKRGHTS{i}")].as_str().map(str::to_string))
                .filter(|s| !s.is_empty())
                .collect();
            out.push(Arc {
                id: p["FRAARCID"].as_i64().unwrap_or(0),
                from: p["FRFRANODE"].as_i64().unwrap_or(0),
                to: p["TOFRANODE"].as_i64().unwrap_or(0),
                owner: p["RROWNER1"].as_str().unwrap_or("").to_string(),
                rights,
                subdiv: p["SUBDIV"].as_str().filter(|s| !s.is_empty() && *s != "#N\\A").map(str::to_string),
                tracks: p["TRACKS"].as_i64(),
                passenger: p["PASSNGR"].as_str().map(|s| !s.is_empty()).unwrap_or(false),
                net: net.to_string(),
                lines,
            });
        }
    }
    out
}

fn line(v: &Value) -> Vec<(f64, f64)> {
    v.as_array()
        .map(|pts| {
            pts.iter()
                .filter_map(|p| Some((p[0].as_f64()?, p[1].as_f64()?)))
                .collect()
        })
        .unwrap_or_default()
}

fn num(v: &Value) -> Option<u32> {
    match v {
        Value::String(s) => s.trim().parse::<f64>().ok().map(|x| x as u32),
        Value::Number(n) => n.as_f64().map(|x| x as u32),
        _ => None,
    }
}

pub fn parse_crossings(rows: &Value) -> Vec<Crossing> {
    let mut out = Vec::new();
    for r in rows.as_array().into_iter().flatten() {
        if r["crossingclosed"].as_str() != Some("No") || r["crossingtype"].as_str() != Some("Public") {
            continue;
        }
        let (Some(lat), Some(lon)) = (
            r["latitude"].as_str().and_then(|s| s.parse::<f64>().ok()),
            r["longitude"].as_str().and_then(|s| s.parse::<f64>().ok()),
        ) else {
            continue;
        };
        if lat == 0.0 || lon == 0.0 {
            continue;
        }
        let s = |k: &str| r[k].as_str().unwrap_or("").trim().to_string();
        out.push(Crossing {
            id: s("crossingid"),
            code: normalize_code(&s("railroadcode")),
            railroad: s("railroadname"),
            street: s("street"),
            city: s("cityname"),
            position: s("crossingposition"),
            day: num(&r["totaldaylightthrutrains"]).unwrap_or(0),
            night: num(&r["totalnighttimethrutrains"]).unwrap_or(0),
            passenger: num(&r["numberpassengertrainperday"]).unwrap_or(0),
            max_speed: num(&r["maximumtimetablespeed"]).filter(|&x| x > 0),
            lon,
            lat,
        });
    }
    out
}

const CELL: f64 = 0.005;

fn cell(p: (f64, f64)) -> (i32, i32) {
    ((p.0 / CELL).floor() as i32, (p.1 / CELL).floor() as i32)
}

/// Attach each crossing to the nearest arc owned (or used via trackage rights) by the
/// same railroad within 50 m, else the nearest arc of any owner within 25 m.
pub fn attach(arcs: &[Arc], xs: &[Crossing]) -> Vec<Option<usize>> {
    let mut grid: HashMap<(i32, i32), Vec<(usize, usize, usize)>> = HashMap::new();
    for (ai, a) in arcs.iter().enumerate() {
        for (li, l) in a.lines.iter().enumerate() {
            for si in 0..l.len().saturating_sub(1) {
                let (c0, c1) = (cell(l[si]), cell(l[si + 1]));
                for cx in c0.0.min(c1.0)..=c0.0.max(c1.0) {
                    for cy in c0.1.min(c1.1)..=c0.1.max(c1.1) {
                        grid.entry((cx, cy)).or_default().push((ai, li, si));
                    }
                }
            }
        }
    }
    xs.iter()
        .map(|x| {
            let p = (x.lon, x.lat);
            let c = cell(p);
            let mut same = (f64::INFINITY, None);
            let mut any = (f64::INFINITY, None);
            for dx in -1..=1 {
                for dy in -1..=1 {
                    for &(ai, li, si) in grid.get(&(c.0 + dx, c.1 + dy)).into_iter().flatten() {
                        let l = &arcs[ai].lines[li];
                        let (d, _) = geo::project(p, l[si], l[si + 1]);
                        let a = &arcs[ai];
                        if (a.owner == x.code || a.rights.contains(&x.code)) && d < same.0 {
                            same = (d, Some(ai));
                        }
                        if d < any.0 {
                            any = (d, Some(ai));
                        }
                    }
                }
            }
            if same.0 <= 50.0 {
                same.1
            } else if any.0 <= 25.0 {
                any.1
            } else {
                None
            }
        })
        .collect()
}

/// Reported trains/day per arc (median of attached crossings with any traffic), then
/// fill gaps by walking connected same-owner arcs up to `max_hops`.
pub fn traffic(arcs: &[Arc], xs: &[Crossing], att: &[Option<usize>], max_hops: u32) -> Vec<Option<(u32, bool)>> {
    let mut per: Vec<Vec<u32>> = vec![vec![]; arcs.len()];
    for (x, a) in xs.iter().zip(att) {
        if let Some(ai) = a {
            per[*ai].push(x.day + x.night);
        }
    }
    let mut out: Vec<Option<(u32, bool)>> = per
        .iter()
        .map(|v| {
            let mut v: Vec<u32> = v.iter().copied().filter(|&t| t > 0).collect();
            if v.is_empty() {
                return None;
            }
            v.sort_unstable();
            Some((v[v.len() / 2], true))
        })
        .collect();

    let mut by_node: HashMap<i64, Vec<usize>> = HashMap::new();
    for (i, a) in arcs.iter().enumerate() {
        by_node.entry(a.from).or_default().push(i);
        by_node.entry(a.to).or_default().push(i);
    }
    let mut q: VecDeque<(usize, u32)> = out.iter().enumerate().filter(|(_, v)| v.is_some()).map(|(i, _)| (i, 0)).collect();
    while let Some((i, hops)) = q.pop_front() {
        if hops >= max_hops || !carries_through_traffic(&arcs[i].net) {
            continue;
        }
        let val = out[i].unwrap().0;
        for n in [arcs[i].from, arcs[i].to] {
            for &j in by_node.get(&n).into_iter().flatten() {
                if out[j].is_none() && arcs[j].owner == arcs[i].owner && carries_through_traffic(&arcs[j].net) {
                    out[j] = Some((val, false));
                    q.push_back((j, hops + 1));
                }
            }
        }
    }
    out
}

pub fn to_geojson(arcs: &[Arc], tpd: &[Option<(u32, bool)>]) -> Value {
    let features: Vec<Value> = arcs
        .iter()
        .zip(tpd)
        .map(|(a, t)| {
            let lines: Vec<Vec<[f64; 2]>> = a
                .lines
                .iter()
                .map(|l| geo::thin(l, 10.0).iter().map(|p| [geo::round5(p.0), geo::round5(p.1)]).collect())
                .collect();
            let geometry = if lines.len() == 1 {
                json!({"type": "LineString", "coordinates": lines[0]})
            } else {
                json!({"type": "MultiLineString", "coordinates": lines})
            };
            json!({
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "id": format!("narn:arc:{}", a.id),
                    "owner": a.owner,
                    "rights": a.rights,
                    "subdiv": a.subdiv,
                    "tracks": a.tracks,
                    "passenger": a.passenger,
                    "net": a.net,
                    "tpd": t.map(|x| x.0),
                    "tpdTier": t.map(|x| if x.1 { "reported" } else { "inferred" }),
                }
            })
        })
        .collect();
    json!({"type": "FeatureCollection", "features": features})
}

pub fn crossings_geojson(arcs: &[Arc], xs: &[Crossing], att: &[Option<usize>]) -> Value {
    let features: Vec<Value> = xs
        .iter()
        .zip(att)
        .map(|(x, a)| {
            json!({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [geo::round5(x.lon), geo::round5(x.lat)]},
                "properties": {
                    "id": format!("fra:crossing:{}", x.id),
                    "railroad": x.railroad,
                    "street": x.street,
                    "city": x.city,
                    "position": x.position,
                    "dayTrains": x.day,
                    "nightTrains": x.night,
                    "passengerTrains": x.passenger,
                    "maxSpeedMph": x.max_speed,
                    "arcId": a.map(|i| format!("narn:arc:{}", arcs[i].id)),
                }
            })
        })
        .collect();
    json!({"type": "FeatureCollection", "features": features})
}

pub fn summary(arcs: &[Arc], xs: &[Crossing], att: &[Option<usize>], tpd: &[Option<(u32, bool)>]) -> Result<String> {
    let attached = att.iter().filter(|a| a.is_some()).count();
    let rep = tpd.iter().filter(|t| matches!(t, Some((_, true)))).count();
    let inf = tpd.iter().filter(|t| matches!(t, Some((_, false)))).count();
    Ok(format!(
        "freight: {} arcs ({} reported, {} inferred, {} unknown); {} public open crossings, {} attached",
        arcs.len(),
        rep,
        inf,
        arcs.len() - rep - inf,
        xs.len(),
        attached
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn arc(id: i64, from: i64, to: i64, owner: &str, pts: Vec<(f64, f64)>) -> Arc {
        Arc {
            id,
            from,
            to,
            owner: owner.into(),
            rights: vec![],
            subdiv: None,
            tracks: Some(1),
            passenger: false,
            net: "M".into(),
            lines: vec![pts],
        }
    }

    fn xing(code: &str, lon: f64, lat: f64, total: u32) -> Crossing {
        Crossing {
            id: "X".into(),
            code: code.into(),
            railroad: code.into(),
            street: "".into(),
            city: "".into(),
            position: "At Grade".into(),
            day: total / 2,
            night: total - total / 2,
            passenger: 0,
            max_speed: None,
            lon,
            lat,
        }
    }

    #[test]
    fn attaches_to_same_owner_and_infers_neighbours() {
        let arcs = vec![
            arc(1, 10, 11, "NS", vec![(-84.0, 33.0), (-84.0, 33.01)]),
            arc(2, 11, 12, "NS", vec![(-84.0, 33.01), (-84.0, 33.02)]),
            // Parallel CSX line 30 m east: closer to the crossing below, but wrong owner.
            arc(3, 20, 21, "CSXT", vec![(-83.99968, 33.0), (-83.99968, 33.01)]),
            arc(4, 21, 22, "CSXT", vec![(-83.99968, 33.01), (-83.99968, 33.02)]),
        ];
        let xs = vec![xing("NS", -83.99980, 33.005, 40)];
        let att = attach(&arcs, &xs);
        assert_eq!(att, vec![Some(0)]);
        let t = traffic(&arcs, &xs, &att, 5);
        assert_eq!(t[0], Some((40, true)));
        assert_eq!(t[1], Some((40, false))); // inferred along NS
        assert_eq!(t[2], None); // never crosses owners
        assert_eq!(t[3], None);
    }

    #[test]
    fn yards_do_not_inherit_mainline_traffic() {
        let mut yard = arc(2, 11, 12, "NS", vec![(-84.0, 33.01), (-84.0, 33.02)]);
        yard.net = "Y".into();
        let arcs = vec![arc(1, 10, 11, "NS", vec![(-84.0, 33.0), (-84.0, 33.01)]), yard];
        let xs = vec![xing("NS", -83.99995, 33.005, 40)];
        let att = attach(&arcs, &xs);
        let t = traffic(&arcs, &xs, &att, 5);
        assert_eq!(t[0], Some((40, true)));
        assert_eq!(t[1], None);
    }

    #[test]
    fn normalizes_csx() {
        assert_eq!(normalize_code("CSX"), "CSXT");
        assert_eq!(normalize_code("NS"), "NS");
    }
}
