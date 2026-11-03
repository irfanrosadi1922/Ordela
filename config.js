window.POS_SB = { url: 'https://txnpqiiwdtgtfgkrquty.supabase.co', key: 'sb_publishable_e1IZBxl3Menz3-N4ehFXkA_rxNLM7t8' };

// SSO is enabled only on the two temporary staging hosts. Production and pages.dev
// keep the existing transport until the full cross-app regression suite passes.
var _ordelaHost = String(location.hostname || '').toLowerCase();
window.POS_SSO_API = (_ordelaHost === 'app-preview.ordela.my.id' || _ordelaHost === 'pos-preview.ordela.my.id')
  ? 'https://api-preview.ordela.my.id'
  : '';
