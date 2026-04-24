// Geographic + demographic data for each trend.
// Adds origin city, realistic spread path, and per-region demographic breakdowns
// across 9 axes (age / income / urbanicity / political / race / education / platform / govt / climate).

// Lightweight world regions as [lng, lat] markers with radii for impact.
// Not countries — "zones" that read on an orthographic globe.
const ZONES = {
  // North America
  staten_island: { name: 'Staten Island, NYC',      lng: -74.15, lat: 40.58, region: 'North America' },
  nyc:           { name: 'New York City',           lng: -74.00, lat: 40.72, region: 'North America' },
  la:            { name: 'Los Angeles',             lng: -118.24, lat: 34.05, region: 'North America' },
  miami:         { name: 'Miami',                   lng: -80.19, lat: 25.76, region: 'North America' },
  austin:        { name: 'Austin',                  lng: -97.74, lat: 30.27, region: 'North America' },
  chicago:       { name: 'Chicago',                 lng: -87.63, lat: 41.88, region: 'North America' },
  rural_us:      { name: 'Rural US (Plains/South)', lng: -95.0,  lat: 39.0,  region: 'North America' },
  toronto:       { name: 'Toronto',                 lng: -79.38, lat: 43.65, region: 'North America' },

  // Europe
  london:        { name: 'London',                  lng: -0.12,  lat: 51.50, region: 'Europe' },
  paris:         { name: 'Paris',                   lng: 2.35,   lat: 48.86, region: 'Europe' },
  berlin:        { name: 'Berlin',                  lng: 13.40,  lat: 52.52, region: 'Europe' },
  milan:         { name: 'Milan',                   lng: 9.19,   lat: 45.46, region: 'Europe' },
  copenhagen:    { name: 'Copenhagen',              lng: 12.57,  lat: 55.67, region: 'Europe' },
  warsaw:        { name: 'Warsaw',                  lng: 21.01,  lat: 52.23, region: 'Europe' },

  // Asia
  seoul:         { name: 'Seoul',                   lng: 126.97, lat: 37.56, region: 'East Asia' },
  tokyo:         { name: 'Tokyo',                   lng: 139.69, lat: 35.68, region: 'East Asia' },
  shanghai:      { name: 'Shanghai',                lng: 121.47, lat: 31.23, region: 'East Asia' },
  mumbai:        { name: 'Mumbai',                  lng: 72.87,  lat: 19.07, region: 'South Asia' },
  jakarta:       { name: 'Jakarta',                 lng: 106.82, lat: -6.20, region: 'SE Asia' },
  manila:        { name: 'Manila',                  lng: 120.98, lat: 14.59, region: 'SE Asia' },

  // Latin America
  saopaulo:      { name: 'São Paulo',               lng: -46.63, lat: -23.55, region: 'Latin America' },
  mexico:        { name: 'Mexico City',             lng: -99.13, lat: 19.43, region: 'Latin America' },
  bogota:        { name: 'Bogotá',                  lng: -74.07, lat: 4.71,  region: 'Latin America' },

  // Africa + Middle East
  lagos:         { name: 'Lagos',                   lng: 3.37,   lat: 6.45,  region: 'Africa' },
  nairobi:       { name: 'Nairobi',                 lng: 36.82,  lat: -1.29, region: 'Africa' },
  capetown:      { name: 'Cape Town',               lng: 18.42,  lat: -33.92, region: 'Africa' },
  dubai:         { name: 'Dubai',                   lng: 55.27,  lat: 25.20, region: 'Middle East' },
  istanbul:      { name: 'Istanbul',                lng: 28.98,  lat: 41.01, region: 'Middle East' },

  // Oceania
  sydney:        { name: 'Sydney',                  lng: 151.21, lat: -33.87, region: 'Oceania' },
};

// Helper to quickly build demographic rows. Percents of that region's carriers.
// For each node-stage, we give the carrier fraction (0..1) — what % of this zone holds the signal at that stage.
const D = (...vals) => vals; // just for readability

