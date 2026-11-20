//! Small geometry helpers. Equirectangular approximations are plenty accurate at
//! the scale of a rail segment, and avoid a heavy dependency.

const R: f64 = 6_371_008.8;

pub fn haversine(a: (f64, f64), b: (f64, f64)) -> f64 {
    let (lon1, lat1) = (a.0.to_radians(), a.1.to_radians());
    let (lon2, lat2) = (b.0.to_radians(), b.1.to_radians());
    let dlat = lat2 - lat1;
    let dlon = lon2 - lon1;
    let h = (dlat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (dlon / 2.0).sin().powi(2);
    2.0 * R * h.sqrt().asin()
}

/// Cumulative metres at each vertex.
pub fn cumulative(coords: &[(f64, f64)]) -> Vec<f64> {
    let mut out = Vec::with_capacity(coords.len());
    let mut acc = 0.0;
    for (i, c) in coords.iter().enumerate() {
        if i > 0 {
            acc += haversine(coords[i - 1], *c);
        }
        out.push(acc);
    }
    out
}

/// Project point p onto segment a-b in a local metric frame.
/// Returns (distance from p in metres, fraction t along segment).
pub fn project(p: (f64, f64), a: (f64, f64), b: (f64, f64)) -> (f64, f64) {
    let k = p.1.to_radians().cos();
    let (ax, ay) = ((a.0 - p.0) * k, a.1 - p.1);
    let (bx, by) = ((b.0 - p.0) * k, b.1 - p.1);
    let (dx, dy) = (bx - ax, by - ay);
    let len2 = dx * dx + dy * dy;
    let t = if len2 == 0.0 { 0.0 } else { (-(ax * dx + ay * dy) / len2).clamp(0.0, 1.0) };
    let (qx, qy) = (ax + t * dx, ay + t * dy);
    let deg = (qx * qx + qy * qy).sqrt();
    (deg * 111_195.0, t)
}

/// Locate a point on a polyline, searching only vertices at or after `from_seg`
/// so that successive stops stay in order. Returns (metres along path, segment index).
pub fn locate(p: (f64, f64), coords: &[(f64, f64)], cum: &[f64], from_seg: usize) -> (f64, usize) {
    let mut best = (f64::INFINITY, 0.0, from_seg);
    for i in from_seg..coords.len().saturating_sub(1) {
        let (d, t) = project(p, coords[i], coords[i + 1]);
        if d < best.0 {
            best = (d, cum[i] + t * (cum[i + 1] - cum[i]), i);
        }
    }
    if best.0.is_infinite() {
        return (*cum.last().unwrap_or(&0.0), from_seg);
    }
    (best.1, best.2)
}

/// Drop vertices closer than `min_m` to the previous kept vertex (keeps endpoints).
pub fn thin(coords: &[(f64, f64)], min_m: f64) -> Vec<(f64, f64)> {
    if coords.len() <= 2 {
        return coords.to_vec();
    }
    let mut out = vec![coords[0]];
    for c in &coords[1..coords.len() - 1] {
        if haversine(*out.last().unwrap(), *c) >= min_m {
            out.push(*c);
        }
    }
    out.push(*coords.last().unwrap());
    out
}

pub fn round5(x: f64) -> f64 {
    (x * 1e5).round() / 1e5
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cumulative_distance_is_monotonic_and_plausible() {
        // ~1.11 km per 0.01 deg latitude
        let c = vec![(-84.0, 33.0), (-84.0, 33.01), (-84.0, 33.02)];
        let cum = cumulative(&c);
        assert_eq!(cum[0], 0.0);
        assert!((cum[1] - 1112.0).abs() < 5.0, "{}", cum[1]);
        assert!((cum[2] - 2224.0).abs() < 10.0);
    }

    #[test]
    fn locate_respects_order() {
        let c = vec![(-84.0, 33.0), (-84.0, 33.01), (-84.0, 33.02)];
        let cum = cumulative(&c);
        let (s, seg) = locate((-84.0001, 33.015), &c, &cum, 0);
        assert_eq!(seg, 1);
        assert!((s - 1668.0).abs() < 10.0, "{s}");
    }
}
