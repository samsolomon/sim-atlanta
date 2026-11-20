//! Downtown 3D scene: Overture buildings/roads/rail + GTFS paths → compact meshes and
//! per-path elevation profiles for the Three.js diorama (web/src/scene3d).
//!
//! Coordinates: local tangent plane at the Five Points origin, metres.
//!   x = east, y = up, z = −north   (Three.js convention)

use anyhow::{Context, Result};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::Write;
use std::path::Path;

pub const ORIGIN: (f64, f64) = (-84.3916, 33.7539); // lon, lat (Five Points)
pub const BBOX: [f64; 4] = [-84.406, 33.740, -84.377, 33.773]; // lon/lat min, max
const R: f64 = 6_371_008.8;

/// lon/lat → local (east, north) metres.
pub fn project(lon: f64, lat: f64) -> (f64, f64) {
    let k = ORIGIN.1.to_radians().cos();
    ((lon - ORIGIN.0).to_radians() * R * k, (lat - ORIGIN.1).to_radians() * R)
}

/// local (east, north) metres → lon/lat (used by tests and the manifest).
pub fn unproject(e: f64, n: f64) -> (f64, f64) {
    let k = ORIGIN.1.to_radians().cos();
    (ORIGIN.0 + (e / (R * k)).to_degrees(), ORIGIN.1 + (n / R).to_degrees())
}

// ---------- mesh buffer ----------------------------------------------------------------

#[derive(Default)]
pub struct Mesh {
    pub pos: Vec<f32>,
    pub col: Vec<u8>,
    pub idx: Vec<u32>,
}

impl Mesh {
    fn vert(&mut self, e: f64, y: f64, n: f64, c: [u8; 3]) -> u32 {
        let i = (self.pos.len() / 3) as u32;
        self.pos.extend_from_slice(&[e as f32, y as f32, -n as f32]);
        self.col.extend_from_slice(&c);
        i
    }
    pub fn vertices(&self) -> usize {
        self.pos.len() / 3
    }
    /// Layout: [f32 pos × 3n][u8 col × 3n, padded to 4][u32 idx × m]
    fn write(&self, path: &Path) -> Result<(usize, usize)> {
        let mut f = std::io::BufWriter::new(std::fs::File::create(path)?);
        for v in &self.pos {
            f.write_all(&v.to_le_bytes())?;
        }
        f.write_all(&self.col)?;
        let pad = (4 - self.col.len() % 4) % 4;
        f.write_all(&vec![0u8; pad])?;
        for i in &self.idx {
            f.write_all(&i.to_le_bytes())?;
        }
        Ok((self.vertices(), self.idx.len()))
    }
}

// ---------- buildings ------------------------------------------------------------------

/// Height in metres and where it came from: measured > floors × 3.5 m > 6 m default.
pub fn building_height(height: Option<f64>, floors: Option<f64>) -> (f64, &'static str) {
    match (height, floors) {
        (Some(h), _) if h > 0.5 => (h, "measured"),
        (_, Some(f)) if f > 0.0 => (f * 3.5, "floors"),
        _ => (6.0, "default"),
    }
}

/// Extrude a polygon (outer ring + holes, in local metres) to `h`. Roof via earcut.
pub fn extrude(mesh: &mut Mesh, rings: &[Vec<(f64, f64)>], h: f64, c: [u8; 3]) {
    let rings: Vec<Vec<(f64, f64)>> = rings
        .iter()
        .map(|r| {
            let mut r = r.clone();
            if r.len() > 1 && r.first() == r.last() {
                r.pop();
            }
            r
        })
        .filter(|r| r.len() >= 3)
        .collect();
    if rings.is_empty() {
        return;
    }
    // Roof
    let mut flat = Vec::new();
    let mut holes = Vec::new();
    for (i, r) in rings.iter().enumerate() {
        if i > 0 {
            holes.push(flat.len() / 2);
        }
        for p in r {
            flat.push(p.0);
            flat.push(p.1);
        }
    }
    let roof = darken(c, 1.08);
    let base = mesh.vertices() as u32;
    for p in rings.iter().flatten() {
        mesh.vert(p.0, h, p.1, roof);
    }
    if let Ok(tris) = earcutr::earcut(&flat, &holes, 2) {
        for t in tris.chunks(3) {
            // earcut returns CCW-in-(e,n); with z = −n that flips, so emit as-is for an up-facing roof.
            mesh.idx.extend_from_slice(&[base + t[0] as u32, base + t[2] as u32, base + t[1] as u32]);
        }
    }
    // Walls: each edge gets its own 4 vertices so flat shading stays crisp.
    for r in &rings {
        for i in 0..r.len() {
            let a = r[i];
            let b = r[(i + 1) % r.len()];
            let wall = darken(c, 0.92);
            let v0 = mesh.vert(a.0, 0.0, a.1, wall);
            let v1 = mesh.vert(b.0, 0.0, b.1, wall);
            let v2 = mesh.vert(b.0, h, b.1, wall);
            let v3 = mesh.vert(a.0, h, a.1, wall);
            mesh.idx.extend_from_slice(&[v0, v1, v2, v0, v2, v3]);
        }
    }
}

