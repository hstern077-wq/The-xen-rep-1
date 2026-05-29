/**
 * AI Motion Hub – Main Panel Logic (main.js)
 * Runs in CEP's Chromium environment (Node.js + browser APIs available).
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   CONFIG  –  replace HIGGSFIELD_API_KEY with your actual key
   ───────────────────────────────────────────────────────────────────────────── */
const CONFIG = {
  API_KEY:      'HIGGSFIELD_API_KEY',         // ← replace with your key
  BASE_URL:     'https://api.higgsfield.ai/v1',
  POLL_INTERVAL: 5000,                        // ms between status checks
  MAX_POLLS:    120,                          // give up after 10 minutes
};

/* ─────────────────────────────────────────────────────────────────────────────
   STATE
   ───────────────────────────────────────────────────────────────────────────── */
const state = {
  selectedPreset:  'cinematic',
  referenceBase64: null,       // base64 string of the grabbed frame
  referencePath:   null,       // local file path of the frame
  seqMeta:         null,       // { fps, width, height, name }
  jobId:           null,       // current generation job ID
  pollCount:       0,
  pollTimer:       null,
  countdownTimer:  null,
  cancelled:       false,
  outputDir:       null,
  generatedPath:   null,
};

/* ─────────────────────────────────────────────────────────────────────────────
   CSINTERFACE
   ───────────────────────────────────────────────────────────────────────────── */
const cs = new CSInterface();

