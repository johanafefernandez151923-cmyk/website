const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

function setAdminAuthenticated(value) {
  localStorage.setItem("northstarAdminAuth", value ? "true" : "false");
}

function isAdminAuthenticated() {
  return localStorage.getItem("northstarAdminAuth") === "true";
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const username = formData.get("username")?.toString().trim();
    const password = formData.get("password")?.toString();

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (result.success) {
        setAdminAuthenticated(true);
        window.location.href = "admin.html";
        return;
      }
    } catch (error) {
      // fall through to the error message below
    }

    if (loginMessage) {
      loginMessage.textContent = "Incorrect username or password.";
    }
  });
}

if (isAdminAuthenticated() && loginMessage) {
  loginMessage.textContent = "You are already signed in. Use the admin page to continue.";
}