fn darken(c: [u8; 3], f: f64) -> [u8; 3] {
    [(c[0] as f64 * f).min(255.0) as u8, (c[1] as f64 * f).min(255.0) as u8, (c[2] as f64 * f).min(255.0) as u8]
}

/// A muted palette; taller buildings drift cooler, so the skyline reads at a glance.
fn building_color(h: f64, id: &str) -> [u8; 3] {
    let jitter = (id.bytes().fold(0u32, |a, b| a.wrapping_mul(31).wrapping_add(b as u32)) % 12) as f64 - 6.0;
    let t = (h / 120.0).min(1.0);
    let warm = [214.0, 206.0, 192.0];
    let cool = [176.0, 186.0, 200.0];
    let mix = |i: usize| (warm[i] * (1.0 - t) + cool[i] * t + jitter).clamp(0.0, 255.0) as u8;
    [mix(0), mix(1), mix(2)]
}

fn rings_of(geom: &Value) -> Vec<Vec<Vec<(f64, f64)>>> {
    let ring = |r: &Value| -> Vec<(f64, f64)> {
        r.as_array()
            .into_iter()
            .flatten()
            .filter_map(|p| Some(project(p[0].as_f64()?, p[1].as_f64()?)))
            .collect()
    };
    let poly = |p: &Value| -> Vec<Vec<(f64, f64)>> { p.as_array().into_iter().flatten().map(ring).collect() };
    match geom["type"].as_str() {
        Some("Polygon") => vec![poly(&geom["coordinates"])],
        Some("MultiPolygon") => geom["coordinates"].as_array().into_iter().flatten().map(poly).collect(),
        _ => vec![],
    }
}

fn lines_of(geom: &Value) -> Vec<Vec<(f64, f64)>> {
    let line = |l: &Value| -> Vec<(f64, f64)> {
        l.as_array()
            .into_iter()
            .flatten()
            .filter_map(|p| Some(project(p[0].as_f64()?, p[1].as_f64()?)))
            .collect()
    };
    match geom["type"].as_str() {
        Some("LineString") => vec![line(&geom["coordinates"])],
        Some("MultiLineString") => geom["coordinates"].as_array().into_iter().flatten().map(line).collect(),
        _ => vec![],
    }
}

// ---------- ribbons (roads, static track) ----------------------------------------------

pub fn ribbon(mesh: &mut Mesh, line: &[(f64, f64)], width: f64, y: f64, c: [u8; 3]) {
    if line.len() < 2 {
        return;
    }
    let hw = width / 2.0;
    let mut prev: Option<(u32, u32)> = None;
    for i in 0..line.len() {
        let a = line[i.saturating_sub(1)];
        let b = line[(i + 1).min(line.len() - 1)];
        let (dx, dy) = (b.0 - a.0, b.1 - a.1);
        let len = (dx * dx + dy * dy).sqrt().max(1e-9);
        let (nx, ny) = (-dy / len * hw, dx / len * hw);
        let p = line[i];
        let l = mesh.vert(p.0 + nx, y, p.1 + ny, c);
        let r = mesh.vert(p.0 - nx, y, p.1 - ny, c);
        if let Some((pl, pr)) = prev {
            mesh.idx.extend_from_slice(&[pl, pr, r, pl, r, l]);
        }
        prev = Some((l, r));
    }
}

fn road_width(class: &str) -> Option<f64> {
    Some(match class {
        "motorway" => 22.0,
        "trunk" => 16.0,
        "primary" => 13.0,
        "secondary" => 11.0,
        "tertiary" => 9.0,
        "residential" | "unclassified" | "living_street" => 7.0,
        // Footways, service alleys and parking aisles add weight but little at diorama scale.
        _ => return None,
    })
}

