/* GoldPriceTools news chrome: theme toggle, mobile menu, live prices, reveal.
   Lean standalone version (the homepage's 20KB script is calculator-coupled). */
(function () {
  'use strict';

  // ---- Theme toggle (pre-paint init runs inline in <head>) ----
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('gpt-theme', next); } catch (e) {}
    });
  }

  // ---- Mobile menu ----
  var burger = document.querySelector('.hamburger');
  var menu = document.querySelector('.mobile-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }
  document.querySelectorAll('.mobile-section__toggle').forEach(function (t) {
    t.addEventListener('click', function () {
      var items = t.nextElementSibling;
      if (!items) return;
      var open = items.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal, .gso-reveal');
  if (reveals.length) {
    if (!('IntersectionObserver' in window)) {
      reveals.forEach(function (e) { e.classList.add('is-visible'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (e) { io.observe(e); });
    }
  }

  // ---- Live prices (ticker + market strip + featured + article hero) ----
  var TROY = 31.1035;
  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function usd(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function price(sym) { return fetch('https://api.gold-api.com/price/' + sym).then(function (r) { return r.json(); }); }
  function load() {
    Promise.all([price('XAU'), price('XAG')]).then(function (res) {
      var gold = res[0] && res[0].price, silver = res[1] && res[1].price;
      if (!gold || !silver) return;
      var g = gold / TROY, ratio = gold / silver;
      [['t-xau', usd(gold)], ['t-xag', usd(silver)], ['t-24k', usd(g)], ['t-18k', usd(g * 0.75)],
       ['t-14k', usd(g * 0.5833)], ['t-10k', usd(g * 0.4167)], ['t-agoz', usd(silver)],
       ['t-agkg', usd(silver / TROY * 1000)]].forEach(function (p) { set(p[0], p[1]); set(p[0] + '2', p[1]); });
      set('mkt-gold', usd(gold)); set('mkt-silver', usd(silver));
      set('mkt-gold-g', usd(g)); set('mkt-ratio', ratio.toFixed(1));
      set('mkt-updated', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      set('feat-spot', usd(gold)); set('feat-ratio', ratio.toFixed(1));
      set('gso-live-gold', usd(gold)); set('gso-live-silver', usd(silver));
      set('gso-live-ratio', ratio.toFixed(1)); set('gso-live-24k', usd(g));
    }).catch(function () {});
  }
  load();
  setInterval(load, 60000);
})();