// Demographic slices per zone for a given trend — hand-authored per trend,
// but we abstract a shared shape here.
// shape: { age:{gz,ml,gx,bb}, income:{lo,mid,hi}, urban:{urb,sub,rur},
//          politics:{left,cen,right}, race:{w,b,a,h,o}, edu:{col,nonc},
//          platform:{tiktok,ig,x,substack,tv}, govt:{dem,mixed,auth},
//          climate:{temp,sub,trop,arid} }

// Rather than author all 9 × 30 zones × 4 trends, we'll define a
// "demographic profile" PER TREND (what kind of person it appeals to),
// and compute each zone's drill-down by modulating that profile
// with the zone's own baseline demographics. This is how the
// drill-down panel stays expressive without hand-typing 2000 values.

const TREND_GEO = {
  'mob-wife': {
    origin: 'staten_island',
    spread: [
      { zone: 'staten_island', t: 0.00, intensity: 1.0 },
      { zone: 'nyc',           t: 0.10, intensity: 0.9 },
      { zone: 'la',            t: 0.22, intensity: 0.7 },
      { zone: 'miami',         t: 0.28, intensity: 0.8 },
      { zone: 'chicago',       t: 0.32, intensity: 0.5 },
      { zone: 'toronto',       t: 0.38, intensity: 0.6 },
      { zone: 'london',        t: 0.42, intensity: 0.75 },
      { zone: 'milan',         t: 0.45, intensity: 0.85 },
      { zone: 'paris',         t: 0.50, intensity: 0.55 },
      { zone: 'seoul',         t: 0.60, intensity: 0.5 },
      { zone: 'tokyo',         t: 0.65, intensity: 0.4 },
      { zone: 'saopaulo',      t: 0.70, intensity: 0.45 },
      { zone: 'sydney',        t: 0.72, intensity: 0.5 },
      { zone: 'mexico',        t: 0.78, intensity: 0.4 },
      { zone: 'dubai',         t: 0.82, intensity: 0.6 },
      { zone: 'jakarta',       t: 0.88, intensity: 0.25 },
    ],
    // Profile (who this trend appeals to) — weights 0..1
    profile: {
      age:      { gz: 0.85, ml: 0.70, gx: 0.35, bb: 0.10 },
      income:   { lo: 0.55, mid: 0.80, hi: 0.40 },
      urban:    { urb: 0.85, sub: 0.50, rur: 0.20 },
      politics: { left: 0.55, cen: 0.60, right: 0.40 },
      race:     { w: 0.60, b: 0.45, a: 0.50, h: 0.75, o: 0.55 },
      edu:      { col: 0.65, nonc: 0.65 },
      platform: { tiktok: 0.95, ig: 0.85, x: 0.40, substack: 0.25, tv: 0.30 },
      govt:     { dem: 0.75, mixed: 0.40, auth: 0.20 },
      climate:  { temp: 0.70, sub: 0.65, trop: 0.55, arid: 0.40 },
    },
  },

  'skinny-jeans': {
    origin: 'paris',
    spread: [
      { zone: 'paris',         t: 0.00, intensity: 1.0 },
      { zone: 'milan',         t: 0.06, intensity: 0.85 },
      { zone: 'london',        t: 0.10, intensity: 0.95 },
      { zone: 'berlin',        t: 0.14, intensity: 0.70 },
      { zone: 'nyc',           t: 0.18, intensity: 0.90 },
      { zone: 'la',            t: 0.22, intensity: 0.85 },
      { zone: 'tokyo',         t: 0.26, intensity: 0.80 },
      { zone: 'seoul',         t: 0.30, intensity: 0.85 },
      { zone: 'toronto',       t: 0.34, intensity: 0.70 },
      { zone: 'sydney',        t: 0.38, intensity: 0.75 },
      { zone: 'chicago',       t: 0.42, intensity: 0.65 },
      { zone: 'saopaulo',      t: 0.50, intensity: 0.70 },
      { zone: 'mexico',        t: 0.55, intensity: 0.60 },
      { zone: 'jakarta',       t: 0.60, intensity: 0.55 },
      { zone: 'manila',        t: 0.62, intensity: 0.55 },
      { zone: 'mumbai',        t: 0.65, intensity: 0.50 },
      { zone: 'shanghai',      t: 0.68, intensity: 0.70 },
      { zone: 'istanbul',      t: 0.72, intensity: 0.60 },
      { zone: 'rural_us',      t: 0.78, intensity: 0.65 },
      { zone: 'warsaw',        t: 0.82, intensity: 0.55 },
      { zone: 'lagos',         t: 0.85, intensity: 0.35 },
      { zone: 'nairobi',       t: 0.90, intensity: 0.30 },
    ],
    profile: {
      age:      { gz: 0.35, ml: 0.95, gx: 0.60, bb: 0.25 },
      income:   { lo: 0.60, mid: 0.85, hi: 0.75 },
      urban:    { urb: 0.90, sub: 0.80, rur: 0.55 },
      politics: { left: 0.70, cen: 0.75, right: 0.60 },
      race:     { w: 0.80, b: 0.55, a: 0.70, h: 0.65, o: 0.60 },
      edu:      { col: 0.80, nonc: 0.60 },
      platform: { tiktok: 0.15, ig: 0.55, x: 0.30, substack: 0.10, tv: 0.80 },
      govt:     { dem: 0.85, mixed: 0.60, auth: 0.35 },
      climate:  { temp: 0.85, sub: 0.70, trop: 0.45, arid: 0.55 },
    },
  },

  'raw-milk': {
    origin: 'austin',
    spread: [
      { zone: 'austin',        t: 0.00, intensity: 1.0 },
      { zone: 'rural_us',      t: 0.08, intensity: 0.95 },
      { zone: 'nyc',           t: 0.25, intensity: 0.40 },
      { zone: 'la',            t: 0.28, intensity: 0.55 },
      { zone: 'chicago',       t: 0.32, intensity: 0.35 },
      { zone: 'london',        t: 0.45, intensity: 0.30 },
      { zone: 'sydney',        t: 0.50, intensity: 0.45 },
      { zone: 'toronto',       t: 0.55, intensity: 0.35 },
      { zone: 'berlin',        t: 0.65, intensity: 0.25 },
      { zone: 'warsaw',        t: 0.72, intensity: 0.30 },
      { zone: 'istanbul',      t: 0.80, intensity: 0.25 },
    ],
    profile: {
      age:      { gz: 0.35, ml: 0.70, gx: 0.65, bb: 0.40 },
      income:   { lo: 0.40, mid: 0.60, hi: 0.75 },
      urban:    { urb: 0.35, sub: 0.65, rur: 0.90 },
      politics: { left: 0.25, cen: 0.45, right: 0.85 },
      race:     { w: 0.85, b: 0.20, a: 0.25, h: 0.35, o: 0.30 },
      edu:      { col: 0.55, nonc: 0.65 },
      platform: { tiktok: 0.55, ig: 0.50, x: 0.80, substack: 0.70, tv: 0.35 },
      govt:     { dem: 0.80, mixed: 0.45, auth: 0.20 },
      climate:  { temp: 0.75, sub: 0.65, trop: 0.25, arid: 0.60 },
    },
  },

  'cringe-weapon': {
    origin: 'nyc',
    spread: [
      { zone: 'nyc',           t: 0.00, intensity: 1.0 },
      { zone: 'la',            t: 0.06, intensity: 0.95 },
      { zone: 'london',        t: 0.12, intensity: 0.90 },
      { zone: 'toronto',       t: 0.18, intensity: 0.80 },
      { zone: 'austin',        t: 0.22, intensity: 0.75 },
      { zone: 'berlin',        t: 0.28, intensity: 0.70 },
      { zone: 'sydney',        t: 0.32, intensity: 0.75 },
      { zone: 'paris',         t: 0.38, intensity: 0.65 },
      { zone: 'tokyo',         t: 0.44, intensity: 0.80 },
      { zone: 'seoul',         t: 0.48, intensity: 0.85 },
      { zone: 'saopaulo',      t: 0.55, intensity: 0.70 },
      { zone: 'manila',        t: 0.60, intensity: 0.75 },
      { zone: 'jakarta',       t: 0.65, intensity: 0.70 },
      { zone: 'mumbai',        t: 0.70, intensity: 0.65 },
      { zone: 'mexico',        t: 0.74, intensity: 0.65 },
      { zone: 'bogota',        t: 0.78, intensity: 0.55 },
      { zone: 'lagos',         t: 0.82, intensity: 0.55 },
      { zone: 'nairobi',       t: 0.85, intensity: 0.50 },
      { zone: 'shanghai',      t: 0.88, intensity: 0.55 },
      { zone: 'dubai',         t: 0.92, intensity: 0.50 },
      { zone: 'istanbul',      t: 0.95, intensity: 0.50 },
    ],
    profile: {
      age:      { gz: 0.95, ml: 0.60, gx: 0.25, bb: 0.10 },
      income:   { lo: 0.75, mid: 0.80, hi: 0.55 },
      urban:    { urb: 0.85, sub: 0.75, rur: 0.50 },
      politics: { left: 0.75, cen: 0.75, right: 0.70 },
      race:     { w: 0.70, b: 0.75, a: 0.80, h: 0.75, o: 0.70 },
      edu:      { col: 0.75, nonc: 0.70 },
      platform: { tiktok: 0.95, ig: 0.80, x: 0.75, substack: 0.45, tv: 0.20 },
      govt:     { dem: 0.85, mixed: 0.70, auth: 0.45 },
      climate:  { temp: 0.75, sub: 0.75, trop: 0.65, arid: 0.55 },
    },
  },
};

