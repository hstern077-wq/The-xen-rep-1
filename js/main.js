/**
 * main.js — Hebrew Subtitle Master panel logic
 *
 * Flow:
 *   Step 1: Ask host.jsx to export the active sequence as a temp MP3,
 *           then send the file to OpenAI Whisper (language=he).
 *           Parse the verbose JSON response into SRT.
 *   Step 2: Write SRT to a temp file, ask host.jsx to call
 *           importCaptionFile() on the active sequence.
 *   Save .SRT: ask host.jsx for a native save-file dialog path, write locally.
 */

(function () {
  'use strict';

  // ── Node modules available in CEP's embedded Node.js runtime ──────────────
  var fs   = require('fs');
  var os   = require('os');
  var path = require('path');

  // ── CEP bridge ────────────────────────────────────────────────────────────
  var cs = new CSInterface();

  // ── State ─────────────────────────────────────────────────────────────────
  var srtData      = null;
  var isProcessing = false;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var elApiKey     = document.getElementById('apiKey');
  var elToggleKey  = document.getElementById('btnToggleKey');
  var elBtnInfo    = document.getElementById('btnInfo');
  var elExtract    = document.getElementById('btnExtract');
  var elPush       = document.getElementById('btnPush');
  var elSaveSRT    = document.getElementById('btnSaveSRT');
  var elClear      = document.getElementById('btnClear');
  var elFill       = document.getElementById('progressFill');
  var elPct        = document.getElementById('progressPct');
  var elStatus     = document.getElementById('statusText');
  var elPreview    = document.getElementById('srtPreview');

  // ── API key persistence ────────────────────────────────────────────────────
  var STORAGE_KEY = 'hsm_openai_api_key';
  elApiKey.value = localStorage.getItem(STORAGE_KEY) || '';

  elApiKey.addEventListener('input', function () {
    localStorage.setItem(STORAGE_KEY, elApiKey.value.trim());
  });

  elToggleKey.addEventListener('click', function () {
    elApiKey.type = (elApiKey.type === 'password') ? 'text' : 'password';
    elToggleKey.textContent = (elApiKey.type === 'password') ? '👁' : '🙈';
  });

  // ── Info button: checks Premiere version + capability ─────────────────────
  elBtnInfo.addEventListener('click', function () {
    cs.evalScript('checkCapability()', function (res) {
      try {
        var info = JSON.parse(res);
        var msg = 'Premiere ' + info.version +
                  ' | Caption import: ' + (info.supportsImportCaption ? '✔' : '✘ (need v15+)') +
                  ' | Sequence: ' + (info.hasActiveSequence ? '✔' : '✘ none active');
        setStatus(msg, info.supportsImportCaption && info.hasActiveSequence ? 'success' : 'warn');
      } catch (_) {
        setStatus(res || 'Could not read host info.', 'warn');
      }
    });
  });

  // ── Progress / status helpers ─────────────────────────────────────────────
  function setProgress(pct, msg, type) {
    pct = Math.max(0, Math.min(100, pct));
    elFill.style.width = pct + '%';
    elPct.textContent  = pct + '%';
    setStatus(msg, type);
  }

  function setStatus(msg, type) {
    elStatus.textContent = msg || '';
    elStatus.className   = 'status-text' + (type ? ' ' + type : '');
  }

  function setBusy(busy) {
    isProcessing       = busy;
    elExtract.disabled = busy;
    elPush.disabled    = busy || !srtData;
    elSaveSRT.disabled = !srtData;
    if (busy) {
      elExtract.classList.add('loading');
    } else {
      elExtract.classList.remove('loading');
    }
  }

  // ── STEP 1: Extract + Transcribe ──────────────────────────────────────────
  elExtract.addEventListener('click', function () {
    var apiKey = elApiKey.value.trim();
    if (!apiKey) {
      setStatus('OpenAI API key is required.', 'error');
      return;
    }
    if (isProcessing) return;

    srtData = null;
    elPreview.value = '';
    elPush.disabled = true;
    elSaveSRT.disabled = true;
    setBusy(true);

    setProgress(5, 'Checking active sequence...');

    exportAudio()
      .then(function (audioPath) {
        setProgress(25, 'Uploading audio to Whisper...');
        return transcribeWithWhisper(audioPath, apiKey);
      })
      .then(function (whisperJson) {
        setProgress(82, 'Parsing transcription to SRT...');
        srtData = buildSRT(whisperJson);
        elPreview.value = srtData;
        setProgress(100, 'Transcription complete. Ready to push.', 'success');
        elPush.disabled = false;
        elSaveSRT.disabled = false;
      })
      .catch(function (err) {
        setProgress(0, err.message || String(err), 'error');
        console.error('[HSM] Step 1:', err);
      })
      .then(function () {
        setBusy(false);
      });
  });

  // ── Export audio via ExtendScript ─────────────────────────────────────────
  function exportAudio() {
    return new Promise(function (resolve, reject) {
      cs.evalScript('exportAudioForTranscription()', function (result) {
        var r = (result || '').trim();
        if (!r || r === 'null' || r === 'undefined') {
          return reject(new Error('exportAudioForTranscription returned empty.'));
        }
        if (r.indexOf('Error:') === 0) {
          return reject(new Error(r));
        }
        // FFMPEG_FALLBACK path means AME is unavailable — try ffmpeg locally
        if (r.indexOf('FFMPEG_FALLBACK:') === 0) {
          var tmpBase = r.replace('FFMPEG_FALLBACK:', '');
          return exportViaFfmpeg(tmpBase, resolve, reject);
        }
        resolve(r);
      });
    });
  }

  // ── FFmpeg fallback (requires ffmpeg on system PATH) ──────────────────────
  function exportViaFfmpeg(tmpDir, resolve, reject) {
    setProgress(12, 'AME unavailable — trying ffmpeg...');
    var outFile = path.join(tmpDir, 'hsm_audio_' + Date.now() + '.mp3');

    cs.evalScript('getActiveSequenceSourcePath()', function (srcPath) {
      srcPath = (srcPath || '').trim();
      if (!srcPath || srcPath.indexOf('Error:') === 0) {
        return reject(new Error(
          'Could not resolve source media for ffmpeg. ' +
          'Open a sequence with a linked media file, or ensure AME is installed.'
        ));
      }

      var { execFile } = require('child_process');
      // Low-bitrate mono MP3 — keeps file well under Whisper's 25 MB limit
      var args = [
        '-i', srcPath,
        '-vn',                    // no video
        '-ac', '1',               // mono
        '-ar', '16000',           // 16 kHz — ideal for speech
        '-b:a', '32k',            // 32 kbps
        '-y',                     // overwrite
        outFile
      ];

      setProgress(18, 'ffmpeg: encoding audio...');
      execFile('ffmpeg', args, function (err) {
        if (err) return reject(new Error('ffmpeg failed: ' + err.message));
        if (!fs.existsSync(outFile)) return reject(new Error('ffmpeg produced no output.'));
        setProgress(24, 'ffmpeg export complete.');
        resolve(outFile);
      });
    });
  }

  // ── Whisper API call ──────────────────────────────────────────────────────
  function transcribeWithWhisper(audioFilePath, apiKey) {
    return new Promise(function (resolve, reject) {
      if (!fs.existsSync(audioFilePath)) {
        return reject(new Error('Audio file not found: ' + audioFilePath));
      }

      var fileBuffer = fs.readFileSync(audioFilePath);
      var fileName   = path.basename(audioFilePath);
      var mimeType   = fileName.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';

      var blob = new Blob([fileBuffer], { type: mimeType });
      var form = new FormData();
      form.append('file',                    blob, fileName);
      form.append('model',                   'whisper-1');
      form.append('language',                'he');       // Hebrew
      form.append('response_format',         'verbose_json');
      form.append('timestamp_granularities[]', 'segment');

      setProgress(40, 'Transcribing Hebrew audio...');

      fetch('https://api.openai.com/v1/audio/transcriptions', {
        method:  'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey },
        body:    form
      })
        .then(function (res) {
          if (!res.ok) {
            return res.text().then(function (body) {
              throw new Error('Whisper API ' + res.status + ': ' + body);
            });
          }
          setProgress(72, 'Processing Whisper response...');
          return res.json();
        })
        .then(resolve)
        .catch(reject)
        .then(function () {
          // Clean up the temp audio file
          try { fs.unlinkSync(audioFilePath); } catch (_) {}
        });
    });
  }

  // ── SRT builder ───────────────────────────────────────────────────────────
  function buildSRT(whisperJson) {
    var segments = Array.isArray(whisperJson.segments) ? whisperJson.segments : [];

    if (!segments.length) {
      // Whole-file fallback — single block with no timestamp info
      var text = applyRTL((whisperJson.text || '').trim());
      return '1\n00:00:00,000 --> 00:00:05,000\n' + text + '\n\n';
    }

    return segments.map(function (seg, i) {
      var start = toSRTTime(seg.start);
      var end   = toSRTTime(seg.end);
      var line  = applyRTL(seg.text.trim());
      return (i + 1) + '\n' + start + ' --> ' + end + '\n' + line + '\n';
    }).join('\n');
  }

  function toSRTTime(seconds) {
    seconds = Number(seconds) || 0;
    var h   = Math.floor(seconds / 3600);
    var m   = Math.floor((seconds % 3600) / 60);
    var s   = Math.floor(seconds % 60);
    var ms  = Math.round((seconds % 1) * 1000);
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s) + ',' + pad3(ms);
  }

  function pad2(n)  { return String(n).padStart(2, '0'); }
  function pad3(n)  { return String(n).padStart(3, '0'); }

  /**
   * Wraps a line with Unicode RTL embedding markers.
   *
   * U+202B RIGHT-TO-LEFT EMBEDDING ensures Premiere's Essential Graphics
   * panel renders the text in the correct direction even when the layer's
   * alignment is not yet set to right-aligned.  U+202C pops the context.
   *
   * Without this, bidirectional heuristics in the text engine can flip
   * the order of mixed Hebrew/punctuation runs.
   */
  function applyRTL(text) {
    return '‫' + text + '‬';
  }

  // ── STEP 2: Push SRT to timeline ──────────────────────────────────────────
  elPush.addEventListener('click', function () {
    if (!srtData || isProcessing) return;

    setBusy(true);
    setProgress(10, 'Writing SRT to temp file...');

    try {
      var tmpPath = path.join(os.tmpdir(), 'hsm_subtitles_' + Date.now() + '.srt');
      // Write with UTF-8 BOM so Premiere correctly identifies the encoding
      var bom = '﻿';
      fs.writeFileSync(tmpPath, bom + srtData, 'utf8');

      setProgress(40, 'Sending SRT to Premiere timeline...');

      // Escape backslashes for ExtendScript string literal
      var escapedPath = tmpPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      cs.evalScript('importCaptionToTimeline("' + escapedPath + '")', function (result) {
        var r = (result || '').trim();
        if (r.indexOf('Error:') === 0) {
          setProgress(0, r, 'error');
        } else {
          var msg = r === 'OK_FALLBACK'
            ? 'Imported via project panel (check caption track).'
            : 'Captions added to timeline!';
          setProgress(100, msg, 'success');
        }
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        setBusy(false);
      });

    } catch (err) {
      setProgress(0, 'Error: ' + err.message, 'error');
      setBusy(false);
    }
  });

  // ── Save as .SRT ──────────────────────────────────────────────────────────
  elSaveSRT.addEventListener('click', function () {
    if (!srtData) return;

    cs.evalScript('getSaveFilePath()', function (savePath) {
      var p = (savePath || '').trim();
      if (!p || p === 'null' || p === 'undefined') {
        setStatus('Save cancelled.', '');
        return;
      }
      if (p.indexOf('Error:') === 0) {
        setStatus(p, 'error');
        return;
      }
      var outPath = p.endsWith('.srt') ? p : p + '.srt';
      try {
        fs.writeFileSync(outPath, '﻿' + srtData, 'utf8');
        setStatus('Saved: ' + path.basename(outPath), 'success');
      } catch (e) {
        setStatus('Save error: ' + e.message, 'error');
      }
    });
  });

  // ── Clear ─────────────────────────────────────────────────────────────────
  elClear.addEventListener('click', function () {
    srtData = null;
    elPreview.value = '';
    setProgress(0, 'Ready');
    elPush.disabled    = true;
    elSaveSRT.disabled = true;
  });

}());
