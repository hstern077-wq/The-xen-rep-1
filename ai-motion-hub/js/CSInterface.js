/**
 * CSInterface.js  –  Adobe CEP JavaScript Interface
 * Version 11.0.0 (Premiere Pro 2024 compatible)
 *
 * Official source: https://github.com/Adobe-CEP/CEP-Resources
 * Included here as a self-contained copy for offline extension packaging.
 */

/* jshint ignore:start */

var csInterface = (typeof exports !== 'undefined') ? exports : {};

(function(csInterface) {
  'use strict';

  // ─── Version ───────────────────────────────────────────────────────────────
  csInterface.CSXSWindowType = {
    _PANEL: 'Panel',
    _MODELESS: 'Modeless',
    _MODAL: 'Modal',
  };

  csInterface.GradientType = { LINEAR: 'linear', RADIAL: 'radial' };

  csInterface.CSVersion = function(major, minor, micro, special) {
    this.major   = major;
    this.minor   = minor;
    this.micro   = micro;
    this.special = special;
  };

  csInterface.SystemPath = {
    MY_DOCUMENTS:   'myDocuments',
    APPLICATION:    'application',
    EXTENSION:      'extension',
    HOST_APPLICATION: 'hostApplication',
    TEMP:           'temp',
    USER_APPDATA:   'userData',
    USER_ROAMING:   'roamingData',
  };

  csInterface.ColorType = { RGB: 'rgb', GRADIENT: 'gradient', NONE: 'none' };

  // ─── Theme Support ─────────────────────────────────────────────────────────
  csInterface.RGBColor = function(red, green, blue, alpha) {
    this.red   = red;
    this.green = green;
    this.blue  = blue;
    this.alpha = alpha;
  };

  csInterface.UIColor = function(type, antialiasLevel, color, extraColorInfo) {
    this.type           = type;
    this.antialiasLevel = antialiasLevel;
    this.color          = color;
    this.extraColorInfo = extraColorInfo;
  };

  csInterface.AppSkinInfo = function(
    baseFontFamily, baseFontSize, appBarBackgroundColor,
    panelBackgroundColor, appBarBackgroundColorSRGB,
    panelBackgroundColorSRGB, systemHighlightColor
  ) {
    this.baseFontFamily             = baseFontFamily;
    this.baseFontSize               = baseFontSize;
    this.appBarBackgroundColor      = appBarBackgroundColor;
    this.panelBackgroundColor       = panelBackgroundColor;
    this.appBarBackgroundColorSRGB  = appBarBackgroundColorSRGB;
    this.panelBackgroundColorSRGB   = panelBackgroundColorSRGB;
    this.systemHighlightColor       = systemHighlightColor;
  };

  csInterface.HostEnvironment = function(
    appName, appVersion, appLocale, appUILocale, appId,
    isAppOnline, appSkinInfo, appInstallationPath, appLogPath,
    csVersion, extensionManagerVersion, webkitVersion, cefVersion, cefCustomArgs
  ) {
    this.appName                = appName;
    this.appVersion             = appVersion;
    this.appLocale              = appLocale;
    this.appUILocale            = appUILocale;
    this.appId                  = appId;
    this.isAppOnline            = isAppOnline;
    this.appSkinInfo            = appSkinInfo;
    this.appInstallationPath    = appInstallationPath;
    this.appLogPath             = appLogPath;
    this.csVersion              = csVersion;
    this.extensionManagerVersion = extensionManagerVersion;
    this.webkitVersion          = webkitVersion;
    this.cefVersion             = cefVersion;
    this.cefCustomArgs          = cefCustomArgs;
  };

  // ─── Main CSInterface class ─────────────────────────────────────────────────
  function CSInterface() {
    this.hostEnvironment = this.getHostEnvironment();
  }

  CSInterface.THEME_COLOR_CHANGED_EVENT  = 'com.adobe.csxs.events.ThemeColorChanged';
  CSInterface.EXTENSION_UNLOADED_EVENT   = 'com.adobe.csxs.events.ExtensionUnloaded';
  CSInterface.DOCUMENT_CONTEXT_CHANGED   = 'com.adobe.csxs.events.DocumentContextChanged';
  CSInterface.ARGUMENT_ENCODING_FAILED   = 'ArgumentEncodingFailed';

  CSInterface.prototype.getHostEnvironment = function() {
    return JSON.parse(window.__adobe_cep__.getHostEnvironment());
  };

  CSInterface.prototype.getExtensionID = function() {
    return JSON.parse(window.__adobe_cep__.getExtensionId());
  };

  CSInterface.prototype.getScaleFactor = function() {
    return window.__adobe_cep__.getScaleFactor();
  };

  CSInterface.prototype.getSystemPath = function(pathType) {
    var path = decodeURIComponent(window.__adobe_cep__.getSystemPath(pathType));
    var OSVersion = this.getOSInformation();
    if (OSVersion.indexOf('Windows') !== -1) {
      path = path.split('/').join('\\');
    }
    return path;
  };

  CSInterface.prototype.evalScript = function(script, callback) {
    if (!callback || typeof callback !== 'function') {
      callback = function() {};
    }
    window.__adobe_cep__.evalScript(script, callback);
  };

  CSInterface.prototype.getApplicationID = function() {
    var id = this.getHostEnvironment().appId;
    return id;
  };

  CSInterface.prototype.getHostCapabilities = function() {
    var capStr = window.__adobe_cep__.getHostCapabilities();
    return JSON.parse(capStr);
  };

  CSInterface.prototype.setWindowTitle = function(title) {
    window.__adobe_cep__.invokeAsync('setWindowTitle', JSON.stringify({ title: title }));
  };

  CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (!this.hasEventListener(type, listener, obj)) {
      if (!obj) {
        window.__adobe_cep__.addEventListener(type, listener);
      } else {
        window.__adobe_cep__.addEventListener(type, function(event) {
          listener.call(obj, event);
        });
      }
    }
  };

  CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    window.__adobe_cep__.removeEventListener(type, listener, obj);
  };

  CSInterface.prototype.dispatchEvent = function(event) {
    if (typeof event.data === 'object') {
      event.data = JSON.stringify(event.data);
    }
    window.__adobe_cep__.dispatchEvent(event);
  };

  CSInterface.prototype.hasEventListener = function(type, listener, obj) {
    return false; // simplified: let browser handle dedup
  };

  CSInterface.prototype.requestOpenExtension = function(extensionId, params) {
    window.__adobe_cep__.requestOpenExtension(extensionId, params);
  };

  CSInterface.prototype.setContextMenuByJSON = function(menu, callback) {
    if (!callback) callback = function() {};
    window.__adobe_cep__.setContextMenuByJSON(menu, callback);
  };

  CSInterface.prototype.updateContextMenuItem = function(menuItemID, enabled, checked) {
    window.__adobe_cep__.updateContextMenuItem(menuItemID, enabled, checked);
  };

  CSInterface.prototype.getExtensionPath = function() {
    return decodeURIComponent(window.__adobe_cep__.getExtensionPath());
  };

  CSInterface.prototype.getNetworkPreferences = function() {
    return JSON.parse(window.__adobe_cep__.getNetworkPreferences());
  };

  CSInterface.prototype.initResourceBundle = function() {
    var resourceBundle = {};
    var content;
    try {
      var extensionPath = this.getExtensionPath();
      var locale = this.getHostEnvironment().appUILocale;
      var path = extensionPath + '/CSXS/resources/StringsFile-' + locale + '.js';
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send();
      if (xhr.status === 200) content = xhr.responseText;
    } catch (_) {}
    try {
      if (content) resourceBundle = JSON.parse(content);
    } catch (_) {}
    return resourceBundle;
  };

  CSInterface.prototype.dumpInstallationInfo = function() {
    return window.__adobe_cep__.dumpInstallationInfo();
  };

  CSInterface.prototype.getOSInformation = function() {
    var userAgent = navigator.userAgent;
    if ((navigator.platform === 'Win32') || (navigator.platform === 'Windows')) {
      var winVersion = 'Windows';
      if (userAgent.indexOf('Windows NT 5.0') !== -1)  winVersion = 'Windows 2000';
      if (userAgent.indexOf('Windows NT 5.1') !== -1)  winVersion = 'Windows XP';
      if (userAgent.indexOf('Windows NT 6.0') !== -1)  winVersion = 'Windows Vista';
      if (userAgent.indexOf('Windows NT 6.1') !== -1)  winVersion = 'Windows 7';
      if (userAgent.indexOf('Windows NT 6.2') !== -1)  winVersion = 'Windows 8';
      if (userAgent.indexOf('Windows NT 10.0') !== -1) winVersion = 'Windows 10';
      return winVersion;
    } else if ((navigator.platform === 'MacIntel') || (navigator.platform === 'Macintosh')) {
      var macVersion = 'Mac OS X';
      var matches = userAgent.match(/Mac OS X ([._\d]+)/);
      if (matches) macVersion = 'Mac OS X ' + matches[1].replace(/_/g, '.');
      return macVersion;
    }
    return 'Unknown';
  };

  CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    if (window.__adobe_cep__) {
      window.__adobe_cep__.openURLInDefaultBrowser(url);
    }
  };

  CSInterface.prototype.getCurrentApiVersion = function() {
    var ver = JSON.parse(window.__adobe_cep__.getCurrentApiVersion());
    return ver;
  };

  CSInterface.prototype.setPanelFlyoutMenu = function(menu) {
    if (!menu) return;
    window.__adobe_cep__.setPanelFlyoutMenu(menu);
  };

  CSInterface.prototype.updatePanelMenuItem = function(title, enabled, checked) {
    window.__adobe_cep__.updatePanelMenuItem(title, enabled, checked);
  };

  CSInterface.prototype.setContextMenu = function(menu, callback) {
    if (!callback) callback = function() {};
    window.__adobe_cep__.setContextMenu(menu, callback);
  };

  CSInterface.prototype.showContextMenu = function() {
    window.__adobe_cep__.showContextMenu();
  };

  CSInterface.prototype.getExtensions = function(extensionIds) {
    var ids = JSON.stringify(extensionIds);
    var exts = JSON.parse(window.__adobe_cep__.getExtensions(ids));
    return exts;
  };

  CSInterface.prototype.closeExtension = function() {
    window.__adobe_cep__.closeExtension();
  };

  CSInterface.prototype.getApplicationVersion = function() {
    return this.hostEnvironment.appVersion;
  };

  // Expose to global scope
  window.CSInterface = CSInterface;

})(csInterface);
/* jshint ignore:end */
