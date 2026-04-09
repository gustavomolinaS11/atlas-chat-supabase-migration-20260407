import {
  ensureStore,
  logoutUser,
  upsertRemoteSessionUser
} from "./store.js";
import {
  getCurrentSession,
  signInWithEmail,
  signOutUser,
  signUpWithEmail
} from "./src/services/remote/authService.js";
import { getMyProfile } from "./src/services/remote/profileService.js";
import {
  isRememberMeEnabled,
  setRememberMeEnabled
} from "./src/lib/sessionPersistence.js";

const elements = {
  loginTab: document.getElementById("login-tab"),
  registerTab: document.getElementById("register-tab"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  feedback: document.getElementById("auth-feedback"),
  loginIdentifier: document.getElementById("login-identifier"),
  loginPassword: document.getElementById("login-password"),
  rememberMe: document.getElementById("remember-me"),
  registerName: document.getElementById("register-name"),
  registerUsername: document.getElementById("register-username"),
  registerEmail: document.getElementById("register-email"),
  registerBio: document.getElementById("register-bio"),
  registerPassword: document.getElementById("register-password"),
  registerConfirmPassword: document.getElementById("register-confirm-password"),
  loginSubmit: document.querySelector("#login-form button[type='submit']"),
  registerSubmit: document.querySelector("#register-form button[type='submit']")
};

const state = {
  pending: false
};

init();

async function init() {
  await ensureStore();
  await syncRemoteSession();
  bindEvents();
}

function bindEvents() {
  elements.loginTab.addEventListener("click", () => setTab("login"));
  elements.registerTab.addEventListener("click", () => setTab("register"));
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.registerUsername.addEventListener("input", handleUsernameInput);
}

function setFeedback(message) {
  elements.feedback.textContent = message || "";
}

function setPending(kind, pending) {
  state.pending = pending;
  const isLogin = kind === "login";
  elements.loginSubmit.disabled = pending;
  elements.registerSubmit.disabled = pending;
  elements.loginIdentifier.disabled = pending;
  elements.loginPassword.disabled = pending;
  elements.rememberMe.disabled = pending;
  elements.registerName.disabled = pending;
  elements.registerUsername.disabled = pending;
  elements.registerEmail.disabled = pending;
  elements.registerBio.disabled = pending;
  elements.registerPassword.disabled = pending;
  elements.registerConfirmPassword.disabled = pending;
  elements.loginSubmit.textContent = pending && isLogin ? "Entrando..." : "Entrar";
  elements.registerSubmit.textContent = pending && !isLogin ? "Criando conta..." : "Criar conta";
}

function normalizeAuthError(error) {
  const raw = String(error?.message || error || "").trim();
  const normalized = raw.toLowerCase();
  if (!raw) {
    return "Nao foi possivel concluir a autenticacao.";
  }
  if (normalized.includes("security purposes") || normalized.includes("after 58 seconds") || normalized.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Espere cerca de 1 minuto e tente novamente.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "Email ou senha invalidos.";
  }
  if (normalized.includes("user already registered")) {
    return "Esse email ja esta cadastrado.";
  }
  if (normalized.includes("duplicate key") && normalized.includes("username")) {
    return "Username ja existe.";
  }
  if (normalized.includes("email not confirmed")) {
    return "O email ainda nao foi confirmado.";
  }
  return raw;
}

function setTab(kind) {
  const login = kind === "login";
  elements.loginTab.classList.toggle("active", login);
  elements.registerTab.classList.toggle("active", !login);
  elements.loginForm.classList.toggle("hidden", !login);
  elements.registerForm.classList.toggle("hidden", login);
  setFeedback("");
}

function sanitizeUsernameInput(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function handleUsernameInput() {
  const sanitized = sanitizeUsernameInput(elements.registerUsername.value);
  elements.registerUsername.value = sanitized;
  if (sanitized && sanitized.length < 3) {
    setFeedback("Usuario com no minimo 3 caracteres, sem espacos ou acentos.");
    return;
  }
  if (!elements.registerForm.classList.contains("hidden")) {
    setFeedback("");
  }
}

async function syncRemoteSession() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      logoutUser();
      return;
    }
    await finalizeRemoteSession(session.user);
    window.location.href = "chat.html";
  } catch (error) {
    console.error(error);
    setFeedback("Nao foi possivel validar a sessao.");
  }
}

async function finalizeRemoteSession(authUser) {
  let profile = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    profile = await getMyProfile();
    if (profile) {
      break;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  if (!profile) {
    throw new Error("Conta criada, mas o perfil ainda nao apareceu no banco. Espere alguns segundos e tente entrar.");
  }
  const result = upsertRemoteSessionUser(profile, authUser);
  if (!result.ok) {
    throw new Error(result.error || "Falha ao sincronizar sessao local");
  }
  return result.user;
}

async function handleLogin(event) {
  event.preventDefault();
  if (state.pending) {
    return;
  }
  const identifier = String(elements.loginIdentifier.value || "").trim().toLowerCase();
  if (!identifier.includes("@")) {
    setFeedback("Entre com email.");
    return;
  }
  setRememberMeEnabled(elements.rememberMe.checked);
  setFeedback("Validando credenciais...");
  setPending("login", true);
  try {
    const data = await signInWithEmail({
      email: identifier,
      password: elements.loginPassword.value
    });
    await finalizeRemoteSession(data.user);
    window.location.href = "chat.html";
  } catch (error) {
    console.error(error);
    setFeedback(normalizeAuthError(error));
  } finally {
    setPending("login", false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  if (state.pending) {
    return;
  }
  if (elements.registerPassword.value !== elements.registerConfirmPassword.value) {
    setFeedback("As senhas nao conferem.");
    return;
  }
  const username = sanitizeUsernameInput(elements.registerUsername.value);
  elements.registerUsername.value = username;
  if (!username || username.length < 3) {
    setFeedback("Usuario sem acentos ou espacos. Use ao menos 3 caracteres.");
    return;
  }
  setFeedback("Criando conta...");
  setPending("register", true);
  try {
    setRememberMeEnabled(elements.rememberMe.checked);
    const signUpData = await signUpWithEmail({
      name: elements.registerName.value.trim(),
      username,
      email: elements.registerEmail.value.trim().toLowerCase(),
      password: elements.registerPassword.value
    });
    const authUser = signUpData.user;
    const sessionUser = signUpData.session?.user || authUser;
    if (!sessionUser) {
      setFeedback("Conta criada, mas a sessao nao foi aberta. O email ainda precisa ser confirmado.");
      return;
    }
    await finalizeRemoteSession(sessionUser);
    window.location.href = "chat.html";
  } catch (error) {
    console.error(error);
    setFeedback(normalizeAuthError(error));
    try {
      await signOutUser();
    } catch {}
  } finally {
    setPending("register", false);
  }
}

elements.rememberMe.checked = isRememberMeEnabled();
