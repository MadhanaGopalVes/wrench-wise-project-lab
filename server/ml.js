'use strict';
// REAL machine learning, implemented from scratch (no external ML libs) so the learner sees genuine
// training on a synthetic housing dataset. Nothing here is simulated or pre-baked.

function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const FEATURES = [
  { key: 'sqft', label: 'Floor area (sq ft)', min: 500, max: 4000, step: 50, def: 1800 },
  { key: 'bedrooms', label: 'Bedrooms', min: 1, max: 6, step: 1, def: 3 },
  { key: 'bathrooms', label: 'Bathrooms', min: 1, max: 5, step: 1, def: 2 },
  { key: 'age', label: 'Property age (years)', min: 0, max: 80, step: 1, def: 15 },
  { key: 'distance_km', label: 'Distance to city centre (km)', min: 1, max: 45, step: 1, def: 12 },
  { key: 'garage', label: 'Has garage (0/1)', min: 0, max: 1, step: 1, def: 1 },
  { key: 'school_score', label: 'Local school score (1-10)', min: 1, max: 10, step: 1, def: 7 },
  { key: 'random_noise', label: 'Random number (useless feature!)', min: 0, max: 100, step: 1, def: 50 },
];
const TARGET = 'price_k_usd';

let cache;
function dataset() {
  if (cache) return cache;
  const rnd = mulberry32(42);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const rows = [];
  for (let i = 0; i < 400; i++) {
    const sqft = Math.round(600 + rnd() * 3200);
    const bedrooms = Math.min(6, Math.max(1, Math.round(sqft / 900 + gauss() * 0.7)));
    const bathrooms = Math.min(5, Math.max(1, Math.round(bedrooms * 0.6 + gauss() * 0.5)));
    const age = Math.round(rnd() * 70);
    const distance_km = Math.round(1 + rnd() * 40);
    const garage = rnd() < 0.55 ? 1 : 0;
    const school_score = Math.min(10, Math.max(1, Math.round(6 - distance_km / 12 + gauss() * 1.8 + 2)));
    const random_noise = Math.round(rnd() * 100);
    const price = 40 + 0.11 * sqft + 7 * bedrooms + 11 * bathrooms - 1.2 * age - 2.4 * distance_km + 16 * garage + 9 * school_score + gauss() * 22;
    rows.push({ sqft, bedrooms, bathrooms, age, distance_km, garage, school_score, random_noise, [TARGET]: Math.round(price * 10) / 10 });
  }
  cache = rows; return rows;
}

function describe() {
  const rows = dataset();
  const stats = FEATURES.concat([{ key: TARGET, label: 'Price (US$ thousand)' }]).map((f) => {
    const v = rows.map((r) => r[f.key]); const n = v.length; const mean = v.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    return { key: f.key, label: f.label, min: Math.min(...v), max: Math.max(...v), mean: +mean.toFixed(2), sd: +sd.toFixed(2) };
  });
  const corr = FEATURES.map((f) => ({ key: f.key, label: f.label, r: +pearson(rows.map((r) => r[f.key]), rows.map((r) => r[TARGET])).toFixed(3) }));
  return { n: rows.length, target: TARGET, features: FEATURES, stats, correlation: corr, sample: rows.slice(0, 8) };
}
function pearson(a, b) {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb || 1);
}

function metrics(y, p) {
  const n = y.length; let ae = 0, se = 0; const m = y.reduce((a, b) => a + b, 0) / n; let st = 0;
  for (let i = 0; i < n; i++) { const e = y[i] - p[i]; ae += Math.abs(e); se += e * e; st += (y[i] - m) ** 2; }
  return { mae: +(ae / n).toFixed(3), mse: +(se / n).toFixed(3), r2: +(1 - se / (st || 1)).toFixed(4) };
}

