// Content script SGES — injecté dans les pages pour extraire les données de mission.
// Répond aux messages envoyés par le popup via chrome.runtime.

console.info('[SGES] content script chargé');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SGES_SCAN') {
    sendResponse({ ok: true, title: document.title, url: location.href });
  }
  return true;
});
