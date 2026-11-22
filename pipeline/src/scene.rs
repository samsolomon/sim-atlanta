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

/// Track checked against dated aerial imagery and found open to the sky, where the generic
/// rules above would bury it: Overture leaves these spans untagged (level 0) between two
/// tunnels, and `clean_profile` fills such short gaps. A sample within `MATCH_M` of one of
/// these centrelines, running the same way, is pinned at `depth` (a schematic open cut).
pub struct OpenCut {
    pub name: &'static str,
    /// Schematic track height (m): shallower than the renderer's portal threshold (−5.5 m).
    pub depth: f64,
    /// One lon/lat polyline per track, copied from the cited OSM ways.
    pub tracks: &'static [&'static [(f64, f64)]],
}

/// Evidence for each entry is in docs/data-model.md ("Open-air MARTA track downtown").
pub const VERIFIED_OPEN: &[OpenCut] = &[OpenCut {
    // MARTA Blue/Green trench through the Gulch, between Five Points and the Ted Turner Dr
    // viaduct. OSM ways 702258823 and 702258824 (no tunnel tag since 2019); open walled
    // trench with a footbridge in USGS NAIP 2023-10-08 (0.6 m) and Vantor WV02 2026-02-02
    // (0.5 m, Esri World Imagery). Centennial Yards plans to deck over the Gulch: re-check.
    name: "Gulch trench (Blue/Green, west of Five Points)",
    depth: -4.0,
    tracks: &[
        &[(-84.3936768, 33.7550708), (-84.3934314, 33.7549158), (-84.3932352, 33.7547891), (-84.3930011, 33.7546431), (-84.3928507, 33.7545547), (-84.3927156, 33.7544750)],
        &[(-84.3936248, 33.7551215), (-84.3923693, 33.7543988)],
    ],
}, OpenCut {
    // MARTA Blue/Green open cut east of Five Points, between Pryor St SW and Shirley Clarke Franklin Blvd SW beside
    // a surface car park. OSM ways 702258817 and 702258818 (no tunnel tag since 2019; the
    // adjacent Interline Connector way 1453238814 is tagged cutting=yes); rails visible in
    // USGS NAIP 2023-10-08 and Vantor WV02 2026-02-02.
    name: "Five Points east cut (Blue/Green)",
    depth: -4.0,
    tracks: &[
        &[(-84.3898253, 33.7527189), (-84.3897680, 33.7526675), (-84.3896381, 33.7525537), (-84.3895058, 33.7524458), (-84.3894068, 33.7523656), (-84.3893297, 33.7523072), (-84.3892660, 33.7522617), (-84.3892106, 33.7522256), (-84.3891639, 33.7521954), (-84.3890871, 33.7521465), (-84.3890070, 33.7520993)],
        &[(-84.3889251, 33.7521287), (-84.3890107, 33.7521858), (-84.3890995, 33.7522436), (-84.3891726, 33.7522951), (-84.3892774, 33.7523697), (-84.3893392, 33.7524162), (-84.3893985, 33.7524626), (-84.3895000, 33.7525435), (-84.3897153, 33.7527279), (-84.3897679, 33.7527728)],
    ],
}];

const MATCH_M: f64 = 12.0;

/// Pinned depth for a path sample at local `p` heading `bearing` (radians, atan2(dn, de)).
pub fn open_cut_depth(p: (f64, f64), bearing: f64) -> Option<f64> {
    for cut in VERIFIED_OPEN {
        for track in cut.tracks {
            let pts: Vec<(f64, f64)> = track.iter().map(|&(lon, lat)| project(lon, lat)).collect();
            for w in pts.windows(2) {
                let (a, b) = (w[0], w[1]);
                let (dx, dy) = (b.0 - a.0, b.1 - a.1);
                let l2 = dx * dx + dy * dy;
                if l2 == 0.0 {
                    continue;
                }
                // Only alongside the span: a point beyond either end is tunnel, not trench.
                let t = ((p.0 - a.0) * dx + (p.1 - a.1) * dy) / l2;
                let d = ((a.0 + t * dx - p.0).powi(2) + (a.1 + t * dy - p.1).powi(2)).sqrt();
                let mut da = (bearing - dy.atan2(dx)).rem_euclid(std::f64::consts::PI);
                da = da.min(std::f64::consts::PI - da);
                if (0.0..=1.0).contains(&t) && d <= MATCH_M && da <= 30f64.to_radians() {
                    return Some(cut.depth);
                }
            }
        }
    }
    None
}

