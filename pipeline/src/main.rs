//! railprep: fetch raw rail data for a region and emit compact static files for the web map.
//!
//!   cargo run --release -- fetch [--force]   download inputs into data/raw/
//!   cargo run --release -- build             write web/public/data/ga/*
//!   cargo run --release -- all               both
//!   cargo run --release -- scene             downtown 3D scene (needs pipeline/scripts/extract_overture.py first)

mod freight;
mod geo;
mod gtfs;
mod scene;

use anyhow::{Context, Result};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

const MARTA_GTFS: &str = "https://itsmarta.com/google_transit_feed/google_transit.zip";
const AMTRAK_GTFS: &str = "https://content.amtrak.com/content/gtfs/GTFS.zip";
const FRA_CROSSINGS: &str = "https://data.transportation.gov/resource/m2f8-22s6.json";
const NARN_LINES: &str = "https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_North_American_Rail_Network_Lines/FeatureServer/0/query";
const FRA_FIELDS: &str = "crossingid,railroadcode,railroadname,street,cityname,crossingposition,crossingclosed,crossingtype,totaldaylightthrutrains,totalnighttimethrutrains,numberpassengertrainperday,maximumtimetablespeed,latitude,longitude";
const NARN_FIELDS: &str = "FRAARCID,FRFRANODE,TOFRANODE,RROWNER1,TRKRGHTS1,TRKRGHTS2,TRKRGHTS3,TRKRGHTS4,TRKRGHTS5,TRKRGHTS6,TRKRGHTS7,TRKRGHTS8,TRKRGHTS9,SUBDIV,TRACKS,PASSNGR,NET";
const GA_BBOX: [f64; 4] = [-85.61, 30.36, -80.84, 35.0];

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf()
}

fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(600))
        .user_agent("railprep/0.1 (open-data rail map)")
        .build()
}

fn download(url: &str, query: &[(&str, &str)], dest: &Path, force: bool) -> Result<()> {
    if dest.exists() && !force {
        println!("  cached  {}", dest.file_name().unwrap().to_string_lossy());
        return Ok(());
    }
    let mut req = agent().get(url);
    for (k, v) in query {
        req = req.query(k, v);
    }
    let resp = req.call().with_context(|| format!("GET {url}"))?;
    let tmp = dest.with_extension("part");
    let mut f = std::fs::File::create(&tmp)?;
    std::io::copy(&mut resp.into_reader(), &mut f)?;
    std::fs::rename(&tmp, dest)?;
    println!("  fetched {} ({} KB)", dest.file_name().unwrap().to_string_lossy(), std::fs::metadata(dest)?.len() / 1024);
    Ok(())
}

fn fetch(force: bool) -> Result<()> {
    let raw = root().join("data/raw");
    std::fs::create_dir_all(&raw)?;
    println!("fetch:");
    download(MARTA_GTFS, &[], &raw.join("marta_gtfs.zip"), force)?;
    download(AMTRAK_GTFS, &[], &raw.join("amtrak_gtfs.zip"), force)?;
    download(
        FRA_CROSSINGS,
        &[("statename", "GEORGIA"), ("$limit", "50000"), ("$select", FRA_FIELDS)],
        &raw.join("fra_crossings_ga.json"),
        force,
    )?;
    let mut offset = 0;
    loop {
        let dest = raw.join(format!("narn_ga_{offset}.geojson"));
        let off = offset.to_string();
        download(
            NARN_LINES,
            &[
                ("where", "STATEAB='GA'"),
                ("outFields", NARN_FIELDS),
                ("outSR", "4326"),
                ("f", "geojson"),
                ("orderByFields", "OBJECTID"),
                ("resultOffset", &off),
                ("resultRecordCount", "2000"),
            ],
            &dest,
            force,
        )?;
        let page: Value = serde_json::from_str(&std::fs::read_to_string(&dest)?)?;
        let n = page["features"].as_array().map(|a| a.len()).unwrap_or(0);
        if n < 2000 {
            break;
        }
        offset += 2000;
    }
    Ok(())
}

fn marta_keep(_rid: &str, short: &str, _long: &str, ty: &str) -> Option<(String, &'static str, &'static str)> {
    match (ty, short) {
        ("1", s) => Some((s.to_uppercase(), "heavy_rail", "marta:vt:heavy-rail")),
        ("0", "ATLSC") => Some(("STREETCAR".into(), "streetcar", "marta:vt:streetcar")),
        _ => None,
    }
}

fn amtrak_keep(_rid: &str, _short: &str, long: &str, _ty: &str) -> Option<(String, &'static str, &'static str)> {
    (long == "Crescent").then(|| ("Crescent".to_string(), "intercity", "amtrak:vt:long-distance"))
}

fn write_json(dir: &Path, name: &str, v: &impl serde::Serialize) -> Result<()> {
    let p = dir.join(name);
    std::fs::write(&p, serde_json::to_vec(v)?)?;
    println!("  wrote {name:<20} {:>6} KB", std::fs::metadata(&p)?.len() / 1024);
    Ok(())
}

