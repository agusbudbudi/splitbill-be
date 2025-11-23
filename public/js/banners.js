const apiUrl = "/api/banners";
let bannersData = []; // To store current state of banners

document.addEventListener("DOMContentLoaded", () => {
  fetchBanners();

  const addBannerFieldBtn = document.getElementById("addBannerFieldBtn");
  addBannerFieldBtn.addEventListener("click", () => createBannerSection());

  const saveAllBannersBtn = document.getElementById("saveAllBannersBtn");
  saveAllBannersBtn.addEventListener("click", saveAllBanners);
});

function createBannerSection(banner = {}) {
  const container = document.getElementById("bannerSectionsContainer");
  const section = document.createElement("div");
  section.className = "banner-section";
  const uniqueId = `imageInput-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  if (banner._id) {
    section.dataset.id = banner._id;
  }

  section.innerHTML = `
    <div class="banner-preview">
      ${
        banner.image
          ? `<img src="${banner.image}" alt="Banner Preview">`
          : `<i class="uil uil-image"></i>`
      }
    </div>
    <div class="banner-form">
      <div class="form-group">
        <label>Banner Image</label>
        <p class="image-size-info">Recommended size 1080 x 339</p>
        <div class="file-input-wrapper">
          <input type="file" id="${uniqueId}" class="image-input" accept="image/*">
          <label for="${uniqueId}" class="file-input-label">${
    banner.image ? "Ganti Gambar" : "Pilih Gambar"
  }</label>
          <span class="file-name-display">${
            banner.image ? "Gambar sudah dipilih" : "Tidak ada gambar dipilih"
          }</span>
        </div>
      </div>
      <div class="form-group">
        <label>Route URL</label>
        <input type="text" class="route-input" placeholder="/profile" value="${
          banner.route || ""
        }">
      </div>
      <div class="banner-actions">
        <button type="button" class="btn-delete-section"><i class="uil uil-trash"></i> Hapus</button>
      </div>
  `;

  container.appendChild(section);

  const imageInput = section.querySelector(".image-input");
  const previewContainer = section.querySelector(".banner-preview");
  const deleteSectionBtn = section.querySelector(".btn-delete-section");
  const fileInputLabel = section.querySelector(".file-input-label");
  const fileNameDisplay = section.querySelector(".file-name-display");

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (file) {
      fileNameDisplay.textContent = file.name; // Update span text with file name
      const reader = new FileReader();
      reader.onload = (e) => {
        previewContainer.innerHTML = `<img src="${e.target.result}" alt="Banner Preview">`;
      };
      reader.readAsDataURL(file);
    } else {
      fileNameDisplay.textContent = "Tidak ada gambar dipilih"; // Reset span text
      previewContainer.innerHTML = `<i class="uil uil-image"></i>`;
    }
  });

  deleteSectionBtn.addEventListener("click", () => {
    if (
      confirm(
        "Apakah Anda yakin ingin menghapus banner ini dari daftar? Perubahan akan disimpan saat Anda mengklik 'Simpan Semua Banner'."
      )
    ) {
      section.remove();
    }
  });
}

async function fetchBanners() {
  try {
    const response = await fetch(apiUrl);
    const result = await response.json();

    if (result.success) {
      bannersData = result.data.banners; // Store fetched data
      const container = document.getElementById("bannerSectionsContainer");
      container.innerHTML = "";
      bannersData.forEach((banner) => createBannerSection(banner));
    }
  } catch (error) {
    console.error("Error fetching banners:", error);
  }
}

async function saveAllBanners() {
  const bannerSections = document.querySelectorAll(".banner-section");
  const newBannersToSave = [];

  for (const section of bannerSections) {
    const id = section.dataset.id;
    const imageInput = section.querySelector(".image-input");
    const route = section.querySelector(".route-input").value;
    const imageFile = imageInput.files[0];
    const previewImg = section.querySelector(".banner-preview img");

    let imageBase64 = previewImg ? previewImg.src : ""; // Use existing image if no new file selected

    // If a new file is selected, convert it to Base64
    if (imageFile) {
      await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          imageBase64 = e.target.result;
          resolve();
        };
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
          reject(error);
        };
        reader.readAsDataURL(imageFile);
      });
    }

    if (!imageBase64 || !route) {
      alert("Gambar dan Route URL harus diisi untuk semua banner.");
      return; // Stop if any banner is invalid
    }

    newBannersToSave.push({
      ...(id && { _id: id }), // Include _id if it's an existing banner
      image: imageBase64,
      route: route.trim(),
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST", // Use POST for batch save (upsert)
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ banners: newBannersToSave }), // Send an array
    });

    const result = await response.json();

    if (result.success) {
      alert("Semua banner berhasil disimpan!");
      fetchBanners(); // Re-fetch to update UI with any new IDs or changes
    } else {
      alert(`Error menyimpan banner: ${result.message}`);
    }
  } catch (error) {
    console.error("Error saving all banners:", error);
    alert("Terjadi kesalahan saat menyimpan semua banner.");
  }
}
