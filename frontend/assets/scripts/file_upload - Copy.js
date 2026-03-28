const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("incidentFileInput");
const startUploadBtn = document.getElementById("startUploadBtn");
const uploadProgress = document.getElementById("uploadProgress");
const uploadStatus = document.getElementById("uploadStatus");
const closePopupBtn = document.getElementById("closePopup");
let selectedFile = null;

uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

const cancelUploadBtn = document.getElementById("cancelUpload");

// function closeUploaderPopup() {
//   // try closing popup first; if blocked, redirect to dashboard
//   window.close();
//   setTimeout(() => {
//     // if close was prevented, force the navigation to return to main app
//     if (!window.closed) {
//       window.location.href = "index.html";
//     }
//   }, 100);
// }

function closeUploaderPopup() {
  const modal = document.getElementById('uploadModal');
  modal.classList.add('hidden');
}

closePopupBtn?.addEventListener("click", () => {
  closeUploaderPopup();
});

uploadBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // extra safety
  fileInput.click();
});

// cancelUploadBtn?.addEventListener("click", () => {
//   // reset UI state and then close/redirect
//   selectedFile = null;
//   fileInput.value = "";
//   uploadProgress.style.width = "0%";
//   uploadStatus.textContent = "Upload canceled.";
//   startUploadBtn.disabled = true;
//   startUploadBtn.classList.add("cursor-not-allowed", "opacity-50", "bg-primary/40", "text-on-primary/60");
//   startUploadBtn.classList.remove("bg-primary", "text-on-primary");
//   closeUploaderPopup();
// });

cancelUploadBtn?.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  uploadProgress.style.width = "0%";
  uploadStatus.textContent = "Upload canceled.";

  startUploadBtn.disabled = true;
  startUploadBtn.classList.add("cursor-not-allowed", "opacity-50");

  closeModal(); // ← use existing modal function
});

startUploadBtn.disabled = true;
startUploadBtn.classList.add("cursor-not-allowed", "opacity-50");

fileInput.addEventListener("change", (event) => {
  selectedFile = event.target.files[0];
  if (!selectedFile) {
    uploadStatus.textContent = "No file selected";
    startUploadBtn.disabled = true;
    startUploadBtn.classList.add("cursor-not-allowed", "opacity-50");
    return;
  }

  uploadStatus.textContent = `Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`;
  uploadProgress.style.width = "0%";
  startUploadBtn.disabled = false;
  startUploadBtn.classList.remove("cursor-not-allowed", "opacity-50", "bg-primary/40", "text-on-primary/60");
  startUploadBtn.classList.add("bg-primary", "text-on-primary");
});

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
      // Store filename in localStorage for later use in scan
      localStorage.setItem("uploadedFilename", result.filename);
      // allow closing after success
      setTimeout(() => {
        if (window.opener) window.close();
      }, 800);
    } else {
      uploadStatus.textContent = `Upload failed (${xhr.status})`;
    }
    startUploadBtn.disabled = true;
    startUploadBtn.classList.add("cursor-not-allowed", "opacity-50");
    fileInput.value = "";
    selectedFile = null;
  };

  xhr.onerror = () => {
    uploadStatus.textContent = "Upload error";
    alert("Upload error during request.");
  };
  xhr.send(formData);
});
