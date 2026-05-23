/* Renders a project detail page from the shared PROJECTS data.
 * Expects window.PROJECT_SLUG to be set before this script runs. */

(function () {
  const slug = window.PROJECT_SLUG;
  const project = window.PROJECTS && window.PROJECTS[slug];
  const order = window.PROJECT_ORDER || [];

  if (!project) {
    document.title = 'Project not found — Andre Arante';
    const main = document.querySelector('.project-page');
    if (main) main.innerHTML = '<p style="font-family:var(--mono);color:var(--muted);text-align:center;padding:80px 0;">Project not found.</p>';
    return;
  }

  document.title = project.title + ' — Andre Arante';
  document.documentElement.style.setProperty('--project-accent', project.accent);

  const setText = (sel, text) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = text;
  };

  setText('.project-eyebrow', project.type);
  setText('.project-title', project.title);

  /* Media */
  const mediaContainer = document.querySelector('.project-media');
  if (mediaContainer && project.media && project.media.length) {
    const label = document.createElement('p');
    label.className = 'section-label';
    label.textContent = 'Media';
    mediaContainer.appendChild(label);

    project.media.forEach(m => {
      const slot = document.createElement('div');
      slot.className = 'media-slot';

      if (m.src) {
        const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(m.src);
        const url = '../' + m.src;
        if (isVideo) {
          const v = document.createElement('video');
          v.src = url;
          v.controls = true;
          v.autoplay = true;
          v.muted = true;
          v.loop = true;
          v.preload = 'auto';
          v.playsInline = true;
          slot.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = url;
          img.alt = m.label || '';
          slot.appendChild(img);
        }
      } else {
        const ph = document.createElement('div');
        ph.className = 'media-placeholder';
        ph.innerHTML = `<span class="ph-icon">${m.icon || '◻'}</span><p>${m.label}<br><span style="opacity:.5">Add your ${m.hint || 'media'} here</span></p>`;
        slot.appendChild(ph);
      }

      if (m.label && m.src) {
        const cap = document.createElement('p');
        cap.className = 'media-caption';
        cap.textContent = m.label;
        slot.appendChild(cap);
      }

      mediaContainer.appendChild(slot);
    });
  }

  /* Overview */
  const overview = document.querySelector('.project-overview');
  if (overview && project.description) {
    overview.innerHTML = '<p class="section-label">Overview</p>' +
      project.description.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  }

  /* Highlights */
  const highlights = document.querySelector('.project-highlights');
  if (highlights && project.highlights && project.highlights.length) {
    highlights.innerHTML = '<p class="section-label">Key Details</p>' +
      '<div class="highlights-list">' +
      project.highlights.map(h => `<div class="highlight-item">${escapeHtml(h)}</div>`).join('') +
      '</div>';
  }

  /* Stack */
  const stack = document.querySelector('.project-stack');
  if (stack && project.stack && project.stack.length) {
    stack.innerHTML = '<p class="section-label">Tech Stack</p>' +
      '<div class="stack-tags">' +
      project.stack.map(s => `<span class="stack-tag">${escapeHtml(s)}</span>`).join('') +
      '</div>';
  }

  /* Actions */
  const actions = document.querySelector('.project-actions');
  if (actions && project.github) {
    actions.innerHTML = `<a class="action-btn" href="${project.github}" target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      View on GitHub
    </a>`;
  }

  /* Prev / Next (wrap-around) */
  const nav = document.querySelector('.project-prev-next');
  if (nav && order.length) {
    const idx = order.indexOf(slug);
    const prevSlug = order[(idx - 1 + order.length) % order.length];
    const nextSlug = order[(idx + 1) % order.length];
    const prev = window.PROJECTS[prevSlug];
    const next = window.PROJECTS[nextSlug];

    nav.innerHTML = `
      <a class="prev-next-link prev" href="${prevSlug}.html">
        <span class="arrow">←</span>
        <span class="title">${escapeHtml(prev.title)}</span>
      </a>
      <a class="prev-next-link next" href="${nextSlug}.html">
        <span class="title">${escapeHtml(next.title)}</span>
        <span class="arrow">→</span>
      </a>
    `;

    /* Keyboard navigation */
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowLeft') window.location.href = prevSlug + '.html';
      else if (e.key === 'ArrowRight') window.location.href = nextSlug + '.html';
      else if (e.key === 'Escape') window.location.href = '../index.html#projects';
    });
  }

  /* Cursor dot */
  const cursor = document.getElementById('cursor');
  if (cursor) {
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
})();
