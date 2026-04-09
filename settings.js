import {
  FEATURE_LIST,
  THEME_PRESETS,
  applyDisplayPreferences,
  applyTheme,
  clearAllData,
  clipText,
  ensureStore,
  exportState,
  formatClock,
  getFavoriteMessagesForUser,
  getConversationIdForDirect,
  getConversationIdForGroup,
  getCurrentUser,
  getDefaultSettings,
  getPinnedMessagesForUser,
  getSettings,
  importState,
  logoutUser,
  requireSession,
  saveSettings,
  searchMessagesForUser,
  upsertRemoteSessionUser,
  updateUserProfile
} from "./store.js";
import { getCurrentSession as getRemoteSession, signOutUser as signOutRemoteUser } from "./src/services/remote/authService.js";
import {
  getMyProfile,
  updateMyProfile as updateRemoteProfile,
  updateMySettings as updateRemoteSettings
} from "./src/services/remote/profileService.js";

const currentUser = requireSession("index.html");

const ICONS = {
  arrowLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2.5M12 18.5V21M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M3 12h2.5M18.5 12H21M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77M12 7a5 5 0 1 1-5 5 5 5 0 0 1 5-5Z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z"/></svg>'
};

const elements = {
  avatar: document.getElementById("settings-avatar"),
  mobileBackLink: document.querySelector(".settings-mobile-back"),
  name: document.getElementById("settings-name"),
  handle: document.getElementById("settings-handle"),
  profilePreview: document.getElementById("profile-photo-preview"),
  profileName: document.getElementById("profile-name-input"),
  profileBio: document.getElementById("profile-bio-input"),
  profilePhotoInput: document.getElementById("profile-photo-input"),
  profilePhotoRemove: document.getElementById("profile-photo-remove"),
  profileSave: document.getElementById("profile-save-btn"),
  palette: document.getElementById("theme-palette"),
  saturation: document.getElementById("saturation-range"),
  modeToggle: document.getElementById("mode-toggle"),
  fontScale: document.getElementById("font-scale-select"),
  bubbleSize: document.getElementById("bubble-size-select"),
  wallpaperGlow: document.getElementById("wallpaper-glow-toggle"),
  compactMode: document.getElementById("compact-mode-toggle"),
  showAvatars: document.getElementById("show-avatars-toggle"),
  showSidebarPreview: document.getElementById("show-sidebar-preview-toggle"),
  enterToSend: document.getElementById("enter-to-send-toggle"),
  showMessageTime: document.getElementById("show-message-time-toggle"),
  showTypingIndicator: document.getElementById("show-typing-indicator-toggle"),
  showReactionBar: document.getElementById("show-reaction-bar-toggle"),
  blurMedia: document.getElementById("blur-media-toggle"),
  privacyLastSeen: document.getElementById("privacy-last-seen"),
  privacyProfilePhoto: document.getElementById("privacy-profile-photo"),
  privacyReadReceipts: document.getElementById("privacy-read-receipts"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
  resetSettingsBtn: document.getElementById("reset-settings-btn"),
  resetBtn: document.getElementById("reset-btn"),
  globalSearch: document.getElementById("global-search"),
  globalResults: document.getElementById("global-search-results"),
  favoriteList: document.getElementById("favorite-list"),
  pinList: document.getElementById("pin-list"),
  featureList: document.getElementById("feature-list"),
  navLinks: Array.from(document.querySelectorAll(".settings-nav-link")),
  sections: Array.from(document.querySelectorAll(".settings-section"))
};

let settings = currentUser ? getSettings(currentUser.id) : null;
let pendingProfilePhoto = null;
let remoteSettingsTimer = null;

init();

async function init() {
  if (!currentUser) {
    return;
  }
  const remoteSession = await getRemoteSession().catch(() => null);
  if (!remoteSession?.user) {
    logoutLocalAndRedirect();
    return;
  }
  await ensureStore();
  await syncRemoteProfile(remoteSession.user);
  settings = getSettings(currentUser.id);
  if (elements.mobileBackLink) {
    elements.mobileBackLink.innerHTML = ICONS.arrowLeft;
  }
  applyTheme(settings);
  applyDisplayPreferences(settings);
  bindEvents();
  renderAll();
}

async function syncRemoteProfile(authUser) {
  try {
    const profile = await getMyProfile();
    if (profile) {
      upsertRemoteSessionUser(profile, authUser);
    }
  } catch (error) {
    console.error(error);
  }
}

async function logoutLocalAndRedirect() {
  try {
    await signOutRemoteUser();
  } catch {}
  logoutUser();
  window.location.href = "index.html";
}

function bindEvents() {
  document.querySelectorAll(".file-field[tabindex='0']").forEach((label) => {
    label.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        label.querySelector("input[type='file']")?.click();
      }
    });
  });
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", () => activateNav(link.getAttribute("href") || ""));
  });
  window.addEventListener("hashchange", () => activateNav(window.location.hash));
  elements.saturation.addEventListener("input", handleSaturation);
  elements.modeToggle.addEventListener("click", handleModeToggle);
  elements.fontScale.addEventListener("change", handleDisplaySettingsChange);
  elements.bubbleSize.addEventListener("change", handleDisplaySettingsChange);
  elements.wallpaperGlow.addEventListener("change", handleDisplaySettingsChange);
  elements.compactMode.addEventListener("change", handleDisplaySettingsChange);
  elements.showAvatars.addEventListener("change", handleDisplaySettingsChange);
  elements.showSidebarPreview.addEventListener("change", handleDisplaySettingsChange);
  elements.enterToSend.addEventListener("change", handleDisplaySettingsChange);
  elements.showMessageTime.addEventListener("change", handleDisplaySettingsChange);
  elements.showTypingIndicator.addEventListener("change", handleDisplaySettingsChange);
  elements.showReactionBar.addEventListener("change", handleDisplaySettingsChange);
  elements.blurMedia.addEventListener("change", handleDisplaySettingsChange);
  elements.profilePhotoInput.addEventListener("change", handleProfilePhotoInput);
  elements.profilePhotoRemove.addEventListener("click", handleProfilePhotoRemove);
  elements.profileSave.addEventListener("click", handleProfileSave);
  elements.privacyLastSeen.addEventListener("change", handlePrivacyChange);
  elements.privacyProfilePhoto.addEventListener("change", handlePrivacyChange);
  elements.privacyReadReceipts.addEventListener("change", handlePrivacyChange);
  elements.exportBtn.addEventListener("click", handleExport);
  elements.importInput.addEventListener("change", handleImport);
  elements.resetSettingsBtn.addEventListener("click", handleResetSettings);
  elements.resetBtn.addEventListener("click", handleReset);
  elements.globalSearch.addEventListener("input", renderSearchResults);
  activateNav(window.location.hash || "#section-profile");
}

