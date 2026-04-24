// Canned cultural trend dataset.
// Each trend has:
//   - A 6-stage lifecycle (Seed → Subculture → Crossover → Mainstream → Parody → Revival/Death)
//   - A semiotic "sign sheet" that MUTATES across stages
//   - Opposition pair axes that drift
//   - Ink-in-water seed points + density field config
//   - A counter-signal (which can be a separate species AND/OR internal mutation)

const STAGES = [
  { id: 'seed',       label: 'Seed',        blurb: 'One node, one gesture. Illegible to the culture around it.' },
  { id: 'subculture', label: 'Subculture',  blurb: 'A closed neighborhood. In-group legibility; out-group confusion.' },
  { id: 'crossover',  label: 'Crossover',   blurb: 'Bridge nodes translate. The sign leaks across social proximity.' },
  { id: 'mainstream', label: 'Mainstream',  blurb: 'Saturation. Denotation decays; connotation hardens into myth.' },
  { id: 'parody',     label: 'Parody',      blurb: 'The sign points at itself. Counter-signal mutates from within.' },
  { id: 'revival',    label: 'Revival/Death', blurb: 'Either residue, or return with knowing quotation marks.' },
];

// Seed examples — cycle through the input placeholder
const CYCLE_PROMPTS = [
  'mob wife aesthetic',
  'why is everyone running?',
  'raw milk',
  'coastal grandma',
  'loud budgeting',
  'matcha maximalism',
  'skinny jeans → baggy jeans',
  'why did cringe become a weapon?',
  'recession pop',
  'tradwife',
  'run clubs as dating apps',
  'dimes square',
];