/// `clean_profile`, but samples with `pin[i] = Some(z)` are set to `z` first (so they never
/// count as a gap to fill) and again after the ramp (so smoothing can't bury them).
pub fn clean_profile_pinned(z: &mut [f64], pin: &[Option<f64>], max_gap: usize, ramp: usize) {
    for (v, p) in z.iter_mut().zip(pin) {
        if let Some(p) = p {
            *v = *p;
        }
    }
    clean_profile(z, max_gap, ramp);
    for (v, p) in z.iter_mut().zip(pin) {
        if let Some(p) = p {
            *v = *p;
        }
    }
}

// ---------- observed rail cover and terrain-relative height -----------------------------

/// A sourced observation along the Blue/Green corridor, located by lon/lat so it does not
/// depend on feed-generated path ids. The bake projects it onto every path that runs through
/// it, in each direction. See docs/data-model.md ("Rail cover and height") for the evidence.
pub struct RailFix {
    pub ev: &'static str,
    pub cover: &'static str, // open | covered | roofed
    pub form: &'static str,  // tunnel | cut | grade | station | viaduct
    /// Observed edges, lon/lat. `to_open`: the stretch continues past the end of the profile.
    pub from: (f64, f64),
    pub to: (f64, f64),
    pub to_open: bool,
    /// ground | anchors (see RailSpan in web/src/core/scene-data.ts)
    pub base: &'static str,
    pub rel: f64,
    /// Identified locations along the stretch, shared by every path through it.
    pub anchors: &'static [Anchor],
    /// schematic | measured: whether the stretch's heights come from a measurement.
    pub height: &'static str,
}

/// A located track-bed height. `rel` is the bed above the ground there. `navd88`, when present,
/// is a measured absolute bed (NAVD88 m), and consumers with a ground grid prefer it. Its `rel`
/// is then only a fallback, computed against the same 1 m DEM nodes.
pub struct Anchor {
    pub lon: f64,
    pub lat: f64,
    pub rel: f64,
    pub navd88: Option<f64>,
    pub at: &'static str,
}

const fn schematic(lon: f64, lat: f64, rel: f64, at: &'static str) -> Anchor {
    Anchor { lon, lat, rel, navd88: None, at }
}

/// A lidar-measured guideway top (USGS 3DEP EPT GA_Statewide_B2_2018, April 2019, NAVD88). The
/// bed is 0.55 m below it, which puts City's rails on the measured surface. See
/// docs/king-memorial-corridor.md.
const fn measured(lon: f64, lat: f64, top: f64, rel: f64, at: &'static str) -> Anchor {
    Anchor { lon, lat, rel, navd88: Some(top - 0.55), at }
}

pub struct RailEv {
    pub id: &'static str,
    pub name: &'static str,
    pub checked: &'static str,
    pub sources: &'static [&'static str],
    pub precision_m: f64,
    pub note: &'static str,
}