function renderAll() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  paintAvatar(elements.avatar, user);
  paintAvatar(elements.profilePreview, pendingProfilePhoto === null ? user : { ...user, photo: pendingProfilePhoto });
  elements.name.textContent = user.name;
  elements.handle.textContent = `@${user.username}`;
  elements.profileName.value = user.name;
  elements.profileBio.value = user.bio || "";
  elements.saturation.value = String(settings.saturation || 1);
  elements.fontScale.value = settings.fontScale;
  elements.bubbleSize.value = settings.bubbleSize;
  elements.wallpaperGlow.checked = settings.wallpaperGlow;
  elements.compactMode.checked = settings.compactMode;
  elements.showAvatars.checked = settings.showAvatars;
  elements.showSidebarPreview.checked = settings.showSidebarPreview;
  elements.enterToSend.checked = settings.enterToSend;
  elements.showMessageTime.checked = settings.showMessageTime;
  elements.showTypingIndicator.checked = settings.showTypingIndicator;
  elements.showReactionBar.checked = settings.showReactionBar;
  elements.blurMedia.checked = settings.blurMedia;
  elements.privacyLastSeen.value = settings.privacy.lastSeen;
  elements.privacyProfilePhoto.value = settings.privacy.profilePhoto;
  elements.privacyReadReceipts.value = settings.privacy.readReceipts;

  renderPalette();
  renderModeToggle();
  renderFavorites();
  renderPins();
  renderFeatures();
}

function renderPalette() {
  elements.palette.innerHTML = "";
  THEME_PRESETS.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-swatch";
    button.style.background = `linear-gradient(135deg, ${preset.accent}, ${preset.accentAlt})`;
    button.classList.toggle("active", settings.accent === preset.accent && settings.accentAlt === preset.accentAlt);
    button.addEventListener("click", () => {
      settings = { ...settings, accent: preset.accent, accentAlt: preset.accentAlt };
      saveSettings(currentUser.id, settings);
      applyTheme(settings);
      renderPalette();
    });
    elements.palette.appendChild(button);
  });
}

function renderFavorites() {
  elements.favoriteList.innerHTML = "";
  const favorites = getFavoriteMessagesForUser(currentUser.id);
  if (!favorites.length) {
    elements.favoriteList.innerHTML = '<div class="empty-block">Nenhuma mensagem favoritada.</div>';
    return;
  }

  favorites.forEach((message) => {
    const conversationId = message.thread?.type === "group"
      ? getConversationIdForGroup(message.thread.id)
      : getConversationIdForDirect(message.thread?.memberIds.find((id) => id !== currentUser.id) || "");
    const item = document.createElement("a");
    item.className = "pin-item";
    item.href = `chat.html?c=${encodeURIComponent(conversationId)}&m=${message.id}`;
    item.innerHTML = `
      <strong>${escapeHtml(message.sender?.name || "Conta")}</strong>
      <span>${escapeHtml(clipText(message.text, 120))}</span>
      <span class="muted-line">${formatClock(message.createdAt)}</span>
    `;
    elements.favoriteList.appendChild(item);
  });
}

