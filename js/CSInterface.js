/**
 * CSInterface.js — Minimal Adobe CEP bridge library
 *
 * This is a self-contained subset of the official Adobe CSInterface library,
 * including only what Hebrew Subtitle Master requires.
 *
 * For the full library (recommended for production):
 *   https://github.com/Adobe-CEP/CEP-Resources/tree/master/CEP_11.x/CSInterface.js
 *
 * Key native hook: window.__adobe_cep__ is injected by the CEP runtime and
 * is the only way JS can call ExtendScript (host.jsx).
 */

/* global __adobe_cep__ */

(function (root) {
  'use strict';

  // ── Version constants ──────────────────────────────────────────────────────
  var CSXS_VERSION = '11.0.0';

  // ── CSInterface constructor ────────────────────────────────────────────────
  function CSInterface() {
    if (!window.__adobe_cep__) {
      console.error('[CSInterface] window.__adobe_cep__ not found.' +
        ' Ensure this panel is loaded inside a CEP host (Premiere Pro, etc.).');
    }
    try {
      this.hostEnvironment = JSON.parse(
        window.__adobe_cep__.getHostEnvironment()
      );
    } catch (e) {
      this.hostEnvironment = {};
    }
  }

  // ── evalScript ────────────────────────────────────────────────────────────
  /**
   * Executes a snippet of ExtendScript in the host application.
   * @param {string}   script   - ExtendScript to evaluate (function call or expression).
   * @param {Function} callback - Receives a single string: the return value of the script,
   *                              or "EvalScript error." on failure.
   */
  CSInterface.prototype.evalScript = function (script, callback) {
    if (!window.__adobe_cep__) {
      if (typeof callback === 'function') callback('Error: __adobe_cep__ not available.');
      return;
    }
    if (typeof callback !== 'function') {
      window.__adobe_cep__.evalScript(script);
    } else {
      window.__adobe_cep__.evalScript(script, callback);
    }
  };

  // ── getHostEnvironment ────────────────────────────────────────────────────
  CSInterface.prototype.getHostEnvironment = function () {
    try {
      return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    } catch (e) {
      return {};
    }
  };

  // ── getSystemPath ─────────────────────────────────────────────────────────
  CSInterface.prototype.getSystemPath = function (pathType) {
    try {
      return window.__adobe_cep__.getSystemPath(pathType);
    } catch (e) {
      return '';
    }
  };

  // ── addEventListener / dispatchEvent ──────────────────────────────────────
  CSInterface.prototype.addEventListener = function (type, listener) {
    try {
      window.__adobe_cep__.addEventListener(type, listener);
    } catch (e) { /* no-op outside CEP */ }
  };

  CSInterface.prototype.dispatchEvent = function (event) {
    try {
      window.__adobe_cep__.dispatchEvent(event);
    } catch (e) { /* no-op outside CEP */ }
  };

  // ── openURLInDefaultBrowser ───────────────────────────────────────────────
  CSInterface.prototype.openURLInDefaultBrowser = function (url) {
    try {
      window.__adobe_cep__.openURLInDefaultBrowser(url);
    } catch (e) { window.open(url, '_blank'); }
  };

  // ── CSEvent (for dispatchEvent) ───────────────────────────────────────────
  function CSEvent(type, scope, appId, extensionId) {
    this.type        = type;
    this.scope       = scope       || 'APPLICATION';
    this.appId       = appId       || '';
    this.extensionId = extensionId || '';
    this.data        = '';
  }

  // ── SystemPath constants ──────────────────────────────────────────────────
  CSInterface.SystemPath = {
    USER_DATA:       'userData',
    COMMON_FILES:    'commonFiles',
    MY_DOCUMENTS:    'myDocuments',
    APPLICATION:     'application',
    EXTENSION:       'extension',
    HOST_APPLICATION:'hostApplication'
  };

  // ── Export ────────────────────────────────────────────────────────────────
  root.CSInterface = CSInterface;
  root.CSEvent     = CSEvent;

}(this));
