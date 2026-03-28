// ===== ELEMENTS =====
const modal = document.getElementById('uploadModal');
const startUploadBtn = document.getElementById("startUploadBtn");
const uploadProgress = document.getElementById("uploadProgress");
const uploadStatus = document.getElementById("uploadStatus");
const cancelUploadBtn = document.getElementById("cancelUpload");
const closeModalBtn = document.getElementById("closeModal");
const dropZone = document.getElementById("dropZone");

let selectedFile = null;
let fileInput = document.getElementById("incidentFileInput");   // using let so we can replace it

dropZone.addEventListener("click", (e) => {
  // e.detail is 0 for drops and keyboard "Enters"
  // e.detail is 1+ for actual physical mouse clicks
  if (e.detail > 0) { 
    fileInput.click();
  }
});


// 3. Update resetUploader (The modern way to reset)
function resetUploader() {
  selectedFile = null;
  fileInput.value = ""; // This completely clears the input natively
  uploadProgress.style.width = "0%";
  uploadStatus.textContent = "Waiting for file…";
  disableUpload();
}

// 4. Update closeModal (Remove replaceFileInput)
function closeModal() {
  fileInput.blur();
  setTimeout(() => {
    resetUploader();
    modal.classList.add('hidden');
  }, 80);
}



// ===== FILE CHANGE HANDLER =====
function handleFileChange(event) {
  selectedFile = event.target.files[0];

  if (!selectedFile) {
    uploadStatus.textContent = "No file selected";
    disableUpload();
    return;
  }

  uploadStatus.textContent =
    `Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`;

  uploadProgress.style.width = "0%";
  enableUpload();
}

// Attach initial listener
fileInput.addEventListener("change", handleFileChange);



// Close buttons
closeModalBtn?.addEventListener("click", closeModal);
cancelUploadBtn?.addEventListener("click", closeModal);

// Click outside modal
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains('hidden')) {
    closeModal();
  }
});

// ===== FILE SELECT & DRAG & DROP =====
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("border-primary");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("border-primary");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation(); // Prevents bubbling
  
  dropZone.classList.remove("border-primary");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    // Sync the internal 'selectedFile' variable and UI
    handleFileChange({ target: fileInput });
  }
});

// ===== UPLOAD =====
startUploadBtn.addEventListener("click", () => {
  if (!selectedFile) {
    alert("Choose a file first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "http://localhost:5000/api/upload");

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      uploadProgress.style.width = `${percent}%`;
      uploadStatus.textContent = `Uploading... ${percent}%`;
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      const result = JSON.parse(xhr.responseText);

      uploadProgress.style.width = "100%";
      uploadStatus.textContent = `Upload complete: ${result.filename}`;
      localStorage.setItem("uploadedFilename", result.filename);

      closeModal();
    } else {
      uploadStatus.textContent = `Upload failed (${xhr.status})`;
      disableUpload();
    }
  };

  xhr.onerror = () => {
    uploadStatus.textContent = "Upload error";
    alert("Upload error during request.");
  };

  xhr.send(formData);
});

// ===== HELPERS =====

function enableUpload() {
  startUploadBtn.disabled = false;
  startUploadBtn.classList.remove("cursor-not-allowed", "opacity-50", "bg-primary/40");
  startUploadBtn.classList.add("bg-primary", "text-on-primary");
}

function disableUpload() {
  startUploadBtn.disabled = true;
  startUploadBtn.classList.add("cursor-not-allowed", "opacity-50");
}
