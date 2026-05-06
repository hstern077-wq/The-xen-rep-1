/**
 * host.jsx — ExtendScript host for Hebrew Subtitle Master
 *
 * Runs inside Premiere Pro's scripting engine (ExtendScript / ES3 subset).
 * All functions return strings so the CEP bridge can deliver them as
 * the callback argument in CSInterface.evalScript().
 *
 * Error convention: any value starting with "Error:" is treated as a
 * failure by main.js.
 */

// ── Audio export ─────────────────────────────────────────────────────────────

/**
 * Exports the active sequence as a low-bitrate MP3 for Whisper.
 * Tries Adobe Media Encoder first, falls back to exportAsMediaDirect(),
 * then signals FFMPEG_FALLBACK so main.js can try system ffmpeg.
 *
 * @returns {string} Absolute path to the exported MP3, or an error/fallback string.
 */
function exportAudioForTranscription() {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'Error: No active sequence. Open a sequence in the timeline.';

    var tmpDir  = Folder.temp.fsName;
    var outName = 'hsm_audio_' + (new Date().getTime()) + '.mp3';
    var outPath = tmpDir + '/' + outName;

    // ── Attempt 1: Adobe Media Encoder (non-blocking via queue is normal,
    //   but encodeSequence with blockUntilDone=true works when AME is installed)
    if (app.encoder) {
      try {
        var encResult = app.encoder.encodeSequence(
          seq,
          outPath,
          'MP3 - 128 kbps',          // standard Premiere preset name
          app.encoder.ENCODE_ENTIRE,  // encode entire sequence (not in/out only)
          true                        // blockUntilDone
        );
        var outFile = new File(outPath);
        if (outFile.exists) return outPath;
      } catch (ameErr) {
        // AME not available or preset not found — fall through
      }
    }

    // ── Attempt 2: exportAsMediaDirect (Premiere Pro internal encoder)
    //   Requires an .epr (export preset) file bundled with the extension.
    var eprPath = Folder.startup.fsName +
                  '/../../extensions/com.hebrewsubtitlemaster/epr/audio_mp3_128.epr';
    var eprFile = new File(eprPath);
    if (eprFile.exists) {
      try {
        seq.exportAsMediaDirect(outPath, eprPath, app.encoder.ENCODE_ENTIRE);
        var outFile2 = new File(outPath);
        if (outFile2.exists) return outPath;
      } catch (eprErr) {
        // Fall through to ffmpeg signal
      }
    }

    // ── Fallback: signal to main.js to use system ffmpeg
    return 'FFMPEG_FALLBACK:' + tmpDir;

  } catch (e) {
    return 'Error: ' + e.message;
  }
}

/**
 * Returns the file system path of the first master clip in the active
 * sequence.  Used by the ffmpeg fallback in main.js.
 *
 * @returns {string} Absolute path or "Error: …"
 */
function getActiveSequenceSourcePath() {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'Error: No active sequence.';

    var tracks = seq.audioTracks;
    for (var t = 0; t < tracks.numTracks; t++) {
      var track = tracks[t];
      for (var c = 0; c < track.clips.numItems; c++) {
        var clip = track.clips[c];
        if (clip && clip.projectItem && clip.projectItem.getMediaPath) {
          var p = clip.projectItem.getMediaPath();
          if (p) return p;
        }
      }
    }
    // Try video tracks as well (for files where audio is muxed with video)
    var vtracks = seq.videoTracks;
    for (var vt = 0; vt < vtracks.numTracks; vt++) {
      var vtrack = vtracks[vt];
      for (var vc = 0; vc < vtrack.clips.numItems; vc++) {
        var vclip = vtrack.clips[vc];
        if (vclip && vclip.projectItem && vclip.projectItem.getMediaPath) {
          var vp = vclip.projectItem.getMediaPath();
          if (vp) return vp;
        }
      }
    }
    return 'Error: No linked media found in the active sequence.';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

// ── Caption import ────────────────────────────────────────────────────────────

/**
 * Imports an SRT file as a caption track on the active sequence.
 *
 * importCaptionFile() was introduced in Premiere Pro 2021 (v15.0).
 * For older versions we fall back to a project-panel import.
 *
 * @param  {string} srtFilePath - Absolute path to a UTF-8 encoded .srt file.
 * @returns {string} "OK", "OK_FALLBACK", or "Error: …"
 */
function importCaptionToTimeline(srtFilePath) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'Error: No active sequence.';

    var srtFile = new File(srtFilePath);
    if (!srtFile.exists) return 'Error: SRT file not found: ' + srtFilePath;

    // ── Primary path: importCaptionFile (PPro 2021+) ──────────────────────
    if (seq.importCaptionFile) {
      var ok = seq.importCaptionFile(
        srtFilePath,
        0  // timebase position (0 = sequence start, in ticks)
      );
      if (ok) {
        // Apply RTL alignment to every newly created caption clip
        applyRTLToAllCaptionTracks(seq);
        return 'OK';
      }
      return 'Error: importCaptionFile returned false. Check Premiere version.';
    }

    // ── Fallback: import into project panel ───────────────────────────────
    return importCaptionFallback(srtFilePath);

  } catch (e) {
    // The method exists but threw — try fallback
    try {
      return importCaptionFallback(srtFilePath);
    } catch (e2) {
      return 'Error: ' + e2.message;
    }
  }
}