// Given a trend + time `t` (0..1), compute each zone's adoption.
// Adoption grows sigmoidally after the zone's arrival time.
function zoneAdoption(trendId, t) {
  const g = TREND_GEO[trendId];
  if (!g) return [];
  return g.spread.map(s => {
    const z = ZONES[s.zone];
    const dt = t - s.t;
    let adopt = 0;
    if (dt >= 0) {
      // sigmoid ramp, saturating at intensity
      adopt = s.intensity * (1 / (1 + Math.exp(-dt * 18)));
      // decay after mainstream (t > 0.75)
      if (t > 0.75) adopt *= Math.max(0.35, 1 - (t - 0.75) * 1.2);
    }
    return { ...s, zone: s.zone, ...z, adopt };
  });
}

// For a given zone + trend + time, compute a full demographic breakdown.
// We simply scale the trend's profile by the zone's current adoption
// level, with small perturbations based on the zone's baseline.
// Each breakdown axis returns {key: percent 0..100}
function zoneDemographics(trendId, zoneId, t) {
  const g = TREND_GEO[trendId];
  const adopt = (zoneAdoption(trendId, t).find(z => z.zone === zoneId)?.adopt) ?? 0;
  const p = g.profile;
  // Small zone-baseline perturbation (pseudo-random but stable per zone+axis)
  const h = (s) => {
    let x = 0;
    for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return (x % 1000) / 1000;
  };
  const jitter = (key) => 0.7 + 0.6 * h(zoneId + key); // 0.7..1.3

  const axis = (obj, axisLabel) => {
    const out = {};
    Object.keys(obj).forEach(k => {
      const j = jitter(axisLabel + k);
      out[k] = Math.min(0.98, obj[k] * adopt * j);
    });
    return out;
  };

  return {
    adopt,
    age:      axis(p.age,      'age'),
    income:   axis(p.income,   'income'),
    urban:    axis(p.urban,    'urban'),
    politics: axis(p.politics, 'politics'),
    race:     axis(p.race,     'race'),
    edu:      axis(p.edu,      'edu'),
    platform: axis(p.platform, 'platform'),
    govt:     axis(p.govt,     'govt'),
    climate:  axis(p.climate,  'climate'),
  };
}

Object.assign(window, { ZONES, TREND_GEO, zoneAdoption, zoneDemographics });
