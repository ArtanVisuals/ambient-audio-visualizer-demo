/**
 * Safe clipboard copy.
 *
 * `navigator.clipboard` is only available in a SECURE context (https:// or
 * localhost). When the app is opened over plain http on a LAN IP
 * (e.g. http://192.168.x.x:5000) `navigator.clipboard` is `undefined`, so a
 * direct `navigator.clipboard.writeText(...)` in a click handler throws and
 * escapes to the global error handler — crashing the whole web app.
 *
 * This wrapper uses the Clipboard API when present and falls back to a hidden
 * <textarea> + execCommand('copy') otherwise. It never throws.
 *
 * @param {string} text
 * @returns {Promise<void>}
 */
export function copyToClipboard(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).catch(() => { fallbackCopy(text); });
    }
  } catch (_) { /* fall through to legacy copy */ }
  fallbackCopy(text);
  return Promise.resolve();
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (_) { /* give up silently — never crash the app over a copy */ }
}