// ---- algorithms ----
function standardise(X) {
  const d = X[0].length, mean = Array(d).fill(0), sd = Array(d).fill(0);
  X.forEach((r) => r.forEach((v, j) => (mean[j] += v / X.length)));
  X.forEach((r) => r.forEach((v, j) => (sd[j] += (v - mean[j]) ** 2 / X.length)));
  return { mean, sd: sd.map((s) => Math.sqrt(s) || 1) };
}
const apply = (x, s) => x.map((v, j) => (v - s.mean[j]) / s.sd[j]);

function solve(A, b) { // Gaussian elimination with partial pivoting
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / (M[c][c] || 1e-12); for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / (M[i][i] || 1e-12); }
  return x;
}
function fitLinear(X, y, alpha) {
  const s = standardise(X); const Z = X.map((r) => apply(r, s)); const d = Z[0].length; const ym = y.reduce((a, b) => a + b, 0) / y.length;
  const A = Array.from({ length: d }, () => Array(d).fill(0)); const b = Array(d).fill(0);
  Z.forEach((z, i) => { for (let j = 0; j < d; j++) { b[j] += z[j] * (y[i] - ym); for (let k = 0; k < d; k++) A[j][k] += z[j] * z[k]; } });
  for (let j = 0; j < d; j++) A[j][j] += alpha;
  return { type: 'linear', s, w: solve(A, b), b: ym };
}
function fitTree(X, y, maxDepth, minLeaf = 5) {
  const imp = Array(X[0].length).fill(0);
  const mean = (idx) => idx.reduce((a, i) => a + y[i], 0) / idx.length;
  const sse = (idx) => { const m = mean(idx); return idx.reduce((a, i) => a + (y[i] - m) ** 2, 0); };
  function build(idx, depth) {
    if (depth >= maxDepth || idx.length < 2 * minLeaf) return { v: mean(idx) };
    let best = null; const base = sse(idx);
    for (let f = 0; f < X[0].length; f++) {
      const sorted = [...idx].sort((a, b) => X[a][f] - X[b][f]);
      let sl = 0, sl2 = 0, st = 0, st2 = 0; sorted.forEach((i) => { st += y[i]; st2 += y[i] ** 2; });
      for (let k = 0; k < sorted.length - 1; k++) {
        const v = y[sorted[k]]; sl += v; sl2 += v * v; const nl = k + 1, nr = sorted.length - nl;
        if (X[sorted[k]][f] === X[sorted[k + 1]][f] || nl < minLeaf || nr < minLeaf) continue;
        const cost = (sl2 - sl * sl / nl) + ((st2 - sl2) - (st - sl) ** 2 / nr);
        if (!best || cost < best.cost) best = { f, t: (X[sorted[k]][f] + X[sorted[k + 1]][f]) / 2, cost };
      }
    }
    if (!best) return { v: mean(idx) };
    imp[best.f] += base - best.cost;
    const L = idx.filter((i) => X[i][best.f] <= best.t), R = idx.filter((i) => X[i][best.f] > best.t);
    return { f: best.f, t: best.t, l: build(L, depth + 1), r: build(R, depth + 1) };
  }
  const root = build(y.map((_, i) => i), 0); const tot = imp.reduce((a, b) => a + b, 0) || 1;
  return { type: 'tree', root, imp: imp.map((v) => v / tot) };
}
const predictTree = (n, x) => (n.v !== undefined ? n.v : predictTree(x[n.f] <= n.t ? n.l : n.r, x));
function fitKnn(X, y, k) { const s = standardise(X); return { type: 'knn', s, k, Z: X.map((r) => apply(r, s)), y }; }

function predictRow(m, x) {
  if (m.type === 'linear') { const z = apply(x, m.s); return m.b + z.reduce((a, v, j) => a + v * m.w[j], 0); }
  if (m.type === 'tree') return predictTree(m.root, x);
  const z = apply(x, m.s);
  const d = m.Z.map((r, i) => ({ i, d: r.reduce((a, v, j) => a + (v - z[j]) ** 2, 0) })).sort((a, b) => a.d - b.d).slice(0, m.k);
  return d.reduce((a, o) => a + m.y[o.i], 0) / d.length;
}

