/**
 * Customer Churn Prediction Interactive Client Application
 * Connects to FastAPI backend on http://localhost:8004
 */

const API_BASE = window.location.origin;

// State
let datasetInfo = null;
let allRecords = [];
let currentFilter = 'all';

// DOM Elements
const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('statusText');
const algoSelect = document.getElementById('algoSelect');
const nEstGroup = document.getElementById('nEstGroup');
const maxDepthGroup = document.getElementById('maxDepthGroup');
const cGroup = document.getElementById('cGroup');
const lrGroup = document.getElementById('lrGroup');

const nEstInput = document.getElementById('nEstInput');
const maxDepthInput = document.getElementById('maxDepthInput');
const cInput = document.getElementById('cInput');
const lrInput = document.getElementById('lrInput');
const testSplitRange = document.getElementById('testSplitRange');

const trainBtn = document.getElementById('trainBtn');
const predictRiskBtn = document.getElementById('predictRiskBtn');
const toggleAllBtn = document.getElementById('toggleAllFeatures');

// Simulation DOM
const simTenure = document.getElementById('simTenure');
const simMonthly = document.getElementById('simMonthly');
const simContract = document.getElementById('simContract');
const simInternet = document.getElementById('simInternet');
const simTechSupport = document.getElementById('simTechSupport');
const simSecurity = document.getElementById('simSecurity');
const simPayment = document.getElementById('simPayment');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkHealth();
  await loadDataset();
  // Auto-train on initial load for instant dashboard satisfaction
  trainModel();
});

function setupEventListeners() {
  // Algo change
  algoSelect.addEventListener('change', () => {
    const algo = algoSelect.value;
    nEstGroup.style.display = (algo === 'random_forest' || algo === 'gradient_boosting') ? 'block' : 'none';
    maxDepthGroup.style.display = (algo !== 'logistic_regression') ? 'block' : 'none';
    cGroup.style.display = (algo === 'logistic_regression') ? 'block' : 'none';
    lrGroup.style.display = (algo === 'gradient_boosting') ? 'block' : 'none';
  });

  // Slider value displays
  nEstInput.addEventListener('input', () => document.getElementById('nEstVal').textContent = nEstInput.value);
  maxDepthInput.addEventListener('input', () => document.getElementById('maxDepthVal').textContent = maxDepthInput.value);
  cInput.addEventListener('input', () => document.getElementById('cVal').textContent = cInput.value);
  lrInput.addEventListener('input', () => document.getElementById('lrVal').textContent = lrInput.value);
  testSplitRange.addEventListener('input', () => document.getElementById('testSplitVal').textContent = `${testSplitRange.value}%`);

  simTenure.addEventListener('input', () => document.getElementById('simTenureVal').textContent = simTenure.value);
  simMonthly.addEventListener('input', () => document.getElementById('simMonthlyVal').textContent = parseFloat(simMonthly.value).toFixed(2));

  // Train button
  trainBtn.addEventListener('click', trainModel);

  // Predict button
  predictRiskBtn.addEventListener('click', predictRisk);

  // Persona buttons
  document.getElementById('personaHighRisk').addEventListener('click', () => {
    simTenure.value = 2;
    simMonthly.value = 105.0;
    simContract.value = 'Month-to-month';
    simInternet.value = 'Fiber optic';
    simTechSupport.value = 'No';
    simSecurity.value = 'No';
    simPayment.value = 'Electronic check';
    document.getElementById('simTenureVal').textContent = '2';
    document.getElementById('simMonthlyVal').textContent = '105.00';
    predictRisk();
  });

  document.getElementById('personaLowRisk').addEventListener('click', () => {
    simTenure.value = 60;
    simMonthly.value = 35.0;
    simContract.value = 'Two year';
    simInternet.value = 'DSL';
    simTechSupport.value = 'Yes';
    simSecurity.value = 'Yes';
    simPayment.value = 'Bank transfer';
    document.getElementById('simTenureVal').textContent = '60';
    document.getElementById('simMonthlyVal').textContent = '35.00';
    predictRisk();
  });

  // Toggle all features
  toggleAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.feature-tag input');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
      cb.checked = !allChecked;
      cb.closest('.feature-tag').classList.toggle('selected', !allChecked);
    });
    toggleAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderSampleTable();
    });
  });
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected: Scikit-learn Classification Engine Live';
    } else {
      throw new Error();
    }
  } catch (err) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Backend Offline (Start Python Server)';
  }
}

