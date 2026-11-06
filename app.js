(() => {
  'use strict';
  const data = window.GoOutData;
  const engine = window.GoOutEngine;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const paths = {
    pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    food:'<path d="M5 3v7m3-7v7M2 3v7c0 2 6 2 6 0M5 12v9M18 3c-4 4-4 10 0 10h2M20 3v18"/>',
    coffee:'<path d="M4 8h12v6a6 6 0 0 1-12 0V8Zm12 1h2a3 3 0 0 1 0 6h-2M3 21h15M7 2v3m5-3v3"/>',
    bar:'<path d="m3 3 9 10 9-10H3Zm9 10v8m-4 0h8M6 7h12"/>',
    music:'<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    sort:'<path d="M4 6h16M4 12h11M4 18h6"/>',
    like:'<path d="M7 10v11H3V10h4Zm0 0 4-7h2v6h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7"/>',
    dislike:'<path d="M7 14V3H3v11h4Zm0 0 4 7h2v-6h6a2 2 0 0 0 2-2l-2-8a2 2 0 0 0-2-2H7"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
    search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  const days = { today:'Σήμερα', tomorrow:'Αύριο', saturday:'Σάββατο' };
  const venueById = id => data.venues.find(venue => venue.id === id);
  const storageKey = 'goout-demo-v1';
  function readStorage() {
    try { const value = JSON.parse(localStorage.getItem(storageKey)); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    catch { return {}; }
  }
  const stored = readStorage();
  function safePreferences(input) {
    const prefs = clone(data.defaultPreferences);
    if (!input || typeof input !== 'object') return prefs;
    if (data.areas.includes(input.area) || input.area === 'all') prefs.area = input.area;
    if (Object.hasOwn(days, input.day)) prefs.day = input.day;
    if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) prefs.time = input.time;
    if (typeof input.budget === 'number' && input.budget >= 10 && input.budget <= 50 && input.budget % 5 === 0) prefs.budget = input.budget;
    if (Array.isArray(input.required)) prefs.required = [...new Set(input.required.filter(tag => ['food','coffee','bar'].includes(tag)))];
    if (Array.isArray(input.wanted)) prefs.wanted = [...new Set(input.wanted.filter(tag => ['outdoor','quiet','lively','live'].includes(tag)))];
    if (input.music === 'any' || Object.hasOwn(data.musicLabels, input.music)) prefs.music = input.music;
    return prefs;
  }
  const state = {
    preferences: safePreferences(stored.preferences),
    favorites: new Set(Array.isArray(stored.favorites) ? stored.favorites.filter(id => venueById(id)) : []),
    feedback: Object.fromEntries(Object.entries(stored.feedback && typeof stored.feedback === 'object' ? stored.feedback : {}).filter(([id,value]) => venueById(id) && ['like','dislike'].includes(value))),
    page:'discover', results:[], currentVenue:null
  };
  let toastTimer;
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({preferences:state.preferences,favorites:[...state.favorites],feedback:state.feedback})); }
    catch { /* The complete demo still works for this session when storage is unavailable. */ }
  }
  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 3100);
  }
  function hydrateIcons(parent=document) { $$('[data-icon]',parent).forEach(element => { element.innerHTML = icon(element.dataset.icon); }); }
  function setForm(preferences) {
    ['area','day','time','budget','music'].forEach(name => { $('#' + name).value = preferences[name]; });
    updateBudget();
    $$('[data-required]').forEach(button => setChip(button, preferences.required.includes(button.dataset.required)));
    $$('[data-wanted]').forEach(button => setChip(button, preferences.wanted.includes(button.dataset.wanted)));
    $$('[data-preset]').forEach(button => {
      const selected = preferences.required.length === 1 && preferences.required.includes(button.dataset.preset);
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }
  function setChip(button, selected) { button.classList.toggle('selected', selected); button.setAttribute('aria-pressed',String(selected)); }
  function updateBudget() {
    $('#budget-value').textContent = $('#budget').value + '€';
    $('#budget').setAttribute('aria-valuetext',$('#budget').value + ' ευρώ ανά άτομο');
  }
  function getForm() {
    return { area:$('#area').value, day:$('#day').value, time:$('#time').value, budget:Number($('#budget').value),
      music:$('#music').value, required:$$('[data-required][aria-pressed="true"]').map(button => button.dataset.required),
      wanted:$$('[data-wanted][aria-pressed="true"]').map(button => button.dataset.wanted) };
  }
  function renderCounts() { $$('.saved-count').forEach(element => { element.textContent = state.favorites.size; }); }
  function card(entry) {
    const venue = entry.venue;
    const saved = state.favorites.has(venue.id);
    const open = engine.isOpen(venue.hours,state.preferences.time);
    const reason = entry.reasons?.find(text => text.startsWith('Ταιριάζει στην')) || entry.reasons?.find(text => text.startsWith('Η κουζίνα')) || entry.reasons?.[0] || 'Κράτησέ το για μια επόμενη έξοδο.';
    const shownTags = venue.tags.filter(tag => (tag !== 'live' || engine.isOpen(venue.liveHours,state.preferences.time)) && (tag !== 'food' || engine.isOpen(venue.kitchen,state.preferences.time))).slice(0,3);
    return `<article class="venue-card" data-venue="${escape(venue.id)}">
      <div class="card-image-wrap"><a href="#venue-${escape(venue.id)}" data-detail="${escape(venue.id)}" aria-label="Δες το ${escape(venue.name)}"><img class="card-image" src="${escape(venue.image)}" alt="Ενδεικτική ατμόσφαιρα χώρου για ${escape(venue.category)}" loading="lazy" ${venue.image.includes('terrace') ? 'style="object-position:50% 60%"' : ''}></a>
      ${typeof entry.score === 'number' ? `<span class="match-badge">${icon('spark')}${entry.score}/100 ταίριασμα</span>` : ''}
      <button class="icon-button save-button ${saved?'is-saved':''}" data-save="${escape(venue.id)}" aria-label="${saved?'Αφαίρεση από':'Αποθήκευση στα'} αγαπημένα: ${escape(venue.name)}" aria-pressed="${saved}">${icon('heart')}</button></div>
      <div class="card-content"><p class="card-kicker">${icon('pin')}${escape(venue.area)} <span>·</span> ${escape(venue.category)}</p>
      <div class="card-title-line"><h3 class="card-title"><a href="#venue-${escape(venue.id)}" data-detail="${escape(venue.id)}">${escape(venue.name)}</a></h3><span class="price">${venue.price}€<small>ανά άτομο</small></span></div>
      <p class="card-description">${escape(venue.description)}</p><div class="card-tags">${shownTags.map(tag=>`<span class="card-tag">${escape(data.tagLabels[tag])}</span>`).join('')}</div>
      <p class="card-why">${icon('check')}<span>${escape(reason)}</span></p>
      <div class="card-footer"><span class="open-status ${open?'':'closed'}">${open?'Ανοιχτό':'Κλειστό'} στις ${escape(state.preferences.time)}</span><button class="detail-button" data-detail="${escape(venue.id)}">Δες περισσότερα ${icon('arrow')}</button></div></div></article>`;
  }
  function renderResults() {
    state.results = engine.recommend(state.preferences, state.feedback);
    $('#results-count').textContent = state.results.length;
    const prefs = state.preferences;
    $('#summary-title').textContent = `${prefs.area==='all'?'Όλες οι περιοχές':prefs.area} · ${days[prefs.day]}, ${prefs.time}`;
    $('#summary-subtitle').textContent = `${prefs.required.map(tag=>data.tagLabels[tag]).join(' + ') || 'Ανοιχτά μέρη'} · έως ${prefs.budget}€ / άτομο`;
    $('#active-filters').innerHTML = `<span>${icon('pin')}${escape(prefs.area==='all'?'Όλες οι περιοχές':prefs.area)}</span><span>${icon('clock')}${days[prefs.day]} · ${escape(prefs.time)}</span><span>έως ${prefs.budget}€ / άτομο</span>`;
    $('#results-grid').innerHTML = state.results.map(card).join('');
    const likes = Object.values(state.feedback).filter(value=>value==='like').length;
    let insight = prefs.required.includes('food') ? 'Οι προτάσεις έχουν ανοιχτή κουζίνα την ώρα που θα πας.' : 'Οι προτάσεις είναι ανοιχτές την ώρα που θα πας και μέσα στο budget σου.';
    if (likes) insight += ' Λάβαμε υπόψη και όσα σου αρέσουν.';
    $('#recommendation-insight').innerHTML = icon('spark') + `<span>${insight}</span>`;
    $('#recommendation-insight').hidden = !state.results.length;
    $('#results-empty').hidden = Boolean(state.results.length);
    if (!state.results.length) {
      const excluded = engine.explainExcluded(prefs).filter(entry=>prefs.area==='all'||entry.venue.area===prefs.area).slice(0,3);
      $('#results-empty').innerHTML = `<div class="empty-symbol">${icon('search')}</div><h3>Δεν βρήκαμε το σωστό ταίριασμα.</h3><p>Κρατήσαμε όλα όσα ζήτησες ως απαραίτητα. Δοκίμασε άλλη ώρα, μεγαλύτερο budget ή λιγότερους περιορισμούς.</p><div class="exclusion-list">${excluded.map(entry=>`<div class="excluded-venue"><strong>${escape(entry.venue.name)}</strong><span>${escape(entry.reasons.join(' '))}</span></div>`).join('')}</div><div class="empty-actions"><button class="primary-button" data-action="edit-filters">Άλλαξε τις επιλογές σου ${icon('arrow')}</button>${prefs.area!=='all'?'<button class="secondary-button" data-action="all-areas">Δες όλες τις περιοχές</button>':''}</div>`;
    }
  }
  function renderSaved() {
    const saved = [...state.favorites].map(id=>state.results.find(entry=>entry.venue.id===id)||{venue:venueById(id)});
    $('#saved-grid').innerHTML = saved.length ? saved.map(card).join('') : `<div class="empty-state"><div class="empty-symbol">${icon('heart')}</div><h3>Η επόμενη έξοδος ξεκινά με μια καρδιά.</h3><p>Πάτησε την καρδιά σε ένα μαγαζί που σου άρεσε. Θα το βρίσκεις εδώ, όποτε το χρειαστείς.</p><button class="primary-button" data-page="discover">Ανακάλυψε μέρη ${icon('arrow')}</button></div>`;
  }
  function renderTaste() {
    const likes=Object.entries(state.feedback).filter(([,value])=>value==='like');
    const dislikes=Object.entries(state.feedback).filter(([,value])=>value==='dislike');
    const counts = {};
    likes.forEach(([id])=>venueById(id).tags.forEach(tag=>{counts[tag]=(counts[tag]||0)+1;}));
    const tags=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).slice(0,4);
    $('#taste-content').innerHTML = `<div class="taste-layout"><div class="taste-card"><h2>Το μικρό σου προφίλ</h2><p>Οι επιλογές σου βοηθούν να ανεβαίνουν στη λίστα μέρη με παρόμοια ατμόσφαιρα, μουσική και χαρακτηριστικά.</p><div class="taste-stats"><div><strong>${likes.length}</strong><span>σου αρέσουν</span></div><div><strong>${dislikes.length}</strong><span>δεν σου ταιριάζουν</span></div><div><strong>${state.favorites.size}</strong><span>αγαπημένα</span></div></div>${tags.length?`<p>Φαίνεται να προτιμάς</p><div class="taste-tags">${tags.map(tag=>`<span>${escape(data.tagLabels[tag])}</span>`).join('')}</div>`:'<p>Άνοιξε ένα μαγαζί και πάτησε «Μου αρέσει» για να ξεκινήσεις.</p>'}<div class="privacy-note">${icon('lock')}<span>Αποθήκευση μόνο σε αυτόν τον browser.<br>Δεν χρειάζεσαι λογαριασμό.</span></div></div><div class="taste-card"><h2>Οι προτιμήσεις σου</h2><div class="feedback-list">${Object.entries(state.feedback).map(([id,value])=>{const venue=venueById(id);return `<div class="feedback-item"><img src="${escape(venue.image)}" alt="" loading="lazy"><div><strong>${escape(venue.name)}</strong><p>${value==='like'?'Μου αρέσει':'Δεν μου ταιριάζει'} · ${escape(venue.area)}</p></div><button class="icon-button" data-clear-feedback="${escape(id)}" aria-label="Αφαίρεση αξιολόγησης: ${escape(venue.name)}">${icon('close')}</button></div>`;}).join('')||'<p>Εδώ θα εμφανιστούν τα μαγαζιά που αξιολόγησες.</p>'}</div>${Object.keys(state.feedback).length?'<button class="text-button taste-reset" data-action="reset-taste">Επαναφορά όλων των αξιολογήσεων</button>':'<button class="primary-button" style="margin-top:22px" data-page="discover">Βρες την πρώτη σου πρόταση</button>'}</div></div>`;
  }
  function renderAll() { renderResults(); renderSaved(); renderTaste(); renderCounts(); }
  function switchPage(page, shouldFocus=true) {
    if (!['discover','saved','taste'].includes(page)) page='discover';
    state.page=page;
    ['discover','saved','taste'].forEach(name=>{ $('#'+name+'-page').hidden=name!==page; });
    $$('[data-page]').forEach(button=>{
      const active=button.dataset.page===page;
      button.classList.toggle('active',active);
      if(active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    if (shouldFocus) {
      $('.device-viewport').scrollTo({top:0,behavior:'instant'});
      const heading=$('#'+page+'-page h1');
      heading.setAttribute('tabindex','-1'); heading.focus({preventScroll:true});
    }
  }
  function navigate(page) {
    if (location.hash !== '#'+page) location.hash=page;
    else switchPage(page);
  }
  const dialog=$('#venue-dialog');
  const filtersDialog=$('#filters-dialog');
  function openFilters() {
    setForm(state.preferences);filtersDialog.showModal();document.body.style.overflow='hidden';
  }
  let dialogReturnElement=null;
  function focusPageHeading() {
    const heading=$('#'+state.page+'-page h1');
    heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
  }
  function showDialog() {
    if (!dialog.open) { dialogReturnElement=document.activeElement;dialog.showModal(); }
    document.body.style.overflow='hidden';
  }
  function renderVenue(id) {
    const venue=venueById(id); if(!venue) return;
    state.currentVenue=id;
    const entry=state.results.find(result=>result.venue.id===id);
    const excluded=!entry?engine.explainExcluded(state.preferences).find(result=>result.venue.id===id):null;
    const saved=state.favorites.has(id);
    const feedback=state.feedback[id];
    const open=engine.isOpen(venue.hours,state.preferences.time);
    const food=engine.isOpen(venue.kitchen,state.preferences.time);
    $('#dialog-content').innerHTML=`<img class="dialog-cover" src="${escape(venue.image)}" alt="Ενδεικτική φωτογραφία ατμόσφαιρας"><div class="dialog-body"><p class="dialog-kicker">${escape(venue.area)} · ${escape(venue.category)}</p><div class="dialog-title-row"><h2 id="dialog-title">${escape(venue.name)}</h2><span class="price">${venue.price}€<small>ενδεικτικά / άτομο</small></span></div><p class="dialog-description">${escape(venue.description)}</p><div class="dialog-tags">${venue.tags.map(tag=>`<span>${escape(data.tagLabels[tag])}</span>`).join('')}</div><div class="schedule-grid"><div class="schedule-block"><h3>${icon('clock')}Ωράριο μαγαζιού</h3><p>${escape(venue.hours.open)} – ${escape(venue.hours.close)}</p><small>${open?'Ανοιχτό':'Κλειστό'} στις ${escape(state.preferences.time)}</small></div><div class="schedule-block"><h3>${icon('food')}Ωράριο κουζίνας</h3><p>${venue.kitchen?escape(venue.kitchen.open)+' – '+escape(venue.kitchen.close):'Χωρίς κουζίνα'}</p><small>${venue.kitchen?(food?'Σερβίρει φαγητό':'Δεν σερβίρει φαγητό')+' στις '+escape(state.preferences.time):'Για καφέ ή ποτό'}</small></div>${venue.liveHours?`<div class="schedule-block"><h3>${icon('music')}Live μουσική</h3><p>${escape(venue.liveHours.open)} – ${escape(venue.liveHours.close)}</p><small>${engine.isOpen(venue.liveHours,state.preferences.time)?'Live την ώρα άφιξης':'Το live δεν συμπίπτει με την ώρα άφιξης'}</small></div>`:''}</div>
      <div class="why-panel"><h3>${entry?`Γιατί σου ταιριάζει · ${entry.score}/100`:'Για την τωρινή σου αναζήτηση'}</h3><ul>${(entry?.reasons||excluded?.reasons||['Αποθηκευμένο για μια επόμενη έξοδο.']).map(reason=>`<li>${icon(entry?'check':'info')}<span>${escape(reason)}</span></li>`).join('')}</ul>${entry?.tradeoffs.length?`<p class="tradeoff"><strong>Για να ξέρεις:</strong> ${escape(entry.tradeoffs.join(' '))}</p>`:''}</div>
      <div class="dialog-actions"><button class="primary-button" data-save="${escape(id)}" aria-pressed="${saved}">${icon('heart')}${saved?'Στα αγαπημένα σου':'Κράτησέ το στα αγαπημένα'}</button><button class="secondary-button" data-action="close-dialog">Πίσω στις επιλογές</button></div><div class="feedback-block"><p>Σου ταιριάζει αυτό το μέρος;<small>Βοήθησέ μας να βελτιώσουμε τις προτάσεις.</small></p><div class="feedback-buttons"><button class="${feedback==='like'?'selected':''}" data-feedback="like" data-id="${escape(id)}" aria-pressed="${feedback==='like'}">${icon('like')}Μου αρέσει</button><button class="${feedback==='dislike'?'selected':''}" data-feedback="dislike" data-id="${escape(id)}" aria-pressed="${feedback==='dislike'}">${icon('dislike')}Όχι τόσο</button></div></div><p class="demo-note">Φανταστικό μαγαζί για το demo. Ενδεικτικές τιμές και φωτογραφία, ίδιο πρόγραμμα κάθε ημέρα.</p></div>`;
    showDialog();
  }
  function closeDialog() { dialog.close(); }
  function showHow() {
    state.currentVenue=null;
    $('#dialog-content').innerHTML=`<div class="how-body"><p class="eyebrow dark" style="margin-bottom:12px">ΕΣΥ ΟΡΙΖΕΙΣ ΤΗΝ ΕΞΟΔΟ</p><h2 id="dialog-title">Γιατί αυτά τα μέρη;</h2><div class="how-step"><span>1</span><div><h3>Κρατάμε τα απαραίτητα</h3><p>Περιοχή, όριο κόστους και όσα θέλεις οπωσδήποτε. Ελέγχουμε αν το μαγαζί και η κουζίνα είναι ανοιχτά την ώρα που θα πας.</p></div></div><div class="how-step"><span>2</span><div><h3>Βάζουμε το γούστο σου πρώτο</h3><p>Ατμόσφαιρα, εξωτερικός χώρος, είδος μουσικής και προηγούμενες αξιολογήσεις αλλάζουν τη σειρά των προτάσεων. Η live μουσική υπολογίζεται μόνο μέσα στο ωράριό της.</p></div></div><div class="how-step"><span>3</span><div><h3>Σου λέμε και τι λείπει</h3><p>Στις λεπτομέρειες βλέπεις γιατί προτείνεται ένα μέρος και ποιες προτιμήσεις δεν καλύπτει, ώστε να διαλέξεις εσύ.</p></div></div><p class="demo-note">Το ταίριασμα είναι βαθμολογία κανόνων στο demo, όχι πιθανότητα ή αξιολόγηση του μαγαζιού. Τα 12 μαγαζιά είναι φανταστικά και τα ωράρια ίδια κάθε ημέρα.</p><button class="primary-button" style="width:100%;margin-top:22px" data-action="close-dialog">Το 'χω!</button></div>`;
    showDialog();
  }
  function submitPreferences(scroll=true) {
    if (!$('#preferences-form').reportValidity()) return;
    state.preferences=getForm();
    setForm(state.preferences);persist();renderAll();
    if(filtersDialog.open) filtersDialog.close();
    if (scroll) { $('#results-title').scrollIntoView({behavior:'smooth',block:'start'}); $('#results-title').focus({preventScroll:true}); }
    toast(state.results.length?`Βρήκαμε ${state.results.length} επιλογές για την έξοδό σου.`:'Δεν βρέθηκε ταίριασμα. Δες ποια κριτήρια το περιορίζουν.');
  }
  function applyPreset(kind) {
    const presets={food:{time:'14:00',budget:30,required:['food'],wanted:['outdoor']},coffee:{time:'16:00',budget:15,required:['coffee'],wanted:['quiet','outdoor']},bar:{time:'22:30',budget:30,required:['bar'],wanted:['lively']}};
    const prefs={...getForm(),...presets[kind],music:'any'};
    setForm(prefs);submitPreferences(false);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button,a'); if(!button) return;
    if(button.dataset.page){event.preventDefault();navigate(button.dataset.page);return;}
    if(button.dataset.required){setChip(button,button.getAttribute('aria-pressed')!=='true');return;}
    if(button.dataset.wanted){setChip(button,button.getAttribute('aria-pressed')!=='true');return;}
    if(button.dataset.preset){applyPreset(button.dataset.preset);return;}
    if(button.dataset.detail){event.preventDefault();renderVenue(button.dataset.detail);return;}
    if(button.dataset.save){
      const id=button.dataset.save;const wasSaved=state.favorites.has(id); if(wasSaved)state.favorites.delete(id);else state.favorites.add(id);
      const inDialog=dialog.open && state.currentVenue===id;
      persist();renderSaved();renderTaste();renderCounts();
      $$(`.save-button[data-save="${id}"]`).forEach(control=>{control.classList.toggle('is-saved',!wasSaved);control.setAttribute('aria-pressed',String(!wasSaved));control.setAttribute('aria-label',`${wasSaved?'Αποθήκευση στα':'Αφαίρεση από'} αγαπημένα: ${venueById(id).name}`);});
      if(inDialog){renderVenue(id);$('[data-save]',dialog).focus();}
      else if(state.page==='saved') {
        const next=$('#saved-grid .save-button');if(next)next.focus({preventScroll:true});else focusPageHeading();
      }
      toast(wasSaved?'Αφαιρέθηκε από τα αγαπημένα.':'Το κρατήσαμε στα αγαπημένα σου.');return;
    }
    if(button.dataset.feedback){
      const {id,feedback}=button.dataset;
      if(state.feedback[id]===feedback)delete state.feedback[id];else state.feedback[id]=feedback;
      persist();renderAll();renderVenue(id);$(`[data-feedback="${feedback}"]`,dialog).focus();toast('Οι προτάσεις ενημερώθηκαν με βάση το γούστο σου.');return;
    }
    if(button.dataset.clearFeedback){delete state.feedback[button.dataset.clearFeedback];persist();renderAll();const next=$('[data-clear-feedback]');if(next)next.focus({preventScroll:true});else focusPageHeading();toast('Η αξιολόγηση αφαιρέθηκε.');return;}
    switch(button.dataset.action){
      case 'close-dialog': closeDialog();break;
      case 'edit-filters': openFilters();break;
      case 'all-areas': setForm({...state.preferences,area:'all'});submitPreferences();break;
      case 'reset-taste': state.feedback={};persist();renderAll();focusPageHeading();toast('Οι αξιολογήσεις μηδενίστηκαν. Τα αγαπημένα παραμένουν.');break;
    }
  });
  $('#preferences-form').addEventListener('submit',event=>{event.preventDefault();submitPreferences();});
  $('#budget').addEventListener('input',updateBudget);
  $('#open-filters').addEventListener('click',openFilters);
  $('#close-filters').addEventListener('click',()=>filtersDialog.close());
  filtersDialog.addEventListener('close',()=>{document.body.style.overflow='';setForm(state.preferences);});
  filtersDialog.addEventListener('click',event=>{if(event.target===filtersDialog){const box=filtersDialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)filtersDialog.close();}});
  $('#reset-filters').addEventListener('click',()=>{setForm(clone(data.defaultPreferences));submitPreferences(false);});
  $('#how-it-works').addEventListener('click',showHow);
  $('#close-dialog').addEventListener('click',closeDialog);
  dialog.addEventListener('click',event=>{ if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDialog();} });
  dialog.addEventListener('close',()=>{
    document.body.style.overflow='';
    const replacement=state.currentVenue?$(`#${state.page}-page [data-detail="${state.currentVenue}"]`):null;
    if(dialogReturnElement?.isConnected)dialogReturnElement.focus({preventScroll:true});
    else if(replacement)replacement.focus({preventScroll:true});
    else focusPageHeading();
    state.currentVenue=null;dialogReturnElement=null;
  });
  window.addEventListener('hashchange',()=>{const page=location.hash.slice(1);if(['discover','saved','taste'].includes(page))switchPage(page);});
  hydrateIcons();setForm(state.preferences);renderAll();switchPage(location.hash.slice(1),false);
})();
