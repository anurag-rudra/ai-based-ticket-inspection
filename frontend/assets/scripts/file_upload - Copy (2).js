// ===== ELEMENTS =====
const modal = document.getElementById('uploadModal');

const openBtn = document.querySelector('[onclick="openModal()"]');
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("incidentFileInput");
const startUploadBtn = document.getElementById("startUploadBtn");
const uploadProgress = document.getElementById("uploadProgress");
const uploadStatus = document.getElementById("uploadStatus");
const cancelUploadBtn = document.getElementById("cancelUpload");
const closeModalBtn = document.getElementById("closeModal");

let selectedFile = null;

// ===== MODAL CONTROL =====
function openModal() {
  if (!modal.classList.contains('hidden')) return;
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

// expose for HTML onclick
window.openModal = openModal;

// ===== BUTTONS =====

// Open file picker (ONLY ONE HANDLER)
uploadBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

// Close modal buttons
closeModalBtn?.addEventListener("click", closeModal);

cancelUploadBtn?.addEventListener("click", () => {
  resetUploader();
  closeModal();
});

// Close on outside click
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ===== FILE SELECTION =====
fileInput.addEventListener("change", (event) => {
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
});

// ===== UPLOAD BUTTON =====
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

      // auto close after success
      setTimeout(() => {
        resetUploader();
        closeModal();
      }, 800);

    } else {
      uploadStatus.textContent = `Upload failed (${xhr.status})`;
    }

    disableUpload();
  };

  xhr.onerror = () => {
    uploadStatus.textContent = "Upload error";
    alert("Upload error during request.");
  };

  xhr.send(formData);
});

// ===== HELPERS =====
function resetUploader() {
  selectedFile = null;
  fileInput.value = "";
  uploadProgress.style.width = "0%";
  uploadStatus.textContent = "Waiting for file…";
  disableUpload();
}

function enableUpload() {
  startUploadBtn.disabled = false;
  startUploadBtn.classList.remove("cursor-not-allowed", "opacity-50", "bg-primary/40");
  startUploadBtn.classList.add("bg-primary", "text-on-primary");
}

function disableUpload() {
  startUploadBtn.disabled = true;
  startUploadBtn.classList.add("cursor-not-allowed", "opacity-50");
}