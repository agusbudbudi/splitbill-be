let usersData = [];
let reviewsData = [];
let filteredUsers = [];
let filteredReviews = [];
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = 10;
let totalReviews = 0;

function switchTab(tabName, element) {
  // Update active tab
  document
    .querySelectorAll(".nav-item")
    .forEach((tab) => tab.classList.remove("active"));
  element.classList.add("active");

  // Show/hide content
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));
  document.getElementById(tabName).classList.add("active");
}

function renderStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? "★" : "☆";
  }
  return `<span class="stars">${stars}</span>`;
}

async function fetchUsers() {
  try {
    const response = await fetch("/api/users");
    usersData = await response.json();
    filteredUsers = [...usersData];
    renderUsersTable();
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("id-ID", options);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  };

  const formattedDate = date.toLocaleDateString("id-ID", dateOptions);
  const formattedTime = date.toLocaleTimeString("id-ID", timeOptions);

  return `${formattedDate} ${formattedTime}`;
}

function renderUsersTable() {
  const tableBody = document.getElementById("usersTableBody");
  tableBody.innerHTML = "";

  filteredUsers.forEach((user) => {
    const row = tableBody.insertRow();
    row.innerHTML = `
                    <td>${user._id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${formatDate(user.createdAt)}</td>
                `;
  });

  // Update stats
  document.getElementById("totalUsers").textContent = usersData.length;
  document.getElementById("activeUsers").textContent = usersData.length;
}

async function fetchReviews(page = 1) {
  try {
    const response = await fetch(
      `/api/reviews?page=${page}&limit=${itemsPerPage}`
    );
    const data = await response.json();

    if (data.success) {
      reviewsData = data.data.reviews;
      filteredReviews = [...reviewsData];

      // Update pagination info
      currentPage = data.data.pagination.currentPage;
      totalPages = data.data.pagination.totalPages;
      totalReviews = data.data.pagination.totalItems;

      renderReviewsTable();
      updatePaginationControls();
    }
  } catch (error) {
    console.error("Error fetching reviews:", error);
  }
}

function renderReviewsTable() {
  const tableBody = document.getElementById("reviewsTableBody");
  tableBody.innerHTML = "";

  filteredReviews.forEach((review) => {
    const row = tableBody.insertRow();
    const contactInfo = review.contactPermission
      ? `<div class="contact-info">
           <div><i class="uil uil-envelope"></i> ${review.email}</div>
           <div><i class="uil uil-whatsapp"></i> ${review.phone}</div>
         </div>`
      : "";

    row.innerHTML = `
      <td>
        <div class="user-name">${review.name}</div>
      </td>
      <td>
        <div class="review-text">${review.review}</div>
      </td>
      <td>${renderStars(review.rating)}</td>
      <td>${formatDateTime(review.createdAt)}</td>
      <td>
        <div class="contact-status">
          <span class="status-badge ${
            review.contactPermission ? "status-yes" : "status-no"
          }">
            ${review.contactPermission ? "YA" : "TIDAK"}
          </span>
          ${contactInfo}
        </div>
      </td>
    `;
  });
}

function searchUsers() {
  const searchTerm = document.getElementById("userSearch").value.toLowerCase();
  filteredUsers = usersData.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      (user.phone && user.phone.includes(searchTerm))
  );
  renderUsersTable();
}

function searchReviews() {
  const searchTerm = document
    .getElementById("reviewSearch")
    .value.toLowerCase();
  filteredReviews = reviewsData.filter(
    (review) =>
      review.name.toLowerCase().includes(searchTerm) ||
      review.review.toLowerCase().includes(searchTerm)
  );
  renderReviewsTable();
}

// Pagination functions
function updatePaginationControls() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");

  // Update page info
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  // Update button states
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

function previousPage() {
  if (currentPage > 1) {
    fetchReviews(currentPage - 1);
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    fetchReviews(currentPage + 1);
  }
}

// Fetch all reviews for stats calculation
async function fetchAllReviewsForStats() {
  try {
    const response = await fetch("/api/reviews?page=1&limit=1000"); // Get a large number to get all reviews
    const data = await response.json();

    if (data.success) {
      const allReviews = data.data.reviews;
      const avgRating =
        allReviews.length > 0
          ? allReviews.reduce((sum, review) => sum + review.rating, 0) /
            allReviews.length
          : 0;
      const contactableCount = allReviews.filter(
        (review) => review.contactPermission
      ).length;

      document.getElementById("totalReviews").textContent =
        data.data.pagination.totalItems;
      document.getElementById("avgRating").textContent = avgRating.toFixed(1);
      document.getElementById("contactableUsers").textContent =
        contactableCount;
    }
  } catch (error) {
    console.error("Error fetching all reviews for stats:", error);
  }
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  fetchUsers();
  fetchReviews();
  fetchAllReviewsForStats();

  const menuBtn = document.querySelector(".menu-btn");
  const closeBtn = document.querySelector(".close-btn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".overlay");
  const navItems = document.querySelectorAll(".nav-item");

  function openSidebar() {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  }

  menuBtn.addEventListener("click", openSidebar);
  closeBtn.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
});
