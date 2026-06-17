/*!
 * ads-interim.js — AdSense-safe supplementary ad loader for goldpricetools.com
 * ---------------------------------------------------------------------------
 * DISABLED BY DEFAULT. This file does nothing until you set CONFIG.network.
 *
 * Purpose: optional INTERIM monetization (while AdSense approval is pending, or
 * as a fallback / ad-block recovery) using ONLY non-intrusive formats.
 * Popunder / OnClick / classic browser-push are intentionally unsupported —
 * they break Google AdSense eligibility and harm SEO and user experience on a
 * content site.
 *
 * Supported (non-intrusive) formats:
 *   - Adsterra : "Social Bar" only
 *   - Monetag  : "Multitag" with OnClick/Popunder turned OFF in the dashboard
 *
 * WARNING: Do NOT enable this during a fresh Google AdSense review. Keep the
 * site clean until you have decided your monetization path.
 * Full setup guide: docs/interim-ad-network-setup.md
 */
(function () {
  'use strict';

  var CONFIG = {
    // '' (disabled, default) | 'adsterra' | 'monetag'
    network: '',

    adsterra: {
      // Paste the FULL "Social Bar" invoke URL from Adsterra
      // (Dashboard -> Websites -> your site -> add a "Social Bar" unit -> copy src).
      // Example shape: '//pl12345678.profitablecpmgate.com/aa/bb/cc/abcdef.js'
      socialBarSrc: ''
    },

    monetag: {
      // Paste the FULL "Multitag" script src + its data-zone id from Monetag
      // (Dashboard -> Sites -> add a "Multitag" unit; turn OnClick/Popunder OFF).
      // Example shape: tagSrc 'https://example-cdn.com/88/tag.min.js', zoneId '1234567'
      tagSrc: '',
      zoneId: ''
    }
  };

  // --- guards -------------------------------------------------------------
  if (window.__adsInterimLoaded) return;                 // never run twice
  if (!CONFIG.network) return;                           // disabled -> no-op
  if (navigator.doNotTrack == '1' || window.doNotTrack == '1') return; // respect DNT

  window.__adsInterimLoaded = true;

  function loadScript(src, attrs) {
    if (!src) return;
    var s = document.createElement('script');
    s.async = true;
    // allow protocol-relative URLs from the dashboards
    s.src = (src.indexOf('//') === 0 ? window.location.protocol + src : src);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    }
    (document.body || document.head || document.documentElement).appendChild(s);
  }

  if (CONFIG.network === 'adsterra') {
    loadScript(CONFIG.adsterra.socialBarSrc);
  } else if (CONFIG.network === 'monetag') {
    var attrs = { 'data-cfasync': 'false' };
    if (CONFIG.monetag.zoneId) attrs['data-zone'] = CONFIG.monetag.zoneId;
    loadScript(CONFIG.monetag.tagSrc, attrs);
  }
})();