const TRENDS = {
  'mob-wife': {
    name: 'Mob wife aesthetic',
    kind: 'current',
    years: [2023, 2024, 2025, 2026],
    one_line: 'A post-clean-girl rejection: fur, gold, cigarette, leather. Glamour as armor in a precarious decade.',
    // Sign sheet per stage — signifier / signified / myth
    signs: [
      { stage: 'seed',       signifier: 'Vintage fur coat, gold hoops', signified: 'Italian-American cinema cosplay', myth: '—' },
      { stage: 'subculture', signifier: 'Leopard + leather + red lip',  signified: 'Opposition to "clean girl" minimalism', myth: 'Anti-wellness rebellion' },
      { stage: 'crossover',  signifier: 'Any big fur, red nails',       signified: 'Confidence, "grown woman" energy',    myth: 'Femininity as armor' },
      { stage: 'mainstream', signifier: 'Shein fur, drugstore red',     signified: 'Winter 2024 #OOTD',                   myth: 'Luxury under recession' },
      { stage: 'parody',     signifier: '"I\'m a mob wife" caption',    signified: 'Self-aware performance',              myth: 'Aesthetic as cope' },
      { stage: 'revival',    signifier: 'Residual red lip',             signified: 'Post-trend neutral',                  myth: 'Absorbed into baseline glam' },
    ],
    // Binary opposition axes (Saussure/Lévi-Strauss) — -1 to +1 drift per stage
    axes: [
      { label: 'authentic ←→ performed',     values: [-0.8, -0.4,  0.1,  0.5,  0.9,  0.6] },
      { label: 'niche ←→ mass',              values: [-0.9, -0.7, -0.1,  0.7,  0.8,  0.2] },
      { label: 'sincere ←→ ironic',          values: [-0.6, -0.3,  0.0,  0.3,  0.9,  0.4] },
      { label: 'abundance ←→ scarcity',      values: [ 0.7,  0.5,  0.2, -0.3, -0.5, -0.2] },
    ],
    counter: {
      name: 'Clean girl / quiet luxury',
      mode: 'species', // 'species' | 'mutation' | 'both'
      description: 'The aesthetic it explicitly negates — and the one waiting to re-dominate.',
    },
    rules_suggested: { threshold: 0.35, immunity: 0.15, counter_strength: 0.55, platform_boost: 0.75 },
    diffusion: [
      { demo: 'Italian-American TikTok',   platform: 'TikTok FYP',         date: 'Late 2023' },
      { demo: 'Fashion-Twitter girlies',   platform: 'X',                  date: 'Jan 2024'  },
      { demo: 'Mall-rat teens',            platform: 'Shein / IG reels',   date: 'Feb 2024'  },
      { demo: 'Morning-show segments',     platform: 'TV / news',          date: 'Mar 2024'  },
      { demo: 'Parody accounts',           platform: 'TikTok',             date: 'May 2024'  },
    ],
  },

  'skinny-jeans': {
    name: 'Skinny jeans (2005–2020)',
    kind: 'historical',
    years: [2003, 2008, 2013, 2018, 2022, 2025],
    one_line: 'Fifteen years of denim hegemony, ended by a TikTok generational war.',
    signs: [
      { stage: 'seed',       signifier: 'Hedi Slimane at Dior Homme',       signified: 'Rock-star androgyny',          myth: '—' },
      { stage: 'subculture', signifier: 'Indie sleaze, emo, fashion kids',  signified: 'Post-bootcut rebellion',       myth: 'Anti-suburbia' },
      { stage: 'crossover',  signifier: 'Kate Moss, Topshop',               signified: 'Cool, modern, universal',      myth: 'The new default jean' },
      { stage: 'mainstream', signifier: 'Every H&M, every dad',             signified: 'Just… jeans',                  myth: 'Invisibility of the norm' },
      { stage: 'parody',     signifier: 'Gen Z "side-part + skinnies"',     signified: 'Millennial signifier',         myth: 'Generational tell' },
      { stage: 'revival',    signifier: 'Worn knowingly, or retired',       signified: 'Cringe, then quietly back',    myth: 'Cycle-ready residue' },
    ],
    axes: [
      { label: 'cool ←→ cringe',             values: [-0.9, -0.7, -0.4, -0.2,  0.8,  0.3] },
      { label: 'young ←→ old',               values: [-0.8, -0.6, -0.2,  0.3,  0.7,  0.4] },
      { label: 'niche ←→ mass',              values: [-0.7, -0.2,  0.4,  0.9,  0.7,  0.2] },
      { label: 'new ←→ exhausted',           values: [-0.9, -0.5,  0.0,  0.5,  0.9,  0.6] },
    ],
    counter: {
      name: 'Baggy / wide-leg / Y2K denim',
      mode: 'mutation',
      description: 'Not a separate species — the generation WEARING skinny jeans mutated its own sign against itself.',
    },
    rules_suggested: { threshold: 0.30, immunity: 0.10, counter_strength: 0.70, platform_boost: 0.40 },
    diffusion: [
      { demo: 'Paris runway / Dior Homme', platform: 'Fashion press',      date: '2003' },
      { demo: 'Indie/emo kids',            platform: 'MySpace',            date: '2006' },
      { demo: 'Mainstream retail',         platform: 'H&M, Gap',           date: '2010' },
      { demo: 'Every demographic',         platform: 'Everywhere',         date: '2015' },
      { demo: 'Gen Z parody',              platform: 'TikTok',             date: '2021' },
    ],
  },

  'raw-milk': {
    name: 'Raw milk',
    kind: 'current',
    years: [2019, 2021, 2023, 2024, 2025, 2026],
    one_line: 'From homesteader forums to RFK-adjacent wellness: a sign of pre-modern trust, weaponized.',
    signs: [
      { stage: 'seed',       signifier: 'Mason jar on a farm table',        signified: 'Homestead self-reliance',        myth: '—' },
      { stage: 'subculture', signifier: 'Crunchy mom Instagram',            signified: 'Anti-industrial motherhood',     myth: 'Return to the real' },
      { stage: 'crossover',  signifier: 'Wellness podcast endorsements',    signified: 'Elite dietary differentiation',  myth: 'Pre-modern = virtuous' },
      { stage: 'mainstream', signifier: 'TikTok milk-mustache memes',       signified: 'Rebellion against authority',    myth: 'Institutional distrust' },
      { stage: 'parody',     signifier: '"Raw dogging everything" jokes',   signified: 'Right-coded lifestyle marker',   myth: 'Virtue as tribal flag' },
      { stage: 'revival',    signifier: 'Regulation / backlash cycle',      signified: 'Contested food politics',        myth: 'Permanent culture-war chip' },
    ],
    axes: [
      { label: 'health ←→ risk',             values: [-0.5, -0.3, -0.1,  0.2,  0.5,  0.6] },
      { label: 'left-coded ←→ right-coded',  values: [-0.3, -0.1,  0.2,  0.6,  0.8,  0.7] },
      { label: 'niche ←→ mass',              values: [-0.9, -0.7, -0.3,  0.4,  0.5,  0.3] },
      { label: 'pragmatic ←→ ideological',   values: [-0.6, -0.3,  0.1,  0.5,  0.9,  0.7] },
    ],
    counter: {
      name: 'FDA / public health consensus',
      mode: 'both',
      description: 'A separate institutional species AND the mutation of "wellness" itself into contrarianism.',
    },
    rules_suggested: { threshold: 0.45, immunity: 0.30, counter_strength: 0.50, platform_boost: 0.65 },
    diffusion: [
      { demo: 'Homesteader forums',        platform: 'Blogs, Reddit',      date: '2019' },
      { demo: 'Crunchy mom IG',            platform: 'Instagram',          date: '2021' },
      { demo: 'Wellness podcasters',       platform: 'Podcasts',           date: '2023' },
      { demo: 'Political commentariat',    platform: 'X, Substack',        date: '2024' },
      { demo: 'Meme culture',              platform: 'TikTok',             date: '2025' },
    ],
  },

  'cringe-weapon': {
    name: 'Why did "cringe" become a weapon?',
    kind: 'question',
    years: [2010, 2015, 2018, 2021, 2024, 2026],
    one_line: 'A private feeling became a public instrument of generational policing — and then ate itself.',
    signs: [
      { stage: 'seed',       signifier: 'r/cringepics, internal wince',    signified: 'Empathic embarrassment',         myth: '—' },
      { stage: 'subculture', signifier: '"That\'s cringe, bro"',           signified: 'In-group taste policing',        myth: 'Cool = absence of trying' },
      { stage: 'crossover',  signifier: 'TikTok "cringe compilation"',     signified: 'Content genre',                  myth: 'Audience as jury' },
      { stage: 'mainstream', signifier: '"Cringe" as verdict',             signified: 'Generational weapon',            myth: 'Millennials as cautionary tale' },
      { stage: 'parody',     signifier: '"Cringe is dead, be cringe"',     signified: 'Backlash to judgment economy',   myth: 'Earnestness reclaimed' },
      { stage: 'revival',    signifier: 'Post-cringe sincerity',           signified: 'Trying is the new cool',         myth: 'Cycle reversal' },
    ],
    axes: [
      { label: 'private ←→ public',          values: [-0.9, -0.5,  0.0,  0.8,  0.6,  0.3] },
      { label: 'sincere ←→ ironic',          values: [ 0.0,  0.3,  0.6,  0.9,  0.2, -0.4] },
      { label: 'defense ←→ weapon',          values: [-0.8, -0.3,  0.2,  0.9,  0.4, -0.1] },
      { label: 'individual ←→ generational', values: [-0.8, -0.4,  0.0,  0.7,  0.5,  0.2] },
    ],
    counter: {
      name: '"Be cringe, be free"',
      mode: 'mutation',
      description: 'No opposing species — the sign flipped on itself once it became too heavy to wield.',
    },
    rules_suggested: { threshold: 0.25, immunity: 0.05, counter_strength: 0.80, platform_boost: 0.85 },
    diffusion: [
      { demo: 'Reddit communities',        platform: 'Reddit',             date: '2010' },
      { demo: 'Gaming/meme forums',        platform: '4chan, Twitter',     date: '2015' },
      { demo: 'Gen Z TikTok',              platform: 'TikTok',             date: '2019' },
      { demo: 'Mainstream discourse',      platform: 'Op-eds, podcasts',   date: '2022' },
      { demo: '"Cringe is cool" wave',     platform: 'TikTok, Substack',   date: '2024' },
    ],
  },
};

const TREND_LIST = Object.entries(TRENDS).map(([id, t]) => ({ id, ...t }));

Object.assign(window, { STAGES, CYCLE_PROMPTS, TRENDS, TREND_LIST });
