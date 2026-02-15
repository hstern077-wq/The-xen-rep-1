(function () {
  "use strict";

  // DOM elements
  const stepsSection = document.getElementById("stepsSection");
  const cameraSection = document.getElementById("cameraSection");
  const cameraContainer = document.getElementById("cameraContainer");
  const cameraPreview = document.getElementById("cameraPreview");
  const captureBtn = document.getElementById("captureBtn");
  const switchCameraBtn = document.getElementById("switchCameraBtn");
  const previewContainer = document.getElementById("previewContainer");
  const previewImage = document.getElementById("previewImage");
  const retakeBtn = document.getElementById("retakeBtn");
  const findPhotosBtn = document.getElementById("findPhotosBtn");
  const actionButtons = document.getElementById("actionButtons");
  const takeSelfieBtn = document.getElementById("takeSelfieBtn");
  const uploadInput = document.getElementById("uploadInput");
  const loadingSection = document.getElementById("loadingSection");
  const resultsSection = document.getElementById("resultsSection");
  const resultsTitle = document.getElementById("resultsTitle");
  const resultsSubtitle = document.getElementById("resultsSubtitle");
  const resultsActions = document.getElementById("resultsActions");
  const saveAllBtn = document.getElementById("saveAllBtn");
  const saveAllText = document.getElementById("saveAllText");
  const photoGrid = document.getElementById("photoGrid");
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const captureCanvas = document.getElementById("captureCanvas");

  let currentStream = null;
  let facingMode = "user";
  let capturedImageData = null;
  let matchedPhotos = [];

  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    ("ontouchstart" in window && window.innerWidth < 768);

  // --- Camera ---

  async function startCamera() {
    stopCamera();
    try {
      const constraints = {
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      };
      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraPreview.srcObject = currentStream;
      cameraContainer.style.display = "block";
      actionButtons.style.display = "none";
      previewContainer.style.display = "none";
    } catch (err) {
      alert(
        "Could not access camera. Please allow camera access or upload a photo instead."
      );
      showActionButtons();
    }
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
    cameraPreview.srcObject = null;
  }

  function capturePhoto() {
    const video = cameraPreview;
    const canvas = captureCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // Mirror for front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    capturedImageData = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    showPreview(capturedImageData);
  }

  function showPreview(dataUrl) {
    previewImage.src = dataUrl;
    cameraContainer.style.display = "none";
    previewContainer.style.display = "block";
    actionButtons.style.display = "none";
  }

  function showActionButtons() {
    actionButtons.style.display = "flex";
    cameraContainer.style.display = "none";
    previewContainer.style.display = "none";
  }

  // --- Matching ---

  async function findPhotos() {
    if (!capturedImageData) return;

    showSection("loading");

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImageData }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      matchedPhotos = data.photos || [];
      showResults(data);
    } catch (err) {
      console.error("Match error:", err);
      alert("Something went wrong. Please try again.");
      showSection("camera");
      showActionButtons();
    }
  }

  // --- Results ---

  function showResults(data) {
    showSection("results");
    photoGrid.innerHTML = "";

    if (data.noFaceDetected) {
      resultsTitle.textContent = "No face detected";
      resultsSubtitle.textContent =
        "We couldn't detect a face in your photo. Try taking a clearer selfie!";
      resultsActions.style.display = "none";
      return;
    }

    if (data.count === 0) {
      resultsTitle.textContent = "No matches found";
      resultsSubtitle.textContent =
        "We couldn't find you in the wedding photos. Try another photo!";
      resultsActions.style.display = "none";
      return;
    }

    resultsTitle.textContent = "We found you!";
    resultsSubtitle.textContent = `${data.count} photo${data.count === 1 ? "" : "s"} from the wedding`;
    resultsActions.style.display = "block";

    for (const photo of data.photos) {
      const card = document.createElement("div");
      card.className = "photo-card";

      const img = document.createElement("img");
      img.src = photo.thumbnailUrl;
      img.alt = "Wedding photo";
      img.loading = "lazy";
      img.addEventListener("click", () => openLightbox(photo));

      const saveBtn = document.createElement("button");
      saveBtn.className = "save-btn";
      saveBtn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      saveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        savePhoto(photo, saveBtn);
      });

      card.appendChild(img);
      card.appendChild(saveBtn);
      photoGrid.appendChild(card);
    }
  }

  // --- Lightbox ---

  function openLightbox(photo) {
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";

    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = "Wedding photo full size";

    const closeBtn = document.createElement("button");
    closeBtn.className = "lightbox-close";
    closeBtn.innerHTML = "&times;";

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary lightbox-save";
    saveBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save Photo';

    lightbox.appendChild(img);
    lightbox.appendChild(closeBtn);
    lightbox.appendChild(saveBtn);
    document.body.appendChild(lightbox);

    // Animate in
    requestAnimationFrame(() => lightbox.classList.add("active"));

    function close() {
      lightbox.classList.remove("active");
      setTimeout(() => lightbox.remove(), 250);
    }

    closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      savePhoto(photo);
    });
  }

  // --- Save / Download ---

  function getPhotoFilename(photo) {
    // Extract original filename from the photoFile path
    const parts = (photo.photoFile || "").split(/[/\\]/);
    return parts[parts.length - 1] || `wedding-photo-${Date.now()}.jpg`;
  }

  async function savePhoto(photo, buttonEl) {
    try {
      const downloadUrl = `${photo.url}?download=1`;
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const filename = getPhotoFilename(photo);

      // Try Web Share API on mobile for direct save to gallery
      if (isMobile && navigator.canShare) {
        const file = new File([blob], filename, {
          type: blob.type,
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          if (buttonEl) buttonEl.classList.add("saved");
          return;
        }
      }

      // Fallback: direct download
      triggerDownload(blob, filename);
      if (buttonEl) buttonEl.classList.add("saved");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Save error:", err);
        // Last-resort fallback: open in new tab
        window.open(`${photo.url}?download=1`, "_blank");
      }
    }
  }

  async function saveAllPhotos() {
    saveAllBtn.disabled = true;
    saveAllText.textContent = "Saving...";

    if (isMobile) {
      // Save one by one on mobile
      for (let i = 0; i < matchedPhotos.length; i++) {
        saveAllText.textContent = `Saving ${i + 1}/${matchedPhotos.length}...`;
        await savePhoto(matchedPhotos[i]);
        // Small delay between shares
        await new Promise((r) => setTimeout(r, 500));
      }
    } else {
      // Desktop: download individually (ZIP would require extra library)
      for (let i = 0; i < matchedPhotos.length; i++) {
        saveAllText.textContent = `Downloading ${i + 1}/${matchedPhotos.length}...`;
        const res = await fetch(`${matchedPhotos[i].url}?download=1`);
        const blob = await res.blob();
        triggerDownload(blob, getPhotoFilename(matchedPhotos[i]));
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    saveAllText.textContent = "Save All Photos";
    saveAllBtn.disabled = false;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // --- Section management ---

  function showSection(name) {
    stepsSection.style.display = name === "camera" ? "flex" : "none";
    cameraSection.style.display = name === "camera" ? "block" : "none";
    loadingSection.style.display = name === "loading" ? "block" : "none";
    resultsSection.style.display = name === "results" ? "block" : "none";
  }

  function resetToStart() {
    stopCamera();
    capturedImageData = null;
    matchedPhotos = [];
    showSection("camera");
    showActionButtons();
  }

  // --- Event listeners ---

  takeSelfieBtn.addEventListener("click", startCamera);

  captureBtn.addEventListener("click", capturePhoto);

  switchCameraBtn.addEventListener("click", () => {
    facingMode = facingMode === "user" ? "environment" : "user";
    startCamera();
  });

  retakeBtn.addEventListener("click", () => {
    capturedImageData = null;
    startCamera();
  });

  findPhotosBtn.addEventListener("click", findPhotos);

  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      capturedImageData = ev.target.result;
      showPreview(capturedImageData);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  });

  saveAllBtn.addEventListener("click", saveAllPhotos);
  tryAgainBtn.addEventListener("click", resetToStart);

  // --- Init ---
  showSection("camera");
})();
