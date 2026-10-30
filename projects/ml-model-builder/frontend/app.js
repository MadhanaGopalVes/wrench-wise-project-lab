// ML Model Builder Frontend Logic
const API_BASE = window.location.origin;

let datasetInfo = null;
let lastScatterPoints = [];
let trainedFeatures = [];

// DOM Elements
const backendStatus = document.getElementById('backendStatus');
const statusText = document.getElementById('statusText');
const featureContainer = document.getElementById('featureContainer');
const algoSelect = document.getElementById('algoSelect');
const alphaGroup = document.getElementById('alphaGroup');
const maxDepthGroup = document.getElementById('maxDepthGroup');
const nEstGroup = document.getElementById('nEstGroup');
const testSizeRange = document.getElementById('testSizeRange');
const testSizeVal = document.getElementById('testSizeVal');
const scalingSelect = document.getElementById('scalingSelect');
const trainBtn = document.getElementById('trainBtn');

const metricR2 = document.getElementById('metricR2');
const metricMae = document.getElementById('metricMae');
const metricMse = document.getElementById('metricMse');
const metricTime = document.getElementById('metricTime');
const evalNotice = document.getElementById('evalNotice');

const formulaDisplay = document.getElementById('formulaDisplay');
const inspectionTbody = document.getElementById('inspectionTbody');
const metricColHeader = document.getElementById('metricColHeader');
const corrTable = document.getElementById('corrTable');

const predictInputsContainer = document.getElementById('predictInputsContainer');
const predictBtn = document.getElementById('predictBtn');
const predictionResult = document.getElementById('predictionResult');
const predVal = document.getElementById('predVal');

const canvas = document.getElementById('scatterCanvas');
const ctx = canvas.getContext('2d');

// 1. Initial Load: Fetch Dataset info
async function init() {
  try {
    const res = await fetch(`${API_BASE}/api/dataset`);
    if (!res.ok) throw new Error("Backend not responding");
    datasetInfo = await res.json();

    backendStatus.querySelector('.status-dot').style.background = '#10B981';
    statusText.textContent = `FastAPI Connected (${datasetInfo.total_rows} samples)`;

    renderFeatureCheckboxes(datasetInfo.feature_candidates);
    renderCorrelationTable(datasetInfo.correlations);
  } catch (err) {
    backendStatus.querySelector('.status-dot').style.background = '#EF4444';
    statusText.textContent = `Backend Offline: Ensure FastAPI is running on port 8001`;
    evalNotice.className = 'alert';
    evalNotice.style.background = '#FEE2E2';
    evalNotice.style.color = '#991B1B';
    evalNotice.innerHTML = `⚠️ Could not reach FastAPI backend at <code>${API_BASE}</code>. Make sure to run <code>python main.py</code> in the backend folder.`;
  }
}

// Render feature checkboxes
function renderFeatureCheckboxes(features) {
  featureContainer.innerHTML = '';
  // Default checked features
  const defaultSelected = ['MedInc', 'HouseAge', 'AveRooms', 'AveOccup'];
  
  features.forEach(feat => {
    const label = document.createElement('label');
    label.className = 'feature-check';
    const isChecked = defaultSelected.includes(feat);
    label.innerHTML = `
      <input type="checkbox" name="feature" value="${feat}" ${isChecked ? 'checked' : ''}>
      <span>${feat}</span>
    `;
    featureContainer.appendChild(label);
  });
}