/// Shared by the Georgia State station roof, the Floyd Building and the Connector viaduct, so the
/// bed is continuous through their seams.
/// - Schematic: the canopies' west end, on the station floor, and the station's east face, 7 m
///   above local ground (a placeholder, within 0.13 m of the measured top 42 m further east).
/// - Measured: east of the Floyd Building, from the lidar guideway top. Eight anchors simplify the
///   5 m profile to within 0.25 m (RMS 0.10 m).
/// - No anchor under the King Memorial canopy (s 8945–9135 on 155177), where the deck was not
///   seen. Interpolation there is an estimate.
const GSU_CHAIN: &[Anchor] = &[
    schematic(-84.386895, 33.750839, 0.0, "west end of the Georgia State platform canopies"),
    schematic(-84.385359, 33.749748, 7.0, "east face of Georgia State station (Floyd Building)"),
    measured(-84.384994, 33.749513, 316.38, 6.61, "guideway top east of the Floyd Building (lidar)"),
    measured(-84.384696, 33.749318, 316.90, 6.35, "guideway top west of the Downtown Connector (lidar)"),
    measured(-84.382236, 33.748844, 324.41, 9.73, "guideway top over the CSX tracks (lidar)"),
    measured(-84.381637, 33.748878, 325.31, 10.82, "guideway top over the Atlanta Terminal Subdivision (lidar)"),
    measured(-84.380237, 33.748948, 325.47, 11.28, "guideway crest east of the board edge (lidar)"),
    measured(-84.376685, 33.749636, 324.11, 15.96, "guideway top at Grant St, King Memorial west end (lidar)"),
    measured(-84.374605, 33.750282, 323.32, 11.72, "guideway top east of the King Memorial canopy (lidar)"),
    measured(-84.372225, 33.751030, 322.48, 7.65, "guideway top beyond the King Memorial Crossover (lidar)"),
];

pub const RAIL_FIXES: &[RailFix] = &[
    RailFix { ev: "gulch-trench", cover: "open", form: "cut", from: (-84.39365, 33.75510), to: (-84.39250, 33.75443), to_open: false, base: "ground", rel: 0.0, anchors: &[], height: "schematic" },
    RailFix { ev: "five-points-east-cut", cover: "open", form: "cut", from: (-84.38980, 33.75274), to: (-84.38897, 33.75212), to_open: false, base: "ground", rel: 0.0, anchors: &[], height: "schematic" },
    RailFix { ev: "gsu-west-open", cover: "open", form: "grade", from: (-84.38746, 33.75124), to: (-84.386895, 33.750839), to_open: false, base: "ground", rel: 0.0, anchors: &[], height: "schematic" },
    RailFix { ev: "gsu-canopy", cover: "roofed", form: "station", from: (-84.386895, 33.750839), to: (-84.386311, 33.750424), to_open: false, base: "anchors", rel: 0.0, anchors: GSU_CHAIN, height: "schematic" },
    RailFix { ev: "gsu-floyd", cover: "covered", form: "station", from: (-84.386311, 33.750424), to: (-84.385359, 33.749748), to_open: false, base: "anchors", rel: 0.0, anchors: GSU_CHAIN, height: "schematic" },
    RailFix { ev: "connector-viaduct", cover: "open", form: "viaduct", from: (-84.385359, 33.749748), to: (-84.37545, 33.74998), to_open: true, base: "anchors", rel: 7.0, anchors: GSU_CHAIN, height: "measured" },
];

