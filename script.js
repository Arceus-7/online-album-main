(() => {
  let db = null;
  const memory = { photos: [], videos: [], events: [], wishlist: [], seq: {photos:1, videos:1, events:1, wishlist:1} };

  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  const toast = $('#toast');
  function showToast(msg){
    toast.textContent = msg;
    toast.hidden = false;
    gsap.fromTo(toast, {y:40, opacity:0}, {y:0, opacity:1, duration:0.3, ease:'power2.out'});
    setTimeout(() => gsap.to(toast, {opacity:0, duration:0.4, onComplete: () => { toast.hidden = true; toast.style.opacity = ''; }}), 2200);
  }

  function initDB(){
    return new Promise((resolve, reject) => {
      if(!('indexedDB' in window)) return resolve(null);
      const request = indexedDB.open('love-scrapbook', 1);
      request.onupgradeneeded = e => {
        const d = e.target.result;
        if(!d.objectStoreNames.contains('photos')){
          d.createObjectStore('photos', {keyPath:'id', autoIncrement:true});
        }
        if(!d.objectStoreNames.contains('videos')){
          d.createObjectStore('videos', {keyPath:'id', autoIncrement:true});
        }
        if(!d.objectStoreNames.contains('events')){
          d.createObjectStore('events', {keyPath:'id', autoIncrement:true});
        }
        if(!d.objectStoreNames.contains('wishlist')){
          d.createObjectStore('wishlist', {keyPath:'id', autoIncrement:true});
        }
      };
      request.onsuccess = () => { db = request.result; resolve(db); };
      request.onerror = () => resolve(null);
    });
  }

  function withStore(name, mode, fn){
    if(!db){
      // memory fallback
      const store = {
        getAll: () => Promise.resolve([...memory[name]]),
        add: val => { const id = memory.seq[name]++; val.id = id; memory[name].push(val); return Promise.resolve(id); },
        delete: id => { memory[name] = memory[name].filter(x => x.id !== id); return Promise.resolve(); },
        put: val => {
          const idx = memory[name].findIndex(x => x.id === val.id);
          if(idx >= 0) memory[name][idx] = val; else memory[name].push(val);
          return Promise.resolve(val.id);
        }
      };
      return fn(store);
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const store = tx.objectStore(name);
      Promise.resolve(fn(store)).then(resolve).catch(reject);
    });
  }

  function storeGetAll(name){
    return withStore(name, 'readonly', store => new Promise((resolve, reject) => {
      if(!db) return store.getAll().then(resolve);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = reject;
    }));
  }

  function storeAdd(name, value){
    return withStore(name, 'readwrite', store => new Promise((resolve, reject) => {
      if(!db) return store.add(value).then(resolve);
      const req = store.add(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    }));
  }

  function storeDel(name, id){
    return withStore(name, 'readwrite', store => new Promise((resolve, reject) => {
      if(!db) return store.delete(id).then(resolve);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = reject;
    }));
  }

  function storePut(name, value){
    return withStore(name, 'readwrite', store => new Promise((resolve, reject) => {
      if(!db) return store.put(value).then(resolve);
      const req = store.put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    }));
  }

  function setAnimations(){
    gsap.from('.hero-inner', {y:-20, opacity:0, duration:.8, ease:'power2.out'});
    gsap.from('.top-nav a', {y:6, opacity:0, stagger:.06, duration:.5, ease:'power2.out', delay:.2});
  }

  // Photos
  async function setupPhotos(){
    const form = $('#photo-form');
    const fileInput = $('#photo-file');
    const captionInput = $('#photo-caption');
    const grid = $('#photo-grid');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const file = fileInput.files[0];
      if(!file){ showToast('Choose a photo first'); return; }
      const caption = captionInput.value.trim();
      const item = { name:file.name, type:file.type, caption, createdAt: Date.now(), blob: file };
      await storeAdd('photos', item);
      fileInput.value = '';
      captionInput.value = '';
      await renderPhotos(grid);
      showToast('Photo added');
    });

    await renderPhotos(grid);
  }

  async function renderPhotos(grid){
    const items = await storeGetAll('photos');
    grid.innerHTML = '';
    for(const p of items){
      const card = document.createElement('article');
      card.className = 'media-card';
      const url = URL.createObjectURL(p.blob);
      const img = document.createElement('img');
      img.className = 'media-thumb';
      img.src = url;
      img.alt = p.caption || 'Photo';
      img.onload = () => URL.revokeObjectURL(url);

      const footer = document.createElement('div');
      footer.className = 'media-footer';
      const cap = document.createElement('div');
      cap.className = 'media-caption';
      cap.textContent = p.caption || '—';
      const actions = document.createElement('div');
      actions.className = 'media-actions';
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        await storeDel('photos', p.id);
        await renderPhotos(grid);
        showToast('Photo deleted');
      });
      actions.appendChild(del);
      footer.appendChild(cap);
      footer.appendChild(actions);

      card.appendChild(img);
      card.appendChild(footer);
      grid.appendChild(card);
      gsap.from(card, {opacity:0, y:12, duration:.4, ease:'power2.out'});
    }
  }

  // Videos
  async function setupVideos(){
    const form = $('#video-form');
    const fileInput = $('#video-file');
    const captionInput = $('#video-caption');
    const grid = $('#video-grid');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const file = fileInput.files[0];
      if(!file){ showToast('Choose a video first'); return; }
      const caption = captionInput.value.trim();
      const item = { name:file.name, type:file.type, caption, createdAt: Date.now(), blob: file };
      await storeAdd('videos', item);
      fileInput.value = '';
      captionInput.value = '';
      await renderVideos(grid);
      showToast('Video added');
    });

    await renderVideos(grid);
  }

  async function renderVideos(grid){
    const items = await storeGetAll('videos');
    grid.innerHTML = '';
    for(const v of items){
      const card = document.createElement('article');
      card.className = 'media-card';
      const url = URL.createObjectURL(v.blob);
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.className = 'media-thumb';
      video.onloadeddata = () => URL.revokeObjectURL(url);

      const footer = document.createElement('div');
      footer.className = 'media-footer';
      const cap = document.createElement('div');
      cap.className = 'media-caption';
      cap.textContent = v.caption || '—';
      const actions = document.createElement('div');
      actions.className = 'media-actions';
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        await storeDel('videos', v.id);
        await renderVideos(grid);
        showToast('Video deleted');
      });
      actions.appendChild(del);
      footer.appendChild(cap);
      footer.appendChild(actions);

      card.appendChild(video);
      card.appendChild(footer);
      grid.appendChild(card);
      gsap.from(card, {opacity:0, y:12, duration:.4, ease:'power2.out'});
    }
  }

  // Calendar
  let currentMonth;
  let currentYear;

  async function setupCalendar(){
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();

    $('#prev-month').addEventListener('click', () => { shiftMonth(-1) });
    $('#next-month').addEventListener('click', () => { shiftMonth(1) });
    $('#event-cancel').addEventListener('click', () => { $('#event-form-wrap').hidden = true; });

    $('#event-form').addEventListener('submit', async e => {
      e.preventDefault();
      const title = $('#event-title').value.trim();
      const date = $('#event-date').value;
      const remindDays = parseInt($('#event-remind').value, 10);
      const recurring = $('#event-recurring').checked;
      if(!title || !date) return;
      await storeAdd('events', { title, date, remindDays, recurring, createdAt:Date.now() });
      $('#event-title').value = '';
      $('#event-date').value = '';
      $('#event-form-wrap').hidden = true;
      showToast('Event saved');
      await renderCalendar();
      await renderUpcoming();
    });

    await renderCalendar();
    await renderUpcoming();
    requestNotificationPermission();
  }

  function shiftMonth(delta){
    currentMonth += delta;
    if(currentMonth < 0){ currentMonth = 11; currentYear--; }
    if(currentMonth > 11){ currentMonth = 0; currentYear++; }
    renderCalendar();
  }

  async function renderCalendar(){
    const monthLabel = $('#current-month');
    const grid = $('#calendar-grid');
    const events = await storeGetAll('events');

    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    monthLabel.textContent = `${names[currentMonth]} ${currentYear}`;

    grid.innerHTML = '';
    const first = new Date(currentYear, currentMonth, 1);
    const startDay = first.getDay();
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();

    for(let i=0;i<startDay;i++){
      const empty = document.createElement('div');
      grid.appendChild(empty);
    }

    const today = new Date();
    for(let d=1; d<=days; d++){
      const cell = document.createElement('div');
      cell.className = 'day';
      const label = document.createElement('div');
      label.className = 'num';
      label.textContent = d;
      cell.appendChild(label);

      const dateStr = fmtDate(new Date(currentYear, currentMonth, d));
      const dayEvents = events.filter(ev => ev.date === dateStr);
      if(dayEvents.length){
        const evDots = document.createElement('div');
        evDots.className = 'events';
        dayEvents.forEach(() => {
          const dot = document.createElement('span');
          dot.className = 'event-dot';
          evDots.appendChild(dot);
        });
        cell.appendChild(evDots);
      }

      if(today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === d){
        cell.classList.add('today');
      }

      cell.addEventListener('click', () => {
        const wrap = $('#event-form-wrap');
        wrap.hidden = false;
        $('#event-date').value = dateStr;
        $('#event-title').focus();
        gsap.from(wrap, {opacity:0, y:10, duration:.2});
      });

      grid.appendChild(cell);
    }
  }

  function fmtDate(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  async function renderUpcoming(){
    const list = $('#upcoming-list');
    const events = await storeGetAll('events');
    const now = new Date();

    const withDays = events.map(ev => {
      const info = nextOccurrence(ev.date, ev.recurring);
      const days = Math.ceil((info.date - now) / (1000*60*60*24));
      return { ev, days, occurrence: info.date };
    }).filter(x => x.days >= 0 && x.days <= 30)
      .sort((a,b) => a.days - b.days);

    list.innerHTML = '';
    withDays.forEach(({ev, days, occurrence}) => {
      const li = document.createElement('li');
      const dateDisp = occurrence.toLocaleDateString(undefined,{month:'short', day:'numeric'});
      li.textContent = `${ev.title} — ${days === 0 ? 'Today!' : `${days} day${days>1?'s':''}`} (${dateDisp})`;

      const btnWrap = document.createElement('div');
      btnWrap.style.float = 'right';

      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        // find and delete by matching id
        const all = await storeGetAll('events');
        const match = all.find(e => e.title === ev.title && e.date === ev.date && e.remindDays === ev.remindDays && e.recurring === ev.recurring);
        if(match){
          await storeDel('events', match.id);
          await renderCalendar();
          await renderUpcoming();
          showToast('Event deleted');
        }
      });

      btnWrap.appendChild(del);
      li.appendChild(btnWrap);
      list.appendChild(li);

      if(days <= ev.remindDays){
        notify(`${ev.title} in ${days} day${days===1?'':'s'}`);
      }
      gsap.from(li, {opacity:0, y:8, duration:.3, ease:'power2.out'});
    });
  }

  function nextOccurrence(dateStr, recurring){
    const [y,m,d] = dateStr.split('-').map(Number);
    const now = new Date();
    let target = new Date(recurring ? now.getFullYear() : y, m-1, d);
    if(recurring && target < now){
      target = new Date(now.getFullYear()+1, m-1, d);
    }
    return {date: target};
  }

  function requestNotificationPermission(){
    if('Notification' in window && Notification.permission === 'default'){
      Notification.requestPermission();
    }
  }

  function notify(msg){
    if('Notification' in window && Notification.permission === 'granted'){
      try{ new Notification('Reminder', { body: msg }); } catch(_){}
    }else{
      showToast(msg);
    }
  }

  // Wishlist
  async function setupWishlist(){
    const form = $('#wishlist-form');
    const input = $('#wishlist-input');
    const list = $('#wishlist-list');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = input.value.trim();
      if(!text) return;
      await storeAdd('wishlist', { text, done:false, createdAt: Date.now() });
      input.value = '';
      await renderWishlist(list);
      showToast('Added to wishlist');
    });

    await renderWishlist(list);
  }

  async function renderWishlist(listEl){
    const items = await storeGetAll('wishlist');
    listEl.innerHTML = '';
    items.forEach(it => {
      const li = document.createElement('li');
      if(it.done) li.classList.add('done');

      const text = document.createElement('div');
      text.className = 'text';
      text.textContent = it.text;

      const actions = document.createElement('div');
      actions.className = 'actions';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = !!it.done;
      toggle.addEventListener('change', async () => {
        it.done = toggle.checked;
        await storePut('wishlist', it);
        await renderWishlist(listEl);
      });

      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        await storeDel('wishlist', it.id);
        await renderWishlist(listEl);
        showToast('Item removed');
      });

      actions.appendChild(toggle);
      actions.appendChild(del);
      li.appendChild(text);
      li.appendChild(actions);
      listEl.appendChild(li);
      gsap.from(li, {opacity:0, y:8, duration:.3});
    });
  }

  window.addEventListener('load', async () => {
    setAnimations();
    await initDB();
    await setupPhotos();
    await setupVideos();
    await setupCalendar();
    await setupWishlist();
  });
})();