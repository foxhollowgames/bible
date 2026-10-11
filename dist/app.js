import { initChapterPicker } from './chapter-picker.js';
import { people, featurePortraits, wordPortraits, personProfileHtml, personIdForLabel, setPortraitMode, webpCopy, webpSourceHtml } from './portraits.js';
import { initModalDragging } from './modal-drag.js';
import { chapterFocus, chapterRoutes, chapterPoints, movementStyle } from './chapter-map.js';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const releaseVersion = '20261009.6';
const chapters = Array.from({ length: 66 }, (_, i) => i + 1);
const defaults = { chapter: 1, verse: 1, studyMode: 'read', view: 'map', perspective: 'historical', portraitMode: 'generated', date: -701, layers: { places: true, regions: true, campaigns: true, roads: false, history: false }, sidebar: 'scripture', map: { center: [32.1, 35.0], zoom: 7 } };
let state = { ...defaults, ...readSaved(), layers: { ...defaults.layers, ...(readSaved().layers || {}) } };
let data = { sources: [], passages: [], events: [], places: [], campaigns: [], ancientRoads: [], regions: [], words: [], guides: [], periods: [] };
let scripture = { translation: 'World English Bible', chapters: {} };
let map, savedScroll = 0, selectedWordButton, toastTimer, guideState = null, sidebarPersonHistory = [], entityLinkCache = {chapter:null, terms:[]};

function readSaved() { try { return JSON.parse(localStorage.getItem('isaiah-study-guide-state') || localStorage.getItem('meridian-state')) || {}; } catch { return {}; } }
function persist() { try { localStorage.setItem('isaiah-study-guide-state', JSON.stringify({ ...state, map: map ? { center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom() } : state.map })); } catch {} updateUrl(); }
function updateUrl() { const p = new URLSearchParams({ chapter: state.chapter, verse: state.verse, view: state.view, study: state.studyMode, mode: state.perspective }); history.replaceState(null, '', `#${p}`); }
function parseUrl() { const p = new URLSearchParams(location.hash.slice(1)); if (['read','map'].includes(p.get('study'))) state.studyMode = p.get('study'); for (const key of ['chapter', 'verse']) if (p.has(key) && Number(p.get(key))) state[key] = Number(p.get(key)); if (['historical','lds'].includes(p.get('mode'))) state.perspective = p.get('mode'); }
function esc(s='') { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function richText(s='') { return esc(s).replace(/\n/g, '<br>'); }
function showToast(message) { const el = $('#toast'); el.textContent = message; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 4200); }
function source(id) { return data.sources.find(s => s.id === id); }
function sourcesHtml(ids = [], numbered = false) {
  ids = [...new Set(ids)].filter(id => source(id));
  if (!ids.length) return '<p class="muted">This entry has no source link.</p>';
  const tag = numbered ? 'ol' : 'ul';
  return `<${tag} class="study-source-links">${ids.map(id => {
    const s = source(id);
    return `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a></li>`;
  }).join('')}</${tag}>`;
}

function passageFootnotes(p) {
  const ids = p?.chapter ? chapterSourceIds(p.chapter) : [...new Set([...(p?.sourceIds || []), ...(state.perspective === 'lds' ? p?.lds?.sourceIds || [] : [])])].filter(id => source(id) && !/^web(?:\d+)?$/.test(id));
  return (references = []) => [...new Set(references)].map(id => {
    const s = source(id), number = ids.indexOf(id) + 1;
    return s && number ? `<sup class="source-footnote"><a href="${esc(s.url)}" data-source-id="${esc(id)}" aria-haspopup="dialog" aria-label="Source ${number}: ${esc(s.title)}">${number}<span class="footnote-label" hidden>${esc(s.title)} · Open source details (${esc(s.type)})</span></a></sup>` : '';
  }).join('');
}

// Render outside scrolling panels so citations remain readable at panel edges.
const sourceTooltip = document.createElement('div');
sourceTooltip.id = 'sourceTooltip';
sourceTooltip.className = 'source-tooltip';
sourceTooltip.role = 'tooltip';
sourceTooltip.hidden = true;
document.body.append(sourceTooltip);
let tooltipAnchor, tooltipCloseTimer;
function hideSourceTooltip() {
  clearTimeout(tooltipCloseTimer);
  tooltipAnchor?.removeAttribute('aria-describedby');
  tooltipAnchor = null;
  sourceTooltip.hidden = true;
}
function showSourceTooltip(anchor) {
  hideSourceTooltip();
  tooltipAnchor = anchor;
  sourceTooltip.textContent = $('.footnote-label', anchor).textContent;
  anchor.setAttribute('aria-describedby', sourceTooltip.id);
  sourceTooltip.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = sourceTooltip.offsetWidth, height = sourceTooltip.offsetHeight;
  sourceTooltip.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
  sourceTooltip.style.top = `${Math.max(8, rect.top >= height + 12 ? rect.top - height - 6 : Math.min(rect.bottom + 6, innerHeight - height - 8))}px`;
}
document.addEventListener('pointerover', event => {
  const anchor = event.target.closest('.source-footnote a');
  if (anchor) showSourceTooltip(anchor);
  if (sourceTooltip.contains(event.target)) clearTimeout(tooltipCloseTimer);
});
document.addEventListener('pointerout', event => {
  if (event.target.closest('.source-footnote a, .source-tooltip')) tooltipCloseTimer = setTimeout(hideSourceTooltip, 150);
});
document.addEventListener('focusin', event => {
  const anchor = event.target.closest('.source-footnote a');
  if (anchor) showSourceTooltip(anchor); else hideSourceTooltip();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideSourceTooltip(); });
