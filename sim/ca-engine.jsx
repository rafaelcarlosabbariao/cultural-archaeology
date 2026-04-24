// Flow-field cellular automaton.
// Cells arranged in a "social proximity" 2D field. Each cell has:
//   - position (x,y) — social neighborhood
//   - state: 0 (untouched), 1 (carrier), 2 (mutated/parody), 3 (counter-species), 4 (immune)
//   - infection: 0..1 — "ink saturation"
//   - susceptibility: 0..1 — baseline adoption threshold modifier
//
// Rules per tick (pure):
//   - Each cell samples 6 nearest neighbors
//   - If neighborhood-carrier-fraction > threshold, flip to carrier (infection += rate)
//   - Platform boost: a few "hub" cells broadcast globally (low prob)
//   - Counter: species mode spawns from edges; mutation mode emerges from high-saturation regions
//   - Stage gates: the rules ramp as simulation progresses (seed → mainstream → parody)

const GRID_W = 54;
const GRID_H = 32;

function buildField(seedRng = mulberry32(42)) {
  // Make a clustered social field — blobs of tight neighborhoods with bridge paths
  const cells = [];
  const clusters = [
    { cx: 0.18, cy: 0.28, r: 0.22, weight: 1.0 }, // subculture core
    { cx: 0.42, cy: 0.55, r: 0.28, weight: 0.9 }, // crossover bridge
    { cx: 0.72, cy: 0.38, r: 0.30, weight: 1.1 }, // mainstream mass
    { cx: 0.86, cy: 0.72, r: 0.18, weight: 0.7 }, // parody pocket
    { cx: 0.12, cy: 0.78, r: 0.16, weight: 0.6 }, // residual/revival
  ];
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const u = gx / (GRID_W - 1);
      const v = gy / (GRID_H - 1);
      // perturb on a jittered lattice for organic feel
      const jx = (seedRng() - 0.5) * 0.6 / GRID_W;
      const jy = (seedRng() - 0.5) * 0.6 / GRID_H;
      const x = u + jx;
      const y = v + jy;
      // density: sum of gaussians
      let density = 0;
      for (const c of clusters) {
        const d = Math.hypot(x - c.cx, y - c.cy);
        density += c.weight * Math.exp(-(d * d) / (c.r * c.r));
      }
      // skip low-density cells for sparse feel
      if (density < 0.15 && seedRng() > 0.45) continue;
      cells.push({
        id: cells.length,
        gx, gy, x, y,
        density,
        susceptibility: Math.min(1, 0.3 + density * 0.6 + seedRng() * 0.2),
        state: 0,        // untouched
        infection: 0,
        prevInfection: 0,
        isHub: false,
        isSeed: false,
        isBridge: false,
      });
    }
  }
  // Assign seed cells in the deep subculture pocket (cluster 0)
  const byDistTo = (cx, cy) => (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy);
  cells.slice().sort(byDistTo(0.18, 0.28)).slice(0, 3).forEach(c => c.isSeed = true);
  // Platform hubs scattered through mainstream
  cells.slice().sort(byDistTo(0.72, 0.38)).slice(0, 6).forEach(c => c.isHub = true);
  // Bridge nodes around crossover cluster
  cells.slice().sort(byDistTo(0.42, 0.55)).slice(0, 8).forEach(c => c.isBridge = true);

  // Precompute k-nearest neighbors (k=6)
  const k = 6;
  for (const c of cells) {
    const arr = cells
      .filter(o => o !== c)
      .map(o => ({ o, d: Math.hypot(o.x - c.x, o.y - c.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k);
    c.neighbors = arr.map(n => n.o.id);
    c.neighborDists = arr.map(n => n.d);
  }
  return cells;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Run the sim from t=0 to t=1 over N ticks. Returns snapshots (one per tick) of {infection, state}
function runSimulation({ rules, counterMode, ticks = 120 }) {
  const cells = buildField(mulberry32(7));
  const snapshots = [];
  const rng = mulberry32(11);

  // Seed initial infection
  cells.forEach(c => {
    if (c.isSeed) { c.state = 1; c.infection = 1; }
  });

  for (let t = 0; t < ticks; t++) {
    const progress = t / (ticks - 1);
    // Stage-dependent multipliers
    const stage = Math.min(5, Math.floor(progress * 6));
    const platformActive = progress > 0.15;
    const parodyActive = progress > 0.62;
    const counterActive = progress > 0.55;

    // Capture previous state
    cells.forEach(c => c.prevInfection = c.infection);

    // Infect from neighbors (ink diffusion)
    for (const c of cells) {
      if (c.state === 4) continue; // immune
      if (c.state === 3) continue; // counter species stays counter
      // compute neighbor carrier weight
      let carrierWeight = 0;
      let counterWeight = 0;
      for (let i = 0; i < c.neighbors.length; i++) {
        const n = cells.find(x => x.id === c.neighbors[i]); // small N — fine
        const w = 1 / (1 + c.neighborDists[i] * 8);
        if (n.state === 1 || n.state === 2) carrierWeight += w * n.prevInfection;
        if (n.state === 3) counterWeight += w * n.prevInfection;
      }
      const totalW = c.neighbors.reduce((s, _, i) => s + 1 / (1 + c.neighborDists[i] * 8), 0);
      const carrierFrac = carrierWeight / totalW;
      const counterFrac = counterWeight / totalW;

      // Adoption
      if (c.state === 0) {
        // immunity check
        if (rng() < rules.immunity * 0.02) { c.state = 4; continue; }
        const local = carrierFrac * (1 + (c.isBridge ? 0.4 : 0));
        if (local > rules.threshold) {
          c.state = 1;
          c.infection = Math.min(1, c.infection + 0.25 + local * 0.5);
        } else {
          c.infection = Math.max(0, c.infection + (local - rules.threshold) * 0.05);
        }
      } else if (c.state === 1) {
        // reinforcement / decay
        c.infection = Math.min(1, c.infection + carrierFrac * 0.08 - 0.005);
        if (counterActive && counterFrac > rules.counter_strength * 0.5 && rng() < 0.02) {
          c.state = 3; // converted to counter
          c.infection = 0.6;
        }
      } else if (c.state === 2) {
        c.infection = Math.max(0.3, c.infection - 0.002);
      }
    }

    // Platform broadcast: hubs pulse infection to random distant cells
    if (platformActive) {
      const boostCount = Math.floor(rules.platform_boost * 6);
      for (let i = 0; i < boostCount; i++) {
        const hub = cells.filter(c => c.isHub)[Math.floor(rng() * 6)];
        const target = cells[Math.floor(rng() * cells.length)];
        if (target && target.state === 0 && rng() < 0.4) {
          target.state = 1;
          target.infection = 0.7;
        }
      }
    }

    // Parody mutation — interior cells flip to state 2 (self-parody)
    if (parodyActive) {
      const mutationRate = (progress - 0.62) * 0.04;
      for (const c of cells) {
        if (c.state === 1 && c.infection > 0.85 && rng() < mutationRate) {
          if (counterMode === 'mutation' || counterMode === 'both') {
            c.state = 2;
          }
        }
      }
    }

    // Counter species — spawn from edges if species mode
    if (counterActive && (counterMode === 'species' || counterMode === 'both')) {
      const spawnRate = (progress - 0.55) * 0.03 * rules.counter_strength;
      for (const c of cells) {
        if (c.state === 0 && (c.x > 0.85 || c.y > 0.85 || c.x < 0.08) && rng() < spawnRate) {
          c.state = 3;
          c.infection = 0.6;
        }
      }
    }

    // Capture snapshot — compact (just numbers)
    snapshots.push({
      progress,
      stage,
      cells: cells.map(c => ({ state: c.state, infection: c.infection })),
    });
  }

  return { cells, snapshots };
}

Object.assign(window, { runSimulation, buildField, GRID_W, GRID_H });
