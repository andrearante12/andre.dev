// Themed photography gallery shown in an almost-full-screen modal inside the room.
const PHOTOS = [
  { src: 'photos/tokyo-trains.jpg', title: 'Trains in Motion', location: 'Tokyo Tower', category: 'Tokyo' },
  { src: 'photos/dc-01.jpg', title: 'Capital Lines', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/aquarium-arch.jpg', title: 'Aquarium Archway', location: 'Ginza, Tokyo', category: 'Tokyo' },
  { src: 'photos/dc-06.jpg', title: 'Morning Commute', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/sashimi.jpg', title: 'Sashimi', location: 'Ginza, Tokyo', category: 'Tokyo' },
  { src: 'photos/dc-02.jpg', title: 'Crosswalk', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/aquarium-date.jpg', title: 'Aquarium Date', location: 'Ginza, Tokyo', category: 'Tokyo' },
  { src: 'photos/dc-07.jpg', title: 'Late Afternoon', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/trains-iii.jpg', title: 'Trains in Motion III', location: 'Tokyo', category: 'Tokyo' },
  { src: 'photos/dc-03.jpg', title: 'City Geometry', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/dc-08.jpg', title: 'Quiet Block', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/dc-04.jpg', title: 'Passersby', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/dc-09.jpg', title: 'Reflections', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/dc-05.jpg', title: 'Avenue', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/dc-10.jpg', title: 'Side Street', location: 'Washington, DC', category: 'Street' },
  { src: 'photos/dc-11.jpg', title: 'Dusk', location: 'Washington, DC', category: 'Street' },
];

export function initGallery() {
  const modal = document.getElementById('photo-modal');
  const masonry = modal.querySelector('.pm-masonry');
  const filters = modal.querySelector('.pm-filters');
  const sub = modal.querySelector('.pm-sub');
  let filter = 'all';

  const cats = ['all', ...new Set(PHOTOS.map((p) => p.category))];
  sub.textContent = `${PHOTOS.length} frames · ${cats.slice(1).join(' · ')} · DC / Tokyo`;

  cats.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'pm-filter' + (c === 'all' ? ' active' : '');
    b.textContent = c === 'all' ? 'All' : c;
    b.onclick = () => { filter = c; [...filters.children].forEach((x) => x.classList.remove('active')); b.classList.add('active'); render(); };
    filters.appendChild(b);
  });

  function render() {
    masonry.innerHTML = '';
    PHOTOS.forEach((p, i) => {
      if (filter !== 'all' && p.category !== filter) return;
      const item = document.createElement('div');
      item.className = 'pm-item';
      item.innerHTML = `
        <img src="${p.src}" alt="${p.title}">
        <div class="pm-ov">
          <span class="pm-ov-t">${p.title}</span>
          <span class="pm-ov-m">${p.category} · ${p.location}</span>
        </div>`;
      item.onclick = () => openLB(i);
      masonry.appendChild(item);
    });
  }

  // ---- lightbox ----
  const lb = modal.querySelector('.pm-lb');
  const lbImg = lb.querySelector('.pm-lb-img');
  const lbTitle = lb.querySelector('.pm-lb-title');
  const lbMeta = lb.querySelector('.pm-lb-meta');
  const lbCount = lb.querySelector('.pm-lb-count');
  let list = [], idx = 0;

  function openLB(globalIdx) {
    list = filter === 'all' ? PHOTOS : PHOTOS.filter((p) => p.category === filter);
    idx = list.indexOf(PHOTOS[globalIdx]);
    if (idx < 0) idx = 0;
    renderLB();
    lb.classList.add('open');
  }
  function renderLB() {
    const p = list[idx];
    lbImg.classList.add('fading');
    setTimeout(() => { lbImg.src = p.src; lbImg.classList.remove('fading'); }, 110);
    lbTitle.textContent = p.title;
    lbMeta.textContent = `${p.category} · ${p.location}`;
    lbCount.textContent = `${idx + 1} / ${list.length}`;
  }
  function nav(d) { const n = idx + d; if (n < 0 || n >= list.length) return; idx = n; renderLB(); }
  function closeLB() { lb.classList.remove('open'); }

  lb.querySelector('.pm-lb-prev').onclick = (e) => { e.stopPropagation(); nav(-1); };
  lb.querySelector('.pm-lb-next').onclick = (e) => { e.stopPropagation(); nav(1); };
  lb.querySelector('.pm-lb-close').onclick = (e) => { e.stopPropagation(); closeLB(); };
  lb.onclick = (e) => { if (e.target === lb || e.target.classList.contains('pm-lb-stage')) closeLB(); };

  // ---- open / close ----
  function open() { render(); modal.classList.add('open'); }
  function close() { closeLB(); modal.classList.remove('open'); }
  modal.querySelector('.pm-close').onclick = close;
  modal.querySelector('.pm-backdrop').onclick = close;

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
    } else if (e.key === 'Escape') close();
  });

  return { open, close };
}