async function loadDataset() {
  try {
    const res = await fetch(`${API_BASE}/api/dataset`);
    datasetInfo = await res.json();
    allRecords = datasetInfo.sample_records || [];

    // Stats
    document.getElementById('totalRecords').textContent = datasetInfo.total_records.toLocaleString();
    document.getElementById('churnRate').textContent = `${datasetInfo.churn_rate}%`;
    document.getElementById('retainedCount').textContent = datasetInfo.retained_count.toLocaleString();
    document.getElementById('churnCount').textContent = datasetInfo.churn_count.toLocaleString();

    // Populate Numeric Features
    const numContainer = document.getElementById('numericFeaturesContainer');
    numContainer.innerHTML = '';
    datasetInfo.available_features.numeric.forEach(feat => {
      numContainer.appendChild(createFeatureTag(feat, true));
    });

    // Populate Categorical Features
    const catContainer = document.getElementById('categoricalFeaturesContainer');
    catContainer.innerHTML = '';
    datasetInfo.available_features.categorical.forEach(feat => {
      catContainer.appendChild(createFeatureTag(feat, true));
    });

    renderSampleTable();
  } catch (err) {
    console.error('Failed to load dataset:', err);
  }
}

function createFeatureTag(name, defaultChecked = true) {
  const label = document.createElement('label');
  label.className = `feature-tag ${defaultChecked ? 'selected' : ''}`;
  
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.value = name;
  cb.checked = defaultChecked;
  cb.addEventListener('change', () => {
    label.classList.toggle('selected', cb.checked);
  });

  const span = document.createElement('span');
  span.textContent = formatFeatureName(name);

  label.appendChild(cb);
  label.appendChild(span);
  return label;
}