// Render correlation table
function renderCorrelationTable(corr) {
  const cols = Object.keys(corr);
  let html = '<thead><tr><th>Feature</th>';
  cols.forEach(c => html += `<th>${c.substring(0, 7)}</th>`);
  html += '</tr></thead><tbody>';

  cols.forEach(rowKey => {
    html += `<tr><td><strong>${rowKey}</strong></td>`;
    cols.forEach(colKey => {
      const val = corr[rowKey][colKey];
      const intensity = Math.abs(val);
      const bg = val > 0 ? `rgba(16, 185, 129, ${intensity * 0.4})` : `rgba(239, 68, 68, ${intensity * 0.4})`;
      html += `<td style="background: ${bg}; font-weight: 500;">${val.toFixed(2)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';
  corrTable.innerHTML = html;
}

// 2. Algorithm Change handler
algoSelect.addEventListener('change', () => {
  const algo = algoSelect.value;
  alphaGroup.style.display = (algo === 'ridge' || algo === 'lasso') ? 'block' : 'none';
  maxDepthGroup.style.display = (algo === 'decision_tree' || algo === 'random_forest') ? 'block' : 'none';
  nEstGroup.style.display = (algo === 'random_forest') ? 'block' : 'none';
});

// Test size range slider
testSizeRange.addEventListener('input', (e) => {
  testSizeVal.textContent = `${e.target.value}%`;
});

// 3. Train Model
trainBtn.addEventListener('click', async () => {
  const selectedFeatures = Array.from(document.querySelectorAll('input[name="feature"]:checked')).map(el => el.value);

  if (selectedFeatures.length === 0) {
    alert("Please select at least one input feature.");
    return;
  }

  const algorithm = algoSelect.value;
  const hyperparameters = {};
  if (algorithm === 'ridge' || algorithm === 'lasso') {
    hyperparameters.alpha = parseFloat(document.getElementById('alphaInput').value) || 1.0;
  }
  if (algorithm === 'decision_tree' || algorithm === 'random_forest') {
    const depth = document.getElementById('maxDepthInput').value;
    hyperparameters.max_depth = depth ? parseInt(depth) : null;
  }
  if (algorithm === 'random_forest') {
    hyperparameters.n_estimators = parseInt(document.getElementById('nEstInput').value) || 30;
  }

  const payload = {
    features: selectedFeatures,
    target: "MedHouseVal",
    algorithm: algorithm,
    hyperparameters: hyperparameters,
    test_size: parseInt(testSizeRange.value) / 100,
    random_state: 42,
    scaling: scalingSelect.value
  };

  trainBtn.disabled = true;
  trainBtn.innerHTML = `<span>⏳</span> Training on Python Backend...`;

  try {
    const res = await fetch(`${API_BASE}/api/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Training failed");

    // Display Metrics
    metricR2.textContent = data.metrics.r2_score.toFixed(3);
    metricMae.textContent = `$${(data.metrics.mae * 100000).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
    metricMse.textContent = data.metrics.mse.toFixed(3);
    metricTime.textContent = `${data.metrics.training_time_ms} ms`;

    evalNotice.className = 'alert alert-success';
    evalNotice.innerHTML = `<strong>Model Trained:</strong> ${data.evaluation_interpretation}`;

    // Render Scatter Plot
    lastScatterPoints = data.actual_vs_predicted;
    drawScatterPlot(lastScatterPoints);

    // Render Inspection Table
    renderInspection(data.inspection, algorithm);

    // Prepare Interactive Prediction Playground
    trainedFeatures = selectedFeatures;
    renderPredictPlayground(trainedFeatures);

  } catch (err) {
    alert("Training Error: " + err.message);
  } finally {
    trainBtn.disabled = false;
    trainBtn.innerHTML = `<span>🚀</span> Retrain Model`;
  }
});

// Render Inspection Table
function renderInspection(inspection, algo) {
  inspectionTbody.innerHTML = '';
  if (inspection.formula) {
    formulaDisplay.style.display = 'block';
    formulaDisplay.textContent = inspection.formula;
  } else {
    formulaDisplay.style.display = 'none';
  }

  if (inspection.coefficients) {
    metricColHeader.textContent = "Regression Coefficient (β)";
    const coeffs = inspection.coefficients;
    const maxVal = Math.max(...Object.values(coeffs).map(Math.abs), 0.001);

    Object.entries(coeffs).forEach(([feat, val]) => {
      const tr = document.createElement('tr');
      const pct = Math.min(100, (Math.abs(val) / maxVal) * 100);
      const isPositive = val >= 0;
      tr.innerHTML = `
        <td><strong>${feat}</strong></td>
        <td><code>${val > 0 ? '+' : ''}${val.toFixed(4)}</code></td>
        <td>
          <div class="bar-wrap">
            <div class="bar-fill" style="width: ${pct}%; background: ${isPositive ? 'var(--primary)' : '#EF4444'};"></div>
          </div>
        </td>
      `;
      inspectionTbody.appendChild(tr);
    });
  } else if (inspection.feature_importances) {
    metricColHeader.textContent = "Gini Feature Importance";
    const importances = inspection.feature_importances;

    Object.entries(importances).forEach(([feat, val]) => {
      const tr = document.createElement('tr');
      const pct = (val * 100).toFixed(1);
      tr.innerHTML = `
        <td><strong>${feat}</strong></td>
        <td><code>${(val * 100).toFixed(2)}%</code></td>
        <td>
          <div class="bar-wrap">
            <div class="bar-fill" style="width: ${pct}%;"></div>
          </div>
        </td>
      `;
      inspectionTbody.appendChild(tr);
    });
  }
}

// 4. Draw Canvas Scatter Plot
function drawScatterPlot(points) {
  const w = canvas.width;
  const h = canvas.height;
  const pad = 45;

  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1;
  for (let x = pad; x < w - pad; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, h - pad);
    ctx.stroke();
  }
  for (let y = pad; y < h - pad; y += 40) {
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // Min and Max values (California housing target is typically 0.5 to 5.0)
  const minVal = 0;
  const maxVal = 5.5;

  const scaleX = (val) => pad + ((val - minVal) / (maxVal - minVal)) * (w - 2 * pad);
  const scaleY = (val) => (h - pad) - ((val - minVal) / (maxVal - minVal)) * (h - 2 * pad);

  // Axes
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  // Axis Labels
  ctx.fillStyle = '#64748B';
  ctx.font = '11px Outfit, sans-serif';
  ctx.fillText('Actual Value ($100k)', w / 2 - 40, h - 12);
  ctx.save();
  ctx.translate(14, h / 2 + 35);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Predicted Value ($100k)', 0, 0);
  ctx.restore();

  // Ideal y = x Line (Red dashed)
  ctx.strokeStyle = '#EF4444';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(scaleX(minVal), scaleY(minVal));
  ctx.lineTo(scaleX(maxVal), scaleY(maxVal));
  ctx.stroke();
  ctx.setLineDash([]);

  // Plot Points
  points.forEach(pt => {
    const x = scaleX(pt.actual);
    const y = scaleY(pt.predicted);
    const absResidual = Math.abs(pt.residual);

    ctx.fillStyle = absResidual < 0.5 ? '#08805A' : absResidual < 1.0 ? '#F59E0B' : '#EF4444';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 5. Playground Prediction Inputs
function renderPredictPlayground(features) {
  predictInputsContainer.innerHTML = '';
  predictBtn.style.display = 'block';

  features.forEach(feat => {
    const sum = datasetInfo.summary[feat] || { min: 0, max: 10, median: 3 };
    const div = document.createElement('div');
    div.className = 'form-group';
    div.style.marginBottom = '0.75rem';
    div.innerHTML = `
      <label style="display:flex; justify-content:space-between;">
        <span>${feat}</span>
        <span style="color:var(--muted); font-size:0.75rem;">Typical: ${sum.median}</span>
      </label>
      <input type="number" class="pred-input" data-feature="${feat}" value="${sum.median}" step="0.1" min="${sum.min}" max="${sum.max}">
    `;
    predictInputsContainer.appendChild(div);
  });
}

predictBtn.addEventListener('click', async () => {
  const inputs = document.querySelectorAll('.pred-input');
  const values = {};
  inputs.forEach(inp => {
    values[inp.dataset.feature] = parseFloat(inp.value) || 0;
  });

  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_values: values })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Prediction failed");

    predictionResult.style.display = 'flex';
    predVal.textContent = data.estimated_value_dollars;
  } catch (err) {
    alert("Inference Error: " + err.message);
  }
});

// Run init on load
init();
