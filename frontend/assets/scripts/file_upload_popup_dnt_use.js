 const modal = document.getElementById('uploadModal');

//   function openModal()  { 
//     if (!modal.classList.contains('hidden')) return;
//     modal.classList.remove('hidden'); }
//   function closeModal() { modal.classList.add('hidden'); }

//   const modal = document.getElementById('uploadModal');

    function openModal() {
    if (!modal.classList.contains('hidden')) return;
    modal.classList.remove('hidden');
    }

    function closeModal() {
    modal.classList.add('hidden');
    }

    document.getElementById('uploadBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('incidentFileInput').click();
    });

    document.getElementById('incidentFileInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        document.getElementById('uploadStatus').textContent = "File selected";
    }
    });

  // Close button (×)
  document.getElementById('closeModal').addEventListener('click', closeModal);

  // Cancel button
  document.getElementById('cancelUpload').addEventListener('click', closeModal);

  // Click outside the modal card to close
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  // Browse files button wires to hidden input
//   document.getElementById('uploadBtn').addEventListener('click', () => {
//     document.getElementById('incidentFileInput').click();
//   });