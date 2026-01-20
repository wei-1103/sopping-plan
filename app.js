// app.js
'use strict';

const STORAGE_KEY = 'dream-shopping-plan-v1';

const els = {
  goalForm: document.getElementById('goalForm'),
  goalInput: document.getElementById('goalInput'),
  goalHint: document.getElementById('goalHint'),

  progressText: document.getElementById('progressText'),
  remainText: document.getElementById('remainText'),
  progressFill: document.getElementById('progressFill'),

  itemForm: document.getElementById('itemForm'),
  nameInput: document.getElementById('nameInput'),
  priceInput: document.getElementById('priceInput'),
  moodInput: document.getElementById('moodInput'),
  linkInput: document.getElementById('linkInput'),
  categoryInput: document.getElementById('categoryInput'),
  statusInput: document.getElementById('statusInput'),

  totalItems: document.getElementById('totalItems'),
  boughtItems: document.getElementById('boughtItems'),
  totalSaved: document.getElementById('totalSaved'),

  list: document.getElementById('list'),
  emptyState: document.getElementById('emptyState'),

  toast: document.getElementById('toast'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  filterSelect: document.getElementById('filterSelect'),
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatMoney(n) {
  const num = Number.isFinite(n) ? n : 0;
  return num.toLocaleString('zh-Hant-TW');
}

function safeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.toString();
  } catch {
    return '';
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { goal: 0, items: [], filter: 'all' };
    const parsed = JSON.parse(raw);
    return {
      goal: Number(parsed.goal) || 0,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      filter: parsed.filter || 'all',
    };
  } catch {
    return { goal: 0, items: [], filter: 'all' };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toast(msg) {
  els.toast.textContent = msg;
  if (!msg) return;
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => {
    els.toast.textContent = '';
  }, 1800);
}

let state = loadState();
els.filterSelect.value = state.filter || 'all';

function computeTotals() {
  const total = state.items.length;
  const bought = state.items.filter(i => i.status === '已購買').length;
  const saved = state.items
    .filter(i => i.status === '已購買')
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0);

  return { total, bought, saved };
}

function updateGoalUI(saved) {
  const goal = Number(state.goal) || 0;

  if (goal <= 0) {
    els.goalHint.textContent = '尚未設定目標。先設定一個金額，進度會在這裡顯示。';
    els.progressText.textContent = 已累積 $${formatMoney(saved)} ／目標 $0;
    els.remainText.textContent = saved > 0 ? '已累積一些了，也很棒！' : '尚未開始存';
    els.progressFill.style.width = '0%';
    return;
  }

  els.goalHint.textContent = '已設定目標金額，進度會在下方即時更新。';
  els.progressText.textContent = 已累積 $${formatMoney(saved)} ／目標 $${formatMoney(goal)};

  const remain = Math.max(goal - saved, 0);
  if (saved <= 0) {
    els.remainText.textContent = '尚未開始存';
  } else if (remain === 0) {
    els.remainText.textContent = '已達成目標！太讚了 ✨';
  } else {
    els.remainText.textContent = 距離目標還差 $${formatMoney(remain)}，加油！;
  }

  const pct = Math.max(0, Math.min(100, Math.round((saved / goal) * 100)));
  els.progressFill.style.width = ${pct}%;
}

function passesFilter(item) {
  const f = state.filter || 'all';
  if (f === 'all') return true;
  if (f === 'bought') return item.status === '已購買';
  if (f === 'abandoned') return item.status === '已放棄';
  if (f === 'active') return item.status !== '已購買';
  return true;
}

function render() {
  const { total, bought, saved } = computeTotals();

  els.totalItems.textContent = String(total);
  els.boughtItems.textContent = String(bought);
  els.totalSaved.textContent = formatMoney(saved);

  updateGoalUI(saved);

  // list
  const visible = state.items.filter(passesFilter);

  els.list.innerHTML = '';
  els.emptyState.style.display = visible.length === 0 ? 'block' : 'none';

  for (const item of visible) {
    const li = document.createElement('li');
    li.className = 'item';

    if (item.status === '已購買') li.classList.add('item--bought');
    if (item.status === '已放棄') li.classList.add('item--abandoned');

    const moodChip = item.mood ? <span class="chip">💭 ${escapeHtml(item.mood)}</span> : '';
    const link = item.link ? <a class="link" href="${item.link}" target="_blank" rel="noopener noreferrer">查看連結</a> : '';

    li.innerHTML = `
      <div class="item__main">
        <div class="item__title">
          <span class="item__name">${escapeHtml(item.name)}</span>
          <span class="item__price">$${formatMoney(Number(item.price) || 0)}</span>
          <span class="chip">📦 ${escapeHtml(item.category)}</span>
          ${moodChip}
        </div>
        <div class="item__meta">
          <span class="chip">狀態：${escapeHtml(item.status)}</span>
          ${link ? <span class="chip">${link}</span> : ''}
        </div>
      </div>

      <div class="item__right">
        <select data-action="status" data-id="${item.id}" aria-label="更新狀態">
          ${statusOptions(item.status)}
        </select>
        <button class="icon-btn" data-action="delete" data-id="${item.id}">刪除</button>
      </div>
    `;

    els.list.appendChild(li);
  }
}

function statusOptions(current) {
  const opts = ['觀望中', '必買', '已購買', '已放棄'];
  return opts.map(v => <option value="${v}" ${v === current ? 'selected' : ''}>${v}</option>).join('');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Events
els.goalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const goal = Number(els.goalInput.value);
  state.goal = Number.isFinite(goal) ? Math.max(0, Math.floor(goal)) : 0;
  saveState();
  toast('已設定目標 ✨');
  render();
});

els.itemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = els.nameInput.value.trim();
  const price = Number(els.priceInput.value);
  const mood = els.moodInput.value;
  const link = safeUrl(els.linkInput.value.trim());
  const category = els.categoryInput.value;
  const status = els.statusInput.value;

  if (!name) return toast('請輸入商品名稱');
  if (!Number.isFinite(price) || price < 0) return toast('請輸入正確價格');
  if (!category) return toast('請選擇分類');
  if (!status) return toast('請選擇狀態');

  state.items.unshift({
    id: uid(),
    name,
    price: Math.floor(price),
    mood,
    link,
    category,
    status,
    createdAt: Date.now(),
  });

  saveState();
  e.target.reset();
  // reset selects default
  els.statusInput.value = '觀望中';

  toast('已加入清單 ✨');
  render();
});

els.list.addEventListener('change', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLSelectElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (action !== 'status' || !id) return;

  const idx = state.items.findIndex(i => i.id === id);
  if (idx === -1) return;

  state.items[idx].status = target.value;
  saveState();
  render();
});

els.list.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === 'delete' && id) {
    state.items = state.items.filter(i => i.id !== id);
    saveState();
    toast('已刪除項目');
    render();
  }
});

els.clearAllBtn.addEventListener('click', () => {
  if (state.items.length === 0) return toast('清單已經是空的');
  // 不做 confirm（你如果要也可以加）
  state.items = [];
  saveState();
  toast('已清空清單');
  render();
});

els.filterSelect.addEventListener('change', () => {
  state.filter = els.filterSelect.value;
  saveState();
  render();
});

// Init
render();