pub const RAIL_EVIDENCE: &[RailEv] = &[
    RailEv { id: "gulch-trench", name: "Gulch trench, west of Five Points", checked: "2026-11-21", sources: &["osm:way/702258823", "osm:way/702258824", "usgs-naip:m_3308413_se_16_060_20231008", "esri-world-imagery:vantor-wv02-2026-02-02"], precision_m: 15.0, note: "Walled open trench with a footbridge. Centennial Yards plans to deck the Gulch: re-check." },
    RailEv { id: "five-points-east-cut", name: "Open cut east of Five Points (Pryor St SW to Shirley Clarke Franklin Blvd SW)", checked: "2026-11-21", sources: &["osm:way/702258817", "osm:way/702258818", "osm:way/1453238814", "usgs-naip:m_3308413_se_16_060_20231008", "esri-world-imagery:vantor-wv02-2026-02-02", "fhwa-nbi-2025:121-5175", "fhwa-nbi-2025:121-0417"], precision_m: 15.0, note: "Rails visible; Pryor St SW and Shirley Clarke Franklin Blvd SW (Central Ave in bridge records) cross its ends." },
    RailEv { id: "gsu-west-open", name: "Georgia State west approach, open at grade", checked: "2026-11-21", sources: &["osm:way/702258813", "osm:way/78090747", "osm:way/78090742", "esri-world-imagery:vantor-2022-09-27-15cm", "esri-world-imagery:vantor-wv02-2026-02-02"], precision_m: 10.0, note: "From the tunnel mouth at the Washington St bridge to the platform canopies, beside the CSX/NS tracks." },
    RailEv { id: "gsu-canopy", name: "Georgia State side-platform canopies", checked: "2026-11-22", sources: &["osm:way/539937961", "osm:way/539937962", "osm:way/287320828", "usgs-naip:m_3308413_se_16_060_20231008", "esri-world-imagery:vantor-2022-09-27-15cm", "esri-world-imagery:vantor-wv02-2026-02-02"], precision_m: 5.0, note: "Two canopy roofs over the side platforms, from the platforms' west tips (the farther tip, 961 and 962 differ by 0.5 m along track) to the Floyd Building's NW face. Canopy roofs start at the tips in NAIP 2023 and Esri. See docs/georgia-state-geometry.md." },
    RailEv { id: "gsu-floyd", name: "Georgia State station under the Floyd Building", checked: "2026-11-22", sources: &["osm:way/702258821", "osm:way/702258822", "osm:way/287320828", "osm:way/537007595", "osm:way/537007597", "usgs-naip:m_3308413_se_16_060_20231008", "esri-world-imagery:vantor-wv02-2026-02-02"], precision_m: 4.0, note: "OSM tunnel=building_passage between the Floyd Building's NW and SE faces (115.7 m along track); the east 116 m of the platforms and both tracks run under the base and both towers. Face positions: OSM outline, whose tower SW corners match the facade bases in NAIP 2023. Roof edges in imagery lean about 10 m and must not be used." },
    RailEv { id: "connector-viaduct", name: "East Line structure from Georgia State over the Downtown Connector", checked: "2026-11-22", sources: &["osm:way/905944412", "osm:way/905944413", "osm:way/905944414", "osm:way/905944415", "osm:way/78090750", "osm:way/78380741", "esri-world-imagery:vantor-2022-09-27-15cm", "esri-world-imagery:vantor-wv02-2026-02-02", "usgs-3dep-ept:GA_Statewide_B2_2018"], precision_m: 15.0, note: "Open elevated structure continuous in imagery from the station's east face into the layer-3 viaduct; a narrow skywalk (osm:way/539939605) is ignored for cover. Heights: lidar guideway top (bed 0.55 m below it), measured east of s 8132 on 155177; the 42 m from the Floyd face is a schematic +7 m; under the King Memorial canopy the deck was not seen and the bed is an estimate. Deck depth and clearances are unknown. See docs/king-memorial-corridor.md." },
];

/// Nearest point on a projected path within `max_d` metres, heading within 35° of `heading`
/// (either way along the path). Returns (s, east, north).
fn locate(pts: &[(f64, f64)], cum: &[f64], p: (f64, f64), heading: Option<f64>, max_d: f64) -> Option<(f64, f64, f64)> {
    let mut best: Option<(f64, f64, f64, f64)> = None;
    for i in 0..pts.len().saturating_sub(1) {
        let (a, b) = (pts[i], pts[i + 1]);
        let (dx, dy) = (b.0 - a.0, b.1 - a.1);
        let l2 = dx * dx + dy * dy;
        if l2 == 0.0 {
            continue;
        }
        if let Some(h) = heading {
            let mut da = (h - dy.atan2(dx)).rem_euclid(std::f64::consts::PI);
            da = da.min(std::f64::consts::PI - da);
            if da > 35f64.to_radians() {
                continue;
            }
        }
        let t = (((p.0 - a.0) * dx + (p.1 - a.1) * dy) / l2).clamp(0.0, 1.0);
        let q = (a.0 + t * dx, a.1 + t * dy);
        let d = ((q.0 - p.0).powi(2) + (q.1 - p.1).powi(2)).sqrt();
        if d <= max_d && best.is_none_or(|bb| d < bb.0) {
            best = Some((d, cum[i] + t * (cum[i + 1] - cum[i]), q.0, q.1));
        }
    }
    best.map(|b| (b.1, b.2, b.3))
}

