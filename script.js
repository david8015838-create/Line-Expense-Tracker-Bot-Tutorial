// ── 共用：畫面下方小提示 ──
const toastEl = document.querySelector('.toast');
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ── 共用：寫入剪貼簿（含 fallback）──
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// ── 我的資料：localStorage 讀寫 ──
const VAULT_KEY = 'line-ledger-vault';
// 教學內文裡的【】佔位符 → 對應的「我的資料」欄位
const VAULT_PLACEHOLDERS = {
  'LINE Channel Access Token': 'lineToken',
  '你的試算表ID': 'spreadsheetId',
  '這段就是ID': 'spreadsheetId',
  '你的n8n網址': 'n8nUrl',
  'n8n網址': 'n8nUrl',
  '你的 Gemini API Key': 'geminiKey',
};

function loadVault() {
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveVault(state) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(state));
}

let vaultState = loadVault();

// 把程式碼區塊裡的【...】佔位符換成使用者已填寫的資料
function applyVaultSubstitution(text) {
  return text.replace(/【([^】]*)】/g, (match, key) => {
    const field = VAULT_PLACEHOLDERS[key];
    if (field && vaultState[field]) return vaultState[field];
    return match;
  });
}

// ── Copy-to-clipboard for code blocks（事件代理，涵蓋動態顯示的 node-panel 內容）──
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;

  const block = btn.closest('.code-block');
  const codeEl = block.querySelector('pre');
  const text = applyVaultSubstitution(codeEl.innerText);
  await copyToClipboard(text);

  const original = btn.dataset.label || '複製';
  btn.textContent = '已複製 ✓';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('copied');
  }, 1500);
});

// ── 內文 📋 一鍵複製按鈕（套用我的資料）──
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.inline-copy');
  if (!btn) return;

  let text;
  let missingField = null;

  if (btn.dataset.template) {
    text = btn.dataset.template.replace(/\{\{(\w+)\}\}/g, (match, field) => {
      if (!vaultState[field] && !missingField) missingField = field;
      return vaultState[field] || match;
    });
  } else {
    const field = btn.dataset.field;
    if (!vaultState[field]) missingField = field;
    text = vaultState[field];
  }

  if (missingField) {
    showToast('👇 請先在「我的資料」填寫好，再回來按一次');
    openVault();
    highlightVaultField(missingField);
    return;
  }

  await copyToClipboard(text);
  btn.textContent = '✓';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = '📋';
    btn.classList.remove('copied');
  }, 1200);
});

// ── 我的資料保險箱：彈窗開關與輸入儲存 ──
const vaultBtn = document.querySelector('.vault-btn');
const vaultOverlay = document.querySelector('.vault-overlay');
const vaultModal = document.querySelector('.vault-modal');
const vaultClose = document.querySelector('.vault-close');
const vaultClear = document.querySelector('.vault-clear');
const vaultInputs = document.querySelectorAll('[data-vault-field]');

vaultInputs.forEach((input) => {
  const field = input.dataset.vaultField;
  input.value = vaultState[field] || '';
  input.addEventListener('input', () => {
    vaultState[field] = input.value;
    saveVault(vaultState);
  });
});

function openVault() {
  vaultOverlay.classList.add('open');
  vaultModal.classList.add('open');
}

function closeVault() {
  vaultOverlay.classList.remove('open');
  vaultModal.classList.remove('open');
}

// 開啟「我的資料」並聚焦＋閃爍提示尚未填寫的欄位
function highlightVaultField(field) {
  const input = document.querySelector(`[data-vault-field="${field}"]`);
  if (!input) return;
  const wrapper = input.closest('.vault-field');
  setTimeout(() => {
    input.focus();
    wrapper.classList.add('highlight');
    setTimeout(() => wrapper.classList.remove('highlight'), 2000);
  }, 300);
}

document.querySelectorAll('.vault-reminder-btn, .vault-save-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    openVault();
    if (btn.dataset.vaultHighlight) highlightVaultField(btn.dataset.vaultHighlight);
  });
});

vaultBtn.addEventListener('click', openVault);
vaultOverlay.addEventListener('click', closeVault);
vaultClose.addEventListener('click', closeVault);

vaultClear.addEventListener('click', () => {
  if (!confirm('確定要清除所有已儲存的資料嗎？')) return;
  vaultState = {};
  saveVault(vaultState);
  vaultInputs.forEach((input) => { input.value = ''; });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeVault();
});

// ── 圖片放大 Lightbox ──
const lightboxOverlay = document.querySelector('.lightbox-overlay');
const lightboxImg = document.querySelector('.lightbox-img');

document.addEventListener('click', (e) => {
  const img = e.target.closest('.shot img, .shot-grid img');
  if (!img) return;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || '放大檢視';
  lightboxOverlay.classList.add('open');
});

lightboxOverlay.addEventListener('click', () => {
  lightboxOverlay.classList.remove('open');
  lightboxImg.src = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    lightboxOverlay.classList.remove('open');
    lightboxImg.src = '';
  }
});

// ── View 切換（開始 / 前置作業 / 互動架構圖 / 測試與完成）──
const viewLinks = document.querySelectorAll('.sidebar nav a.view-link');
const views = document.querySelectorAll('.view');

viewLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const target = link.dataset.view;

    viewLinks.forEach((l) => l.classList.toggle('active', l === link));
    views.forEach((v) => v.classList.toggle('active', v.id === target));

    window.scrollTo(0, 0);

    // 互動架構圖第一次顯示時 wrap 寬度才有值，觸發 diagram.js 重新計算縮放
    if (target === 'view-diagram') {
      window.dispatchEvent(new Event('resize'));
    }
  });
});

// ── Phase 0 checklist：點擊勾選，狀態存在 localStorage ──
const STORAGE_KEY = 'line-ledger-prereq-checklist';

function loadChecklist() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveChecklist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const checklistState = loadChecklist();
document.querySelectorAll('.prereq-check-card').forEach((card) => {
  const key = card.dataset.check;
  if (checklistState[key]) card.classList.add('done');

  card.addEventListener('click', () => {
    const isDone = card.classList.toggle('done');
    checklistState[key] = isDone;
    saveChecklist(checklistState);
  });
});

// ── Phase 0 分頁（Sheets / GCP / Gemini / LINE）──
const prereqTabs = document.querySelectorAll('.prereq-tab');
const prereqTracks = document.querySelectorAll('.prereq-track');

prereqTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    prereqTabs.forEach((t) => t.classList.toggle('active', t === tab));
    prereqTracks.forEach((track) => track.classList.toggle('active', track.dataset.track === target));
  });
});

// ── Scroll-to-top button ──
const scrollTopBtn = document.querySelector('.scroll-top');
if (scrollTopBtn) {
  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 600);
  });
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