fn build() -> Result<()> {
    let raw = root().join("data/raw");
    let out = root().join("web/public/data/ga");
    std::fs::create_dir_all(&out)?;
    let today = today();
    println!("build:");

    let marta = gtfs::load(
        &raw.join("marta_gtfs.zip"),
        &gtfs::FeedSpec { feed: "marta", source: "marta-gtfs", operator: "MARTA", keep: marta_keep },
    )?;
    // Bus GPS points need a route label, independently of the rail timetable.
    let mut bus_routes = std::collections::BTreeMap::new();
    gtfs::Archive::open(&raw.join("marta_gtfs.zip"))?.each("routes.txt", |r| {
        if r.get("route_type") == "3" {
            bus_routes.insert(r.get("route_id").to_owned(), r.get("route_short_name").to_owned());
        }
    })?;
    write_json(&out, "bus-routes.json", &bus_routes)?;
    let amtrak = gtfs::load(
        &raw.join("amtrak_gtfs.zip"),
        &gtfs::FeedSpec { feed: "amtrak", source: "amtrak-gtfs", operator: "Amtrak", keep: amtrak_keep },
    )?;
    for (name, f) in [("marta", &marta), ("amtrak", &amtrak)] {
        println!(
            "  {name}: {} routes, {} stops, {} paths, {} patterns, {} trips, {} services",
            f.routes.len(),
            f.stops.len(),
            f.paths.len(),
            f.timetable.patterns.len(),
            f.timetable.trips.len(),
            f.timetable.services.len()
        );
    }

    let routes_file = json!({
        "routes": marta.routes.iter().chain(&amtrak.routes).collect::<Vec<_>>(),
        "stops": marta.stops.iter().chain(&amtrak.stops).collect::<Vec<_>>(),
        "paths": marta.paths.iter().chain(&amtrak.paths).collect::<Vec<_>>(),
    });
    write_json(&out, "routes.json", &routes_file)?;
    write_json(
        &out,
        "timetable.json",
        &json!({
            "sourceAsOf": {"marta-gtfs": marta.feed_version, "amtrak-gtfs": amtrak.feed_version},
            "timetables": [marta.timetable, amtrak.timetable],
        }),
    )?;

    // Freight
    let mut pages = Vec::new();
    for e in std::fs::read_dir(&raw)? {
        let p = e?.path();
        if p.file_name().unwrap().to_string_lossy().starts_with("narn_ga_") {
            pages.push(serde_json::from_str::<Value>(&std::fs::read_to_string(&p)?)?);
        }
    }
    let arcs = freight::parse_arcs(&pages);
    let fra: Value = serde_json::from_str(&std::fs::read_to_string(raw.join("fra_crossings_ga.json"))?)?;
    let xs = freight::parse_crossings(&fra);
    let att = freight::attach(&arcs, &xs);
    let tpd = freight::traffic(&arcs, &xs, &att, 6);
    println!("  {}", freight::summary(&arcs, &xs, &att, &tpd)?);
    write_json(&out, "freight.geojson", &freight::to_geojson(&arcs, &tpd))?;
    write_json(&out, "crossings.geojson", &freight::crossings_geojson(&arcs, &xs, &att))?;

    write_json(
        &out,
        "vehicle-types.json",
        &json!([
            {"id": "marta:vt:heavy-rail", "name": "Heavy-rail car (MARTA-style)", "lengthM": 22.9, "typicalUnits": 6, "art": "heavy-rail-silver"},
            {"id": "marta:vt:streetcar", "name": "Modern streetcar", "lengthM": 24.4, "typicalUnits": 1, "art": "streetcar-modern"},
            {"id": "amtrak:vt:long-distance", "name": "Long-distance passenger train", "lengthM": 26.0, "typicalUnits": 9, "art": "intercity-long-distance"},
            {"id": "generic:vt:freight-loco", "name": "Freight locomotive", "lengthM": 22.3, "typicalUnits": 1, "art": "freight-loco", "canCarry": "Pulls the train; typically 2–4 per heavy freight."}
        ]),
    )?;

    write_json(
        &out,
        "meta.json",
        &json!({
            "region": "Georgia",
            "generated": today,
            "bbox": GA_BBOX,
            "timezone": "America/New_York",
            "sources": [
                {"id": "marta-gtfs", "name": "MARTA GTFS schedule", "url": MARTA_GTFS, "license": "MARTA developer terms; unofficial use, no MARTA marks", "retrieved": marta.feed_version},
                {"id": "marta-bus-rt", "name": "MARTA bus vehicle positions", "url": "https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/vehicle/vehiclepositions.pb", "license": "MARTA developer terms; unofficial use, no MARTA marks", "retrieved": today},
                {"id": "amtrak-gtfs", "name": "Amtrak GTFS schedule", "url": AMTRAK_GTFS, "license": "No stated license (contact DL_DTGTFSsupport@Amtrak.com before public launch)", "retrieved": amtrak.feed_version},
                {"id": "fra-crossings", "name": "FRA Highway-Rail Crossing Inventory (Form 71)", "url": "https://data.transportation.gov/d/m2f8-22s6", "license": "US public domain", "retrieved": today},
                {"id": "narn-lines", "name": "North American Rail Network Lines (BTS/FRA)", "url": "https://geodata.bts.gov/datasets/usdot::north-american-rail-network-lines", "license": "US public domain", "retrieved": today},
                {"id": "openfreemap", "name": "OpenFreeMap basemap", "url": "https://openfreemap.org", "license": "© OpenMapTiles © OpenStreetMap contributors", "retrieved": today}
            ]
        }),
    )?;
    Ok(())
}

/// YYYY-MM-DD from the system clock (UTC) without pulling in a date crate.
fn today() -> String {
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;
    let z = secs / 86400 + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}")
}

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let force = args.iter().any(|a| a == "--force");
    match args.get(1).map(String::as_str) {
        Some("fetch") => fetch(force),
        Some("build") => build(),
        Some("scene") => scene::build(&root()),
        Some("all") | None => {
            fetch(force)?;
            build()
        }
        Some(other) => anyhow::bail!("unknown command {other}; use fetch | build | scene | all"),
    }
}
