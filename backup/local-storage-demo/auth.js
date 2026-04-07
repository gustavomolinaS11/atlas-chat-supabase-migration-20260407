import {
  ensureStore,
  loginUser,
  redirectIfAuthenticated,
  registerUser
} from "./store.js";

const elements = {
  loginTab: document.getElementById("login-tab"),
  registerTab: document.getElementById("register-tab"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  feedback: document.getElementById("auth-feedback"),
  loginIdentifier: document.getElementById("login-identifier"),
  loginPassword: document.getElementById("login-password"),
  registerName: document.getElementById("register-name"),
  registerUsername: document.getElementById("register-username"),
  registerEmail: document.getElementById("register-email"),
  registerBio: document.getElementById("register-bio"),
  registerPassword: document.getElementById("register-password")
};

init();

async function init() {
  await ensureStore();
  redirectIfAuthenticated("chat.html");
  bindEvents();
}

function bindEvents() {
  elements.loginTab.addEventListener("click", () => setTab("login"));
  elements.registerTab.addEventListener("click", () => setTab("register"));
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.registerForm.addEventListener("submit", handleRegister);
}

function setTab(kind) {
  const login = kind === "login";
  elements.loginTab.classList.toggle("active", login);
  elements.registerTab.classList.toggle("active", !login);
  elements.loginForm.classList.toggle("hidden", !login);
  elements.registerForm.classList.toggle("hidden", login);
  elements.feedback.textContent = "";
}

function handleLogin(event) {
  event.preventDefault();
  const result = loginUser(elements.loginIdentifier.value, elements.loginPassword.value);
  if (!result.ok) {
    elements.feedback.textContent = result.error;
    return;
  }
  window.location.href = "chat.html";
}

function handleRegister(event) {
  event.preventDefault();
  const result = registerUser({
    name: elements.registerName.value,
    username: elements.registerUsername.value,
    email: elements.registerEmail.value,
    bio: elements.registerBio.value,
    password: elements.registerPassword.value
  });
  if (!result.ok) {
    elements.feedback.textContent = result.error;
    return;
  }
  window.location.href = "chat.html";
}
