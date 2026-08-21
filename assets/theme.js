/* Theme switch: cream light (default) ⇄ dark.
 *
 * Loaded synchronously in <head> so the stored theme is on <html> before the
 * first paint (no flash), then injects the toggle button into the nav once the
 * DOM is ready. Canvas backgrounds listen for the 'themechange' event.
 *
 * The site's default is cream light; dark is an explicit opt-in that is
 * remembered in localStorage — so a visitor who already chose dark keeps it.
 * (To follow the OS instead, seed `stored` from
 * matchMedia('(prefers-color-scheme: dark)').) */
(function () {
  var KEY = 'aa-theme';
  var THEMES = { dark: '#0a0a0f', light: '#d8d2c4' };

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  var theme = THEMES[stored] ? stored : 'light';

  function apply(t, persist) {
    theme = t;
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = THEMES[t];
    if (persist) { try { localStorage.setItem(KEY, t); } catch (e) {} }
    sync();
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  }

  apply(theme, false);

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.8v2.4M12 19.8v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M1.8 12h2.4M19.8 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.3A8.6 8.6 0 019.7 3.5a8.6 8.6 0 1010.8 10.8z"/></svg>';

  var btn = null;
  function sync() {
    if (!btn) return;
    var next = theme === 'dark' ? 'light' : 'dark';
    btn.innerHTML = (theme === 'dark' ? SUN : MOON) +
      '<span class="tt-label">' + (theme === 'dark' ? 'Light' : 'Dark') + '</span>';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    btn.title = 'Switch to ' + next + ' theme';
  }

  function mount() {
    var nav = document.querySelector('nav');
    if (!nav || document.getElementById('theme-toggle')) return;

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle';
    btn.addEventListener('click', function () {
      apply(theme === 'dark' ? 'light' : 'dark', true);
    });
    sync();

    var links = nav.querySelector('.nav-links');
    if (links) {
      var li = document.createElement('li');
      li.className = 'nav-theme-item';
      li.appendChild(btn);
      links.appendChild(li);
    } else {
      // No link list (photography nav): group the toggle with whatever is
      // already sitting on the right so the flex row keeps its alignment.
      var right = document.createElement('div');
      right.className = 'nav-right';
      var last = nav.lastElementChild;
      if (last) right.appendChild(last);
      right.appendChild(btn);
      nav.appendChild(right);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.SITE_THEME = { get: function () { return theme; }, set: apply };
})();