/* Utility: call ExtendScript and get a Promise back */
function evalScript(fn, ...args) {
  return new Promise((resolve, reject) => {
    const argStr = args.map(a => JSON.stringify(a)).join(', ');
    cs.evalScript(`${fn}(${argStr})`, (result) => {
      try {
        const parsed = JSON.parse(result);
        if (parsed && parsed.error) reject(new Error(parsed.error));
        else resolve(parsed);
      } catch (_) {
        resolve(result); // raw string fallback
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   DOM REFS
   ───────────────────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const el = {
  promptInput:      $('prompt-input'),
  charCount:        $('char-count'),
  seqFps:           $('seq-fps'),
  seqW:             $('seq-w'),
  seqH:             $('seq-h'),
  refPreview:       $('reference-preview'),
  refBadge:         $('ref-badge'),
  btnGrabFrame:     $('btn-grab-frame'),
  btnClearRef:      $('btn-clear-ref'),
  toggleUseSeed:    $('toggle-use-seed'),
  btnRefreshSeq:    $('btn-refresh-seq'),
  btnGenerate:      $('btn-generate'),
  btnCancel:        $('btn-cancel'),
  btnImport:        $('btn-import-premiere'),
  btnReveal:        $('btn-reveal-finder'),
  progressSection:  $('progress-section'),
  progressFill:     $('progress-fill'),
  progressPct:      $('progress-pct'),
  progressLabel:    $('progress-label-text'),
  progressStatus:   $('progress-status'),
  pollRow:          $('poll-row'),
  pollCountdown:    $('poll-countdown'),
  logOutput:        $('log-output'),
  resultCard:       $('result-card'),
  resultPath:       $('result-path'),
  statusDot:        $('status-dot'),
  statusText:       $('status-text'),
  advancedToggle:   $('advanced-toggle'),
  advancedPanel:    $('advanced-panel'),
  advancedArrow:    $('advanced-arrow'),
  toast:            $('toast'),
  selDuration:      $('sel-duration'),
  selMotion:        $('sel-motion'),
  toggleAutoImport: $('toggle-auto-import'),
  toggleMatchFps:   $('toggle-match-fps'),
};

/* ─────────────────────────────────────────────────────────────────────────────
   LOGGING
   ───────────────────────────────────────────────────────────────────────────── */
function log(msg, level = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${level}`;
  const ts = new Date().toLocaleTimeString('en', { hour12: false });
  line.textContent = `[${ts}] ${msg}`;
  el.logOutput.appendChild(line);
  el.logOutput.scrollTop = el.logOutput.scrollHeight;
}

/* ─────────────────────────────────────────────────────────────────────────────
   TOAST
   ───────────────────────────────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = '', duration = 3000) {
  el.toast.textContent = msg;
  el.toast.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.className = 'toast'; }, duration);
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS BAR
   ───────────────────────────────────────────────────────────────────────────── */
function setStatus(text, type = '') {
  el.statusText.textContent = text;
  el.statusDot.className    = `status-dot ${type}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROGRESS HELPERS
   ───────────────────────────────────────────────────────────────────────────── */
function setProgress(pct, label, status) {
  el.progressFill.style.width  = pct + '%';
  el.progressPct.textContent   = pct + '%';
  if (label)  el.progressLabel.textContent  = label;
  if (status) el.progressStatus.textContent = status;
}

function showProgress(show) {
  el.progressSection.classList.toggle('visible', show);
}

function showResult(path) {
  el.generatedPath           = path;
  el.resultPath.textContent  = path;
  el.resultCard.classList.add('visible');
}

/* ─────────────────────────────────────────────────────────────────────────────
   SEQUENCE METADATA
   ───────────────────────────────────────────────────────────────────────────── */
async function refreshSequenceInfo() {
  el.btnRefreshSeq.disabled = true;
  try {
    const meta = await evalScript('getSequenceMetadata');
    state.seqMeta = meta;
    el.seqFps.textContent = meta.fps  || '—';
    el.seqW.textContent   = meta.width  || '—';
    el.seqH.textContent   = meta.height || '—';
    setStatus('Sequence loaded', 'ready');
  } catch (err) {
    el.seqFps.textContent = '—';
    el.seqW.textContent   = '—';
    el.seqH.textContent   = '—';
    setStatus('No sequence', 'error');
    showToast('No active sequence found', 'error');
  } finally {
    el.btnRefreshSeq.disabled = false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   REFERENCE FRAME CAPTURE
   ───────────────────────────────────────────────────────────────────────────── */
async function grabCurrentFrame() {
  el.btnGrabFrame.disabled = true;
  el.btnGrabFrame.textContent = '⏳ Capturing…';

  try {
    const result = await evalScript('captureCurrentFrame');
    state.referencePath = result.path;

    /* Read file as base64 via Node.js fs (available in CEP) */
    const fs   = require('fs');
    const data = fs.readFileSync(result.path);
    state.referenceBase64 = data.toString('base64');

    /* Show thumbnail */
    const blob = new Blob([data], { type: 'image/jpeg' });
    const url  = URL.createObjectURL(blob);

    /* Clear existing preview content and show image */
    el.refPreview.innerHTML = `
      <img src="${url}" alt="Reference frame"/>
      <span class="reference-badge" id="ref-badge">Frame captured</span>`;
    el.refPreview.classList.add('has-image');

    log('Reference frame captured: ' + result.path, 'success');
    showToast('Frame captured!', 'success');
  } catch (err) {
    log('Frame capture failed: ' + err.message, 'error');
    showToast('Could not capture frame: ' + err.message, 'error');
  } finally {
    el.btnGrabFrame.disabled = false;
    el.btnGrabFrame.textContent = '📷 Grab Current Frame';
  }
}

function clearReference() {
  state.referenceBase64 = null;
  state.referencePath   = null;
  el.refPreview.innerHTML = `
    <span class="preview-placeholder-icon">🎞</span>
    <span class="preview-placeholder-text">No frame captured</span>
    <span class="reference-badge" id="ref-badge">Frame captured</span>`;
  el.refPreview.classList.remove('has-image');
}

/* ─────────────────────────────────────────────────────────────────────────────
   HIGGSFIELD API
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * POST /generations — start a video generation job.
 * Docs reference: https://docs.higgsfield.ai  (fill in exact endpoint when known)
 */
async function startGeneration(payload) {
  const res = await fetch(`${CONFIG.BASE_URL}/generation`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }

  return res.json(); // expects { id, status, ... }
}

/**
 * GET /generations/{id} — poll the status of a generation job.
 */
async function pollGeneration(jobId) {
  const res = await fetch(`${CONFIG.BASE_URL}/generation/${jobId}`, {
    headers: { 'Authorization': `Bearer ${CONFIG.API_KEY}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Poll ${res.status}: ${errText}`);
  }

  return res.json(); // expects { id, status, progress, output_url, ... }
}

/**
 * Download the finished video to AI_Generated_Assets/
 * Returns the local file path.
 */
async function downloadVideo(url, outputDir, jobId) {
  const fs   = require('fs');
  const path = require('path');
  const http = url.startsWith('https') ? require('https') : require('http');

  /* Derive a safe filename */
  const ext      = url.split('?')[0].split('.').pop() || 'mp4';
  const fileName = `ai_motion_${jobId}.${ext}`;
  const filePath = path.join(outputDir, fileName);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    http.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloaded   = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalBytes > 0) {
          const pct = Math.round((downloaded / totalBytes) * 100);
          setProgress(70 + Math.round(pct * 0.25), 'Downloading…', `${Math.round(downloaded / 1024)} KB / ${Math.round(totalBytes / 1024)} KB`);
        }
      });

      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(filePath); });
      file.on('error', reject);
    }).on('error', reject);
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   POLLING LOOP
   ───────────────────────────────────────────────────────────────────────────── */
function startPolling(jobId, outputDir) {
  state.pollCount = 0;
  el.pollRow.style.display = 'flex';

  function scheduleNextPoll(delay) {
    let remaining = Math.floor(delay / 1000);
    el.pollCountdown.textContent = `Next check in ${remaining}s…`;

    state.countdownTimer = setInterval(() => {
      remaining--;
      el.pollCountdown.textContent = remaining > 0
        ? `Next check in ${remaining}s…`
        : 'Checking…';
      if (remaining <= 0) clearInterval(state.countdownTimer);
    }, 1000);

    state.pollTimer = setTimeout(() => doPoll(jobId, outputDir), delay);
  }

  async function doPoll(jobId, outputDir) {
    if (state.cancelled) return;
    state.pollCount++;

    if (state.pollCount > CONFIG.MAX_POLLS) {
      onError(new Error('Generation timed out after 10 minutes.'));
      return;
    }

    try {
      log(`Polling status (attempt ${state.pollCount})…`);
      const data = await pollGeneration(jobId);

      const status   = (data.status || '').toLowerCase();
      const progress = data.progress || 0;

      /* Map API progress (0-100) into the 10-70 progress-bar range */
      const barPct = 10 + Math.round(progress * 0.60);
      setProgress(barPct, `Processing… (${status})`, data.message || status);
      log(`Status: ${status} | ${progress}%`);

      if (status === 'completed' || status === 'succeeded') {
        await onComplete(data, outputDir);
      } else if (status === 'failed' || status === 'error') {
        onError(new Error(data.error || 'Generation failed'));
      } else {
        /* Still in progress — schedule next poll */
        scheduleNextPoll(CONFIG.POLL_INTERVAL);
      }
    } catch (err) {
      log('Poll error: ' + err.message, 'error');
      /* Retry once on transient network errors */
      if (state.pollCount < CONFIG.MAX_POLLS && !state.cancelled) {
        scheduleNextPoll(CONFIG.POLL_INTERVAL * 2);
      } else {
        onError(err);
      }
    }
  }

  scheduleNextPoll(CONFIG.POLL_INTERVAL);
}

function stopPolling() {
  clearTimeout(state.pollTimer);
  clearInterval(state.countdownTimer);
  el.pollRow.style.display = 'none';
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPLETION / ERROR
   ───────────────────────────────────────────────────────────────────────────── */
async function onComplete(data, outputDir) {
  stopPolling();
  setProgress(70, 'Downloading video…', 'Saving to AI_Generated_Assets…');

  const outputUrl = data.output_url || data.video_url || data.url;
  if (!outputUrl) {
    onError(new Error('API response missing output URL'));
    return;
  }

  try {
    const localPath = await downloadVideo(outputUrl, outputDir, state.jobId);
    log('Video saved: ' + localPath, 'success');
    setProgress(100, 'Complete!', 'Video saved successfully.');

    showResult(localPath);
    setStatus('Generation complete', 'ready');
    setUIBusy(false);

    /* Auto-import if enabled */
    if (el.toggleAutoImport.checked) {
      await importToPremiere(localPath);
    }

    showToast('✓ Generation complete!', 'success', 5000);
  } catch (err) {
    onError(err);
  }
}

function onError(err) {
  stopPolling();
  log('Error: ' + err.message, 'error');
  setProgress(0, 'Error', err.message);
  setStatus('Error', 'error');
  setUIBusy(false);
  showToast('Generation failed: ' + err.message, 'error', 6000);
}

/* ─────────────────────────────────────────────────────────────────────────────
   PREMIERE IMPORT
   ───────────────────────────────────────────────────────────────────────────── */
async function importToPremiere(filePath) {
  try {
    log('Importing to Premiere Pro (AI_RENDER bin)…');
    const result = await evalScript('importGeneratedVideo', filePath);
    log(`Imported: "${result.itemName}"`, 'success');
    showToast('Imported into AI_RENDER bin', 'success');
  } catch (err) {
    log('Import failed: ' + err.message, 'error');
    showToast('Import failed: ' + err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   UI BUSY STATE
   ───────────────────────────────────────────────────────────────────────────── */
function setUIBusy(busy) {
  el.btnGenerate.disabled  = busy;
  el.btnGrabFrame.disabled = busy;
  if (busy) {
    el.btnGenerate.textContent = '⏳ Generating…';
    setStatus('Working…', 'working');
  } else {
    el.btnGenerate.textContent = '⚡ Generate Video';
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN GENERATE HANDLER
   ───────────────────────────────────────────────────────────────────────────── */
async function handleGenerate() {
  const prompt = el.promptInput.value.trim();
  if (!prompt) {
    showToast('Please enter a prompt.', 'error');
    el.promptInput.focus();
    return;
  }

  if (CONFIG.API_KEY === 'HIGGSFIELD_API_KEY') {
    showToast('Set your Higgsfield API key in js/main.js (CONFIG.API_KEY).', 'error', 6000);
    return;
  }

  /* Reset UI */
  state.cancelled   = false;
  state.jobId       = null;
  state.pollCount   = 0;
  el.resultCard.classList.remove('visible');
  el.logOutput.innerHTML = '';
  showProgress(true);
  setProgress(5, 'Starting…', 'Building request…');
  setUIBusy(true);

  try {
    /* 1. Get output directory from ExtendScript */
    const dirResult = await evalScript('getOutputDirectory');
    state.outputDir = dirResult.path;
    log('Output directory: ' + state.outputDir);

    /* 2. Build payload */
    const payload = {
      prompt:   prompt,
      style:    state.selectedPreset,
      duration: parseInt(el.selDuration.value, 10),
      motion:   el.selMotion.value,
    };

    /* Attach sequence metadata if available */
    if (state.seqMeta && el.toggleMatchFps.checked) {
      payload.fps    = state.seqMeta.fps;
      payload.width  = state.seqMeta.width;
      payload.height = state.seqMeta.height;
    }

    /* Attach reference frame if available and toggled on */
    if (state.referenceBase64 && el.toggleUseSeed.checked) {
      payload.reference_image = state.referenceBase64;
      payload.mode            = 'image_to_video';
      log('Including reference frame as seed.');
    } else {
      payload.mode = 'text_to_video';
    }

    /* 3. Submit generation request */
    setProgress(8, 'Submitting…', 'Sending to Higgsfield API…');
    log('Submitting generation request…');
    const jobData = await startGeneration(payload);

    state.jobId = jobData.id || jobData.job_id;
    if (!state.jobId) throw new Error('API did not return a job ID');

    log(`Job created: ${state.jobId}`, 'success');
    setProgress(10, 'In queue…', `Job ID: ${state.jobId}`);

    /* 4. Start polling */
    startPolling(state.jobId, state.outputDir);

  } catch (err) {
    onError(err);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   EVENT LISTENERS
   ───────────────────────────────────────────────────────────────────────────── */

/* Prompt char count */
el.promptInput.addEventListener('input', () => {
  const len = el.promptInput.value.length;
  el.charCount.textContent = `${len} / 800`;
  el.charCount.style.color = len > 720
    ? 'var(--spectrum-warning)'
    : 'var(--color-text-dim)';
});

/* Style preset selection */
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedPreset = btn.dataset.preset;
  });
});

/* Sequence refresh */
el.btnRefreshSeq.addEventListener('click', refreshSequenceInfo);

/* Frame grab */
el.btnGrabFrame.addEventListener('click', grabCurrentFrame);

/* Clear reference */
el.btnClearRef.addEventListener('click', () => {
  clearReference();
  showToast('Reference cleared');
});

/* Generate */
el.btnGenerate.addEventListener('click', handleGenerate);

/* Cancel */
el.btnCancel.addEventListener('click', () => {
  state.cancelled = true;
  stopPolling();
  showProgress(false);
  setUIBusy(false);
  setStatus('Cancelled', '');
  log('Generation cancelled by user.', 'warn');
  showToast('Cancelled');
});

/* Import to Premiere */
el.btnImport.addEventListener('click', async () => {
  if (state.generatedPath) {
    await importToPremiere(state.generatedPath);
  }
});

/* Reveal in file explorer */
el.btnReveal.addEventListener('click', async () => {
  if (state.generatedPath) {
    try {
      await evalScript('revealInExplorer', state.generatedPath);
    } catch (err) {
      /* Fallback: use Node's shell open */
      const { shell } = require('electron');
      const path = require('path');
      shell.showItemInFolder(state.generatedPath);
    }
  }
});

/* Advanced panel toggle */
el.advancedToggle.addEventListener('click', () => {
  const open = el.advancedPanel.style.display === 'block';
  el.advancedPanel.style.display  = open ? 'none' : 'block';
  el.advancedArrow.textContent    = open ? '▶' : '▼';
});

/* ─────────────────────────────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────────────────────────────── */
(async function init() {
  /* Apply Premiere's theme color to match host app */
  cs.setContextMenuByJSON('[]');

  /* Try to load sequence info immediately */
  await refreshSequenceInfo().catch(() => {});

  /* Also load the output dir path so we can show it early */
  try {
    const dirResult = await evalScript('getOutputDirectory');
    state.outputDir = dirResult.path;
    log('Ready. Output → ' + state.outputDir, 'info');
  } catch (_) {
    log('Ready. Open a project to enable output directory detection.', 'info');
  }

  setStatus('Ready', 'ready');
})();
