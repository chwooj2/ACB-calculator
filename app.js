// ── ACB Calculator — app.js ────────────────────────────────────

let selectedDrugs = [];

function normalize(s) {
  return s.toLowerCase().replace(/[\s\-_\(\)\.]/g, '');
}

function searchDrug(query) {
  if (!query || query.trim().length < 1) return [];
  const q = normalize(query);
  const results = [];
  const seen = new Set();
  const alreadyAdded = new Set(selectedDrugs.map(d => d.en));

  for (const drug of INGREDIENT_DB) {
    if (alreadyAdded.has(drug.en)) continue;
    if (seen.has(drug.en)) continue;
    if (normalize(drug.en).includes(q) || normalize(drug.kr).includes(q)) {
      results.push({ ...drug });
      seen.add(drug.en);
    }
  }

  for (const [brand, enName] of Object.entries(BRAND_MAP)) {
    if (normalize(brand).includes(q)) {
      if (seen.has(enName) || alreadyAdded.has(enName)) continue;
      const drug = INGREDIENT_DB.find(d => d.en === enName);
      if (drug) {
        results.push({ ...drug, brandMatch: brand });
        seen.add(enName);
      }
    }
  }

  return results.slice(0, 8);
}

function addDrug(drug) {
  if (selectedDrugs.find(d => d.en === drug.en)) return;
  selectedDrugs.push(drug);
  document.getElementById('searchInput').value = '';
  closeDropdown();
  renderDrugList();
  renderResult();
}

function removeDrug(en) {
  selectedDrugs = selectedDrugs.filter(d => d.en !== en);
  renderDrugList();
  renderResult();
}

function openDropdown(results) {
  const dd = document.getElementById('dropdown');
  if (!results.length) { closeDropdown(); return; }

  dd.innerHTML = results.map((d, i) => `
    <div class="dropdown-item" data-idx="${i}">
      <div class="di-left">
        <div class="di-en">${d.en}${d.brandMatch ? ` <span style="font-weight:400;color:#9B9590">(${d.brandMatch})</span>` : ''}</div>
        <div class="di-kr">${d.kr} &middot; <span class="di-class">${d.classKR}</span></div>
      </div>
      <span class="badge badge-${d.score}">ACB ${d.score} &middot; ${d.level}</span>
    </div>
  `).join('');

  dd.querySelectorAll('.dropdown-item').forEach((el, i) => {
    el.addEventListener('click', () => addDrug(results[i]));
  });
  dd.classList.add('open');
}

function closeDropdown() {
  document.getElementById('dropdown').classList.remove('open');
  document.getElementById('dropdown').innerHTML = '';
}

function renderDrugList() {
  const el = document.getElementById('drugList');
  if (!selectedDrugs.length) {
    el.innerHTML = '<div class="drug-empty">약물을 검색해서 추가해 주세요.</div>';
    return;
  }
  el.innerHTML = selectedDrugs.map(d => `
    <div class="drug-item">
      <div class="di-name">
        <div class="di-name-en">${d.en}</div>
        <div class="di-name-kr">${d.kr}</div>
      </div>
      <span class="di-class-tag">${d.classKR}</span>
      <span class="badge badge-${d.score}">ACB ${d.score}</span>
      <button class="remove-btn" onclick="removeDrug('${d.en}')" title="제거">✕</button>
    </div>
  `).join('');
}

function scorePips(score) {
  return [1,2,3].map(i => {
    const filled = i <= score;
    const cls = filled ? `pip-filled-${score}` : 'pip-empty';
    return `<div class="ds-pip ${cls}"></div>`;
  }).join('');
}

function getRiskInfo(total) {
  if (total === 0) return { cls:'rh-safe',   label:'안전합니다 😊 처방대로 복용하세요.',          tl:'green'  };
  if (total === 1) return { cls:'rh-low',    label:'안전합니다 😊 처방대로 복용하세요.',          tl:'green'  };
  if (total === 2) return { cls:'rh-medium', label:'약 복용 주의! ⚠️ 전문가와 상담하세요.',      tl:'yellow' };
  return               { cls:'rh-high',   label:'약 복용 위험!! 🚨 즉시 조정이 필요합니다.',  tl:'red'    };
}

