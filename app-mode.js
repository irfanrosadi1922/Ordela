/* Shared app-mode configuration. Loaded before the legacy application bundle. */
(function (window) {
  'use strict';

  var host = window.location.hostname;
  var mode = host === 'pos-preview.ordela.my.id' || host === 'ordela-pos-preview.pages.dev'
    ? 'pos'
    : host === 'app-preview.ordela.my.id' || host === 'ordela-business-preview.pages.dev'
      ? 'business'
      : 'legacy';

  window.ORDELA_APP_CONFIG = Object.freeze({
    mode: mode,
    posOnly: Object.freeze(['pos', 'table', 'shift', 'kds']),
    businessOnly: Object.freeze(['home', 'inv', 'usr', 'pyr', 'integ', 'gift', 'rsv', 'opname', 'exp', 'mem', 'buy', 'promo', 'ai', 'branch'])
  });
})(window);