document.addEventListener('scroll', hideSourceTooltip, true);
window.addEventListener('resize', hideSourceTooltip);
function eligibleWords(verse) { return data.words.filter(w => (w.chapter == null || Number(w.chapter) === state.chapter) && (!w.verses?.length || w.verses.includes(verse.verse))); }
function matchWord(token, candidates) { const plain = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); return candidates.find(w => (w.matches || [w.label]).some(m => m.toLowerCase() === plain.toLowerCase())) || null; }
function entityLinkTerms() {
  if (entityLinkCache.chapter === state.chapter && entityLinkCache.terms.length) return entityLinkCache.terms;
  const terms = new Map();
  const add = (label, type, id, name = label) => {
    const clean = String(label || '').trim();
    if (clean.length < 3 || terms.has(clean.toLowerCase())) return;
    terms.set(clean.toLowerCase(), {label:clean, type, id, name});
  };
  for (const [id, person] of Object.entries(people)) {
    for (const label of [person.name, ...(person.linkNames || [])]) add(label, 'person', id, person.name);
  }
  for (const feature of [...data.places, ...data.regions, ...data.campaigns, ...data.events, ...data.ancientRoads]) {
    const name = mapDisplayName(feature.name || feature.title || '');
    add(name, 'feature', feature.id, name);
  }
  const words = data.words.filter(word => word.scope === 'glossary' || Number(word.chapter) === state.chapter);
  for (const word of words) for (const label of [word.label, ...(word.matches || [])]) add(label, 'word', word.id, word.label);
  entityLinkCache = {chapter:state.chapter, terms:[...terms.values()].sort((a, b) => b.label.length - a.label.length)};
  return entityLinkCache.terms;
}
function linkedEntityHtml(text = '', options = {}) {
  const excluded = new Set();
  const person = people[options.excludePersonId];
  if (person) for (const label of [person.name, ...(person.linkNames || [])]) excluded.add(label.toLowerCase());
  const terms = entityLinkTerms().filter(term => !excluded.has(term.label.toLowerCase()) && !(term.type === options.excludeType && term.id === options.excludeId));
  if (!terms.length) return esc(text);
  const byLabel = new Map(terms.map(term => [term.label.toLowerCase(), term]));
  const pattern = new RegExp(terms.map(term => term.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'giu');
  let html = '', cursor = 0;
  for (const match of String(text).matchAll(pattern)) {
    const start = match.index, end = start + match[0].length;
    if (/\p{L}|\p{N}/u.test(text[start - 1] || '') || /\p{L}|\p{N}/u.test(text[end] || '')) continue;
    const term = byLabel.get(match[0].toLowerCase());
    if (!term) continue;
    html += esc(text.slice(cursor, start));
    html += term.type === 'person'
      ? `<button type="button" class="entity-inline-link" data-person-id="${esc(term.id)}" aria-label="Open profile for ${esc(term.name)}">${esc(match[0])}</button>`
      : `<button type="button" class="entity-inline-link" data-detail-type="${term.type}" data-detail-id="${esc(term.id)}" aria-label="Open details for ${esc(term.name)}">${esc(match[0])}</button>`;
    cursor = end;
  }
  return html + esc(text.slice(cursor));
}
function linkedPersonProfileHtml(id, options = {}) {
  return personProfileHtml(id, {...options, linkHtml:text => linkedEntityHtml(text, {excludePersonId:id})}) + (people[id]?.word ? wordLanguagesHtml(people[id].word) : '');
}

async function load() {
  parseUrl();
  const results = await Promise.allSettled(['data/content.json', 'data/scripture.json', 'data/portrait-images.json'].map(p => fetch(`${p}?v=${releaseVersion}`).then(r => { if (!r.ok) throw Error(`${p} (${r.status})`); return r.json(); })));
  if (results[0].status === 'fulfilled') data = { ...data, ...results[0].value };
  if (results[1].status === 'fulfilled') scripture = results[1].value;
  if (!chapters.includes(state.chapter)) state.chapter = 1;
  if (!scripture.chapters[state.chapter]?.some(v => v.verse === state.verse)) state.verse = 1;
  state.view = 'map';
  if (!['historical','lds'].includes(state.perspective)) state.perspective = 'historical';
  if (!['generated', 'non-generated'].includes(state.portraitMode)) state.portraitMode = 'generated';
  setPortraitMode(state.portraitMode, results[2].status === 'fulfilled' ? results[2].value : {});
  if (!['read', 'map'].includes(state.studyMode)) state.studyMode = 'read';
  if (state.studyMode === 'read' || !Number.isFinite(state.date)) state.date = activePassage()?.year ?? defaults.date;
  state.sidebar = 'scripture';
  buildStaticUi(); initMap(); renderAll();
  if (results.some(r => r.status === 'rejected')) showToast('Some study notes did not load. Reload the page and try again.');
}

function ensureLayerOptions() {
  const existing = $('#layerOptions');
  if (existing) return existing;
  const toggle = $('#layerToggle'), panel = toggle?.closest('.layers');
  if (!toggle || !panel) return null;
  const options = document.createElement('div');
  options.id = 'layerOptions';
  toggle.insertAdjacentElement('afterend', options);
  return options;
}
function buildStaticUi() {
  initSettings();
  initModalDragging();
  $('#scriptureAttribution').textContent = `${scripture.translation || 'World English Bible'} · ${scripture.copyright || 'Public domain'}`;
  initScriptureResize();
  initTimelineTooltip();
  const layerOptions = ensureLayerOptions();
  if (!layerOptions) throw new Error('Map layer controls are unavailable.');
  layerOptions.innerHTML = [['places','Places','place'],['regions','Areas','region'],['campaigns','Paths','route'],['roads','Ancient roads','road'],['history','Nations','region']].map(([key,label,kind]) => `<label class="layer-option"><input type="checkbox" data-layer="${key}"><span class="layer-swatch ${kind}"></span>${label}</label>`).join('');
  $('#periods').innerHTML = (data.periods.length ? data.periods : [{id:'pre',label:'Before Isaiah',description:'Earlier eighth-century setting'},{id:'isaiah',label:'Isaiah',description:'Assyria, Judah, and Isaiah’s ministry'},{id:'post',label:'After Isaiah',description:'Later events in Babylon and Persia'}]).slice(0,3).map(p => `<button data-period="${esc(p.id)}">${esc(p.label)}<small>${esc(p.description || '')}</small></button>`).join('');
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  $('#timelineRange').addEventListener('input', e => { state.date = Number(e.target.value); renderTimeline(); drawOverlays(); persist(); });
  $('#timelineRange').addEventListener('change', () => { if (!isPassageDate()) showToast('The map now shows your date. Select Return to passage to go back.'); });
  $('#libraryDialog .dialog-close').addEventListener('click', () => hideModalPanel($('#libraryDialog')));
  $('#sourceDialog .dialog-close').addEventListener('click', () => hideModalPanel($('#sourceDialog')));
  for (const dialog of $$('dialog')) dialog.addEventListener('cancel', event => {
    event.preventDefault();
    hideModalPanel(dialog);
  });
  if (matchMedia('(max-width:720px)').matches) {
    layerOptions.classList.add('hidden');
    $('#layerToggle').setAttribute('aria-expanded', 'false');
  }
}
function initSettings() {
  const menu = $('#settingsMenu'), button = $('#settingsButton'), panel = $('#settingsPanel');
  function close(restoreFocus = false) {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open settings');
    if (restoreFocus) button.focus();
  }
  button.addEventListener('click', () => {
    if (!panel.hidden) return close();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Close settings');
  });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (!menu.contains(event.target)) close(); });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopPropagation(); close(true); }
  });
  $('#nonGeneratedPortraits').addEventListener('change', event => {
    state.portraitMode = event.target.checked ? 'non-generated' : 'generated';
    setPortraitMode(state.portraitMode);
    renderTop();
    persist();
  });
}
function initScriptureResize() {
  const divider = $('#scriptureResize'), panel = $('#scriptureSidebar'), view = $('#mapView');
  const wide = matchMedia('(min-width:1025px)');
  let drag = null, frame = 0;
  const minimum = () => wide.matches ? 280 : 220;
  const maximum = () => wide.matches ? Math.max(280, view.clientWidth - 288) : Math.max(220, view.clientHeight - 180);
  function update(size) {
    if (!view.clientWidth || !view.clientHeight) return;
    const value = Math.round(Math.max(minimum(), Math.min(maximum(), size)));
    panel.style.setProperty(wide.matches ? '--scripture-width' : '--scripture-height', `${value}px`);
    divider.setAttribute('aria-valuemax', String(maximum()));
    divider.setAttribute('aria-valuemin', String(minimum()));
    divider.setAttribute('aria-valuenow', String(value));
    divider.setAttribute('aria-valuetext', `${value} pixels`);
    return value;
  }
  function syncMode() {
    const isWide = wide.matches;
    divider.setAttribute('aria-orientation', isWide ? 'vertical' : 'horizontal');
    divider.title = isWide
      ? 'Drag left or right to resize the scripture panel. You can also use the Left and Right arrow keys.'
      : 'Drag up to enlarge the scripture panel. You can also use the Up and Down arrow keys.';
    update(isWide
      ? Number(state.scriptureWidth) || (innerWidth <= 1100 ? 365 : 432)
      : Number(state.scriptureHeight) || Math.round(view.clientHeight * 0.42));
  }
  divider.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    divider.focus();
    const bounds = panel.getBoundingClientRect();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, width: bounds.width, height: bounds.height };
    divider.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing-scripture');
  });
  divider.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (wide.matches) state.scriptureWidth = update(drag.width + e.clientX - drag.x);
    else state.scriptureHeight = update(drag.height + drag.y - e.clientY);
  });
  function finish() {
    if (!drag) return;
    drag = null;
    document.body.classList.remove('resizing-scripture');
    persist();
  }
  divider.addEventListener('pointerup', finish);
  divider.addEventListener('pointercancel', finish);
  divider.addEventListener('lostpointercapture', finish);
  divider.addEventListener('keydown', e => {
    const bounds = panel.getBoundingClientRect();
    const sizes = wide.matches
      ? { ArrowLeft: bounds.width - 20, ArrowRight: bounds.width + 20, Home: minimum(), End: maximum() }
      : { ArrowDown: bounds.height - 20, ArrowUp: bounds.height + 20, Home: minimum(), End: maximum() };
    if (!(e.key in sizes)) return;
    e.preventDefault();
    if (wide.matches) state.scriptureWidth = update(sizes[e.key]);
    else state.scriptureHeight = update(sizes[e.key]);
    persist();
  });
  new ResizeObserver(() => {
    syncMode();
  }).observe(view);
  wide.addEventListener('change', syncMode);
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
  }).observe(panel);
}
function onClick(e) {
  const citation = e.target.closest('[data-source-id]');
  if (citation) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); openSource(citation.dataset.sourceId); return;
  }
  const mode = e.target.closest('[data-study-mode]'); if (mode) { selectStudyMode(mode.dataset.studyMode); return; }
  const chapter = e.target.closest('[data-chapter]'); if (chapter) { selectChapter(Number(chapter.dataset.chapter)); return; }
  const perspective = e.target.closest('[data-perspective]'); if (perspective) { state.perspective = perspective.dataset.perspective; renderAll(); persist(); return; }
  const layer = e.target.closest('[data-layer]'); if (layer) { state.layers[layer.dataset.layer] = e.target.checked; drawOverlays(); persist(); return; }
  const person = e.target.closest('[data-person-id]'); if (person) { openPersonProfile(person.dataset.personId, person); return; }
  const detail = e.target.closest('[data-detail-type][data-detail-id]'); if (detail) { openLinkedDetail(detail.dataset.detailType, detail.dataset.detailId, detail); return; }
  const word = e.target.closest('[data-word-id]'); if (word) { openWord(data.words.find(w => w.id === word.dataset.wordId), word); return; }
  const event = e.target.closest('[data-event]'); if (event) { const ev = data.events.find(x => x.id === event.dataset.event); if (ev) selectEvent(ev); return; }
  const act = e.target.closest('[data-action]'); if (act) { performAction(act.dataset.action, act.dataset.id); return; }
  const period = e.target.closest('[data-period]'); if (period) { const p = data.periods.find(x => x.id === period.dataset.period); if (p) { state.date = Math.round((p.start + p.end) / 2); renderTimeline(); drawOverlays(); persist(); } return; }
}
function onChange(e) { if (e.target.matches('[data-layer]')) { state.layers[e.target.dataset.layer] = e.target.checked; drawOverlays(); persist(); } if (e.target.matches('[data-passage-select]')) selectPassage(e.target.value); if (e.target.matches('[data-chapter-select]')) selectChapter(Number(e.target.value)); }
function performAction(action, id) {
  if (action === 'chapter-prev' || action === 'chapter-next') { const i = chapters.indexOf(state.chapter); const next = chapters[i + (action === 'chapter-prev' ? -1 : 1)]; if (next) selectChapter(next); return; }
  if (action === 'focus-chapter') focusChapterMap();
  if (action === 'story-route') {
    const route = focusedRoutes().find(r=>r.id === id);
    if (route && map) { map.stop(); map.fitBounds(L.latLngBounds(route.points).pad(.2), {paddingTopLeft:[Math.min($('.layers').offsetWidth+35,map.getSize().x*.5),45],paddingBottomRight:[40,45],maxZoom:10,animate:!reducedMapMotion.matches}); openFeature(route,true); }
  }
  if (action === 'back-scripture') closeWord();
  if (action === 'person-profile-back') closePersonProfile();
  if (action === 'sidebar-person-back') closeSidebarPersonProfile();
  if (action === 'close-card') closeCard();
  if (action === 'toggle-layers') {
    const collapsed = $('#layerOptions').classList.toggle('hidden');
    $('#layerToggle').setAttribute('aria-expanded', String(!collapsed));
    layoutPlaceLabels();
    layoutGeographyLabels();
  }
  if (action === 'return-passage') { const p = activePassage(); if (p?.year) state.date = p.year; renderTimeline(); drawOverlays(); focusChapterMap(); persist(); }
  if (action === 'library') openLibrary();
  if (action === 'guide') startGuide(id);
  if (action === 'open-guides') { renderGuides(); persist(); }
  if (action === 'guide-list') { guideState = null; renderGuides(); $("#tourDrawer .tour-choice")?.focus(); }
  if (action === 'close-guides') hideModalPanel($('#tourDrawer'));
  if (action === 'guide-next' || action === 'guide-prev') moveGuide(action === 'guide-next' ? 1 : -1);
}
function renderAll() { renderTop(); renderView(); renderTimeline(); renderScripture(); drawOverlays(); if (lastMapChapter !== state.chapter) focusChapterMap(lastMapChapter != null); if (!$('#tourDrawer').classList.contains('hidden')) renderGuides(); }
function renderTop() {
  $$('[data-chapter]').forEach(b => b.classList.toggle('active', Number(b.dataset.chapter) === state.chapter));
  $$('[data-perspective]').forEach(b => { const active = b.dataset.perspective === state.perspective; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  $$('[data-layer]').forEach(i => i.checked = !!state.layers[i.dataset.layer]);
  $('#nonGeneratedPortraits').checked = state.portraitMode === 'non-generated';
  $('#portraitAttribution').textContent = state.portraitMode === 'non-generated'
    ? 'These old pictures are free to use. We do not know how these people looked.'
    : 'Generated portraits are illustrations. They do not establish actual appearance.';
}
function selectStudyMode(mode) {
  if (!['read', 'map'].includes(mode) || mode === state.studyMode) return;
  if (mode === 'read') {
    state.mapDate = state.date;
    state.date = activePassage()?.year ?? defaults.date;
  } else if (Number.isFinite(state.mapDate)) state.date = state.mapDate;
  state.studyMode = mode;
  hideSourceTooltip();
  closeCard();
  renderTop(); renderView(); renderTimeline(); drawOverlays(); persist();
}
function renderView() {
  const mapMode = state.studyMode === 'map';
  $('#mapView').classList.toggle('map-mode', mapMode);
  $('#scriptureSidebar').hidden = mapMode;
  $('.timeline').hidden = !mapMode;
  $$('[data-study-mode]').forEach(button => {
    const active = button.dataset.studyMode === state.studyMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#timelineTooltip').hidden = true;
  requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
}
function activePassage() { return data.passages.find(p => Number(p.chapter) === state.chapter && state.verse >= p.start && state.verse <= p.end) || data.passages.find(p => Number(p.chapter) === state.chapter); }
function selectChapter(chapter, verse = 1) { state.chapter = chapter; state.verse = verse; state.sidebar = 'scripture'; const p = activePassage(); if (p?.year) state.date = p.year; renderAll(); persist(); $('#sidebarContent').scrollTop=0; }
function selectPassage(id) { const p = data.passages.find(x => x.id === id); if (!p) return; state.chapter = Number(p.chapter); state.verse = Number(p.start); state.sidebar = 'scripture'; if (p.year != null) state.date = Number(p.year); renderAll(); persist(); showToast(`Following ${p.title || `Isaiah ${p.chapter}:${p.start}–${p.end}`}.`); }
const chapterDateBands = [
  {from:1, to:5, label:'~740 - 680 BCE'},
  {from:6, to:6, label:'~742 - 734 BCE'},
  {from:7, to:8, label:'~735 - 732 BCE'},
  {from:9, to:12, label:'~740 - 680 BCE'},
  {from:13, to:14, label:'~625 - 539 BCE'},
  {from:15, to:19, label:'~740 - 600 BCE'},
  {from:20, to:20, label:'~711 BCE'},
  {from:21, to:23, label:'~740 - 680 BCE'},
  {from:24, to:27, label:'~500 - 400 BCE'},
  {from:28, to:33, label:'~715 - 701 BCE'},
  {from:34, to:35, label:'~550 - 539 BCE'},
  {from:36, to:36, label:'~701 BCE'},
  {from:37, to:37, label:'~701 - 681 BCE'},
  {from:38, to:38, label:'~715 - 701 BCE'},
  {from:39, to:39, label:'~704 - 703 BCE'},
  {from:40, to:55, label:'~550 - 539 BCE'},
  {from:56, to:66, label:'~539 - 450 BCE'}
];
function chapterDateLabel(chapter = state.chapter) {
  return chapterDateBands.find(band => chapter >= band.from && chapter <= band.to)?.label || '~740 - 680 BCE';
}
function chapterDateHtml() {
  const label = chapterDateLabel();
  return `<p class="chapter-date" aria-label="Approximate historical or composition period: ${esc(label)}">${esc(label)}</p>`;
}
function renderScripture() {
  sidebarPersonHistory = [];
  if (state.sidebar === 'word') return renderWord();
  const verses = scripture.chapters?.[state.chapter] || [];
  const body = verses.length ? verses.map(v => renderVerse(v)).join('') : `<div class="word-view"><h2>Isaiah ${state.chapter}</h2><p>The text for this chapter is not available.</p></div>`;
  $('#sidebarContent').innerHTML = `<div class="scripture-heading"><button class="sidebar-next" data-action="chapter-prev" aria-label="Previous chapter" ${state.chapter === 1 ? 'disabled' : ''}>‹</button><div class="chapter-picker-block"><h1 class="chapter-picker"><button type="button" class="chapter-picker-trigger" aria-label="Choose Isaiah chapter, current chapter ${state.chapter}" aria-haspopup="listbox" aria-expanded="false" aria-controls="chapterPickerMenu">Isaiah ${state.chapter}<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></button></h1>${chapterDateHtml()}</div><div id="chapterPickerMenu" class="chapter-picker-menu" popover="auto" role="listbox" aria-label="Choose Isaiah chapter">${chapters.map(c => `<button type="button" role="option" aria-label="Isaiah chapter ${c}" aria-selected="${c === state.chapter}" tabindex="-1" data-value="${c}"><span>${c}</span><span class="chapter-picker-check" aria-hidden="true">${c === state.chapter ? '✓' : ''}</span></button>`).join('')}</div><button class="sidebar-next" data-action="chapter-next" aria-label="Next chapter" ${state.chapter === 66 ? 'disabled' : ''}>›</button></div>${body}`;
  initChapterPicker(document.querySelector('#sidebarContent'), state.chapter, chapters, selectChapter);
  $('#sidebarContent .verse')?.insertAdjacentHTML('beforebegin', passageContextHtml());
}
function chapterSourceIds(chapter = state.chapter) {
  return [...new Set(data.passages.filter(p => p.chapter === chapter).flatMap(p => [
    ...(p.sourceIds || []), ...(state.perspective === 'lds' ? p.lds?.sourceIds || [] : []),
    ...(p.studyNotes || []).filter(n => n.perspective !== 'lds' || state.perspective === 'lds').flatMap(n => n.sourceIds || [])
  ]))].filter(id => source(id) && !/^web(?:\d+)?$/.test(id));
}
function chapterInterviewNotesHtml() {
  if (state.perspective !== 'lds') return '';
  const cite = passageFootnotes({chapter:state.chapter});
  return data.passages.filter(p => p.chapter === state.chapter)
    .flatMap(p => p.studyNotes || []).filter(note => note.kind === 'interview-insight')
    .map(note => `<div class="interview-insight"><p><strong>${esc(note.title)}.</strong> ${esc(note.text)}${cite(note.sourceIds)}</p>${sourceMediaHtml(note.sourceIds, {images:false})}<p><strong>Try this reading.</strong> ${esc(note.application)}</p></div>`).join('');
}
function openSource(id) {
  const s = source(id); if (!s) return;
  hideSourceTooltip();
  const chapter = /^web(?:\d+)?$/.test(id) ? (id === 'web' ? state.chapter : Number(id.slice(3))) : null;
  const reading = chapter && scripture.chapters[chapter] ? `<details><summary>Read Isaiah ${chapter} here · World English Bible</summary>${scripture.chapters[chapter].map(v => `<p><b>${v.verse}</b> ${esc(v.text)}</p>`).join('')}</details>` : '';
  $('#sourceContent').innerHTML = `<h2 id="sourceDialogTitle">Source details</h2>${librarySourceHtml(s).replace(`id="library-${esc(s.id)}"`, `id="detail-${esc(s.id)}"`)}${reading}<p class="source-rights">${esc(s.license || '')}</p>`;
  const dialog = $('#sourceDialog');
  // Keep the reader or guide underneath this dialog so closing returns to it.
  showModalPanel(dialog, id);
  dialog.scrollTop = 0;
  $('#sourceDialog .dialog-close').focus({preventScroll:true});
}
function passageOptions() { return data.passages.filter(p => Number(p.chapter) === state.chapter); }
function passageSelectHtml() { const entries = passageOptions(); if (entries.length < 2) return ''; const current = activePassage()?.id; return `<label class="eyebrow">Historical setting<select class="passage-select" data-passage-select>${entries.map(p => `<option value="${esc(p.id)}" ${p.id === current ? 'selected' : ''}>${esc(p.start)}–${esc(p.end)} · ${esc(p.title || p.dateLabel || 'Passage context')}</option>`).join('')}</select></label>`; }
function passageContextHtml() {
  const passages = data.passages.filter(p => p.chapter === state.chapter);
  const p = passages[0]; if (!p) return '';
  const cite = passageFootnotes(p);
  const ids = [...new Set(passages.flatMap(p => p.sourceIds || []))];
  const reflection = state.perspective === 'lds' ? `<h3>LDS lens</h3><p>${esc(p.lds?.text || '')}${cite(p.lds?.sourceIds)}</p>${sourceInsightsHtml(passages.flatMap(item => item.lds?.sourceIds || []))}` : '';
  return `<section class="passage-context chapter-introduction" aria-label="Chapter introduction"><h2>${esc(p.title)}</h2><div class="passage-prose"><p>${esc(p.summary)}${cite(ids)}</p>${chapterEvidenceHtml()}${sourceInsightsHtml(ids)}${reflection}${chapterInterviewNotesHtml()}</div>${mapStoryHtml()}</section>`;
}
function passageInterpretationHtml() {
  if (state.perspective !== 'lds') return '';
  const p = activePassage(), cite = passageFootnotes(p);
  return `<section class="passage-interpretation"><h3>LDS reading</h3><p class="translation">${p ? `Isaiah ${esc(String(p.chapter))}:${esc(String(p.start))}–${esc(String(p.end))} · ${esc(p.title || '')}` : `Isaiah ${state.chapter}`}</p><div class="passage-prose"><p>${esc(p?.lds?.text || 'This passage has no LDS study note yet.')}${cite(p?.lds?.sourceIds)}</p>${sourceInsightsHtml(p?.lds?.sourceIds)}</div></section>`;
}
function renderVerse(v, prefix = 'side') {
  const candidates = eligibleWords(v); const parts = v.text.split(/(\s+)/); const text = parts.map(part => { if (/^\s+$/.test(part)) return part; const found = matchWord(part, candidates); const label = esc(part); return found ? `<button class="word" data-word-id="${esc(found.id)}">${label}</button>` : label; }).join('');
  const passage = data.passages.find(p => p.chapter === state.chapter && p.start === v.verse);
  const refs = passage ? [...(passage.sourceIds || []), ...(state.perspective === 'lds' ? passage.lds?.sourceIds || [] : [])] : [];
  const citations = passage ? passageFootnotes(passage)(refs) : '';
  const notes = citations ? `<small class="verse-study-sources">Study sources for ${passage.start}–${passage.end}${citations}</small>` : '';
  return `<article class="verse ${v.verse === state.verse ? 'selected-verse' : ''}" id="${prefix}-verse-${v.verse}"><span class="verse-number">${v.verse}</span><span>${text}${notes}</span></article>`;
}
function openWord(word, trigger) { if (!word) return; savedScroll = $('#sidebarContent').scrollTop; const verseNode = trigger.closest('.verse'); const same = '[data-word-id="' + CSS.escape(word.id) + '"]'; const peers = verseNode ? $$(same, verseNode) : []; selectedWordButton = { verse: Number(verseNode?.id.match(/verse-(\d+)/)?.[1] || state.verse), selector: same, index: Math.max(0, peers.indexOf(trigger)) }; state.sidebar = 'word'; state.wordId = word.id; state.wordLabel = word.label; renderScripture(); $('#sidebarContent').scrollTop = 0; requestAnimationFrame(() => $('#sidebarContent .back-button')?.focus({preventScroll:true})); persist(); }
function wordReferences(word) {
  const ids = word.sourceIds || [];
  const greek = ids.filter(id => id.startsWith('lxx') || id === 'strong-greek' || id === 'byz');
  const hebrew = ids.filter(id => id === 'strong' || id === 'oshb');
  const meaning = ids.filter(id => (id === 'strong' && word.scope !== 'glossary') || id.startsWith('web'));
  const ordered = [...new Set([...greek, ...hebrew, ...ids])].filter(id => source(id));
  return { greek, hebrew, meaning, discussion: ordered, ordered, cite: passageFootnotes({ sourceIds: ordered }) };
}
function wordLanguagesHtml(word) {
  const refs = wordReferences(word), cite = refs.cite, greekBook = word.language === 'greek';
  return `<div class="word-section word-languages"><div class="word-language-grid"><div class="word-language"><h3>${greekBook ? 'Greek' : 'Greek (Septuagint)'}</h3>${word.greek ? `<p class="term" lang="grc">${esc(word.greek)}${cite(refs.greek)}</p>${word.greekTransliteration ? `<p>${esc(word.greekTransliteration)}</p>` : ''}` : '<p>No Greek match was found.</p>'}</div><div class="word-language word-language-hebrew"><h3>Hebrew</h3>${word.hebrew ? `<p class="term hebrew-term"><bdi lang="he" dir="rtl">${esc(word.hebrew)}</bdi>${cite(refs.hebrew)}</p><p>${esc(word.transliteration || '')}</p>` : `<p>${greekBook ? 'This book has no Hebrew text.' : 'No Hebrew match was found.'}</p>`}</div></div>${word.greek && word.greekNote ? `<p class="word-language-note">${esc(word.greekNote)}${cite(refs.greek)}</p>` : ''}${word.languageNote ? `<p class="word-language-note">${esc(word.languageNote)}</p>` : ''}</div>`;
}
function wordStudyBodyHtml(word, title = word?.label || 'Selected word') {
  const personId = personIdForLabel(title);
  let html = personId ? linkedPersonProfileHtml(personId) : `<h2>${esc(title)}</h2>${wordPortraits(title)}`;
  if (!word) html += `<p class="translation">No study note yet</p><div class="word-section"><p>This word has no study note yet. The app does not give a Hebrew or Greek match for it.</p></div>`;
  else {
    const refs = wordReferences(word), cite = refs.cite;
    html += wordLanguagesHtml(word);
    if (word.meaning) html += `<div class="word-section"><h3>${word.scope === 'dictionary' ? 'Dictionary meaning' : word.scope === 'glossary' ? 'Plain meaning' : 'Meaning in this passage'}</h3><p>${linkedEntityHtml(word.meaning, {excludeType:'word', excludeId:word.id}).replace(/\n/g, '<br>')}${cite(refs.meaning)}</p></div>`;
    if (word.discussion) html += `<div class="word-section"><h3>Study note</h3><p>${linkedEntityHtml(word.discussion, {excludeType:'word', excludeId:word.id}).replace(/\n/g, '<br>')}${cite(refs.discussion)}</p></div>`;

    if (word.related?.length) html += `<div class="word-section"><h3>Related use</h3>${word.related.map(r => `<a class="source-link" target="_blank" rel="noopener" href="${esc(r.url)}">${esc(r.label)} — ${esc(r.note || '')}</a>`).join('')}</div>`;
    html += sourceInsightsHtml(refs.ordered);
    html += `<div class="word-section"><h3>Sources</h3>${sourcesHtml(refs.ordered, true)}</div>`;
  }
  return html;
}
function renderWord() {
  const word = data.words.find(w => w.id === state.wordId); const title = word?.label || state.wordLabel || 'Selected word';
  $('#sidebarContent').innerHTML = `<section class="word-view"><button class="back-button" data-action="back-scripture">← Back to scripture</button>${wordStudyBodyHtml(word, title)}</section>`;
}
function closeWord() { const restore = selectedWordButton; state.sidebar = 'scripture'; renderScripture(); persist(); requestAnimationFrame(() => { $('#sidebarContent').scrollTop = savedScroll; const verse = $(`#side-verse-${restore?.verse}`); const button = verse ? $$(restore.selector, verse)[restore.index] : null; button?.focus({ preventScroll: true }); }); }
function scrollVerse(verse, focus = true) {
  const number = Number(verse);
  if (!scripture.chapters[state.chapter]?.some(v => v.verse === number)) return;
  state.verse = number;
  $$('#sidebarContent .verse').forEach(el => el.classList.toggle('selected-verse', el.id === `side-verse-${number}`));
  const el = $(`#side-verse-${number}`);
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (focus) $('button', el)?.focus({preventScroll:true});
  }
  renderTop(); persist();
}
function isPassageDate() { const p = activePassage(); return !p?.year || state.date === p.year; }
function renderTimeline() {
  const p = activePassage(), follow = isPassageDate();
  $('#timelineRange').value = state.date;
  $('#timelineRange').setAttribute('aria-valuetext', `${Math.abs(state.date)} BCE`);
  $('#timelineChapter').textContent = state.studyMode === 'map' ? 'Historical map' : `Isaiah ${state.chapter}`;
  $('#dateLabel').value = state.studyMode === 'map' ? `${Math.abs(state.date)} BCE` : p?.year == null ? 'Date not known' : follow && p?.dateLabel ? p.dateLabel : `${Math.abs(state.date)} BCE`;
  $('#returnPassage').classList.toggle('hidden', follow || !p?.year);
  $('#timelineTooltip').textContent = `${Math.abs(state.date)} BCE`;
}
function initTimelineTooltip() {
  const range = $('#timelineRange'), tooltip = $('#timelineTooltip');
  let pointerId = null;
  function position(event) {
    tooltip.textContent = `${Math.abs(Number(range.value))} BCE`;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.max(8, Math.min(event.clientX - tooltip.offsetWidth / 2, innerWidth - tooltip.offsetWidth - 8))}px`;
    tooltip.style.top = `${Math.max(8, event.clientY - tooltip.offsetHeight - 16)}px`;
  }
  function stop() { pointerId = null; tooltip.hidden = true; }
  range.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    range.setPointerCapture(pointerId);
    position(event);
  });
  range.addEventListener('pointermove', event => { if (event.pointerId === pointerId) position(event); });
  range.addEventListener('pointerup', stop);
  range.addEventListener('pointercancel', stop);
  range.addEventListener('lostpointercapture', stop);
  range.addEventListener('blur', stop);
  window.addEventListener('blur', stop);
}
function eventsNear(year, range = 10) { return data.events.filter(e => Math.abs(Number(e.year) - year) <= range).sort((a,b) => Math.abs(a.year-year)-Math.abs(b.year-year)); }
function selectEvent(event) { state.date = Number(event.year); renderTimeline(); drawOverlays(); persist(); openFeature(event, true, null); }
function findFeature(id) { return [...data.places, ...data.events, ...data.campaigns, ...data.ancientRoads, ...data.regions, ...focusedRoutes(), ...chapterImpacts(), ...chapterAreas()].find(f => f.id === id); }
function featureType(f) { return f.narrativeRegion ? 'Map area' : f.impact ? 'Loss or pain' : f.chapterRoute || f.textRoute ? 'Chapter path' : data.ancientRoads.includes(f) ? 'Major road' : data.campaigns.includes(f) ? 'Army path' : data.regions.includes(f) ? (f.typeLabel || 'Area of rule') : data.places.includes(f) ? 'Place' : 'Event'; }
function mapDisplayText(text = '') {
  const footerCovered = /\b(?:map|line|connection|route|road|itinerary|coordinate|pin|location|border|area of influence|travel order|sequence of (?:movement|stops))\b/i;
  const caveat = /\b(?:approximate|schematic|representative|precise|exact|verified|confirmed|unknown|uncertain|does not (?:establish|show|trace|identify|reconstruct)|not (?:a|an|the)|remain debated)\b/i;
  return text.split(/(?<=[.!?])\s+/).filter(sentence => !(footerCovered.test(sentence) && caveat.test(sentence))).join(' ').trim();
}
function mapDisplayName(name = '') {
  return name.replace(/ · (?:approximate(?: regional influence)?|regional focus|uncertain site)$/i, '');
}
const modalOpeningAnimations = new WeakMap();
const modalContentKeys = new WeakMap();
function showModalPanel(panel, contentKey) {
  const isDialog = panel.tagName === 'DIALOG';
  const wasClosed = isDialog ? !panel.open : panel.classList.contains('hidden');
  const contentChanged = contentKey !== undefined && modalContentKeys.get(panel) !== contentKey;
  modalContentKeys.set(panel, contentKey);
  if (!wasClosed && !contentChanged) return;
  if (wasClosed) {
    if (isDialog) panel.showModal();
    else panel.classList.remove('hidden');
  }
  // Shared panels also animate when another item replaces their content.
  modalOpeningAnimations.get(panel)?.cancel();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animation = panel.animate([
    { opacity: 0, scale: '.94' },
    { opacity: 1, scale: '1' }
  ], { duration: 180, easing: 'ease-in-out' });
  modalOpeningAnimations.set(panel, animation);
}
function hideModalPanel(panel) {
  modalOpeningAnimations.get(panel)?.cancel();
  if (panel.tagName === 'DIALOG') panel.close();
  else panel.classList.add('hidden');
}
// Keep floating study windows mutually exclusive without restoring old focus.
function openStudyModal(id, contentKey) {
  hideSourceTooltip();
  try {
    for (const modal of $$('#contextCard, #tourDrawer, dialog')) {
      if (modal.id === id) continue;
      hideModalPanel(modal);
    }
    const modal = $('#' + id);
    if (id === 'contextCard') modal.style.translate = '';
    showModalPanel(modal, contentKey);
  } finally {
    syncMapSelection();
  }
}
function focusPathVerse(feature) {
  if (!feature.chapterRoute && !feature.textRoute && !data.campaigns.includes(feature)) return;
  const chapter = Number(feature.chapter), verse = Number(feature.verse);
  if (!scripture.chapters[chapter]?.some(v => v.verse === verse)) return;
  if (chapter !== state.chapter) return;
  if (state.sidebar !== 'scripture') { state.sidebar = 'scripture'; renderScripture(); }
  scrollVerse(verse, false);
}
function sourceMediaHtml(ids = [], options = {}) {
  const images = new Set(), chapter = options.chapter ?? state.chapter;
  return [...new Set(ids)].map(id => {
    const item = source(id);
    if (!item) return '';
    const showImage = options.images !== false && item.image && !images.has(item.image.src);
    if (showImage) images.add(item.image.src);
    const excerpt = options.quotes === false ? null : item.excerpt;
    const showExcerpt = excerpt && (!excerpt.chapters || excerpt.chapters.includes(Number(chapter)) || options.allExcerpts);
    const previewText = mapDisplayText(item.previewText || '');
    return `${showImage ? `<div class="study-evidence">${previewText ? `<p>${esc(previewText)}</p>` : ''}${sourceImageHtml(item.image)}</div>` : ''}${showExcerpt ? `<figure class="study-quotation"><blockquote cite="${esc(excerpt.url || item.url)}">${esc(excerpt.text)}</blockquote><figcaption>${esc(excerpt.attribution)}<br><a href="${esc(excerpt.url || item.url)}" target="_blank" rel="noopener">${esc(excerpt.location)} ↗</a></figcaption>${excerpt.context ? `<p>${esc(excerpt.context)}</p>` : ''}</figure>` : ''}`;
  }).join('');
}
function sourceInsightsHtml(ids = [], chapter = state.chapter) {
  const seen = new Set();
  return [...new Set(ids)].map(id => {
    const item = source(id);
    if (!item || /^(web\d*|geo|earth|strong|oshb|lxx\d+)$/.test(id)) return '';
    if (seen.has(id)) return '';
    seen.add(id);
    if (item.group === 'conference-year' && !item.scriptureReferences?.some(ref => {
      const match = ref.label.match(/Isaiah\s+(\d+)(?=\D|$)/i);
      return match ? Number(match[1]) === Number(chapter) : Number(chapter) === 61 && /Luke 4:18/.test(ref.label);
    })) return '';
    const related = item.chapterCoverage && !item.chapterCoverage.includes(Number(chapter));
    const context = mapDisplayText((related ? `This lesson covers nearby chapters, not Isaiah ${chapter}. ` : '') + (item.studyText || item.summary || ''));
    const note = context && !item.image ? `<p class="source-insight">${esc(context)} <a class="source-inline-citation" href="${esc(item.url)}" data-source-id="${esc(id)}" aria-haspopup="dialog">${esc(item.author || item.title)}</a></p>` : '';
    const cited = (item.citedSourceIds || []).filter(id => !ids.includes(id) && !seen.has(id)).map(source).filter(Boolean);
    cited.forEach(work => seen.add(work.id));
    const supporting = cited.map(work => `<p class="source-insight">${esc(mapDisplayText(work.summary))} <a class="source-inline-citation" href="${esc(work.url)}" data-source-id="${esc(work.id)}" aria-haspopup="dialog">${esc(work.author || work.title)}</a></p>`).join('');
    return note + sourceMediaHtml([id], {chapter}) + supporting;
  }).join('');
}
function scriptureExcerptHtml(chapter, verse, context = '') {
  const reading = scripture.chapters[chapter]?.find(item => item.verse === Number(verse));
  if (!reading) return '';
  const url = `https://ebible.org/engwebp/ISA${String(chapter).padStart(2, '0')}.htm#V${Number(verse)}`;
  return `<figure class="study-quotation scripture-excerpt"><blockquote cite="${esc(url)}">${esc(reading.text)}</blockquote><figcaption><a href="${esc(url)}" target="_blank" rel="noopener">Isaiah ${Number(chapter)}:${Number(verse)} ↗</a> · World English Bible · Public domain</figcaption>${context ? `<p>${esc(context)}</p>` : ''}</figure>`;
}
function chapterEvidenceHtml(chapter = state.chapter) {
  const study = data.chapterStudies?.find(item => item.chapter === Number(chapter));
  return study ? scriptureExcerptHtml(study.chapter, study.verse, study.context) : '';
}
function placeVerseInChapter(feature, chapter = state.chapter) {
  if (!data.places?.some(place => place.id === feature.id)) return null;
  const name = (feature.name || '').split(' · ')[0];
  const nameWords = name.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return (scripture.chapters[chapter] || []).find(item => {
    const words = item.text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    return nameWords.length && words.some((_, index) => nameWords.every((word, offset) => words[index + offset] === word));
  }) || null;
}
function sourceChapters(id) {
  const item = source(id);
  const reviewed = data.studySourceReview?.find(entry => entry.sourceId === id)?.chapters || [];
  const webChapter = id === 'web' ? 36 : id.match(/^web(\d+)$/)?.[1];
  return [...new Set([...(item?.chapterCoverage || []), ...reviewed, ...(webChapter ? [Number(webChapter)] : [])].map(Number))];
}
function genericPlaceDescription(feature) {
  const name = mapDisplayName(feature.name || feature.title);
  const chapterSpecific = /\b(?:Isaiah|chapter|passage|prophecy|speaker|speech|account|narrative)\b/i;
  const mapSpecific = /\b(?:marker|map|route|line|pin|coordinate)\b/i;
  const clauses = (feature.summary || '').split(/(?<=[.!?])\s+|;\s+/)
    .map(text => text.trim()).filter(text => text && !chapterSpecific.test(text) && !mapSpecific.test(text));
  if (!clauses.length) return `${name} is a place in the geographic setting of Isaiah.`;
  return clauses.map((text, index) => {
    if (index || !/^It(?:s)?\b/.test(text)) return text;
    return text.replace(/^Its\b/, `${name}’s`).replace(/^It\b/, name);
  }).join(' ');
}
function featureChapterContext(feature) {
  const isPlace = data.places?.some(place => place.id === feature.id);
  if (!isPlace || Number(feature.chapter) === state.chapter) {
    return { paragraphs:[...new Set([feature.summary, feature.detail].map(mapDisplayText).filter(Boolean))], sourceIds:feature.sourceIds || [] };
  }
  const verse = placeVerseInChapter(feature);
  const name = mapDisplayName(feature.name || feature.title);
  const paragraphs = [verse ? `Isaiah ${state.chapter}:${verse.verse} names ${name}.` : genericPlaceDescription(feature), mapDisplayText(feature.detail)].filter(Boolean);
  const sourceIds = (feature.sourceIds || []).filter(id => {
    const chapters = sourceChapters(id);
    return !chapters.length || chapters.includes(state.chapter);
  });
  const webId = state.chapter === 36 ? 'web' : `web${state.chapter}`;
  if (verse && source(webId)) sourceIds.push(webId);
  return { paragraphs, sourceIds:[...new Set(sourceIds)] };
}
function featureScriptureHtml(feature) {
  const reference = feature.reference?.match(/^Isaiah (\d+):(\d+)/);
  if (reference) return scriptureExcerptHtml(Number(reference[1]), Number(reference[2]));
  if (feature.textRoute || data.campaigns?.some(item => item.id === (feature.originalId || feature.id))) {
    return scriptureExcerptHtml(feature.chapter, feature.verse);
  }
  // A place gets a quotation only when its name occurs in the current chapter.
  if (data.places?.some(place => place.id === feature.id)) {
    const verse = placeVerseInChapter(feature);
    return verse ? scriptureExcerptHtml(state.chapter, verse.verse) : '';
  }
  return '';
}
function featureBodyHtml(feature) {
  const context = featureChapterContext(feature);
  return `<div class="feature-prose">${(context.paragraphs.length ? context.paragraphs : ['No description is available for this feature.']).map(text => `<p>${linkedEntityHtml(text, {excludeType:'feature', excludeId:feature.id})}</p>`).join('')}${featureScriptureHtml(feature)}${data.regions.includes(feature) ? '' : sourceMediaHtml(context.sourceIds, {chapter:state.chapter})}</div>`;
}
function featureDetailBodyHtml(feature) {
  const context = featureChapterContext(feature);
  const lds = state.perspective === 'lds' && feature.lds?.text ? `<div class="word-section"><h3>LDS reading</h3><p>${linkedEntityHtml(feature.lds.text, {excludeType:'feature', excludeId:feature.id})}</p>${sourceInsightsHtml(feature.lds.sourceIds)}</div>` : '';
  return `<span class="eyebrow">${featureType(feature)}</span><h2>${esc(mapDisplayName(feature.name || feature.title))}</h2>${featurePortraits(feature, state.date)}${feature.dateLabel ? `<span class="badge">${esc(feature.dateLabel)}</span>` : ''}${featureBodyHtml(feature)}${feature.word ? wordLanguagesHtml(feature.word) : ''}${lds}<div class="word-section"><h3>Sources</h3>${sourcesHtml([...context.sourceIds, ...(state.perspective === 'lds' ? feature.lds?.sourceIds || [] : [])])}</div>`;
}
function linkedDetail(type, id) {
  if (type === 'person') return people[id] ? {type, id, label:people[id].name} : null;
  if (type === 'word') { const word = data.words.find(item => item.id === id); return word ? {type, id, label:word.label, item:word} : null; }
  if (type === 'feature') { const feature = findFeature(id); return feature ? {type, id, label:mapDisplayName(feature.name || feature.title), item:feature} : null; }
  return null;
}
function detailReturnSelector(type, id) {
  return type === 'person' ? `[data-person-id="${CSS.escape(id)}"]` : `[data-detail-type="${CSS.escape(type)}"][data-detail-id="${CSS.escape(id)}"]`;
}
function linkedDetailBodyHtml(detail, backLabel, context = 'sidebar') {
  const back = `<button class="back-button person-profile-back" data-action="${context === 'context' ? 'person-profile-back' : 'sidebar-person-back'}" aria-label="Back to ${esc(backLabel)}">← Back</button>`;
  if (detail.type === 'person') return context === 'context'
    ? linkedPersonProfileHtml(detail.id, {backLabel:`Back to ${backLabel}`})
    : `<section class="word-view">${back}${linkedPersonProfileHtml(detail.id)}</section>`;
  const body = detail.type === 'word' ? wordStudyBodyHtml(detail.item, detail.label) : featureDetailBodyHtml(detail.item);
  return `<section class="word-view">${back}${body}</section>`;
}
function renderContextLinkedDetail(card, detail, backLabel) {
  card.innerHTML = `<button class="dialog-close" data-action="close-card" aria-label="Close context">×</button>${linkedDetailBodyHtml(detail, backLabel, 'context')}`;
  openStudyModal('contextCard', `${detail.type}:${detail.id}`);
  card.scrollTop = 0;
  requestAnimationFrame(() => $('.person-profile-back', card)?.focus({preventScroll:true}));
}
function openSidebarLinkedDetail(type, id, trigger) {
  const detail = linkedDetail(type, id);
  if (!detail) return;
  const content = $('#sidebarContent');
  const backLabel = $('h2', content)?.textContent?.trim() || state.wordLabel || `Isaiah ${state.chapter}`;
  sidebarPersonHistory.push({html:content.innerHTML, scrollTop:content.scrollTop, returnSelector:detailReturnSelector(type, id)});
  content.innerHTML = linkedDetailBodyHtml(detail, backLabel);
  content.scrollTop = 0;
  requestAnimationFrame(() => $('[data-action="sidebar-person-back"]', content)?.focus({preventScroll:true}));
}
function closeSidebarPersonProfile() {
  const content = $('#sidebarContent'), previous = sidebarPersonHistory.pop();
  if (!previous) return closeWord();
  content.innerHTML = previous.html;
  if (content.querySelector('.chapter-picker-trigger')) initChapterPicker(content, state.chapter, chapters, selectChapter);
  requestAnimationFrame(() => {
    content.scrollTop = previous.scrollTop;
    $(previous.returnSelector, content)?.focus({preventScroll:true});
  });
}
function openPersonProfile(personId, trigger) {
  const card = trigger?.closest('#contextCard');
  if (!card) return openSidebarLinkedDetail('person', personId, trigger);
  openContextLinkedDetail('person', personId, trigger);
}
function openLinkedDetail(type, id, trigger) {
  const card = trigger?.closest('#contextCard');
  if (!card) return openSidebarLinkedDetail(type, id, trigger);
  openContextLinkedDetail(type, id, trigger);
}
function openContextLinkedDetail(type, id, trigger) {
  const detail = linkedDetail(type, id), card = trigger?.closest('#contextCard');
  if (!detail || !card) return;
  const backLabel = $('h2', card)?.textContent?.trim() || 'previous entry';
  card._detailHistory ||= [];
  card._detailHistory.push({html:card.innerHTML, scrollTop:card.scrollTop, returnSelector:detailReturnSelector(type, id)});
  renderContextLinkedDetail(card, detail, backLabel);
}
function closePersonProfile() {
  const card = $('#contextCard'), previous = card._detailHistory?.pop();
  if (previous) {
    card.innerHTML = previous.html;
    requestAnimationFrame(() => {
      card.scrollTop = previous.scrollTop;
      $(previous.returnSelector, card)?.focus({preventScroll:true});
    });
    return;
  }
  closeCard();
}
function openFeature(f, pinned = false, origin) { if (!f) return; if (pinned) focusPathVerse(f); const card = $('#contextCard'); if (!pinned && card.dataset.pinned === 'true' && !card.classList.contains('hidden')) return; card._detailHistory = []; card.dataset.feature = f.id; card.dataset.pinned = String(pinned); card.innerHTML = `<button class="dialog-close" data-action="close-card" aria-label="Close context">×</button>${featureDetailBodyHtml(f)}`; openStudyModal('contextCard', f.id); card.scrollTop = 0; card._origin = origin?.getElement?.() || origin || card._origin; const point = origin?.getLatLng?.() || origin?.getCenter?.(); const stage = $('.map-stage'); const labelRect = origin?.getElement?.()?.matches('.city-label') ? origin.getElement().firstElementChild.getBoundingClientRect() : null; const stageRect = stage.getBoundingClientRect(); const at = labelRect ? {x:labelRect.right-stageRect.left, y:labelRect.top-stageRect.top} : point && map ? map.latLngToContainerPoint(point) : {x: stage.clientWidth / 2, y: 70}; card.style.left = `${Math.max(12, Math.min(at.x + 18, stage.clientWidth - card.offsetWidth - 12))}px`; card.style.top = `${Math.max(12, Math.min(at.y, stage.clientHeight - card.offsetHeight - 12))}px`; }
function closeCard() { const card = $('#contextCard'); if (card.classList.contains('hidden')) return; hideModalPanel(card); syncMapSelection(); card._origin?.focus?.({preventScroll:true}); }

function initMap() {
  if (!window.L) { showToast('The map did not load. Reload the page to try again.'); return; }
  const stored = state.map || defaults.map; const center = Array.isArray(stored.center) && stored.center[0] >= 8 && stored.center[0] <= 48 && stored.center[1] >= 1 && stored.center[1] <= 57 ? stored.center : defaults.map.center; const zoom = stored.zoom >= 3 && stored.zoom <= 14 ? stored.zoom : defaults.map.zoom;
  map = L.map('map', { zoomControl: false, attributionControl: true, preferCanvas: false, minZoom: 3, maxZoom: 14, zoomSnap: .25, maxBounds: [[8,1],[48,57]], maxBoundsViscosity: .8 }).setView(center, zoom);
  L.control.zoom({position:'bottomright'}).addTo(map);
  L.control.scale({position:'bottomleft',imperial:false}).addTo(map);
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('Natural Earth · Terrain: Mapzen / USGS / NOAA · Places: <a href="https://www.openbible.info/geo/">OpenBible.info</a> / <a href="https://www.openstreetmap.org/copyright">OSM contributors</a>');
  for (const [name,z] of [['base',200],['relief',220],['detail',230],['water',240],['outsideFocus',250]]) { map.createPane(name); map.getPane(name).style.zIndex=z; map.getPane(name).style.pointerEvents='none'; }
  // Remove color outside the terrain bounds. Keep story markers above this pane.
  map.getPane('outsideFocus').style.mixBlendMode = 'saturation';
  // Keep area fills and distress rings below city dots in every draw order.
  for (const [name,z] of [['areas',300],['roads',390],['routes',410],['impacts',415],['places',420],['geography',450]]) {
    map.createPane(name); map.getPane(name).style.zIndex = z;
  }
  map.getPane('geography').style.pointerEvents = 'none';
  addGeographyLabels();
  map.on('moveend', persist).on('moveend zoomend', updateRecenter).on('resize', keepChapterView).on('moveend zoomend resize', refreshMapDetails).on('dragstart zoomstart', () => { const card = $('#contextCard'); if (card.dataset.pinned !== 'true') hideModalPanel(card); });
  Promise.allSettled(['data/land.geojson','data/lakes-detail.geojson','data/relief.json','data/rivers.geojson'].map(p => fetch(p).then(r => r.json()))).then(r => {
    if (r[0].status === 'fulfilled') L.geoJSON(r[0].value, {pane:'base',interactive:false, style: { color: '#dfc990', weight: 1, fillColor: '#a4ac79', fillOpacity: 1 } }).addTo(map);
    if (r[1].status === 'fulfilled') L.geoJSON(r[1].value, {pane:'water',interactive:false, style: { color: '#81bbca', weight: 1.2, fillColor: '#155c80', fillOpacity: 1 } }).addTo(map);
    if (r[3].status === 'fulfilled') L.geoJSON(r[3].value, {pane:'water', interactive:false,
      style: f => ({color:'#4b9fbd', weight:f.properties.rank <= 5 ? 3.2 : 2.2, opacity:1})}).addTo(map);
    if (r[2].status === 'fulfilled') {
      L.imageOverlay('assets/relief.webp',r[2].value.bounds,{pane:'relief',opacity:1,interactive:false}).addTo(map);
      const [[south,west],[north,east]] = r[2].value.bounds;
      L.polygon([
        [[-85,-180],[-85,180],[85,180],[85,-180]],
        [[south,west],[north,west],[north,east],[south,east]]
      ], {pane:'outsideFocus', interactive:false, stroke:false, fillColor:'#888888',
        fillOpacity:1, fillRule:'evenodd', smoothFactor:0}).addTo(map);
      // Keep coarse tiles beneath finer layers as a fallback outside their bounds.
      const details = [r[2].value.detail, ...(r[2].value.closeDetail || [])].filter(Boolean);
      details.forEach((detail,index) => L.tileLayer(webpCopy(detail.url) || detail.url, {
        pane:'detail', bounds:detail.bounds, minZoom:detail.minZoom,
        maxNativeZoom:detail.maxNativeZoom, maxZoom:14, noWrap:true, keepBuffer:1,
        zIndex:index+1,
        errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
      }).addTo(map));
    }
  });
}
const geographyLabels = [];
function addGeographyLabels() {
  // Fixed geographic anchors keep names on their water features as the map moves.
  const labels = [
    ['Mediterranean Sea',34,32,4,0], ['Red Sea',23.5,37,4,-62],
    ['Dead Sea',31.5,35.48,7,-78], ['Sea of Galilee',32.82,35.59,8,0],
    ['Gulf of Aqaba',28.8,34.75,7,-62], ['Gulf of Suez',28.8,32.9,7,-55],
    ['Persian Gulf',27,51,4,-32], ['Black Sea',43,34,4,0],
    ['Nile',28,30.8,6,-80], ['Jordan',32.28,35.57,8,-80],
    ['Euphrates',35.2,40.5,6,35], ['Tigris',35.4,43.35,6,48]
  ];
  for (const [name,lat,lng,minZoom,angle] of labels) {
    const layer = L.marker([lat,lng], {pane:'geography',interactive:false,keyboard:false,
      icon:L.divIcon({className:'geography-label',iconSize:[0,0],iconAnchor:[0,0],
        html:`<span style="--water-angle:${angle}deg">${esc(name)}</span>`})}).addTo(map);
    layer.getElement().setAttribute('aria-hidden','true');
    const positions = name === 'Mediterranean Sea' ? [[34,32],[32,33],[35,34],[33,33]]
      : name === 'Red Sea' ? [[23.5,37],[26,35],[27.3,34.1]] : [[lat,lng]];
    geographyLabels.push({layer,minZoom,positions});
  }
}
function layoutGeographyLabels() {
  const occupied = [...labelFeatures.values()].filter(e => e.visible).map(e => e.layer.getElement().getBoundingClientRect());
  occupied.push(...$$('.layers, .leaflet-control').map(el => el.getBoundingClientRect()));
  const bounds = map.getContainer().getBoundingClientRect();
  for (const {layer,minZoom,positions} of geographyLabels) {
    const el = layer.getElement();
    el.style.visibility = 'hidden';
    if (map.getZoom() < minZoom) continue;
    for (const position of positions) {
      layer.setLatLng(position);
      const rect = el.firstElementChild.getBoundingClientRect();
      const overlaps = occupied.some(r => rect.left < r.right+5 && rect.right > r.left-5 && rect.top < r.bottom+5 && rect.bottom > r.top-5);
      if (overlaps || rect.left < bounds.left || rect.right > bounds.right || rect.top < bounds.top || rect.bottom > bounds.bottom) continue;
      el.style.visibility = 'visible';
      occupied.push(rect);
      break;
    }
  }
}
const mapFeatures = new Map(), arrowFeatures = new Map(), labelFeatures = new Map();
const reducedMapMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mapTransitionMs = 650;
// Retain each feature by identity. Interrupted fades resume from their current opacity.
function fadeMapFeature(entry, visible, done) {
  const el = entry.layer.getElement();
  const opacity = entry.animation ? getComputedStyle(el).opacity : (entry.visible ? '1' : '0');
  entry.animation?.cancel();
  entry.visible = visible;
  el.style.opacity = visible ? '1' : '0';
  el.style.pointerEvents = visible ? '' : 'none';
  if (el.hasAttribute('tabindex')) el.setAttribute('tabindex', visible ? '0' : '-1');
  el.setAttribute('aria-hidden', String(!visible));
  if (reducedMapMotion.matches || !el.animate) { entry.animation = null; done?.(); return; }
  const animation = el.animate([{opacity}, {opacity: visible ? 1 : 0}], {
    duration: visible ? mapTransitionMs : 350, easing: 'ease-in-out'
  });
  entry.animation = animation;
  animation.onfinish = () => { entry.animation = null; done?.(); };
}
function keepMapFeature(collection, key, create) {
  let entry = collection.get(key);
  if (!entry) {
    entry = {layer: create(), visible: false, animation: null};
    collection.set(key, entry);
  }
  if (!entry.visible) fadeMapFeature(entry, true);
  return entry.layer;
}
function retireMapFeatures(collection, wanted) {
  for (const [key, entry] of collection) {
    if (wanted.has(key) || !entry.visible) continue;
    fadeMapFeature(entry, false, () => {
      map.removeLayer(entry.layer);
      collection.delete(key);
    });
  }
}
reducedMapMotion.addEventListener('change', () => {
  if (!reducedMapMotion.matches) return;
  for (const collection of [mapFeatures, arrowFeatures, labelFeatures]) {
    for (const entry of collection.values()) entry.animation?.finish();
  }
  $$('.route-arrow svg').forEach(el => el.getAnimations().forEach(animation => animation.finish()));
});
function visibleAt(f) { return (f.start == null || state.date >= f.start) && (f.end == null || state.date <= f.end); }
const factions = {
  judah: { name: 'Judah', color: '#8a5908', selectedBorder: '#4d3003' },
  philistia: { name: 'Philistia', color: '#a4634f', selectedBorder: '#563126' },
  egypt: { name: 'Egypt', color: '#4f8278', selectedBorder: '#285047' },
  cush: { name: 'Cush', color: '#7b5f8e', selectedBorder: '#45334f' },
  assyria: { name: 'Assyria', color: '#ae3924', selectedBorder: '#651d11' },
  babylonia: { name: 'Babylonia', color: '#783951', selectedBorder: '#431b2d' },
  persian: { name: 'Persia', color: '#694529', selectedBorder: '#3d2718' }
};
// A book can supply its own powers in data.factions. The built-in list stays the default.
function factionById(id) { return factions[id] || data.factions?.[id]; }
function factionFor(feature) { return factionById(feature.faction || feature.id) || { name: 'Place', color: '#594530', selectedBorder: '#34271b' }; }
let lastMapChapter;
let mapHome;
// Recenter shows only after the map leaves the chapter view.
function updateRecenter() {
  const button = $('#recenterMap');
  if (!button) return;
  if (!map || !mapHome) { button.hidden = true; return; }
  const zoom = map.getZoom(), offset = map.project(map.getCenter(), zoom).distanceTo(map.project(mapHome.center, zoom));
  button.hidden = Math.abs(zoom - mapHome.zoom) < .01 && offset < 2;
}
// A resize keeps the chapter view when the reader has not moved the map.
function keepChapterView() { if (mapHome && $('#recenterMap')?.hidden) focusChapterMap(false, true); }
function focusChapterMap(animate = true, keepCard = false) {
  if (!map) return;
  const focus = chapterFocus(data, state.chapter), points = chapterPoints(data, state.chapter);
  lastMapChapter = state.chapter;
  if (!points.length) { mapHome = null; updateRecenter(); return; }
  if (!keepCard) closeCard();
  map.stop();
  map.invalidateSize({pan:false});
  const size = map.getSize();
  const panel = $('.layers').getBoundingClientRect();
  const options = { maxZoom:focus.maxZoom || 10,
    paddingTopLeft:[Math.min(panel.width + 35, size.x * .5), 50],
    paddingBottomRight:[40,50], animate:animate && !reducedMapMotion.matches, duration:.8 };
  const bounds = L.latLngBounds(points).pad(.12), target = map._getBoundsCenterZoom?.(bounds, options);
  mapHome = target && { zoom:target.zoom, center:map._limitCenter(target.center, target.zoom, map.options.maxBounds) };
  map.fitBounds(bounds, options);
}
function focusedRoutes() { return chapterRoutes(data, state.chapter); }
function chapterAreas() { return (data.narrativeRegions || []).filter(r=>chapterFocus(data,state.chapter)?.placeIds.includes(r.placeId)); }
function chapterImpacts() {
  const focus = chapterFocus(data,state.chapter);
  return (focus?.impacts || []).map(item=>{
    const place = data.places.find(p=>p.id===item.placeId);
    return {...place,id:`impact:${state.chapter}:${item.placeId}`,impact:true,
      name:`${place.name.split(' · ')[0]} · destruction or distress`,
      reference:item.reference, summary:item.description, uncertainty:focus.limits, sourceIds:focus.sourceIds};
  });
}
function mapStoryHtml() {
  const routes = focusedRoutes();
  if (!routes.length) return '';
  return `<details class="chapter-movements"><summary>Paths and facts · ${routes.length}</summary>${routes.map(r=>{const evidence=mapDisplayText(r.evidence);return `<button class="story-route" data-action="story-route" data-id="${esc(r.id)}"><i style="background:${movementStyle(r).color}"></i><span>${esc(r.title)}<small>${esc(movementStyle(r).label)}${evidence ? ` · ${esc(evidence)}` : ''}</small></span></button>`;}).join('')}</details>`;
}
function displayedCampaigns() {
  return state.studyMode === 'map' ? data.campaigns.filter(visibleAt) : focusedRoutes();
}
function chapterPlaceVisible(p) { return !p.chapterLocation || chapterFocus(data, state.chapter)?.placeIds.includes(p.id); }
function placeMentionedInChapter(place) { return !!placeVerseInChapter(place, state.chapter); }
function regionMentionedInChapter(region) {
  const text = (scripture.chapters[state.chapter] || []).map(verse => verse.text).join(' ');
  const patterns = {
    judah: /\bJudah\b/i,
    philistia: /\bPhilist(?:ia|ines?)\b/i,
    'egypt-region': /\bEgypt(?:ian|ians)?\b/i,
    'cush-region': /\b(?:Cush|Ethiopia|Tirhakah)\b/i,
    assyria: /\bAssyria(?:n|ns)?\b/i,
    'babylonia-early': /\bBabylon(?:ia|ian|ians)?\b/i,
    babylonia: /\bBabylon(?:ia|ian|ians)?\b/i,
    persian: /\b(?:Persia|Persian|Cyrus)\b/i
  };
  return (region.pattern ? new RegExp(region.pattern, 'i') : patterns[region.id])?.test(text) || false;
}
function drawOverlays() {
  if (!map) return;
  const wanted = new Set();
  const feature = (key, create, info) => {
    wanted.add(key);
    return keepMapFeature(mapFeatures, key, () => {
      const layer = create().addTo(map);
      if (info) bindFeature(layer, info);
      return layer;
    });
  };
  const current = findFeature($('#contextCard').dataset.feature);
  if (current && !visibleAt(current)) hideModalPanel($('#contextCard'));
  const regions = state.layers.history ? data.regions.filter(region => visibleAt(region) && (state.studyMode === 'map' || (!region.chapterCoverage || region.chapterCoverage.includes(state.chapter)))) : [];
  if (state.layers.regions && state.studyMode === 'read') chapterAreas().forEach(r => {
    feature(r.id,()=>L.polygon(r.points,{pane:'areas',color:'#79501b',weight:2.5,dashArray:'6 4',fillColor:'#d39a48',fillOpacity:.32,className:'chapter-area'}),r);
  });
  const campaigns = state.layers.campaigns ? displayedCampaigns() : [];
  const roads = state.layers.roads ? data.ancientRoads : [];
  regions.forEach(r => {
    const color = factionFor(r).color;
    const mentioned = regionMentionedInChapter(r);
    const layer = feature(`region:${r.id}`, () => L.polygon(r.points, { pane:'areas', color, weight: mentioned ? 2.75 : 1.5, dashArray: mentioned ? '6 4' : '3 6', fillColor: color, fillOpacity: mentioned ? .3 : .13, className: 'region-overlay' }), r);
    layer.setStyle({weight:mentioned ? 2.75 : 1.5,dashArray:mentioned ? '6 4' : '3 6',fillOpacity:mentioned ? .3 : .13});
    layer.getElement()?.classList.toggle('chapter-relevant-region', mentioned);
  });
  roads.forEach(road => {
    const dash = road.confidence === 'probable' ? '7 7' : null;
    feature(`road:${road.id}`, () => L.polyline(road.points, {pane:'roads',color:'#e1d6b8',weight:2.25,opacity:.58,dashArray:dash,interactive:false,className:'ancient-road-overlay'}));
    feature(`road-hit:${road.id}`, () => L.polyline(road.points, {pane:'roads',color:'#e1d6b8',weight:18,opacity:0,className:'ancient-road-hit'}), road);
  });
  campaigns.forEach(c => {
    const style = movementStyle(c), color = c.chapterRoute ? style.color : factionFor(c).color;
    // Keep every enabled route readable before hover or selection.
    feature(`campaign:${c.id}`, () => L.polyline(c.points, { pane:'routes', color, weight: c.chapterRoute && !c.contextRoute ? 5 : 3.5, opacity: 1, dashArray: c.chapterRoute ? style.dash : '10 7', interactive: false, className: 'campaign-overlay' }));
    feature(`hit:${c.id}`, () => L.polyline(c.points, {pane:'routes', color, weight:22, opacity:0, className:'campaign-hit'}), c);
  });
  if (state.layers.places) data.places.filter(p => state.studyMode === 'map' ? visibleAt(p) : chapterPlaceVisible(p)).forEach(p => {
    const mentioned = placeMentionedInChapter(p);
    const layer = feature(`place:${p.id}`, () => L.circleMarker([p.lat,p.lng], {pane:'places',radius:mentioned ? 6 : 4, color:mentioned ? '#fff4dc' : '#9bb2b7', weight:mentioned ? 2.5 : 1.25, fillColor:mentioned ? '#594530' : '#304c55', fillOpacity:mentioned ? 1 : .72}), p);
    layer.setRadius(mentioned ? 6 : 4);
    layer.setStyle({color:mentioned ? '#fff4dc' : '#9bb2b7',weight:mentioned ? 2.5 : 1.25,fillColor:mentioned ? '#594530' : '#304c55',fillOpacity:mentioned ? 1 : .72});
    layer.getElement()?.classList.toggle('chapter-relevant-place', mentioned);
  });
  if (state.layers.places && state.studyMode === 'read') chapterImpacts().forEach(p => {
    feature(p.id,()=>L.circleMarker([p.lat,p.lng],{pane:'impacts',radius:11,color:'#b52e26',weight:2.5,fillColor:'#c43c32',fillOpacity:.16,className:'chapter-impact'}),p);
  });
  retireMapFeatures(mapFeatures, wanted);
  const active = [...new Set([...regions, ...campaigns].map(f => f.faction || f.id))];
  $('#factionLegend').innerHTML = active.map(id => factionById(id) ? '<span><i style="background:' + factionById(id).color + '"></i>' + esc(factionById(id).name) + '</span>' : '').join('');
  $('#factionLegend').hidden = !active.length;
  const focus = chapterFocus(data, state.chapter);
  const kinds = [...new Set(campaigns.filter(c=>c.chapterRoute).map(c=>c.kind))];
  const roadKey = roads.length ? '<div class="road-key"><span><i></i>Well-supported route</span><span><i class="probable"></i>Probable route</span></div>' : '';
  $('.map-note').innerHTML = `<div class="movement-legend">${kinds.map(kind=>{const s=movementStyle({kind});return `<span><i style="background:${s.color}"></i>${s.label}</span>`;}).join('')}${focus?.impacts?.length && state.layers.places ? '<span><i class="impact-key"></i>Destruction / distress</span>' : ''}</div>${roadKey}${focus?.narrative ? `<details><summary>Map context</summary>${esc(focus.narrative)}</details>` : ''}`;
  refreshMapDetails();
}
function refreshMapDetails() {
  if (!map) return;
  const wanted = new Set();
  if (state.layers.campaigns) displayedCampaigns().filter(c => c.direction !== false).forEach(c => {
    // Work in screen pixels so arrows stay readable at every zoom level.
    const points = c.points.map(p => map.latLngToContainerPoint(p));
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1], b = points[i], dx = b.x-a.x, dy = b.y-a.y;
      const length = Math.hypot(dx,dy);
      if (length < 18) continue;
      const count = Math.max(1, Math.floor(length / 85));
      for (let j = 0; j < count; j++) {
        const t = (j + .65) / count, x = a.x + dx*t, y = a.y + dy*t;
        if (x < -15 || y < -15 || x > map.getSize().x+15 || y > map.getSize().y+15) continue;
        const angle = Math.atan2(dy,dx)*180/Math.PI;
        const key = `${c.id}:${i}:${j}`;
        wanted.add(key);
        const latlng = map.containerPointToLatLng([x,y]);
        const entering = !arrowFeatures.has(key);
        const arrow = keepMapFeature(arrowFeatures, key, () => L.marker(latlng, {interactive:false, keyboard:false, icon:L.divIcon({className:'route-arrow', iconSize:[18,18], iconAnchor:[9,9], html:'<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3 L14 9 L3 15 L6 9 Z" fill="' + (c.chapterRoute ? movementStyle(c).color : factionFor(c).color) + '" stroke="#fff0d5" stroke-width="1.2"/></svg>'})}).addTo(map));
        arrow.setLatLng(latlng);
        const svg = arrow.getElement().firstElementChild;
        svg.style.opacity = '1';
        svg.style.transform = `rotate(${angle}deg)`;
        if (entering && !reducedMapMotion.matches && svg.animate) {
          svg.animate([
            {opacity:0, transform:`rotate(${angle}deg) translateX(-24px)`},
            {opacity:1, transform:`rotate(${angle}deg) translateX(0)`}
          ], {duration:650, delay:300 * (i - 1 + t) / (points.length - 1), fill:'backwards', easing:'cubic-bezier(.22,.61,.36,1)'});
        }
      }
    }
  });
  retireMapFeatures(arrowFeatures, wanted);
  layoutPlaceLabels();
  layoutGeographyLabels();
  syncMapSelection();
}
function placePriority(place) {
  const focus = chapterFocus(data, state.chapter);
  if (focus?.focusPlaceIds.includes(place.id)) return 120;
  if (focus?.placeIds.includes(place.id)) return 100;
  const passage = activePassage();
  if (isPassageDate() && passage?.placeIds?.includes(place.id)) return 100;
  if (data.events.some(e => Math.abs(e.year-state.date) <= 6 && e.placeIds?.includes(place.id))) return 80;
  if (isPassageDate() && data.passages.some(p => p.chapter === state.chapter && p.placeIds?.includes(place.id))) return 60;
  return 0;
}
function layoutPlaceLabels() {
  const wanted = new Set();
  if (!state.layers.places) { retireMapFeatures(labelFeatures, wanted); return; }
  const size = map.getSize(), zoom = map.getZoom();
  if (!size.x || !size.y) return;
  const occupied = [];
  const mapRect = map.getContainer().getBoundingClientRect();
  // Reserve room for controls as well as other labels and city dots.
  $$('.layers, .leaflet-control').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width && r.height) occupied.push({x:r.left-mapRect.left-5,y:r.top-mapRect.top-5,w:r.width+10,h:r.height+10});
  });
  const places = data.places.filter(p => state.studyMode === 'map' ? visibleAt(p) : chapterPlaceVisible(p)).map(p => ({p, point:map.latLngToContainerPoint([p.lat,p.lng]), priority:placePriority(p)}));
  places.forEach(({p,point}) => occupied.push({id:p.id,x:point.x-6,y:point.y-6,w:12,h:12}));
  const collides = (r, id) => occupied.some(b => b.id !== id && r.x < b.x+b.w && r.x+r.w > b.x && r.y < b.y+b.h && r.y+r.h > b.y);
  places.sort((a,b) => b.priority-a.priority || a.p.name.localeCompare(b.p.name)).forEach(({p,point,priority}) => {
    if (!priority && zoom < 7) return;
    if (point.x < 0 || point.y < 0 || point.x > size.x || point.y > size.y) return;
    const existing = labelFeatures.get(p.id);
    const label = existing?.layer || leafletLabel([p.lat,p.lng], mapDisplayName(p.name), 'city-label', p);
    const el = label.getElement();
    const mentioned = placeMentionedInChapter(p);
    el.classList.toggle('relevant-label', mentioned);
    el.classList.toggle('context-label', !mentioned);
    const text = el.firstElementChild;
    const w = text.offsetWidth, h = text.offsetHeight;
    const gap = priority ? 3 : Math.max(4, 20-(zoom-7)*7);
    const offset = 8 + gap;
    const offsets = [[offset,-h/2],[-w-offset,-h/2]];
    const target = x => ({left:Math.min(-16,x), right:Math.max(16,x+w)});
    const fit = offsets.find(([x,y]) => {
      const hit = target(x);
      const r = {x:point.x+hit.left-gap,y:point.y+y-gap,w:hit.right-hit.left+gap*2,h:h+gap*2};
      return r.x >= 4 && r.y >= 4 && r.x+r.w <= size.x-4 && r.y+r.h <= size.y-4 && !collides(r,p.id);
    });
    if (!fit) { if (!existing) map.removeLayer(label); return; }
    const hit = target(fit[0]);
    el.style.width = hit.right-hit.left + 'px';
    text.style.marginLeft = fit[0]-hit.left + 'px';
    el.style.height = h + 'px';
    el.style.marginLeft = hit.left + 'px';
    el.style.marginTop = fit[1] + 'px';
    occupied.push({x:point.x+hit.left-gap,y:point.y+fit[1]-gap,w:hit.right-hit.left+2*gap,h:h+2*gap});
    wanted.add(p.id);
    keepMapFeature(labelFeatures, p.id, () => label);
  });
  retireMapFeatures(labelFeatures, wanted);
}
function syncMapSelection() {
  const card = $('#contextCard');
  const selected = !card.classList.contains('hidden') && card.dataset.pinned === 'true' ? card.dataset.feature : null;
  for (const region of data.regions) {
    const active = region.id === selected;
    const layer = mapFeatures.get(`region:${region.id}`)?.layer;
    const faction = factionFor(region);
    const mentioned = regionMentionedInChapter(region);
    layer?.setStyle({
      color:active ? faction.selectedBorder : faction.color,
      weight:active ? 3.5 : mentioned ? 2.75 : 1.5,
      dashArray:active ? null : mentioned ? '6 4' : '3 6',
      fillOpacity:active ? .45 : mentioned ? .3 : .13
    });
    const el = layer?.getElement();
    el?.style.setProperty('--selected-region-border', faction.selectedBorder);
    el?.classList.toggle('selected-region', active);
    el?.setAttribute('aria-pressed', String(active));
  }
  for (const place of data.places) {
    const active = place.id === selected;
    const relevant = chapterFocus(data, state.chapter)?.focusPlaceIds.includes(place.id);
    const marker = mapFeatures.get(`place:${place.id}`)?.layer;
    marker?.getElement()?.setAttribute('tabindex', labelFeatures.get(place.id)?.visible ? '-1' : '0');
    marker?.setRadius(active ? 8 : relevant ? 6.5 : 4);
    marker?.setStyle({color:active ? '#fff' : '#fff4dc', weight:active ? 3 : 2, fillColor:active || relevant ? '#0877c4' : '#594530'});
    for (const layer of [marker, labelFeatures.get(place.id)?.layer]) {
      const el = layer?.getElement();
      el?.classList.toggle('selected-place', active);
      el?.setAttribute('aria-pressed', String(active));
    }
  }
  for (const road of data.ancientRoads) {
    const active = road.id === selected;
    mapFeatures.get(`road:${road.id}`)?.layer.setStyle({color:'#e1d6b8',weight:active ? 4 : 2.25,opacity:active ? .92 : .58});
    mapFeatures.get(`road-hit:${road.id}`)?.layer.getElement()?.setAttribute('aria-pressed', String(active));
  }
}
function leafletLabel(latlng, label, className, feature) {
  const layer = L.marker(latlng, { interactive:!!feature, keyboard:false, icon: L.divIcon({ className: `map-text ${className}`, html: '<span>' + esc(label) + '</span>', iconSize: [0,0], iconAnchor: [0,0] }) }).addTo(map);
  if (feature) bindFeature(layer, feature);
  return layer;
}
function bindFeature(layer, feature) {
  layer.on({ click(e) { openFeature(feature, true, e.target); } });
  const el = layer.getElement?.();
  if (!el) return;
  el.classList.add('map-feature');
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${featureType(feature)}: ${feature.title || feature.name}`);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFeature(feature, true, layer);
    }
  });
}
function isLdsSource(s) { const ldsIds = new Set(data.passages.flatMap(p => p.lds?.sourceIds || [])); return ldsIds.has(s.id) || /faith|lds|church|devotional/i.test(s.type || ''); }
function librarySourceHtml(s) {
  const moments = (s.timestamps || []).map(moment => {
    const url = new URL(s.url);
    url.searchParams.set('t', `${moment.seconds}s`);
    return `<a class="source-link" target="_blank" rel="noopener" href="${esc(url.href)}">${esc(moment.label)} ↗</a>`;
  }).join('');
  const cited = (s.citedSourceIds || []).map(id => source(id)).filter(Boolean);
  const scriptureRefs = (s.scriptureReferences || []).map(ref => `<p><a target="_blank" rel="noopener" href="${esc(ref.url)}">${esc(ref.label)} ↗</a> · <a target="_blank" rel="noopener" href="${esc(ref.contextUrl)}">${esc(ref.location)} in talk ↗</a></p>`).join('');
  return `<article class="library-source" id="library-${esc(s.id)}"><a target="_blank" rel="noopener" href="${esc(s.url)}">${esc(s.title)} ↗</a><p>${esc(s.author || '')}${s.year ? ` · ${esc(s.year)}` : ''} · ${esc(s.type || 'Source')}</p>${sourceImageHtml(s.image)}${sourceMediaHtml([s.id], {images:false, allExcerpts:true})}<p><span class="badge">About this source</span> ${esc(s.summary || '')}</p>${scriptureRefs ? `<details><summary>Isaiah links</summary>${scriptureRefs}</details>` : ''}${moments ? `<details><summary>Video parts</summary>${moments}</details>` : ''}${cited.length ? `<details><summary>Sources used</summary>${cited.map(item => `<a class="source-link" href="${esc(item.url)}" data-source-id="${esc(item.id)}">${esc(item.title)} · Read source note</a>`).join('')}</details>` : ''}${s.revisionUrl ? `<p><a href="${esc(s.revisionUrl)}" target="_blank" rel="noopener">Wikipedia page we checked ↗</a> · <a href="${esc(s.licenseUrl)}" target="_blank" rel="noopener">${esc(s.license)}</a> · We made the notes shorter.</p>` : ''}${s.reviewed ? `<p><span class="badge">What we checked</span> ${esc(s.reviewed)}</p>` : ''}${s.limitations ? `<p><span class="badge">What this cannot show</span> ${esc(s.limitations)}</p>` : ''}</article>`;
}
function openLibrary() {
  const list = state.perspective === 'historical' ? data.sources.filter(s => !isLdsSource(s)) : data.sources;
  const additions = list.filter(s => s.group === 'mcclellan');
  const conference = list.filter(s => s.group === 'conference-year');
  const publicGroups = [
    ['sennacherib-prism', 'Sennacherib’s Prism', 'Museum records, a free scholarly edition, and a public-domain photograph. Compare the royal account with Isaiah 36–37.'],
    ['opening-isaiah', 'Opening Isaiah: A Harmony', 'Public sample, publisher information, and author interviews. Ann N. Madsen and Shon D. Hopkin’s study aid is separate from official Church teaching.']
  ];
  const publicHtml = publicGroups.map(([group, title, description]) => {
    const entries = list.filter(s => s.group === group);
    return entries.length ? `<section aria-label="${esc(title)}"><h3>${esc(title)}</h3><p>${esc(description)}</p>${entries.map(librarySourceHtml).join('')}</section>` : '';
  }).join('');
  const other = list.filter(s => !['mcclellan', 'conference-year', ...publicGroups.map(([group]) => group)].includes(s.group));
  const conferenceHtml = conference.length ? `<section aria-label="Recent general conference"><h3>General conference · past year</h3><p>We checked 72 talks from October 2025 and April 2026. We found ${conference.length} talks that name Isaiah or cite his words. We may not have found hints that do not name him.</p><p>Each talk links to the chapter it uses. The questions are original study prompts.</p>${['April 2026','October 2025'].map(month => { const talks = conference.filter(s => s.conference === month); return `<details><summary>${month} · ${talks.length} talks</summary>${talks.map(librarySourceHtml).join('')}</details>`; }).join('')}</section>` : '';
  const modeNotice = state.perspective === 'historical' ? 'This mode shows history sources. Select LDS to add Church sources.' : 'This mode shows history sources and Church sources.';
  $('#libraryContent').innerHTML = `<h2>Source library</h2><p class="translation">${modeNotice}</p>${publicHtml}${conferenceHtml}${additions.length ? `<section aria-label="Dan McClellan and cited scholarship"><h3>Dan McClellan and his sources</h3><p>This group has four videos and five works used in them. Each note says what we checked. It also says what the source cannot prove. The video about who wrote Isaiah links to chapter 39. The other videos help with the whole book.</p>${additions.map(librarySourceHtml).join('')}</section><h3>Other study sources</h3>` : ''}${other.map(librarySourceHtml).join('') || (additions.length || conference.length ? '' : '<p>No sources are available for this study mode.</p>')}`;
  // Scroll inside the dialog without replacing the app's chapter/verse URL state.
  $('#libraryContent').querySelectorAll('a[href^="#library-"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const target = document.getElementById(link.getAttribute('href').slice(1));
    target?.scrollIntoView({block:'start'});
    target?.querySelector('a')?.focus({preventScroll:true});
  }));
  openStudyModal('libraryDialog');
  $('#libraryDialog').scrollTop = 0;
}
function renderGuides() { const drawer = $('#tourDrawer'); openStudyModal('tourDrawer'); if (!guideState) { drawer.innerHTML = `<button class="dialog-close" data-action="close-guides" aria-label="Close guides">×</button><span class="eyebrow">Study guides</span>${passageInterpretationHtml()}<h2>Choose a study guide</h2>${data.guides.map(g => `<button class="tour-choice" data-action="guide" data-id="${esc(g.id)}"><b>${esc(g.title)}</b><span>${esc(g.description || '')}</span></button>`).join('') || '<p>No study guides are available.</p>'}`; } else renderGuideStep(); drawer.scrollTop = 0; }
function startGuide(id) { const guide = data.guides.find(g => g.id === id); if (!guide?.steps?.length) { showToast('This study guide has no steps yet.'); return; } guideState = { id, index: 0 }; openStudyModal('tourDrawer'); applyGuideStep(); }
function applyGuideStep() { const guide = data.guides.find(g => g.id === guideState?.id); const step = guide?.steps?.[guideState.index]; if (!step) return; state.chapter = Number(step.chapter || state.chapter); state.verse = Number(step.verse || state.verse); state.sidebar = 'scripture'; if (step.year != null) state.date = Number(step.year); renderAll(); renderGuideStep(); focusChapterMap(); requestAnimationFrame(() => scrollVerse(state.verse,false)); persist(); }
function sourceImageHtml(image) {
  if (!image) return '';
  return `<figure class="guide-image"><a href="${esc(image.fullUrl || image.src)}" target="_blank" rel="noopener" aria-label="${esc(image.linkLabel || 'View full-size image')}"><picture>${webpSourceHtml(image.src)}<img src="${esc(image.src)}" alt="${esc(image.alt)}" width="${Number(image.width)}" height="${Number(image.height)}" loading="lazy" decoding="async"></picture></a><figcaption>${esc(image.caption)}<br><a href="${esc(image.fullUrl || image.src)}" target="_blank" rel="noopener">${esc(image.linkLabel || 'View full-size image')} ↗</a><small><a href="${esc(image.creditUrl)}" target="_blank" rel="noopener">${esc(image.credit)}</a> · <a href="${esc(image.licenseUrl)}" target="_blank" rel="noopener">${esc(image.license)}</a> · <a href="${esc(image.sourceUrl)}" target="_blank" rel="noopener">Photo source ↗</a></small></figcaption></figure>`;
}
function guideReadingHtml(step) {
  const verses = (scripture.chapters[step.chapter] || []).filter(v => v.verse === Number(step.verse));
  const reading = verses.length ? `<section class="guide-reading"><h3>Isaiah ${Number(step.chapter)}:${Number(step.verse)}</h3><blockquote>${verses.map(v => esc(v.text)).join(' ')}</blockquote><a class="source-link" href="https://ebible.org/engwebp/ISA${String(step.chapter).padStart(2, '0')}.htm" target="_blank" rel="noopener">Read full chapter ↗</a><small>World English Bible · Public domain</small></section>` : '';
  const words = (step.wordIds || []).map(id => data.words.find(w => w.id === id)).filter(Boolean);
  return reading + words.map(w => `<section class="guide-reading"><h3>${esc(w.label)}</h3><p>${esc(w.meaning)}</p><p>${esc(w.discussion)}</p>${sourcesHtml(w.sourceIds)}</section>`).join('');
}
function renderGuideStep() { const guide = data.guides.find(g => g.id === guideState?.id); const step = guide?.steps?.[guideState.index]; if (!guide || !step) { guideState = null; return renderGuides(); } const extraSources = (step.sourceIds || []).filter(id => !/^web(?:\d+)?$/.test(id)); const sourceHtml = extraSources.length ? sourcesHtml(extraSources) : ''; $('#tourDrawer').innerHTML = `<button class="dialog-close" data-action="close-guides" aria-label="Close guide">×</button><button class="back-button guide-back" data-action="guide-list">← Back to guide list</button><p class="tour-progress">${esc(guide.title)} · Step ${guideState.index + 1} of ${guide.steps.length}</p><h2>${esc(step.title)}</h2><p>${richText(step.text || '')}</p>${sourceInsightsHtml(step.sourceIds, step.chapter)}${guideReadingHtml(step)}${sourceHtml ? `<div class="word-section"><h3>Sources</h3>${sourceHtml}</div>` : ''}${passageInterpretationHtml()}<div class="tour-nav"><button data-action="guide-prev" ${guideState.index === 0 ? 'disabled' : ''}>← Previous</button><button data-action="guide-next">${guideState.index === guide.steps.length - 1 ? 'Finish' : 'Next →'}</button></div>`; $('#tourDrawer').scrollTop = 0; }
function moveGuide(direction) { const guide = data.guides.find(g => g.id === guideState?.id); if (!guide) return; const next = guideState.index + direction; if (next < 0) return; if (next >= guide.steps.length) { showToast(`${guide.title} complete. You can continue your study.`); guideState = null; hideModalPanel($('#tourDrawer')); return; } guideState.index = next; applyGuideStep(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
$('#layerToggle').dataset.action = 'toggle-layers'; $('#libraryButton').dataset.action = 'library'; $('#tourButton').dataset.action = 'open-guides'; $('#returnPassage').dataset.action = 'return-passage';
load();