/**
 * Older Premiere Pro: import the SRT file into the project panel so the
 * user can drag it to a caption track manually.
 */
function importCaptionFallback(srtFilePath) {
  try {
    app.project.importFiles(
      [srtFilePath],
      true,                    // suppress dialogs
      app.project.rootItem,
      false                    // don't import as numbered stills
    );
    return 'OK_FALLBACK';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

// ── RTL alignment ─────────────────────────────────────────────────────────────

/**
 * Walks every caption track in a sequence and sets text alignment to "right"
 * so Hebrew RTL text in Essential Graphics / caption layers renders correctly.
 *
 * Premiere Pro exposes caption clip properties through the TrackItem's
 * component API.  This function is best-effort — it silently skips clips
 * whose API surface isn't available (older host versions).
 *
 * @param {Sequence} seq - The Premiere Pro Sequence object.
 */
function applyRTLToAllCaptionTracks(seq) {
  try {
    var tracks = seq.captionTracks;
    if (!tracks) return false;

    for (var t = 0; t < tracks.numTracks; t++) {
      var track = tracks[t];
      for (var c = 0; c < track.clips.numItems; c++) {
        var clip = track.clips[c];
        applyRTLToClip(clip);
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sets right-alignment on a single caption/text track item.
 *
 * Essential Graphics text components expose alignment as a numeric property:
 *   0 = left, 1 = center, 2 = right, 3 = justify.
 *
 * @param {TrackItem} clip
 */
function applyRTLToClip(clip) {
  try {
    if (!clip || !clip.getMGTComponent) return;

    var mgt = clip.getMGTComponent();
    if (!mgt) return;

    // controlPointGroup holds the text layer's style properties
    var group = mgt.controlPointGroup;
    if (!group) return;

    for (var i = 0; i < group.numProperties; i++) {
      var prop = group.getAt(i);
      if (!prop || !prop.displayName) continue;

      var name = prop.displayName.toLowerCase();

      // "alignment", "text alignment", "align" — normalise property name
      if (name.indexOf('align') !== -1) {
        prop.setValue(2, true);   // 2 = right, true = invokeCallback
      }

      // Also ensure the bidi/text direction flag if exposed
      if (name.indexOf('direction') !== -1 || name.indexOf('rtl') !== -1) {
        try { prop.setValue(1, true); } catch (_) {}
      }
    }
  } catch (e) {
    // Non-fatal — clip may not expose the MGT API
  }
}

// ── Save-file dialog ──────────────────────────────────────────────────────────

/**
 * Opens a native OS "Save As" dialog filtered to .srt files.
 * @returns {string} The chosen absolute path, or "null" if cancelled.
 */
function getSaveFilePath() {
  try {
    var f = File.saveDialog('Save subtitles as SRT', '*.srt:SRT Files');
    if (!f) return 'null';
    return f.fsName;
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

// ── Capability check ──────────────────────────────────────────────────────────

/**
 * Returns a JSON string describing host capabilities.
 * main.js parses this for the ℹ info button.
 */
function checkCapability() {
  try {
    var ver          = parseFloat(app.version);
    var seq          = app.project.activeSequence;
    var hasCaptionFn = !!(seq && seq.importCaptionFile);

    return JSON.stringify({
      version:              app.version,
      supportsImportCaption: ver >= 15.0 || hasCaptionFn,
      hasActiveSequence:    !!seq,
      sequenceName:         seq ? seq.name : null,
      hasAME:               !!app.encoder
    });
  } catch (e) {
    return 'Error: ' + e.message;
  }
}