/// Spans for one path within its profile range [lo, hi], sorted and non-overlapping.
pub fn rail_spans(pts: &[(f64, f64)], cum: &[f64], lo: f64, hi: f64) -> Vec<Value> {
    let r1 = |v: f64| (v * 10.0).round() / 10.0;
    let mut spans: Vec<(f64, f64, Value)> = vec![];
    for f in RAIL_FIXES {
        let (a, b) = (project(f.from.0, f.from.1), project(f.to.0, f.to.1));
        let heading = (b.1 - a.1).atan2(b.0 - a.0);
        // An open-ended stretch's far point is only a direction hint, so don't filter on it.
        let Some((sa, _, _)) = locate(pts, cum, a, (!f.to_open).then_some(heading), 20.0) else { continue };
        let sb = if f.to_open {
            // Past the scene: whichever profile end lies toward `to`.
            let Some((sn, _, _)) = locate(pts, cum, b, None, f64::INFINITY) else { continue };
            if sn > sa { hi } else { lo }
        } else {
            let Some((sb, _, _)) = locate(pts, cum, b, Some(heading), 20.0) else { continue };
            // Same corridor, not a crossing line: path distance close to the straight distance.
            let straight = ((b.0 - a.0).powi(2) + (b.1 - a.1).powi(2)).sqrt();
            if (sb - sa).abs() < 0.7 * straight || (sb - sa).abs() > 1.6 * straight + 20.0 {
                continue;
            }
            sb
        };
        let (s0, s1) = (sa.min(sb).max(lo), sa.max(sb).min(hi));
        if s1 - s0 < 1.0 {
            continue;
        }
        let mut anchors: Vec<(f64, Value)> = f
            .anchors
            .iter()
            .filter_map(|a| {
                let (s, e, n) = locate(pts, cum, project(a.lon, a.lat), None, 25.0)?;
                let mut v = json!({"s": r1(s), "x": r1(e), "z": r1(-n), "at": a.at, "rel": a.rel});
                if let Some(h) = a.navd88 {
                    v["navd88"] = json!((h * 100.0).round() / 100.0);
                }
                Some((s, v))
            })
            .collect();
        anchors.sort_by(|x, y| x.0.total_cmp(&y.0));
        let mut span = json!({"s0": r1(s0), "s1": r1(s1), "cover": f.cover, "form": f.form, "base": f.base, "rel": f.rel, "height": f.height, "ev": f.ev});
        if f.base == "anchors" {
            span["anchors"] = Value::Array(anchors.into_iter().map(|a| a.1).collect());
        }
        spans.push((s0, s1, span));
    }
    spans.sort_by(|x, y| x.0.total_cmp(&y.0));
    // Adjacent observations share an edge; projection noise must not make them overlap.
    for i in 1..spans.len() {
        let prev_end = spans[i - 1].1;
        if spans[i].0 < prev_end {
            spans[i].0 = prev_end;
            spans[i].2["s0"] = json!(r1(prev_end));
        }
    }
    spans.into_iter().filter(|s| s.1 - s.0 >= 1.0).map(|s| s.2).collect()
}