function renderPins() {
  elements.pinList.innerHTML = "";
  const pins = getPinnedMessagesForUser(currentUser.id);
  if (!pins.length) {
    elements.pinList.innerHTML = '<div class="empty-block">Nenhuma mensagem fixada.</div>';
    return;
  }

  pins.forEach((message) => {
    const conversationId = message.thread?.type === "group"
      ? getConversationIdForGroup(message.thread.id)
      : getConversationIdForDirect(message.thread?.memberIds.find((id) => id !== currentUser.id) || "");
    const item = document.createElement("a");
    item.className = "pin-item";
    item.href = `chat.html?c=${encodeURIComponent(conversationId)}&m=${message.id}`;
    item.innerHTML = `
      <strong>${escapeHtml(message.sender?.name || "Conta")}</strong>
      <span>${escapeHtml(clipText(message.text, 120))}</span>
      <span class="muted-line">${formatClock(message.createdAt)}</span>
    `;
    elements.pinList.appendChild(item);
  });
}

function renderFeatures() {
  elements.featureList.innerHTML = "";
  FEATURE_LIST.forEach((feature) => {
    const card = document.createElement("div");
    card.className = "feature-item";
    card.innerHTML = `<strong>${feature}</strong><span class="muted-line">ativo</span>`;
    elements.featureList.appendChild(card);
  });
}

function renderSearchResults() {
  const results = searchMessagesForUser(currentUser.id, elements.globalSearch.value);
  elements.globalResults.innerHTML = "";

  if (!results.length && elements.globalSearch.value.trim()) {
    elements.globalResults.innerHTML = '<div class="empty-block">Nada encontrado.</div>';
    return;
  }

  results.slice(0, 20).forEach((message) => {
    const conversationId = message.thread?.type === "group"
      ? getConversationIdForGroup(message.thread.id)
      : getConversationIdForDirect(message.thread?.memberIds.find((id) => id !== currentUser.id) || "");
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `
      <strong>${escapeHtml(message.sender?.name || "Conta")}</strong>
      <span>${escapeHtml(clipText(message.text, 120))}</span>
      <span class="muted-line">${formatClock(message.createdAt)}</span>
    `;
    item.addEventListener("click", () => {
      window.location.href = `chat.html?c=${encodeURIComponent(conversationId)}&m=${message.id}`;
    });
    elements.globalResults.appendChild(item);
  });
}

function handleSaturation(event) {
  settings = { ...settings, saturation: Number(event.target.value) };
  saveSettings(currentUser.id, settings);
  queueRemoteSettingsSync();
  applyTheme(settings);
  applyDisplayPreferences(settings);
}

function handleModeToggle() {
  settings = { ...settings, mode: settings.mode === "dark" ? "light" : "dark" };
  saveSettings(currentUser.id, settings);
  queueRemoteSettingsSync();
  applyTheme(settings);
  applyDisplayPreferences(settings);
  renderModeToggle();
}

function handleDisplaySettingsChange() {
  settings = {
    ...settings,
    fontScale: elements.fontScale.value,
    bubbleSize: elements.bubbleSize.value,
    wallpaperGlow: elements.wallpaperGlow.checked,
    compactMode: elements.compactMode.checked,
    showAvatars: elements.showAvatars.checked,
    showSidebarPreview: elements.showSidebarPreview.checked,
    enterToSend: elements.enterToSend.checked,
    showMessageTime: elements.showMessageTime.checked,
    showTypingIndicator: elements.showTypingIndicator.checked,
    showReactionBar: elements.showReactionBar.checked,
    blurMedia: elements.blurMedia.checked
  };
  saveSettings(currentUser.id, settings);
  queueRemoteSettingsSync();
  applyTheme(settings);
  applyDisplayPreferences(settings);
}

async function handleProfilePhotoInput(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    pendingProfilePhoto = await fileToAvatarDataUrl(file);
    const user = getCurrentUser();
    if (user) {
      paintAvatar(elements.profilePreview, { ...user, photo: pendingProfilePhoto });
    }
  } catch {
    alert("Nao foi possivel processar essa imagem.");
  }
  event.target.value = "";
}

function handleProfilePhotoRemove() {
  pendingProfilePhoto = "";
  const user = getCurrentUser();
  if (user) {
    paintAvatar(elements.profilePreview, { ...user, photo: "" });
  }
}

