// DOM overlay: CV detection boxes + sliding project panel.
export function initUI({ lamps } = {}) {
  const boxLayer = document.getElementById('detection-layer');
  const panel = document.getElementById('panel');
  const panelInner = document.getElementById('panel-inner');
  const boxes = new Map(); // id -> {wrap, label}

  function ensureBox(id, accent) {
    let b = boxes.get(id);
    if (b) return b;
    const wrap = document.createElement('div');
    wrap.className = 'det-box';
    wrap.innerHTML = `
      <span class="c c-tl"></span><span class="c c-tr"></span>
      <span class="c c-bl"></span><span class="c c-br"></span>
      <span class="det-label"></span>`;
    boxLayer.appendChild(wrap);
    b = { wrap, label: wrap.querySelector('.det-label') };
    boxes.set(id, b);
    return b;
  }

  function renderBoxes(list) {
    const present = new Set(list.map((i) => i.id));
    for (const [id, b] of boxes) {
      if (!present.has(id)) b.wrap.style.display = 'none';
    }
    list.forEach((item) => {
      const b = ensureBox(item.id, item.accent);
      const { rect, accent, label, tag, active } = item;
      b.wrap.style.display = 'block';
      b.wrap.style.setProperty('--accent', accent);
      b.wrap.classList.toggle('active', !!active);
      const pad = 10;
      b.wrap.style.transform = `translate(${rect.x - pad}px, ${rect.y - pad}px)`;
      b.wrap.style.width = `${rect.w + pad * 2}px`;
      b.wrap.style.height = `${rect.h + pad * 2}px`;
      b.label.innerHTML = `<i>${tag}</i>${label}`;
    });
  }

  function openPanel(data, { onClose, side } = {}) {
    panel.style.setProperty('--accent', data.accent);
    panel.classList.remove('lumina-mode');
    panel.classList.toggle('left', side === 'left');
    const h = [...data.title].reduce((a, c) => a + c.charCodeAt(0), 0);
    const classNo = String(10 + (h % 80)).padStart(3, '0');
    panelInner.innerHTML = `
      <div class="det-panel">
        <button class="panel-close">←&nbsp;back to room</button>
        <div class="det-corner tl"></div><div class="det-corner tr"></div>
        <div class="det-classrow">
          <span>CLASS_${classNo}</span><span class="det-type">${data.type}</span>
        </div>
        <h2 class="det-title"${data.titleSize ? ` style="font-size:${data.titleSize}"` : ''}>${data.title}</h2>
        <p class="det-blurb">${data.blurb}</p>
        <p class="det-seclabel">▍&nbsp;KEY DETAILS</p>
        <ul class="det-list">
          ${data.highlights.map((x) => `<li>${x}</li>`).join('')}
        </ul>
        <p class="det-seclabel">▍&nbsp;STACK</p>
        <div class="det-stack">
          ${data.stack.map((s) => `<span>${s}</span>`).join('')}
        </div>
        <div class="det-actions">
          ${data.github ? `<a class="det-gh" href="${data.github}" target="_blank" rel="noopener">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            View repository&nbsp;↗</a>` : ''}
        </div>
      </div>`;
    panel.querySelector('.panel-close').addEventListener('click', onClose);
    panel.classList.add('open');
    document.body.classList.add('panel-open');
    // dock fully to the left edge (stylesheet .open transform is overridden elsewhere)
    if (side === 'left') panel.style.setProperty('transform', 'translateX(0)', 'important');
    else panel.style.removeProperty('transform');
  }

  // ---- LUMINA smart-light app: live controls wired to the room's lamps ----
  function lampCard(id) {
    const l = lamps.get(id);
    return `
      <div class="lum-card" data-lamp="${id}">
        <h3>${l.label}</h3>
        <div class="lum-onoff">
          <button class="lum-btn on" data-act="on">ON</button>
          <button class="lum-btn off" data-act="off">OFF</button>
        </div>
        <div class="lum-slider">
          <div class="lum-row"><span>Brightness</span><b data-out="bri">${Math.round(l.brightness * 100)}%</b></div>
          <input type="range" min="0" max="100" value="${Math.round(l.brightness * 100)}" data-ctl="bri">
        </div>
        <div class="lum-slider">
          <div class="lum-row"><span>Tone</span></div>
          <input type="range" min="0" max="100" value="${Math.round(l.tone * 100)}" data-ctl="tone" class="tone">
        </div>
      </div>`;
  }

  function luminaMarkup() {
    const ids = lamps.ids();
    const first = lamps.get(ids[0]);
    return `
      <div class="lum-app">
        <div class="lum-status"><span>3:35</span><span class="lum-status-r">▮▮▯ &#9651; &#9707;</span></div>
        <h1 class="lum-title">LUMINA</h1>
        <div class="lum-card all">
          <h3>ALL LAMPS</h3>
          <div class="lum-grid">
            <button class="lum-btn on" data-all="on">ON</button>
            <button class="lum-btn off" data-all="off">OFF</button>
            <button class="lum-btn cool" data-all="cool">COOL</button>
            <button class="lum-btn warm" data-all="warm">WARM</button>
          </div>
          <button class="lum-btn default" data-all="default">DEFAULT</button>
          <div class="lum-slider">
            <div class="lum-row"><span>Global Brightness</span><b data-gout="bri">${Math.round(first.brightness * 100)}%</b></div>
            <input type="range" min="0" max="100" value="${Math.round(first.brightness * 100)}" data-gctl="bri">
          </div>
          <div class="lum-slider">
            <div class="lum-row"><span>Global Tone (Cool to Warm)</span></div>
            <input type="range" min="0" max="100" value="${Math.round(first.tone * 100)}" data-gctl="tone" class="tone">
          </div>
        </div>
        ${ids.map(lampCard).join('')}
        <p class="lum-foot">IoT Smart Home · Zigbee + MQTT, fully local.</p>
      </div>`;
  }

  function wireLumina(scope) {
    const ids = lamps.ids();
    const refresh = () => {
      scope.querySelectorAll('.lum-card[data-lamp]').forEach((card) => {
        const id = card.dataset.lamp; const l = lamps.get(id);
        card.querySelector('[data-ctl="bri"]').value = Math.round(l.brightness * 100);
        card.querySelector('[data-out="bri"]').textContent = Math.round(l.brightness * 100) + '%';
        card.querySelector('[data-ctl="tone"]').value = Math.round(l.tone * 100);
        card.classList.toggle('is-off', !l.on);
      });
      const g = lamps.get(ids[0]);
      scope.querySelector('[data-gctl="bri"]').value = Math.round(g.brightness * 100);
      scope.querySelector('[data-gout="bri"]').textContent = Math.round(g.brightness * 100) + '%';
    };
    scope.querySelectorAll('[data-all]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.all;
      if (a === 'on') lamps.setAll({ on: true });
      else if (a === 'off') lamps.setAll({ on: false });
      else if (a === 'cool') lamps.setAll({ on: true, tone: 0 });
      else if (a === 'warm') lamps.setAll({ on: true, tone: 1 });
      else if (a === 'default') lamps.setAll({ on: true, brightness: 1, tone: 0.82 });
      refresh();
    }));
    scope.querySelector('[data-gctl="bri"]').addEventListener('input', (e) => { lamps.setAll({ brightness: e.target.value / 100 }); refresh(); });
    scope.querySelector('[data-gctl="tone"]').addEventListener('input', (e) => { lamps.setAll({ tone: e.target.value / 100 }); });
    scope.querySelectorAll('.lum-card[data-lamp]').forEach((card) => {
      const id = card.dataset.lamp;
      card.querySelector('[data-act="on"]').addEventListener('click', () => { lamps.set(id, { on: true }); refresh(); });
      card.querySelector('[data-act="off"]').addEventListener('click', () => { lamps.set(id, { on: false }); refresh(); });
      card.querySelector('[data-ctl="bri"]').addEventListener('input', (e) => { lamps.set(id, { brightness: e.target.value / 100 }); card.querySelector('[data-out="bri"]').textContent = e.target.value + '%'; });
      card.querySelector('[data-ctl="tone"]').addEventListener('input', (e) => { lamps.set(id, { tone: e.target.value / 100 }); });
    });
    refresh();
  }

  // --- map the LUMINA DOM onto the phone's 3D screen via a CSS homography ---
  function adj(m) { return [m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4], m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5], m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]]; }
  function mmm(a, b) { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3*i+k]*b[3*k+j]; c[3*i+j] = s; } return c; }
  function mmv(m, v) { return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]]; }
  function basis(x1,y1,x2,y2,x3,y3,x4,y4) { const m = [x1,x2,x3, y1,y2,y3, 1,1,1]; const v = mmv(adj(m), [x4,y4,1]); return mmm(m, [v[0],0,0, 0,v[1],0, 0,0,v[2]]); }

  let _saClose = null;
  function mountScreenApp() {
    const wrap = document.getElementById('screen-app');
    const screen = wrap.querySelector('.screen-body');
    screen.innerHTML = luminaMarkup();
    wireLumina(screen);
    wrap.querySelector('.screen-close').onclick = () => { if (_saClose) _saClose(); };
    wrap.classList.add('mounted');
  }
  function setScreenAppActive(on, onClose) {
    _saClose = onClose || null;
    document.getElementById('screen-app').classList.toggle('active', !!on);
  }
  // state = { tl,tr,bl,br } px quad, or { hide:true }
  function placeScreenApp(state) {
    const wrap = document.getElementById('screen-app');
    if (!wrap.classList.contains('mounted')) return;
    if (!state || state.hide) { wrap.classList.add('off'); return; }
    wrap.classList.remove('off');
    const w = wrap.offsetWidth, h = wrap.offsetHeight;
    const s = basis(0,0, w,0, 0,h, w,h);
    const d = basis(state.tl[0],state.tl[1], state.tr[0],state.tr[1], state.bl[0],state.bl[1], state.br[0],state.br[1]);
    const t = mmm(d, adj(s));
    for (let i = 0; i < 9; i++) t[i] /= t[8];
    const m = [t[0],t[3],0,t[6], t[1],t[4],0,t[7], 0,0,1,0, t[2],t[5],0,t[8]];
    wrap.style.transform = 'matrix3d(' + m.join(',') + ')';
  }

  function closePanel() {
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    panel.style.removeProperty('transform');
  }

  return { renderBoxes, openPanel, closePanel, mountScreenApp, setScreenAppActive, placeScreenApp };
}