function trafficLightHTML(color) {
  const g = color === 'green'  ? 'on-green'  : 'off';
  const y = color === 'yellow' ? 'on-yellow' : 'off';
  const r = color === 'red'    ? 'on-red'    : 'off';
  return `<div class="traffic">
    <div class="tl-dot ${r}"></div>
    <div class="tl-dot ${y}"></div>
    <div class="tl-dot ${g}"></div>
  </div>`;
}

function renderResult() {
  const section = document.getElementById('resultSection');
  const card    = document.getElementById('resultCard');

  if (!selectedDrugs.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const total   = selectedDrugs.reduce((s, d) => s + d.score, 0);
  const risk    = getRiskInfo(total);
  const pct     = Math.min((total / Math.max(total, 6)) * 100, 100);
  const barColor = risk.cls === 'rh-safe' || risk.cls === 'rh-low' ? '#2D6A30'
                 : risk.cls === 'rh-high' ? '#C0392B' : '#D4A017';
  const needsReview = total >= 3;

  const dsRows = selectedDrugs.map(d => `
    <div class="ds-row">
      <span class="ds-en">${d.en}</span>
      <span class="ds-kr">${d.kr}</span>
      <div class="ds-bar">${scorePips(d.score)}</div>
      <span class="badge badge-${d.score}">+${d.score}</span>
    </div>
  `).join('');

  const totalColor = risk.cls === 'rh-safe' || risk.cls === 'rh-low' ? 'var(--green)'
                   : risk.cls === 'rh-high' ? 'var(--red)' : 'var(--yellow)';

  let recHTML = '';
  if (needsReview) {
    const highDrugs = selectedDrugs.filter(d => d.score >= 2);
    const recItems = highDrugs.map(d => {
      const alts = ALTERNATIVE_MAP[d.en] || [];
      const altHTML = alts.length
        ? alts.map(a => `<span class="alt-pill">${a}</span>`).join('')
        : `<span class="no-alt">대체 약물 없음 — 의료진 상담 필요</span>`;
      return `
        <div class="rec-drug">
          <div class="rec-drug-title">
            <span class="badge badge-${d.score}">ACB ${d.score}</span>
            <span class="rec-drug-name">${d.en}</span>
            <span class="rec-drug-kr">${d.kr}</span>
          </div>
          <div class="alt-pills">${altHTML}</div>
        </div>`;
    }).join('');

    recHTML = `
      <div class="rec-section">
        <div class="rec-header">
          <span class="rec-header-icon">⚠</span>
          <span class="rec-header-text">총점 ${total}점 — 대체 약물 추천</span>
        </div>
        <div class="rec-disclaimer">
          📋 <strong>대체 약물 추천 기준:</strong> 동일한 적응증을 가지지만, 더 낮은 ACB 점수를 가진 약물을 추천합니다.<br>
          ⚠️ <strong>주의 사항:</strong> 완전히 동일한 효능을 가지는 약물이 아닙니다. 개별 환자의 상태·병용 약물·금기증에 따라 적합성이 다를 수 있으며, <strong>최종 처방 변경은 반드시 의료 전문가와 상담하세요.</strong>
        </div>
        <div class="rec-body">${recItems}</div>
      </div>`;
  }

  card.innerHTML = `
    <div class="result-header ${risk.cls}">
      <div>
        <div class="score-big">${total}<span style="font-size:24px;font-family:var(--sans);font-weight:300;">점</span></div>
        <div class="score-label">${risk.label}</div>
      </div>
      ${trafficLightHTML(risk.tl)}
    </div>
    <div class="score-bar-section">
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${barColor};"></div>
      </div>
      <div class="bar-marks">
        <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5+</span>
      </div>
    </div>
    <div class="drug-scores-section">
      <div class="ds-label">약물별 ACB 점수</div>
      ${dsRows}
      <div class="ds-total-row">
        <span>총 ACB 점수</span>
        <span style="font-size:20px;color:${totalColor};font-family:var(--serif)">${total}점</span>
      </div>
    </div>
    ${recHTML}
  `;

  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'fadeUp 0.3s ease';
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const results = searchDrug(input.value);
      if (input.value.trim()) {
        if (results.length) {
          openDropdown(results);
        } else {
          document.getElementById('dropdown').innerHTML =
            `<div class="no-result">'${input.value}' 에 해당하는 약물을 찾을 수 없습니다.</div>`;
          document.getElementById('dropdown').classList.add('open');
        }
      } else {
        closeDropdown();
      }
    }, 120);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) closeDropdown();
  });

  renderDrugList();
});
