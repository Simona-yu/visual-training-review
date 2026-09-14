const state = { training: [], activeDay: null };
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
const dayLabel = day => `Day ${String(day).padStart(2, '0')}`;

function renderList(items) {
  return `<ul class="plain-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderNotes(notes = []) {
  return notes.length ? `<div class="reference-notes">${notes.map(note => `<article class="mini"><h3>${escapeHtml(note.title)}</h3>${renderList(note.items)}</article>`).join('')}</div>` : '';
}

function renderDayNav() {
  const nav = document.querySelector('#day-nav');
  nav.innerHTML = state.training.map(item => `<button class="day-button ${item.day === state.activeDay ? 'active' : ''}" type="button" data-day="${item.day}">${dayLabel(item.day)}</button>`).join('');
  nav.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => selectDay(Number(button.dataset.day))));
}

function renderTraining(day) {
  const reviews = day.review.map(item => `<div class="review-row"><div class="review-label">${escapeHtml(item.dimension)}<span class="status status-${escapeHtml(item.status)}" title="${escapeHtml(item.status)}"></span></div><div><div class="mine">${escapeHtml(item.user)}</div><div class="correct">${escapeHtml(item.correct)}</div></div></div>`).join('');
  const references = (day.references || []).map(item => `<article class="card reference-card"><h3>${escapeHtml(item.title)}</h3><img class="reference-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">${renderNotes(item.notes)}</article>`).join('');
  document.querySelector('#training-content').innerHTML = `
    <article class="card training-hero"><img class="main-image" src="${escapeHtml(day.image)}" alt="${escapeHtml(day.title)} 原训练图片"><div><p class="meta">${dayLabel(day.day)} · ${escapeHtml(day.category)}${day.date ? ` · ${escapeHtml(day.date)}` : ''}</p><h2>${escapeHtml(day.title)}</h2><div class="chips">${day.topics.map(topic => `<span class="chip">${escapeHtml(topic)}</span>`).join('')}</div><div class="memory"><strong>一句话记忆</strong>${escapeHtml(day.memory)}</div></div></article>
    <article class="card"><h3>我的描述 vs 正确表达</h3><details><summary>点击展开复盘</summary><div class="review-list">${reviews}</div></details></article>
    <section class="two-column"><article class="card"><h3>今日重点</h3>${renderList(day.keyPoints)}</article><article class="card"><h3>我的弱项</h3>${day.weaknesses.length ? renderList(day.weaknesses) : '<p class="empty">本次训练未单独记录弱项。</p>'}</article></section>
    <article class="card"><h3>下次训练重点</h3><p class="next">${escapeHtml(day.nextFocus)}</p></article>${renderNotes(day.notes)}${references}`;
}

function selectDay(dayNumber) {
  state.activeDay = dayNumber;
  renderDayNav();
  renderTraining(state.training.find(item => item.day === dayNumber));
}

function groupedTerms() {
  const terms = new Map();
  state.training.forEach(day => day.topics.forEach(topic => { if (!terms.has(topic)) terms.set(topic, []); terms.get(topic).push(day.day); }));
  return [...terms.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'));
}

function renderVocabulary() {
  const entries = groupedTerms();
  document.querySelector('#vocabulary-view').innerHTML = `<article class="card"><h2>我的视觉词库</h2><p class="meta">自动聚合每次训练的关键词；点击词汇可查看出现日期。</p><div class="stat-list">${entries.map(([term, days]) => `<div class="stat-item"><button class="term-button" type="button" data-term="${escapeHtml(term)}">${escapeHtml(term)}</button><span class="days">${days.map(dayLabel).join('、')}</span></div>`).join('')}</div></article>`;
  document.querySelectorAll('[data-term]').forEach(button => button.addEventListener('click', () => { const days = groupedTerms().find(([term]) => term === button.dataset.term)[1]; window.alert(`${button.dataset.term}：${days.map(dayLabel).join('、')}`); }));
}

function renderWeaknesses() {
  const counts = new Map();
  state.training.forEach(day => day.weaknesses.forEach(item => counts.set(item, (counts.get(item) || 0) + 1)));
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
  document.querySelector('#weaknesses-view').innerHTML = `<article class="card"><h2>我的高频弱项</h2><p class="meta">根据训练数据中的“我的弱项”自动统计，按出现次数排序。</p>${entries.length ? `<div class="stat-list">${entries.map(([term, count]) => `<div class="stat-item"><span>${escapeHtml(term)}</span><span class="count">${count}</span></div>`).join('')}</div>` : '<p class="empty">暂未记录弱项。</p>'}</article>`;
}

function switchView(view) {
  document.querySelectorAll('.view').forEach(element => { element.hidden = element.id !== `${view}-view`; });
  document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
}

async function init() {
  try {
    const response = await fetch('data/training.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.training = await response.json();
    if (!Array.isArray(state.training) || !state.training.length) throw new Error('训练数据为空');
    state.training.sort((a, b) => a.day - b.day); state.activeDay = state.training[0].day;
    renderDayNav(); renderTraining(state.training[0]); renderVocabulary(); renderWeaknesses();
    document.querySelectorAll('.nav-button').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  } catch (error) {
    const target = document.querySelector('#load-error'); target.hidden = false; target.textContent = `训练数据加载失败：${error.message}`;
  }
}
init();