const ALGOS = {
  linear: { label: 'Linear Regression', params: {} },
  ridge: { label: 'Ridge Regression', params: { alpha: [0, 200, 10] } },
  tree: { label: 'Decision Tree', params: { max_depth: [1, 12, 4] } },
  knn: { label: 'k-Nearest Neighbours', params: { k: [1, 40, 7] } },
};

function train({ features, algorithm = 'linear', params = {}, testSize = 0.25, seed = 7 }) {
  const known = FEATURES.map((f) => f.key);
  const feats = (features || []).filter((f) => known.includes(f));
  if (feats.length < 1) throw new Error('Select at least one feature');
  if (!ALGOS[algorithm]) throw new Error('Unknown algorithm');
  testSize = Math.min(0.4, Math.max(0.1, Number(testSize) || 0.25));
  const rows = dataset(); const rnd = mulberry32(seed | 0);
  const idx = rows.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const nTest = Math.round(rows.length * testSize); const te = idx.slice(0, nTest), tr = idx.slice(nTest);
  const get = (ids) => ({ X: ids.map((i) => feats.map((f) => rows[i][f])), y: ids.map((i) => rows[i][TARGET]) });
  const A = get(tr), B = get(te);
  const clamp = (v, [lo, hi, d]) => Math.min(hi, Math.max(lo, Number.isFinite(+v) ? +v : d));
  let model, used = {};
  if (algorithm === 'linear') model = fitLinear(A.X, A.y, 1e-6);
  if (algorithm === 'ridge') { used.alpha = clamp(params.alpha, ALGOS.ridge.params.alpha); model = fitLinear(A.X, A.y, used.alpha); }
  if (algorithm === 'tree') { used.max_depth = Math.round(clamp(params.max_depth, ALGOS.tree.params.max_depth)); model = fitTree(A.X, A.y, used.max_depth); }
  if (algorithm === 'knn') { used.k = Math.round(clamp(params.k, ALGOS.knn.params.k)); model = fitKnn(A.X, A.y, used.k); }
  const pTr = A.X.map((x) => predictRow(model, x)), pTe = B.X.map((x) => predictRow(model, x));
  let importance;
  if (model.type === 'linear') { const t = model.w.reduce((a, b) => a + Math.abs(b), 0) || 1; importance = feats.map((f, j) => ({ feature: f, value: +(Math.abs(model.w[j]) / t).toFixed(4), signed: +model.w[j].toFixed(2) })); }
  else if (model.type === 'tree') importance = feats.map((f, j) => ({ feature: f, value: +model.imp[j].toFixed(4) }));
  else importance = null;
  const out = {
    algorithm, label: ALGOS[algorithm].label, params: used, features: feats, testSize, nTrain: tr.length, nTest: te.length,
    train: metrics(A.y, pTr), test: metrics(B.y, pTe),
    points: B.y.map((a, i) => ({ actual: a, predicted: +pTe[i].toFixed(1) })),
    importance,
  };
  const diag = out.train.r2 - out.test.r2;
  out.diagnosis = out.test.r2 < 0.5 ? 'Underfitting: the model explains less than half of the variance. Add informative features or use a more flexible model.'
    : diag > 0.12 ? 'Likely overfitting: training R² is much higher than test R². Simplify the model (lower depth, higher alpha or k).'
    : 'Healthy fit: training and test performance are close.';
  return { result: out, model: { ...model, features: feats } };
}

function predict(model, values) {
  const x = model.features.map((f) => Number(values[f]));
  if (x.some((v) => !Number.isFinite(v))) throw new Error('Provide a numeric value for every selected feature');
  return +predictRow(model, x).toFixed(1);
}

module.exports = { FEATURES, ALGOS, describe, train, predict, dataset };