// ---------- rail levels → elevation profiles --------------------------------------------

/// Value of a `between`-scoped Overture rule at fraction `t` along the segment.
fn rule_at<'a>(rules: &'a Value, t: f64) -> Option<&'a Value> {
    rules.as_array()?.iter().find(|r| match r["between"].as_array() {
        None => true,
        Some(b) => b[0].as_f64().unwrap_or(0.0) <= t && t <= b[1].as_f64().unwrap_or(1.0),
    })
}

/// Schematic height for an Overture level (stacking order, not depth).
pub fn level_height(level: i64, tunnel: bool, bridge: bool) -> f64 {
    match level {
        l if l <= -3 => -22.0,
        -2 => -16.0,
        -1 => -10.0,
        l if l > 0 => 7.0,
        _ if bridge => 7.0,
        // A level-0 "tunnel" is a covered cut at street level (e.g. under a plaza): keep it at grade.
        _ => {
            let _ = tunnel;
            0.0
        }
    }
}

struct SubwaySeg {
    pts: Vec<(f64, f64)>,
    cum: Vec<f64>,
    levels: Value,
    flags: Value,
}

/// Height at one point on a transit path, from the nearest same-direction subway segment.
fn match_height(segs: &[SubwaySeg], p: (f64, f64), bearing: f64) -> Option<f64> {
    let mut best: Option<(f64, f64)> = None; // (distance, height)
    for s in segs {
        for i in 0..s.pts.len().saturating_sub(1) {
            let (a, b) = (s.pts[i], s.pts[i + 1]);
            let (dx, dy) = (b.0 - a.0, b.1 - a.1);
            let l2 = dx * dx + dy * dy;
            let t = if l2 == 0.0 { 0.0 } else { (((p.0 - a.0) * dx + (p.1 - a.1) * dy) / l2).clamp(0.0, 1.0) };
            let d = ((a.0 + t * dx - p.0).powi(2) + (a.1 + t * dy - p.1).powi(2)).sqrt();
            let sb = dy.atan2(dx);
            let mut da = (bearing - sb).rem_euclid(std::f64::consts::TAU);
            if da > std::f64::consts::PI {
                da = std::f64::consts::TAU - da;
            }
            let da = da.min(std::f64::consts::PI - da); // either travel direction
            if d <= 15.0 && da <= 30f64.to_radians() && best.is_none_or(|bb| d < bb.0) {
                let total = *s.cum.last().unwrap_or(&1.0);
                let frac = if total > 0.0 { (s.cum[i] + t * l2.sqrt()) / total } else { 0.0 };
                let level = rule_at(&s.levels, frac).and_then(|r| r["value"].as_i64()).unwrap_or(0);
                let flags: Vec<&str> = rule_at(&s.flags, frac)
                    .and_then(|r| r["values"].as_array())
                    .map(|v| v.iter().filter_map(|x| x.as_str()).collect())
                    .unwrap_or_default();
                best = Some((d, level_height(level, flags.contains(&"is_tunnel"), flags.contains(&"is_bridge"))));
            }
        }
    }
    best.map(|b| b.1)
}

/// Smooth out short (≤ max_gap samples) interruptions, then ramp changes over `ramp` samples:
/// - a surface gap between two underground or two elevated spans takes the shallower neighbour;
/// - a short "bridge" between two tunnels (a span over something inside a cut) stays below
///   ground at the shallower tunnel depth, so trains don't surface for one block.
pub fn clean_profile(z: &mut [f64], max_gap: usize, ramp: usize) {
    let n = z.len();
    let fill_runs = |z: &mut [f64], in_run: &dyn Fn(f64) -> bool, ok: &dyn Fn(f64, f64) -> bool| {
        let mut i = 0;
        while i < n {
            if !in_run(z[i]) {
                i += 1;
                continue;
            }
            let start = i;
            while i < n && in_run(z[i]) {
                i += 1;
            }
            if start > 0 && i < n && i - start <= max_gap {
                let (a, b) = (z[start - 1], z[i]);
                if ok(a, b) {
                    let fill = if a < 0.0 { a.max(b) } else { a.min(b) };
                    z[start..i].iter_mut().for_each(|v| *v = fill);
                }
            }
        }
    };
    fill_runs(z, &|v| v == 0.0, &|a, b| a != 0.0 && a.signum() == b.signum());
    fill_runs(z, &|v| v >= 0.0, &|a, b| a < 0.0 && b < 0.0);
    // Ramp: moving average of width `ramp` (keeps endpoints honest, smooths portals).
    if ramp > 1 {
        let src = z.to_vec();
        for (j, v) in z.iter_mut().enumerate() {
            let lo = j.saturating_sub(ramp / 2);
            let hi = (j + ramp / 2 + 1).min(n);
            *v = src[lo..hi].iter().sum::<f64>() / (hi - lo) as f64;
        }
    }
}

