/**
 * AI Image Classifier Client Application
 * Connects to FastAPI Vision Backend on http://localhost:8005
 */

const API_BASE = window.location.origin;

// State
let samples = [];
let activeSampleFilename = null;
let activeUploadedFile = null;
let activeBase64 = null;

// DOM
const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('statusText');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const galleryGrid = document.getElementById('galleryGrid');
const classifyBtn = document.getElementById('classifyBtn');

const topKInput = document.getElementById('topKInput');
const topKVal = document.getElementById('topKVal');
const confThreshInput = document.getElementById('confThreshInput');
const confThreshVal = document.getElementById('confThreshVal');

const activePreviewImg = document.getElementById('activePreviewImg');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const metaDimensions = document.getElementById('metaDimensions');
const metaSource = document.getElementById('metaSource');

const winnerCard = document.getElementById('winnerCard');
const winnerClass = document.getElementById('winnerClass');
const winnerConfFill = document.getElementById('winnerConfFill');
const winnerConfNum = document.getElementById('winnerConfNum');
const latencyBadge = document.getElementById('latencyBadge');

const distributionList = document.getElementById('distributionList');
const probCountBadge = document.getElementById('probCountBadge');

const telLatency = document.getElementById('telLatency');
const telMargin = document.getElementById('telMargin');
const telEntropy = document.getElementById('telEntropy');
const telClasses = document.getElementById('telClasses');

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkHealth();
  await loadSamples();
});

function setupEventListeners() {
  topKInput.addEventListener('input', () => {
    topKVal.textContent = topKInput.value;
  });

  confThreshInput.addEventListener('input', () => {
    confThreshVal.textContent = `${parseFloat(confThreshInput.value).toFixed(1)}%`;
  });

  // Drop zone clicks
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUserFile(e.target.files[0]);
    }
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUserFile(e.dataTransfer.files[0]);
    }
  });

  // Classify button
  classifyBtn.addEventListener('click', runClassification);
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected: ONNX Deep Vision Engine Live';
    } else {
      throw new Error();
    }
  } catch (err) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Vision Backend Offline (Start Python Port 8005)';
  }
}

async function loadSamples() {
  try {
    const res = await fetch(`${API_BASE}/api/samples`);
    samples = await res.json();
    renderGallery();

    if (samples.length > 0) {
      // Auto-select first sample (Golden Retriever)
      selectSample(samples[0].filename);
    }
  } catch (err) {
    galleryGrid.innerHTML = '<div class="gallery-loading">Failed to load benchmark gallery.</div>';
  }
}

function renderGallery() {
  galleryGrid.innerHTML = '';
  samples.forEach(s => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.filename = s.filename;

    item.innerHTML = `
      <img src="${s.thumbnail_base64}" alt="${s.label}" class="gallery-thumb">
      <div class="gallery-label">${s.label}</div>
    `;

    item.addEventListener('click', () => selectSample(s.filename));
    galleryGrid.appendChild(item);
  });
}

function selectSample(filename) {
  activeSampleFilename = filename;
  activeUploadedFile = null;
  activeBase64 = null;

  document.querySelectorAll('.gallery-item').forEach(el => {
    el.classList.toggle('active', el.dataset.filename === filename);
  });

  // Show image
  const sampleObj = samples.find(s => s.filename === filename);
  activePreviewImg.src = `${API_BASE}/sample-images/${filename}`;
  activePreviewImg.style.display = 'block';
  imagePlaceholder.style.display = 'none';

  metaSource.textContent = filename;
  if (sampleObj) {
    metaDimensions.textContent = `${sampleObj.width} x ${sampleObj.height} px`;
  }

  // Trigger classification immediately for preview
  runClassification();
}

function handleUserFile(file) {
  activeUploadedFile = file;
  activeSampleFilename = null;

  document.querySelectorAll('.gallery-item').forEach(el => el.classList.remove('active'));

  const reader = new FileReader();
  reader.onload = (e) => {
    activeBase64 = e.target.result;
    activePreviewImg.src = activeBase64;
    activePreviewImg.style.display = 'block';
    imagePlaceholder.style.display = 'none';

    metaSource.textContent = file.name;
    const img = new Image();
    img.src = activeBase64;
    img.onload = () => {
      metaDimensions.textContent = `${img.naturalWidth} x ${img.naturalHeight} px`;
    };

    runClassification();
  };
  reader.readAsDataURL(file);
}

async function runClassification() {
  if (!activeSampleFilename && !activeUploadedFile && !activeBase64) {
    alert('Please select a sample image or upload a photo first.');
    return;
  }

  classifyBtn.disabled = true;
  classifyBtn.innerHTML = '<span>⏳</span> Processing Deep CNN Inference...';

  const topK = parseInt(topKInput.value, 10);
  const cutoff = parseFloat(confThreshInput.value);

  try {
    let resData;

    if (activeUploadedFile) {
      const formData = new FormData();
      formData.append('file', activeUploadedFile);
      formData.append('top_k', topK);

      const res = await fetch(`${API_BASE}/api/classify`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Inference error');
      resData = await res.json();
    } else if (activeSampleFilename) {
      const formData = new FormData();
      formData.append('sample_filename', activeSampleFilename);
      formData.append('top_k', topK);

      const res = await fetch(`${API_BASE}/api/classify`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Inference error');
      resData = await res.json();
    }

    renderResults(resData, cutoff);
  } catch (err) {
    alert(`Classification Failed: ${err.message}`);
  } finally {
    classifyBtn.disabled = false;
    classifyBtn.innerHTML = '<span>⚡</span> Run Neural Classification';
  }
}

function renderResults(data, cutoff) {
  const top = data.top_prediction;
  if (!top) return;

  // Winner card
  winnerClass.textContent = formatLabel(top.label);
  winnerConfFill.style.width = `${top.confidence_percent}%`;
  winnerConfNum.textContent = `${top.confidence_percent}%`;
  latencyBadge.textContent = `${data.metrics.inference_time_ms} ms`;

  // Telemetry
  telLatency.textContent = `${data.metrics.inference_time_ms} ms`;
  telMargin.textContent = `+${(data.metrics.confidence_margin * 100).toFixed(1)}%`;
  telEntropy.textContent = `${data.metrics.entropy_uncertainty}`;
  telClasses.textContent = data.metrics.total_classes_evaluated.toLocaleString();

  // Filter distribution by cutoff
  const filteredPreds = (data.predictions || []).filter(p => p.confidence_percent >= cutoff);
  probCountBadge.textContent = `${filteredPreds.length} Classes Shown`;

  distributionList.innerHTML = '';
  if (filteredPreds.length === 0) {
    distributionList.innerHTML = '<p class="empty-state">No predictions met the confidence cutoff.</p>';
    return;
  }

  filteredPreds.forEach(p => {
    const row = document.createElement('div');
    row.className = 'dist-row';

    row.innerHTML = `
      <div class="dist-rank">#${p.rank}</div>
      <div class="dist-label" title="${p.label}">${formatLabel(p.label)}</div>
      <div class="dist-bar-wrap">
        <div class="dist-bar-fill" style="width: ${p.confidence_percent}%;"></div>
      </div>
      <div class="dist-val">${p.confidence_percent}%</div>
    `;

    distributionList.appendChild(row);
  });
}

function formatLabel(lbl) {
  return lbl.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
