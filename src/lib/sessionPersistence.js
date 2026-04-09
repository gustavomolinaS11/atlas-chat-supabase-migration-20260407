export const REMEMBER_ME_KEY = "atlas.auth.remember";

function hasWindowStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage) && Boolean(window.sessionStorage);
}

export function isRememberMeEnabled() {
  if (!hasWindowStorage()) {
    return true;
  }
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== "0";
}

export function setRememberMeEnabled(enabled) {
  if (!hasWindowStorage()) {
    return;
  }
  window.localStorage.setItem(REMEMBER_ME_KEY, enabled ? "1" : "0");
}

function getPreferredStorage() {
  if (!hasWindowStorage()) {
    return null;
  }
  return isRememberMeEnabled() ? window.localStorage : window.sessionStorage;
}

function getSecondaryStorage() {
  if (!hasWindowStorage()) {
    return null;
  }
  return isRememberMeEnabled() ? window.sessionStorage : window.localStorage;
}

export function readPersistedValue(key) {
  if (!hasWindowStorage()) {
    return null;
  }
  const preferred = getPreferredStorage();
  const secondary = getSecondaryStorage();
  return preferred?.getItem(key) ?? secondary?.getItem(key) ?? null;
}

export function writePersistedValue(key, value) {
  if (!hasWindowStorage()) {
    return;
  }
  const preferred = getPreferredStorage();
  const secondary = getSecondaryStorage();
  preferred?.setItem(key, value);
  secondary?.removeItem(key);
}

export function removePersistedValue(key) {
  if (!hasWindowStorage()) {
    return;
  }
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

export const supabaseAuthStorage = {
  getItem(key) {
    return readPersistedValue(key);
  },
  setItem(key, value) {
    writePersistedValue(key, value);
  },
  removeItem(key) {
    removePersistedValue(key);
  }
};