async function handleProfileSave() {
  try {
    const result = updateUserProfile(currentUser.id, {
      name: elements.profileName.value,
      bio: elements.profileBio.value,
      photo: pendingProfilePhoto === null ? undefined : pendingProfilePhoto,
      clearPhoto: pendingProfilePhoto === ""
    });
    if (!result.ok) {
      alert(result.error);
      return;
    }
    const remoteProfile = await updateRemoteProfile({
      name: elements.profileName.value.trim(),
      bio: elements.profileBio.value.trim(),
      avatarUrl: pendingProfilePhoto === null
        ? (getCurrentUser()?.photo || "")
        : pendingProfilePhoto
    });
    upsertRemoteSessionUser(remoteProfile);
    pendingProfilePhoto = null;
    renderAll();
  } catch {
    alert("Nao foi possivel salvar. Tente uma imagem menor.");
  }
}

function handlePrivacyChange() {
  settings = {
    ...settings,
    privacy: {
      ...settings.privacy,
      lastSeen: elements.privacyLastSeen.value,
      profilePhoto: elements.privacyProfilePhoto.value,
      readReceipts: elements.privacyReadReceipts.value
    }
  };
  saveSettings(currentUser.id, settings);
  queueRemoteSettingsSync();
}

function renderModeToggle() {
  const darkMode = settings.mode === "dark";
  elements.modeToggle.innerHTML = darkMode ? ICONS.moon : ICONS.sun;
  elements.modeToggle.setAttribute("aria-label", darkMode ? "Modo escuro ativo" : "Modo claro ativo");
  elements.modeToggle.setAttribute("title", darkMode ? "Modo escuro ativo" : "Modo claro ativo");
}

function activateNav(hash) {
  const target = hash && hash !== "#" ? hash : "#section-profile";
  elements.navLinks.forEach((link) => {
    link.classList.toggle("active", (link.getAttribute("href") || "") === target);
  });
  elements.sections.forEach((section) => {
    section.classList.toggle("hidden", `#${section.id}` !== target);
  });
}

function handleExport() {
  const blob = new Blob([JSON.stringify(exportState(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atlas-chat.json";
  link.click();
  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importState(JSON.parse(String(reader.result)));
      window.location.href = "settings.html";
    } catch {
      alert("JSON invalido.");
    }
  };
  reader.readAsText(file);
}

function handleResetSettings() {
  if (!confirm("Redefinir preferencias para o padrao?")) {
    return;
  }
  settings = getDefaultSettings();
  saveSettings(currentUser.id, settings);
  queueRemoteSettingsSync();
  applyTheme(settings);
  applyDisplayPreferences(settings);
  renderAll();
}

async function handleReset() {
  if (!confirm("Resetar todos os dados locais?")) {
    return;
  }
  clearAllData();
  await ensureStore();
  window.location.href = "index.html";
}

function queueRemoteSettingsSync() {
  window.clearTimeout(remoteSettingsTimer);
  remoteSettingsTimer = window.setTimeout(async () => {
    try {
      await updateRemoteSettings({
        settings: {
          mode: settings.mode,
          accent: settings.accent,
          accentAlt: settings.accentAlt,
          saturation: settings.saturation,
          fontScale: settings.fontScale,
          bubbleSize: settings.bubbleSize,
          compactMode: settings.compactMode,
          showAvatars: settings.showAvatars,
          showMessageTime: settings.showMessageTime,
          showTypingIndicator: settings.showTypingIndicator,
          enterToSend: settings.enterToSend,
          showSidebarPreview: settings.showSidebarPreview,
          showReactionBar: settings.showReactionBar,
          blurMedia: settings.blurMedia,
          wideBubbles: settings.wideBubbles,
          wallpaperGlow: settings.wallpaperGlow
        },
        privacy: settings.privacy
      });
    } catch (error) {
      console.error(error);
    }
  }, 260);
}

function paintAvatar(element, user) {
  if (!element) {
    return;
  }
  const photo = user?.photo || "";
  element.classList.toggle("has-photo", Boolean(photo));
  element.innerHTML = photo
    ? `<img src="${photo}" alt="${escapeHtml(user?.name || "Perfil")}">`
    : escapeHtml(user?.avatar || "AT");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fileToAvatarDataUrl(file) {
  const source = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 320;
      const crop = Math.min(image.width, image.height);
      const offsetX = Math.max(0, (image.width - crop) / 2);
      const offsetY = Math.max(0, (image.height - crop) / 2);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas indisponivel"));
        return;
      }
      canvas.width = size;
      canvas.height = size;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.drawImage(image, offsetX, offsetY, crop, crop, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = reject;
    image.src = String(source);
  });
}
