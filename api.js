// ==============================================================
// Shared API helper for all pages. Replaces google.script.run.
//
// SET WEB_APP_URL BELOW to your Apps Script /exec URL before
// deploying, and keep it identical across every page that includes
// this file.
// ==============================================================
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzXzcHByT4WR84J0MiBi8srCHQK_dyymHURz9hpqwoca4sQg3pREasNpAbL9XVOaJ0d/exec';

// Every call is a POST with a JSON body, sent as Content-Type:
// text/plain. Two reasons:
//  1. text/plain keeps this a CORS "simple request" - no preflight
//     OPTIONS call, which Apps Script cannot respond to.
//  2. POST (not GET query params) keeps tokens and passwords out of
//     URLs entirely - out of server/proxy logs, browser history, and
//     the Referer header. This applies to every call, not just
//     login, so there's one rule to remember, not a judgment call
//     per endpoint.
function callApi(action, params) {
  var body = Object.assign({ action: action }, params || {});
  return fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }).then(function (res) {
    if (!res.ok) {
      throw new Error('Server returned ' + res.status);
    }
    return res.json();
  });
}

// ==============================================================
// Session token storage.
//
// Uses sessionStorage, not localStorage. Both are equally readable
// by JS (so equally exposed to an XSS bug), but sessionStorage
// clears itself when the tab closes - localStorage sits on the
// device indefinitely until something explicitly clears it. On a
// shared or borrowed device, that's the difference between a token
// that dies with the browser tab and one that's still sitting there
// days later. The trade-off: no "stay logged in" across visits -
// members and execs will need to log in again each new session.
// ==============================================================
function saveToken(token) {
  sessionStorage.setItem('ogfza_token', token);
}

function getToken() {
  return sessionStorage.getItem('ogfza_token');
}

function clearToken() {
  sessionStorage.removeItem('ogfza_token');
}