pub fn rail_evidence() -> Value {
    let mut m = serde_json::Map::new();
    for e in RAIL_EVIDENCE {
        m.insert(e.id.into(), json!({"name": e.name, "checked": e.checked, "sources": e.sources, "precisionM": e.precision_m, "note": e.note}));
    }
    Value::Object(m)
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
    let mut rail_paths = serde_json::Map::new();
    let (mut total, mut matched, mut pinned) = (0usize, 0usize, 0usize);
    for p in routes["paths"].as_array().into_iter().flatten() {
        if !heavy.iter().any(|h| p["routeId"] == h.as_str()) {
            continue;
        }
        let coords: Vec<f64> = p["coords"].as_array().into_iter().flatten().filter_map(Value::as_f64).collect();
        let cum: Vec<f64> = p["cum"].as_array().into_iter().flatten().filter_map(Value::as_f64).collect();
        let pts: Vec<(f64, f64)> = coords.chunks(2).map(|c| project(c[0], c[1])).collect();
        let len = *cum.last().unwrap_or(&0.0);
        let (mut s0, mut z, mut pin) = (None::<f64>, Vec::new(), Vec::new());
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
                let bearing = (b.1 - a.1).atan2(b.0 - a.0);
                let h = match_height(&subway, q, bearing);
                if h.is_some() {
                    matched += 1;
                }
                s0.get_or_insert(s);
                z.push(h.unwrap_or(0.0));
                pin.push(open_cut_depth(q, bearing));
            } else if s0.is_some() {
                break; // left the scene (paths cross it once)
            }
            s += step;
        }
        if let Some(s0) = s0 {
            pinned += pin.iter().filter(|p| p.is_some()).count();
            clean_profile_pinned(&mut z, &pin, 15, 15);
            let spans = rail_spans(&pts, &cum, s0, s0 + step * (z.len().max(1) - 1) as f64);
            if !spans.is_empty() {
                rail_paths.insert(p["id"].as_str().unwrap_or("").to_string(), Value::Array(spans));
            }
            profiles.insert(
                p["id"].as_str().unwrap_or("").to_string(),
                json!({"s0": s0, "step": step, "z": z.iter().map(|v| (v * 10.0).round() / 10.0).collect::<Vec<_>>()}),
            );
        }
    }
    println!("  profiles: {} paths, {:.0}% of {} samples matched a subway segment", profiles.len(), 100.0 * matched as f64 / total.max(1) as f64, total);
    println!("  verified open cuts: {pinned} samples pinned");
    println!("  rail cover: {} paths with observed spans", rail_paths.len());

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
        "rail": {"version": 1, "datum": "track-bed", "paths": rail_paths, "evidence": rail_evidence()},
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
    fn verified_open_cut_survives_gap_fill_and_ramp() {
        // 30 samples: tunnel (-22), a 10-sample unflagged gap, tunnel (-10). Unpinned, the
        // gap is filled; pinned, it stays at the open-cut depth through the ramp.
        let mut z: Vec<f64> = (0..30).map(|i| if i < 10 { -22.0 } else if i < 20 { 0.0 } else { -10.0 }).collect();
        let pin: Vec<Option<f64>> = (0..30).map(|i| (10..20).contains(&i).then_some(-4.0)).collect();
        let mut plain = z.clone();
        clean_profile(&mut plain, 15, 15);
        assert!(plain[10..20].iter().all(|&v| v < -5.5), "{plain:?}");
        clean_profile_pinned(&mut z, &pin, 15, 15);
        assert!(z[10..20].iter().all(|&v| v == -4.0), "{z:?}");
        assert!(z[0] < -5.5 && z[29] < -5.5);
    }

    #[test]
    fn gulch_trench_matches_only_alongside_its_ways() {
        let along = |lon0: f64, lat0: f64, lon1: f64, lat1: f64, f: f64| {
            let (a, b) = (project(lon0, lat0), project(lon1, lat1));
            ((a.0 + f * (b.0 - a.0), a.1 + f * (b.1 - a.1)), (b.1 - a.1).atan2(b.0 - a.0))
        };
        // Middle of way 702258824, either direction of travel.
        let (mid, brg) = along(-84.3936248, 33.7551215, -84.3923693, 33.7543988, 0.5);
        assert_eq!(open_cut_depth(mid, brg), Some(-4.0));
        assert_eq!(open_cut_depth(mid, brg + std::f64::consts::PI), Some(-4.0));
        // A crossing line (Red/Gold runs roughly north-south) never matches.
        assert_eq!(open_cut_depth(mid, brg + std::f64::consts::FRAC_PI_2), None);
        // 60 m beyond the west end is the tunnel toward Dome/GWCC.
        let (west, brg) = along(-84.3923693, 33.7543988, -84.3936248, 33.7551215, 1.0 + 60.0 / 141.0);
        assert_eq!(open_cut_depth(west, brg), None);
        // Five Points station itself stays underground.
        assert_eq!(open_cut_depth(project(ORIGIN.0, ORIGIN.1), brg), None);
    }

    /// A synthetic path through every fixture edge, west to east, as (projected pts, cum).
    fn corridor(reverse: bool) -> (Vec<(f64, f64)>, Vec<f64>) {
        let mut ll: Vec<(f64, f64)> = vec![(-84.3960, 33.7563)];
        for f in RAIL_FIXES {
            ll.push(f.from);
            if !f.to_open {
                ll.push(f.to);
            }
        }
        ll.push((-84.38270, 33.74882));
        ll.push((-84.3780, 33.7492));
        // On to King Memorial and the crossover, through the measured anchors.
        ll.push((-84.376685, 33.749636));
        ll.push((-84.374605, 33.750282));
        ll.push((-84.371, 33.75142));
        ll.dedup();
        if reverse {
            ll.reverse();
        }
        let pts: Vec<(f64, f64)> = ll.iter().map(|&(lon, lat)| project(lon, lat)).collect();
        let mut cum = vec![0.0];
        for w in pts.windows(2) {
            cum.push(cum.last().unwrap() + ((w[1].0 - w[0].0).powi(2) + (w[1].1 - w[0].1).powi(2)).sqrt());
        }
        (pts, cum)
    }

    #[test]
    fn rail_spans_mirror_by_direction_and_share_the_gsu_anchor_chain() {
        let summary = |rev: bool| {
            let (pts, cum) = corridor(rev);
            let hi = *cum.last().unwrap();
            let spans = rail_spans(&pts, &cum, 0.0, hi);
            for w in spans.windows(2) {
                assert!(w[1]["s0"].as_f64() >= w[0]["s1"].as_f64(), "overlap {w:?}");
            }
            spans.iter().map(|s| (s["ev"].as_str().unwrap().to_string(), (s["s1"].as_f64().unwrap() - s["s0"].as_f64().unwrap()).round())).collect::<Vec<_>>()
        };
        let (east, mut west) = (summary(false), summary(true));
        assert_eq!(east.len(), RAIL_FIXES.len(), "{east:?}");
        west.reverse();
        for (e, w) in east.iter().zip(&west) {
            assert_eq!(e.0, w.0);
            if e.0 != "connector-viaduct" {
                assert!((e.1 - w.1).abs() <= 1.0, "{e:?} vs {w:?}"); // the open end runs to each path's own end
            }
        }
        // Station roof, building and viaduct hang from the same three anchors.
        let (pts, cum) = corridor(false);
        let spans = rail_spans(&pts, &cum, 0.0, *cum.last().unwrap());
        let chain = |ev: &str| spans.iter().find(|s| s["ev"] == ev).unwrap()["anchors"].clone();
        let anchors = chain("gsu-canopy");
        let anchors = anchors.as_array().unwrap();
        assert_eq!(anchors.len(), GSU_CHAIN.len());
        // Two schematic anchors at Georgia State, then measured absolute beds east of the Floyd face.
        assert!(anchors[..2].iter().all(|a| a.get("navd88").is_none()));
        assert!(anchors[2..].iter().all(|a| a["navd88"].as_f64().unwrap() > 300.0));
        assert!(anchors.windows(2).all(|w| w[0]["s"].as_f64() < w[1]["s"].as_f64()));
        assert_eq!(spans.iter().find(|s| s["ev"] == "connector-viaduct").unwrap()["height"], "measured");
        assert_eq!(spans.iter().find(|s| s["ev"] == "gsu-floyd").unwrap()["height"], "schematic");
        assert_eq!(chain("gsu-canopy"), chain("gsu-floyd"));
        assert_eq!(chain("gsu-floyd"), chain("connector-viaduct"));
    }

    #[test]
    fn rail_spans_skip_a_crossing_line() {
        // North-south through Five Points (Red/Gold's corridor): no east-west observation applies.
        let ll = [(-84.3916, 33.7480), (-84.3916, 33.7600)];
        let pts: Vec<(f64, f64)> = ll.iter().map(|&(lon, lat)| project(lon, lat)).collect();
        let len = ((pts[1].0 - pts[0].0).powi(2) + (pts[1].1 - pts[0].1).powi(2)).sqrt();
        assert!(rail_spans(&pts, &[0.0, len], 0.0, len).is_empty());
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
