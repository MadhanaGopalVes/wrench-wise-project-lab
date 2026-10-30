/**
 * Recommendation Engine Client Application
 * Connects to FastAPI Recommender Backend on http://localhost:8006
 */

const API_BASE = window.location.origin;

// State
let catalogData = null;
let activeUserId = 'user_001';

// DOM
const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('statusText');
const userSelect = document.getElementById('userSelect');
const strategySelect = document.getElementById('strategySelect');
const alphaGroup = document.getElementById('alphaGroup');
const alphaSlider = document.getElementById('alphaSlider');
const alphaDisplay = document.getElementById('alphaDisplay');
const topKSlider = document.getElementById('topKSlider');
const topKDisplay = document.getElementById('topKDisplay');
const generateRecsBtn = document.getElementById('generateRecsBtn');

const userHistoryList = document.getElementById('userHistoryList');
const historyCountBadge = document.getElementById('historyCountBadge');

const rateCourseSelect = document.getElementById('rateCourseSelect');
const ratingStarsSelect = document.getElementById('ratingStarsSelect');
const submitRatingBtn = document.getElementById('submitRatingBtn');

const heroUserTitle = document.getElementById('heroUserTitle');
const heroUserSubtitle = document.getElementById('heroUserSubtitle');
const recLatencyBadge = document.getElementById('recLatencyBadge');
const feedCountBadge = document.getElementById('feedCountBadge');
const recsGrid = document.getElementById('recsGrid');

const telCatalog = document.getElementById('telCatalog');
const telRatings = document.getElementById('telRatings');
const telMode = document.getElementById('telMode');
const telModeSub = document.getElementById('telModeSub');
const telLatency = document.getElementById('telLatency');

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkHealth();
  await loadCatalog();
  await loadUserHistory(activeUserId);
  runRecommendations();
});

function setupEventListeners() {
  userSelect.addEventListener('change', async (e) => {
    activeUserId = e.target.value;
    await loadUserHistory(activeUserId);
    runRecommendations();
  });

  strategySelect.addEventListener('change', () => {
    const mode = strategySelect.value;
    alphaGroup.style.display = (mode === 'hybrid') ? 'block' : 'none';
    telMode.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    telModeSub.textContent = mode === 'hybrid' ? 'Content + Collaborative' : (mode === 'content' ? 'TF-IDF Semantic' : 'User-User Pearson');
  });

  alphaSlider.addEventListener('input', () => {
    const val = parseFloat(alphaSlider.value);
    const contentPct = Math.round(val * 100);
    const collabPct = 100 - contentPct;
    alphaDisplay.textContent = `${contentPct}% Content / ${collabPct}% Collab`;
  });

  topKSlider.addEventListener('input', () => {
    topKDisplay.textContent = topKSlider.value;
  });

  generateRecsBtn.addEventListener('click', runRecommendations);

  submitRatingBtn.addEventListener('click', submitNewRating);
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected: Hybrid Recommender Engine Live';
    } else {
      throw new Error();
    }
  } catch (err) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Backend Offline (Port 8006)';
  }
}

async function loadCatalog() {
  try {
    const res = await fetch(`${API_BASE}/api/catalog`);
    catalogData = await res.json();

    // Populate user dropdown
    userSelect.innerHTML = '';
    catalogData.sample_users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = `Learner Profile (${u})`;
      userSelect.appendChild(opt);
    });

    // Add Cold-Start New Student Option
    const coldOpt = document.createElement('option');
    coldOpt.value = 'new_student_cold_start';
    coldOpt.textContent = '🌟 New Learner (Zero Past Ratings / Cold Start)';
    userSelect.appendChild(coldOpt);

    userSelect.value = activeUserId;

    // Populate Rate Course Dropdown
    rateCourseSelect.innerHTML = '';
    catalogData.items.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.item_id;
      opt.textContent = `[${c.category}] ${c.title}`;
      rateCourseSelect.appendChild(opt);
    });

    // Telemetry
    telCatalog.textContent = `${catalogData.total_items} Courses`;
    telRatings.textContent = `${catalogData.total_ratings.toLocaleString()} Ratings`;
  } catch (err) {
    console.error('Failed to load catalog:', err);
  }
}

