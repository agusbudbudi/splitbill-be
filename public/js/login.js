document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("error");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const email = /** @type {HTMLInputElement} */ (
      document.getElementById("email")
    ).value.trim();
    const password = /** @type {HTMLInputElement} */ (
      document.getElementById("password")
    ).value;

    if (!email || !password) {
      errorEl.textContent = "Email dan password wajib diisi.";
      return;
    }

    const submitBtn = /** @type {HTMLButtonElement} */ (
      form.querySelector('button[type="submit"]')
    );
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.accessToken) {
        errorEl.textContent =
          data?.error ||
          data?.message ||
          "Login gagal. Periksa email/password.";
        return;
      }

      // Simpan token untuk digunakan di dashboard
      localStorage.setItem("token", data.accessToken);
      try {
        // Optionally store user info for later
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      } catch (_) {}

      // Redirect ke dashboard
      window.location.href = "/index.html";
    } catch (err) {
      console.error("Login request failed:", err);
      errorEl.textContent = "Terjadi kesalahan jaringan. Coba lagi.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