function formatFeatureName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function trainModel() {
  const selectedFeatures = Array.from(document.querySelectorAll('.feature-tag input:checked')).map(cb => cb.value);
  if (selectedFeatures.length === 0) {
    alert('Please select at least one feature for training.');
    return;
  }

  trainBtn.disabled = true;
  trainBtn.innerHTML = '<span>⏳</span> Training Model in Python...';

  const algo = algoSelect.value;
  const hyperparameters = {};

  if (algo === 'random_forest' || algo === 'gradient_boosting') {
    hyperparameters.n_estimators = parseInt(nEstInput.value, 10);
  }
  if (algo !== 'logistic_regression') {
    hyperparameters.max_depth = parseInt(maxDepthInput.value, 10);
  }
  if (algo === 'logistic_regression') {
    hyperparameters.C = parseFloat(cInput.value);
  }
  if (algo === 'gradient_boosting') {
    hyperparameters.learning_rate = parseFloat(lrInput.value);
  }

  const payload = {
    features: selectedFeatures,
    algorithm: algo,
    hyperparameters: hyperparameters,
    test_size: parseInt(testSplitRange.value, 10) / 100,
    random_state: 42
  };

  try {
    const res = await fetch(`${API_BASE}/api/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Training failed');
    }

    const data = await res.json();
    renderEvaluation(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    trainBtn.disabled = false;
    trainBtn.innerHTML = '<span>🚀</span> Train Classification Model';
  }
}

function renderEvaluation(data) {
  const m = data.metrics;
  document.getElementById('valAccuracy').textContent = `${(m.accuracy * 100).toFixed(1)}%`;
  document.getElementById('valPrecision').textContent = `${(m.precision * 100).toFixed(1)}%`;
  document.getElementById('valRecall').textContent = `${(m.recall * 100).toFixed(1)}%`;
  document.getElementById('valF1').textContent = `${(m.f1_score * 100).toFixed(1)}%`;
  document.getElementById('valRocAuc').textContent = `${(m.roc_auc * 100).toFixed(1)}%`;
  document.getElementById('valLatency').textContent = `${m.training_time_ms.toFixed(1)} ms`;

  // Confusion matrix
  const cm = data.confusion_matrix;
  document.getElementById('cmTN').querySelector('.cm-num').textContent = cm.true_negative;
  document.getElementById('cmFP').querySelector('.cm-num').textContent = cm.false_positive;
  document.getElementById('cmFN').querySelector('.cm-num').textContent = cm.false_negative;
  document.getElementById('cmTP').querySelector('.cm-num').textContent = cm.true_positive;

  // Insight trade-off calculation
  const totalActualChurners = cm.true_positive + cm.false_negative;
  const caughtPct = totalActualChurners > 0 ? ((cm.true_positive / totalActualChurners) * 100).toFixed(1) : 0;
  document.getElementById('tradeoffText').textContent = 
    `Currently capturing ${caughtPct}% of actual at-risk churners (TP) while misidentifying ${cm.false_positive} retained users (FP).`;

  // Feature Importance
  renderFeatureImportance(data.top_feature_importance || []);
}

function renderFeatureImportance(importances) {
  const list = document.getElementById('featureImportanceList');
  list.innerHTML = '';

  if (!importances || importances.length === 0) {
    list.innerHTML = '<p class="empty-state">No feature weights available for this model type.</p>';
    return;
  }

  // Max value for relative normalization
  const maxVal = Math.max(...importances.map(item => Math.abs(item.importance)), 0.001);

  importances.slice(0, 8).forEach(item => {
    const row = document.createElement('div');
    row.className = 'importance-row';

    const pct = Math.min(100, Math.max(5, (Math.abs(item.importance) / maxVal) * 100));

    row.innerHTML = `
      <div class="importance-name" title="${item.feature}">${formatFeatureName(item.feature)}</div>
      <div class="importance-bar-wrap">
        <div class="importance-bar-fill" style="width: ${pct}%;"></div>
      </div>
      <div class="importance-val">${(item.importance * 100).toFixed(1)}%</div>
    `;

    list.appendChild(row);
  });
}

async function predictRisk() {
  const profile = {
    tenure: parseInt(simTenure.value, 10),
    monthly_charges: parseFloat(simMonthly.value),
    total_charges: Math.round(parseInt(simTenure.value, 10) * parseFloat(simMonthly.value)),
    contract_type: simContract.value,
    internet_service: simInternet.value,
    tech_support: simTechSupport.value,
    online_security: simSecurity.value,
    paperless_billing: 'Yes',
    payment_method: simPayment.value
  };

  predictRiskBtn.disabled = true;
  predictRiskBtn.innerHTML = '<span>⚡</span> Calculating...';

  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_profile: profile })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Prediction failed');
    }

    const data = await res.json();
    renderRiskResult(data);
  } catch (err) {
    alert(`Prediction Error: ${err.message}`);
  } finally {
    predictRiskBtn.disabled = false;
    predictRiskBtn.innerHTML = '<span>⚡</span> Calculate Churn Probability';
  }
}

function renderRiskResult(data) {
  const card = document.getElementById('riskResultCard');
  card.style.display = 'block';

  const badge = document.getElementById('riskTierBadge');
  const percentText = document.getElementById('riskProbabilityText');
  const fill = document.getElementById('riskProgressFill');
  const reco = document.getElementById('recommendationText');

  const pct = (data.churn_probability * 100).toFixed(1);
  percentText.textContent = `${pct}%`;
  fill.style.width = `${pct}%`;

  badge.className = 'risk-tier-badge';
  if (data.risk_tier === 'HIGH') {
    badge.classList.add('tier-high');
    badge.textContent = '🔴 HIGH RISK';
    fill.style.background = 'var(--danger)';
  } else if (data.risk_tier === 'MODERATE') {
    badge.classList.add('tier-moderate');
    badge.textContent = '🟡 MODERATE RISK';
    fill.style.background = 'var(--warning)';
  } else {
    badge.classList.add('tier-low');
    badge.textContent = '🟢 LOW RISK';
    fill.style.background = 'var(--success)';
  }

  reco.textContent = data.recommended_action || 'Maintain regular customer engagement.';
}

function renderSampleTable() {
  const tbody = document.getElementById('sampleTableBody');
  tbody.innerHTML = '';

  let filtered = allRecords;
  if (currentFilter === 'churned') {
    filtered = allRecords.filter(r => r.churn === 1);
  } else if (currentFilter === 'retained') {
    filtered = allRecords.filter(r => r.churn === 0);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--muted);">No matching records found.</td></tr>';
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${r.customer_id}</strong></td>
      <td>${r.tenure} mo</td>
      <td>$${r.monthly_charges.toFixed(2)}</td>
      <td>$${r.total_charges.toFixed(2)}</td>
      <td>${r.contract_type}</td>
      <td>${r.internet_service}</td>
      <td>${r.tech_support}</td>
      <td>
        <span class="${r.churn === 1 ? 'status-badge-churned' : 'status-badge-retained'}">
          ${r.churn === 1 ? 'Churned (1)' : 'Retained (0)'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