// ---------- build ------------------------------------------------------------------------

fn load(p: &Path) -> Result<Value> {
    serde_json::from_str(&std::fs::read_to_string(p).with_context(|| format!("read {}", p.display()))?)
        .with_context(|| format!("parse {}", p.display()))
}

pub fn build(root: &Path) -> Result<()> {
    let raw = root.join("data/raw");
    let out = root.join("web/public/data/scene/downtown");
    std::fs::create_dir_all(&out)?;
    let (e0, n0) = project(BBOX[0], BBOX[1]);
    let (e1, n1) = project(BBOX[2], BBOX[3]);
    let inside = |p: (f64, f64)| p.0 >= e0 && p.0 <= e1 && p.1 >= n0 && p.1 <= n1;
    println!("scene:");

    // Buildings
    let bjson = load(&raw.join("overture_downtown_buildings.geojson"))?;
    let release = bjson["release"].as_str().unwrap_or("").to_string();
    let mut bmesh = Mesh::default();
    let mut height_src: HashMap<&str, usize> = HashMap::new();
    let mut tallest: Vec<(f64, (f64, f64))> = vec![];
    for f in bjson["features"].as_array().into_iter().flatten() {
        let p = &f["properties"];
        let (h, src) = building_height(p["height"].as_f64(), p["num_floors"].as_f64());
        let id = p["id"].as_str().unwrap_or("");
        for poly in rings_of(&f["geometry"]) {
            let Some(outer) = poly.first() else { continue };
            let c = outer.iter().fold((0.0, 0.0), |a, q| (a.0 + q.0, a.1 + q.1));
            let c = (c.0 / outer.len() as f64, c.1 / outer.len() as f64);
            if !inside(c) {
                continue;
            }
            extrude(&mut bmesh, &poly, h, building_color(h, id));
            *height_src.entry(src).or_default() += 1;
            tallest.push((h, unproject(c.0, c.1)));
        }
    }
    tallest.sort_by(|a, b| b.0.total_cmp(&a.0));
    let (bv, bi) = bmesh.write(&out.join("buildings.bin"))?;
    println!("  buildings: {:?}; {} vertices, {} triangles", height_src, bv, bi / 3);
    println!("  tallest: {:?}", tallest.iter().take(4).map(|t| (t.0.round(), (t.1 .1 * 1e4).round() / 1e4, (t.1 .0 * 1e4).round() / 1e4)).collect::<Vec<_>>());

    // Roads
    let rjson = load(&raw.join("overture_downtown_roads.geojson"))?;
    let mut roads = Mesh::default();
    for f in rjson["features"].as_array().into_iter().flatten() {
        let p = &f["properties"];
        let Some(w) = road_width(p["class"].as_str().unwrap_or("")) else { continue };
        let c = if w >= 16.0 { [150, 152, 158] } else { [176, 178, 182] };
        for l in lines_of(&f["geometry"]) {
            ribbon(&mut roads, &l, w, 0.02 + w * 0.001, c);
        }
    }
    let (rv, ri) = roads.write(&out.join("roads.bin"))?;
    println!("  roads: {} vertices, {} triangles", rv, ri / 3);

    // Static rail (freight + tram) and subway segments for level matching
    let rail = load(&raw.join("overture_downtown_rail.geojson"))?;
    let mut track = Mesh::default();
    let mut subway: Vec<SubwaySeg> = vec![];
    for f in rail["features"].as_array().into_iter().flatten() {
        let p = &f["properties"];
        let class = p["class"].as_str().unwrap_or("");
        let flags = p["rail_flags"].to_string();
        let dead = flags.contains("is_abandoned") || flags.contains("is_disused");
        for l in lines_of(&f["geometry"]) {
            match class {
                "subway" => {
                    let cum = l
                        .iter()
                        .scan((0.0, None::<(f64, f64)>), |st, q| {
                            if let Some(pr) = st.1 {
                                st.0 += ((q.0 - pr.0).powi(2) + (q.1 - pr.1).powi(2)).sqrt();
                            }
                            st.1 = Some(*q);
                            Some(st.0)
                        })
                        .collect();
                    subway.push(SubwaySeg { pts: l, cum, levels: p["level_rules"].clone(), flags: p["rail_flags"].clone() })
                }
                "standard_gauge" if !dead => ribbon(&mut track, &l, 3.2, 0.12, [122, 72, 52]),
                "tram" => ribbon(&mut track, &l, 2.6, 0.12, [96, 120, 160]),
                _ => {}
            }
        }
    }
    let (tv, ti) = track.write(&out.join("track.bin"))?;
    println!("  static track: {} vertices, {} triangles; {} subway segments for levels", tv, ti / 3, subway.len());

    // Profiles for every MARTA heavy-rail path that passes through the scene
    let routes = load(&root.join("web/public/data/ga/routes.json"))?;
    let heavy: Vec<String> = routes["routes"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|r| r["mode"] == "heavy_rail")
        .filter_map(|r| r["id"].as_str().map(str::to_string))
        .collect();
    let step = 10.0;
    let mut profiles = serde_json::Map::new();
    let (mut total, mut matched) = (0usize, 0usize);
    for p in routes["paths"].as_array().into_iter().flatten() {
        if !heavy.iter().any(|h| p["routeId"] == h.as_str()) {
            continue;
        }
        let coords: Vec<f64> = p["coords"].as_array().into_iter().flatten().filter_map(Value::as_f64).collect();
        let cum: Vec<f64> = p["cum"].as_array().into_iter().flatten().filter_map(Value::as_f64).collect();
        let pts: Vec<(f64, f64)> = coords.chunks(2).map(|c| project(c[0], c[1])).collect();
        let len = *cum.last().unwrap_or(&0.0);
        let (mut s0, mut z) = (None::<f64>, Vec::new());
        let mut j = 0;
        let mut s = 0.0;
        while s <= len {
            while j + 2 < cum.len() && cum[j + 1] < s {
                j += 1;
            }
            let seg = (cum[j + 1] - cum[j]).max(1e-9);
            let f = ((s - cum[j]) / seg).clamp(0.0, 1.0);
            let (a, b) = (pts[j], pts[j + 1]);
            let q = (a.0 + f * (b.0 - a.0), a.1 + f * (b.1 - a.1));
            if inside(q) {
                total += 1;
                let h = match_height(&subway, q, (b.1 - a.1).atan2(b.0 - a.0));
                if h.is_some() {
                    matched += 1;
                }
                s0.get_or_insert(s);
                z.push(h.unwrap_or(0.0));
            } else if s0.is_some() {
                break; // left the scene (paths cross it once)
            }
            s += step;
        }
        if let Some(s0) = s0 {
            clean_profile(&mut z, 15, 15);
            profiles.insert(
                p["id"].as_str().unwrap_or("").to_string(),
                json!({"s0": s0, "step": step, "z": z.iter().map(|v| (v * 10.0).round() / 10.0).collect::<Vec<_>>()}),
            );
        }
    }
    println!("  profiles: {} paths, {:.0}% of {} samples matched a subway segment", profiles.len(), 100.0 * matched as f64 / total.max(1) as f64, total);

    let manifest = json!({
        "name": "Downtown Atlanta",
        "origin": {"lon": ORIGIN.0, "lat": ORIGIN.1},
        "bounds": {"minX": e0, "maxX": e1, "minZ": -n1, "maxZ": -n0},
        "axes": "x = east, y = up, z = -north (metres)",
        "meshes": {
            "buildings": {"file": "buildings.bin", "vertices": bv, "indices": bi},
            "roads": {"file": "roads.bin", "vertices": rv, "indices": ri},
            "track": {"file": "track.bin", "vertices": tv, "indices": ti}
        },
        "buildingHeights": height_src,
        "profiles": profiles,
        "notes": "Rail elevations are schematic: Overture levels are stacking order, not depth.",
        "sources": [
            {"name": "Overture Maps buildings & transportation", "release": release, "license": "ODbL (OpenStreetMap-derived), CDLA-Permissive-2.0", "attribution": "© OpenStreetMap contributors, Overture Maps Foundation"},
            {"name": "MARTA GTFS", "license": "MARTA developer terms"}
        ]
    });
    std::fs::write(out.join("scene.json"), serde_json::to_vec(&manifest)?)?;
    for name in ["buildings.bin", "roads.bin", "track.bin", "scene.json"] {
        println!("  wrote {name:<14} {:>6} KB", std::fs::metadata(out.join(name))?.len() / 1024);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn projection_round_trips() {
        let (e, n) = project(-84.38, 33.76);
        let (lon, lat) = unproject(e, n);
        assert!((lon + 84.38).abs() < 1e-9 && (lat - 33.76).abs() < 1e-9);
        assert!((e - 1070.0).abs() < 5.0, "{e}"); // ~0.0116° east at this latitude
    }

    #[test]
    fn height_fallback_order() {
        assert_eq!(building_height(Some(42.0), Some(3.0)), (42.0, "measured"));
        assert_eq!(building_height(None, Some(4.0)), (14.0, "floors"));
        assert_eq!(building_height(None, None), (6.0, "default"));
    }

    #[test]
    fn extrudes_square_with_hole() {
        let outer = vec![(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0), (0.0, 0.0)];
        let hole = vec![(4.0, 4.0), (6.0, 4.0), (6.0, 6.0), (4.0, 6.0)];
        let mut m = Mesh::default();
        extrude(&mut m, &[outer, hole], 20.0, [200, 200, 200]);
        // roof: square-with-hole = 8 triangles; walls: 8 edges × 2 triangles
        assert_eq!(m.idx.len() / 3, 8 + 16);
        assert!(m.pos.chunks(3).any(|p| p[1] == 20.0));
    }

    #[test]
    fn levels_map_to_schematic_heights() {
        assert_eq!(level_height(-3, true, false), -22.0);
        assert_eq!(level_height(-1, true, false), -10.0);
        assert_eq!(level_height(3, false, true), 7.0);
        assert_eq!(level_height(0, true, false), 0.0);
        assert_eq!(level_height(0, false, false), 0.0);
    }

    #[test]
    fn fills_short_gaps_between_tunnels_only() {
        let mut z = vec![-10.0, -10.0, 0.0, 0.0, -22.0, 0.0, 0.0, 0.0, 7.0];
        clean_profile(&mut z, 3, 1);
        assert_eq!(z, vec![-10.0, -10.0, -10.0, -10.0, -22.0, 0.0, 0.0, 0.0, 7.0]);
    }

    #[test]
    fn short_bridge_between_tunnels_stays_underground() {
        let mut z = vec![-16.0, -16.0, 7.0, 7.0, -10.0, -10.0, 7.0, 7.0, 7.0, 7.0, 7.0];
        clean_profile(&mut z, 3, 1);
        assert_eq!(z, vec![-16.0, -16.0, -10.0, -10.0, -10.0, -10.0, 7.0, 7.0, 7.0, 7.0, 7.0]);
    }

    #[test]
    fn reads_between_scoped_rules() {
        let rules = json!([{"value": -3, "between": [0.0, 0.5]}, {"value": 1, "between": [0.5, 1.0]}]);
        assert_eq!(rule_at(&rules, 0.2).unwrap()["value"], -3);
        assert_eq!(rule_at(&rules, 0.8).unwrap()["value"], 1);
        let all = json!([{"value": -1, "between": null}]);
        assert_eq!(rule_at(&all, 0.9).unwrap()["value"], -1);
    }

    #[test]
    fn matches_same_direction_subway_only() {
        // An east-west tunnel at level -3 crossed by a north-south one at -1.
        let ew = SubwaySeg { pts: vec![(-100.0, 0.0), (100.0, 0.0)], cum: vec![0.0, 200.0], levels: json!([{"value": -3, "between": null}]), flags: json!([{"values": ["is_tunnel"], "between": null}]) };
        let ns = SubwaySeg { pts: vec![(0.0, -100.0), (0.0, 100.0)], cum: vec![0.0, 200.0], levels: json!([{"value": -1, "between": null}]), flags: json!([{"values": ["is_tunnel"], "between": null}]) };
        let segs = [ew, ns];
        // At the crossing, a train heading north must get the north-south level.
        assert_eq!(match_height(&segs, (0.0, 0.0), std::f64::consts::FRAC_PI_2), Some(-10.0));
        assert_eq!(match_height(&segs, (0.0, 0.0), 0.0), Some(-22.0));
        assert_eq!(match_height(&segs, (0.0, 50.0), 0.0), None); // wrong direction, nothing within 15 m
    }
}