async function loadUserHistory(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/user-ratings?user_id=${userId}`);
    const ratings = await res.json();

    historyCountBadge.textContent = `${ratings.length} courses`;
    userHistoryList.innerHTML = '';

    if (ratings.length === 0) {
      userHistoryList.innerHTML = '<p class="empty-state" style="padding: 1rem;">No rating history (Cold-start persona).</p>';
      return;
    }

    ratings.forEach(r => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-item-title" title="${r.title}">${r.title}</div>
        <div class="history-item-rating">⭐ ${r.rating.toFixed(1)}</div>
      `;
      userHistoryList.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load user ratings:', err);
  }
}

async function runRecommendations() {
  generateRecsBtn.disabled = true;
  generateRecsBtn.innerHTML = '<span>⏳</span> Computing Recommendations...';

  const mode = strategySelect.value;
  const alpha = parseFloat(alphaSlider.value);
  const topK = parseInt(topKSlider.value, 10);

  const payload = {
    user_id: activeUserId,
    mode: mode,
    alpha: alpha,
    top_k: topK
  };

  try {
    const res = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Recommendation failed');
    }

    const data = await res.json();
    renderRecommendations(data);
  } catch (err) {
    alert(`Recommendation Error: ${err.message}`);
  } finally {
    generateRecsBtn.disabled = false;
    generateRecsBtn.innerHTML = '<span>✨</span> Generate Personalized Recommendations';
  }
}

function renderRecommendations(data) {
  heroUserTitle.textContent = `Personalized Recommendations for ${data.user_id}`;
  recLatencyBadge.textContent = `${data.execution_time_ms} ms`;
  telLatency.textContent = `${data.execution_time_ms} ms`;
  feedCountBadge.textContent = `${data.recommendations.length} Recommendations`;

  recsGrid.innerHTML = '';
  if (data.recommendations.length === 0) {
    recsGrid.innerHTML = '<p class="empty-state">No matching unrated courses available.</p>';
    return;
  }

  data.recommendations.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'rec-card';

    const contentPct = rec.content_score ? (rec.content_score * 100).toFixed(1) : 0;
    const collabPct = rec.collab_score ? (rec.collab_score * 100).toFixed(1) : 0;

    card.innerHTML = `
      <div class="rec-card-header">
        <div class="rec-badges">
          <span class="category-badge">${rec.category}</span>
          <span class="level-badge">${rec.level}</span>
          <span class="level-badge">⭐ ${rec.avg_rating}</span>
        </div>
        <div class="match-badge">${rec.match_percentage}% Match</div>
      </div>

      <div class="rec-title">${rec.title}</div>

      <div class="rec-breakdown">
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span>Semantic Content Score</span>
            <strong>${contentPct}%</strong>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${contentPct}%;"></div>
          </div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span>Collaborative Peer Score</span>
            <strong>${collabPct}%</strong>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${collabPct}%; background: #2563EB;"></div>
          </div>
        </div>
      </div>

      <div class="rec-reason">
        💡 <strong>Explainability:</strong> ${rec.reason}
      </div>
    `;

    recsGrid.appendChild(card);
  });
}

async function submitNewRating() {
  const itemId = rateCourseSelect.value;
  const rating = parseFloat(ratingStarsSelect.value);

  submitRatingBtn.disabled = true;
  submitRatingBtn.innerHTML = '<span>⏳</span> Recording...';

  try {
    const res = await fetch(`${API_BASE}/api/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: activeUserId,
        item_id: itemId,
        rating: rating
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Rating failed');
    }

    await loadUserHistory(activeUserId);
    await runRecommendations();
  } catch (err) {
    alert(`Rating Error: ${err.message}`);
  } finally {
    submitRatingBtn.disabled = false;
    submitRatingBtn.innerHTML = '<span>💾</span> Submit Rating & Retrain';
  }
}
