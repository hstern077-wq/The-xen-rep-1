/**
 * AI Motion Hub – Host ExtendScript (host.jsx)
 * Runs inside Premiere Pro's ExtendScript engine.
 * Called via CSInterface.evalScript() from main.js
 */

/* ─── Polyfill: JSON for ExtendScript ─── */
if (typeof JSON === 'undefined') {
  JSON = {};
  JSON.stringify = function(obj) {
    var t = typeof obj;
    if (t !== 'object' || obj === null) {
      if (t === 'string') return '"' + obj.replace(/"/g, '\\"') + '"';
      return String(obj);
    }
    var n, v, json = [], arr = obj && obj.constructor === Array;
    for (n in obj) {
      if (obj.hasOwnProperty(n)) {
        v = obj[n];
        t = typeof v;
        if (t === 'string')       v = '"' + v.replace(/"/g, '\\"') + '"';
        else if (t === 'object')  v = JSON.stringify(v);
        else if (t === 'boolean') v = String(v);
        json.push((arr ? '' : '"' + n + '":') + v);
      }
    }
    return (arr ? '[' : '{') + String(json) + (arr ? ']' : '}');
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. GET SEQUENCE METADATA
   Returns a JSON string: { fps, width, height, name, duration }
   ───────────────────────────────────────────────────────────────────────────── */
function getSequenceMetadata() {
  try {
    if (!app.project) return JSON.stringify({ error: 'No project open' });

    var seq = app.project.activeSequence;
    if (!seq) return JSON.stringify({ error: 'No active sequence' });

    var timebase    = seq.timebase;           // ticks per second (string)
    var ticksPerSec = 254016000000;           // Adobe standard tick rate
    var fpsFraction = ticksPerSec / parseInt(timebase, 10);
    var fps         = Math.round(fpsFraction * 100) / 100;

    var width  = seq.frameSizeHorizontal;
    var height = seq.frameSizeVertical;

    var durationTicks = parseFloat(seq.end);
    var durationSecs  = durationTicks / ticksPerSec;

    return JSON.stringify({
      fps:      fps,
      width:    width,
      height:   height,
      name:     seq.name,
      duration: Math.round(durationSecs * 10) / 10
    });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. CAPTURE CURRENT FRAME
   Exports the frame at the playhead position as a JPEG to a temp path.
   Returns JSON: { success, path } or { error }
   ───────────────────────────────────────────────────────────────────────────── */
function captureCurrentFrame() {
  try {
    if (!app.project) return JSON.stringify({ error: 'No project open' });

    var seq = app.project.activeSequence;
    if (!seq) return JSON.stringify({ error: 'No active sequence' });

    /* Build export path inside project directory */
    var projPath = app.project.path;
    var projDir  = projPath.substring(0, projPath.lastIndexOf('/'));
    if (!projDir) projDir = projPath.substring(0, projPath.lastIndexOf('\\'));

    var assetDir  = projDir + '/AI_Generated_Assets';
    var frameFile = assetDir + '/reference_frame.jpg';

    /* Ensure the asset directory exists */
    var folder = new Folder(assetDir);
    if (!folder.exists) folder.create();

    /* Use Premiere's export frame API */
    var time     = seq.getPlayerPosition();
    var filePath = new File(frameFile);

    /* exportFramePNG is available in newer Premiere versions */
    seq.exportFramePNG(time, filePath);

    return JSON.stringify({ success: true, path: frameFile });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. ENSURE BIN EXISTS
   Finds or creates a bin named <binName> at root level.
   Returns the bin object (internal helper).
   ───────────────────────────────────────────────────────────────────────────── */
function ensureBin(binName) {
  var rootBin = app.project.rootItem;
  var children = rootBin.children;

  for (var i = 0; i < children.numItems; i++) {
    var item = children[i];
    if (item.type === ProjectItemType.BIN && item.name === binName) {
      return item;
    }
  }

  /* Not found — create it */
  app.project.rootItem.createBin(binName);

  /* Find and return the newly created bin */
  for (var j = 0; j < children.numItems; j++) {
    if (children[j].type === ProjectItemType.BIN && children[j].name === binName) {
      return children[j];
    }
  }

  return app.project.rootItem;
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. IMPORT GENERATED VIDEO
   Imports the file at <filePath> into a bin called "AI_RENDER".
   Returns JSON: { success, itemName } or { error }
   ───────────────────────────────────────────────────────────────────────────── */
function importGeneratedVideo(filePath) {
  try {
    if (!app.project) return JSON.stringify({ error: 'No project open' });

    var targetBin = ensureBin('AI_RENDER');

    /* importFiles(paths, suppressWarnings, targetBin, importAsNumberedStills) */
    var importResult = app.project.importFiles(
      [filePath],
      true,
      targetBin,
      false
    );

    if (!importResult) {
      return JSON.stringify({ error: 'Import returned false. File may already exist or path is invalid.' });
    }

    /* Get the name of the imported item from the bin */
    var itemName = '';
    var binChildren = targetBin.children;
    for (var i = 0; i < binChildren.numItems; i++) {
      var child = binChildren[i];
      if (child.getMediaPath && child.getMediaPath() === filePath) {
        itemName = child.name;
        break;
      }
    }

    return JSON.stringify({ success: true, itemName: itemName || 'Imported' });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. GET PROJECT OUTPUT DIRECTORY
   Returns the path to AI_Generated_Assets within the current project's folder.
   ───────────────────────────────────────────────────────────────────────────── */
function getOutputDirectory() {
  try {
    if (!app.project || !app.project.path) {
      return JSON.stringify({ error: 'No project saved. Please save the project first.' });
    }

    var projPath = app.project.path;
    /* Cross-platform path separator handling */
    var sep = (projPath.indexOf('/') !== -1) ? '/' : '\\';
    var projDir = projPath.substring(0, projPath.lastIndexOf(sep));

    var assetDir = projDir + sep + 'AI_Generated_Assets';
    var folder   = new Folder(assetDir);
    if (!folder.exists) folder.create();

    return JSON.stringify({ success: true, path: assetDir });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. REVEAL IN FINDER / EXPLORER
   Opens the folder containing the generated file in the OS file browser.
   ───────────────────────────────────────────────────────────────────────────── */
function revealInExplorer(filePath) {
  try {
    var f = new File(filePath);
    if (f.exists) {
      f.parent.execute();
      return JSON.stringify({ success: true });
    }
    return JSON.stringify({ error: 'File not found: ' + filePath });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  }
}
