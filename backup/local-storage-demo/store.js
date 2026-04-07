const STATE_KEY = "atlas.state.v4";
const SESSION_KEY = "atlas.session.v4";
const USERS_URL = "data/users.json";
const THREADS_URL = "data/threads.json";
const MESSAGES_URL = "data/messages.json";

const DEFAULT_SETTINGS = {
  mode: "dark",
  accent: "#35c2ff",
  accentAlt: "#45e0b1",
  saturation: 1,
  fontScale: "md",
  compactMode: false,
  showAvatars: true,
  showMessageTime: true,
  showTypingIndicator: true,
  enterToSend: true,
  showSidebarPreview: true,
  showReactionBar: true,
  blurMedia: false,
  wideBubbles: false,
  wallpaperGlow: true,
  privacy: {
    lastSeen: "everyone",
    profilePhoto: "everyone",
    readReceipts: "everyone"
  }
};

export const THEME_PRESETS = [
  { accent: "#35c2ff", accentAlt: "#45e0b1" },
  { accent: "#f97316", accentAlt: "#facc15" },
  { accent: "#8b5cf6", accentAlt: "#ec4899" },
  { accent: "#22c55e", accentAlt: "#60a5fa" },
  { accent: "#fb7185", accentAlt: "#f59e0b" },
  { accent: "#14b8a6", accentAlt: "#84cc16" }
];

export const FEATURE_LIST = [
  "Auth local com login, cadastro e sessao",
  "Conversas diretas entre contas",
  "Grupos com admins e controle de membros",
  "Edicao de contato por apelido e etiqueta",
  "Foto de perfil e ultima vez online",
  "Privacidade de foto, leitura e visto por ultimo",
  "Pins e favoritos por usuario",
  "Recibos de envio, entrega e leitura",
  "Busca global e por conversa",
  "Tema, saturacao e modo claro/escuro",
  "Import e export de estado",
  "Upload de imagem, documento e audio"
];

const DEFAULT_USERS = [
  { id: "u-gustavo", name: "Gustavo", username: "gustavo", email: "gustavo@atlas.local", password: "demo123", avatar: "GU", bio: "Owner", lastSeenAt: Date.now() - 12 * 60 * 1000, contactEdits: {} },
  { id: "u-ana", name: "Ana Costa", username: "ana", email: "ana@atlas.local", password: "demo123", avatar: "AN", bio: "Design lead", lastSeenAt: Date.now() - 18 * 60 * 1000, contactEdits: {} },
  { id: "u-bruno", name: "Bruno Dev", username: "bruno", email: "bruno@atlas.local", password: "demo123", avatar: "BD", bio: "Backend", lastSeenAt: Date.now() - 32 * 60 * 1000, contactEdits: {} },
  { id: "u-clara", name: "Clara Support", username: "clara", email: "clara@atlas.local", password: "demo123", avatar: "CS", bio: "Support", lastSeenAt: Date.now() - 54 * 60 * 1000, contactEdits: {} }
];

const DEFAULT_THREADS = [
  { id: "t-dm-gustavo-ana", type: "direct", title: "", memberIds: ["u-gustavo", "u-ana"], admins: ["u-gustavo"], createdBy: "u-gustavo", createdAt: Date.now() - 120 * 60 * 1000 },
  { id: "t-dm-gustavo-bruno", type: "direct", title: "", memberIds: ["u-gustavo", "u-bruno"], admins: ["u-gustavo"], createdBy: "u-gustavo", createdAt: Date.now() - 140 * 60 * 1000 },
  { id: "t-group-product", type: "group", title: "Product squad", avatar: "PS", description: "Launch room", memberIds: ["u-gustavo", "u-ana", "u-bruno"], admins: ["u-gustavo", "u-ana"], createdBy: "u-gustavo", createdAt: Date.now() - 160 * 60 * 1000 },
  { id: "t-group-support", type: "group", title: "Support sync", avatar: "SS", description: "Tickets and customer notes", memberIds: ["u-gustavo", "u-clara"], admins: ["u-gustavo", "u-clara"], createdBy: "u-clara", createdAt: Date.now() - 200 * 60 * 1000 }
];

const DEFAULT_MESSAGES = [
  { id: "m-1", threadId: "t-dm-gustavo-ana", senderId: "u-ana", text: "Revisei a home. Posso subir o pack final agora.", createdAt: Date.now() - 62 * 60 * 1000, editedAt: null, replyTo: null, attachments: { images: [], docs: [], audio: [] }, pinnedBy: ["u-gustavo"], favoriteBy: [], reactions: { love: ["u-gustavo"] }, receipts: { "u-ana": "read", "u-gustavo": "read" } },
  { id: "m-2", threadId: "t-dm-gustavo-ana", senderId: "u-gustavo", text: "Manda tambem a versao mobile e o grid final.", createdAt: Date.now() - 58 * 60 * 1000, editedAt: null, replyTo: "m-1", attachments: { images: [], docs: [], audio: [] }, pinnedBy: [], favoriteBy: ["u-gustavo"], reactions: {}, receipts: { "u-ana": "read", "u-gustavo": "read" } },
  { id: "m-3", threadId: "t-dm-gustavo-bruno", senderId: "u-bruno", text: "Deploy concluido. Fila e logs normais.", createdAt: Date.now() - 46 * 60 * 1000, editedAt: null, replyTo: null, attachments: { images: [], docs: [], audio: [] }, pinnedBy: ["u-gustavo"], favoriteBy: [], reactions: { fire: ["u-gustavo"] }, receipts: { "u-bruno": "read", "u-gustavo": "delivered" } },
  { id: "m-4", threadId: "t-group-product", senderId: "u-gustavo", text: "Fechar backlog hoje. Cada um manda status antes das 18h.", createdAt: Date.now() - 36 * 60 * 1000, editedAt: null, replyTo: null, attachments: { images: [], docs: [], audio: [] }, pinnedBy: ["u-gustavo", "u-ana"], favoriteBy: [], reactions: { like: ["u-ana", "u-bruno"] }, receipts: { "u-gustavo": "read", "u-ana": "read", "u-bruno": "delivered" } },
  { id: "m-5", threadId: "t-group-support", senderId: "u-clara", text: "Ticket 4821 fechado. Cliente pediu follow up em 7 dias.", createdAt: Date.now() - 22 * 60 * 1000, editedAt: null, replyTo: null, attachments: { images: [], docs: [], audio: [] }, pinnedBy: [], favoriteBy: [], reactions: {}, receipts: { "u-clara": "read", "u-gustavo": "sent" } }
];

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function buildInitials(name) {
  return String(name || "AT").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function normalizePrivacy(value) {
  const source = value && typeof value === "object" ? value : {};
  const pick = (key) => source[key] === "nobody" ? "nobody" : "everyone";
  return {
    lastSeen: pick("lastSeen"),
    profilePhoto: pick("profilePhoto"),
    readReceipts: pick("readReceipts")
  };
}

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSettingsRecord(value) {
  const source = value && typeof value === "object" ? value : {};
  const fontScale = ["sm", "md", "lg"].includes(source.fontScale) ? source.fontScale : DEFAULT_SETTINGS.fontScale;
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    fontScale,
    compactMode: normalizeBoolean(source.compactMode, DEFAULT_SETTINGS.compactMode),
    showAvatars: normalizeBoolean(source.showAvatars, DEFAULT_SETTINGS.showAvatars),
    showMessageTime: normalizeBoolean(source.showMessageTime, DEFAULT_SETTINGS.showMessageTime),
    showTypingIndicator: normalizeBoolean(source.showTypingIndicator, DEFAULT_SETTINGS.showTypingIndicator),
    enterToSend: normalizeBoolean(source.enterToSend, DEFAULT_SETTINGS.enterToSend),
    showSidebarPreview: normalizeBoolean(source.showSidebarPreview, DEFAULT_SETTINGS.showSidebarPreview),
    showReactionBar: normalizeBoolean(source.showReactionBar, DEFAULT_SETTINGS.showReactionBar),
    blurMedia: normalizeBoolean(source.blurMedia, DEFAULT_SETTINGS.blurMedia),
    wideBubbles: normalizeBoolean(source.wideBubbles, DEFAULT_SETTINGS.wideBubbles),
    wallpaperGlow: normalizeBoolean(source.wallpaperGlow, DEFAULT_SETTINGS.wallpaperGlow),
    privacy: normalizePrivacy(source.privacy)
  };
}

function normalizeUser(user, index) {
  return {
    id: String(user.id || `u-${index + 1}`),
    name: String(user.name || `User ${index + 1}`),
    username: String(user.username || `user${index + 1}`).toLowerCase(),
    email: String(user.email || `user${index + 1}@atlas.local`).toLowerCase(),
    password: String(user.password || "demo123"),
    avatar: String(user.avatar || buildInitials(user.name || `U${index + 1}`)).slice(0, 2).toUpperCase(),
    photo: typeof user.photo === "string" ? user.photo : "",
    bio: String(user.bio || "Team"),
    lastSeenAt: Number.isFinite(user.lastSeenAt) ? user.lastSeenAt : Date.now(),
    contactEdits: user.contactEdits && typeof user.contactEdits === "object" ? user.contactEdits : {}
  };
}

function normalizeThread(thread, index) {
  const type = thread.type === "group" ? "group" : "direct";
  const memberIds = Array.isArray(thread.memberIds) ? [...new Set(thread.memberIds.map(String))] : [];
  return {
    id: String(thread.id || `t-${index + 1}`),
    type,
    title: String(thread.title || ""),
    avatar: String(thread.avatar || ""),
    photo: typeof thread.photo === "string" ? thread.photo : "",
    description: String(thread.description || ""),
    memberIds,
    admins: Array.isArray(thread.admins) ? [...new Set(thread.admins.map(String))] : [],
    createdBy: String(thread.createdBy || memberIds[0] || ""),
    createdAt: Number.isFinite(thread.createdAt) ? thread.createdAt : Date.now(),
    archivedBy: Array.isArray(thread.archivedBy) ? [...new Set(thread.archivedBy.map(String))] : []
  };
}

function normalizeMessage(message, index, threadMap) {
  const thread = threadMap.get(String(message.threadId || ""));
  const members = thread ? thread.memberIds : [];
  const attachments = message.attachments || {};
  const reactions = message.reactions && typeof message.reactions === "object" ? message.reactions : {};
  const receipts = message.receipts && typeof message.receipts === "object" ? { ...message.receipts } : {};
  members.forEach((memberId) => {
    if (!receipts[memberId]) {
      receipts[memberId] = memberId === String(message.senderId || "") ? "read" : "sent";
    }
  });
  return {
    id: String(message.id || `m-${index + 1}`),
    threadId: String(message.threadId || ""),
    senderId: String(message.senderId || ""),
    text: String(message.text || ""),
    createdAt: Number.isFinite(message.createdAt) ? message.createdAt : Date.now() - index * 60000,
    editedAt: Number.isFinite(message.editedAt) ? message.editedAt : null,
    replyTo: message.replyTo ? String(message.replyTo) : null,
    attachments: {
      images: Array.isArray(attachments.images) ? attachments.images : [],
      docs: Array.isArray(attachments.docs) ? attachments.docs : [],
      audio: Array.isArray(attachments.audio) ? attachments.audio : []
    },
    pinnedBy: Array.isArray(message.pinnedBy) ? [...new Set(message.pinnedBy.map(String))] : [],
    favoriteBy: Array.isArray(message.favoriteBy) ? [...new Set(message.favoriteBy.map(String))] : [],
    reactions: Object.fromEntries(Object.entries(reactions).map(([token, userIds]) => [token, Array.isArray(userIds) ? [...new Set(userIds.map(String))] : []])),
    receipts
  };
}
function normalizeState(input) {
  const users = (Array.isArray(input.users) ? input.users : []).map(normalizeUser);
  const threads = (Array.isArray(input.threads) ? input.threads : []).map(normalizeThread);
  const validUserIds = new Set(users.map((user) => user.id));
  const cleanedThreads = threads
    .map((thread) => ({ ...thread, memberIds: thread.memberIds.filter((memberId) => validUserIds.has(memberId)), admins: thread.admins.filter((adminId) => validUserIds.has(adminId)) }))
    .filter((thread) => thread.type === "group" ? thread.memberIds.length >= 2 : thread.memberIds.length === 2);
  const threadMap = new Map(cleanedThreads.map((thread) => [thread.id, thread]));
  const messages = (Array.isArray(input.messages) ? input.messages : [])
    .map((message, index) => normalizeMessage(message, index, threadMap))
    .filter((message) => threadMap.has(message.threadId));
  const settings = input.settings && typeof input.settings === "object"
    ? Object.fromEntries(Object.entries(input.settings).map(([userId, value]) => [userId, normalizeSettingsRecord(value)]))
    : {};
  return {
    version: 5,
    users,
    threads: cleanedThreads,
    messages: messages.sort((left, right) => left.createdAt - right.createdAt),
    settings,
    drafts: input.drafts && typeof input.drafts === "object" ? input.drafts : {}
  };
}

async function fetchSeedArray(url, fallback) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }
    const payload = await response.json();
    return Array.isArray(payload) ? payload : fallback;
  } catch {
    return fallback;
  }
}

async function buildSeedState() {
  const users = await fetchSeedArray(USERS_URL, DEFAULT_USERS);
  const threads = await fetchSeedArray(THREADS_URL, DEFAULT_THREADS);
  const messages = await fetchSeedArray(MESSAGES_URL, DEFAULT_MESSAGES);
  return normalizeState({ version: 5, users, threads, messages, settings: {}, drafts: {} });
}

function readState() {
  const raw = readJsonStorage(STATE_KEY, null);
  return raw ? normalizeState(raw) : null;
}

function writeState(state) {
  writeJsonStorage(STATE_KEY, normalizeState(state));
}

function withState(mutator) {
  const state = readState();
  if (!state) {
    throw new Error("Store not initialized");
  }
  const result = mutator(state);
  writeState(state);
  return result;
}

function findUser(state, userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function findThread(state, threadId) {
  return state.threads.find((thread) => thread.id === threadId) || null;
}

function getDirectThreadBetween(state, leftUserId, rightUserId) {
  const target = [leftUserId, rightUserId].sort();
  return state.threads.find((thread) => {
    if (thread.type !== "direct") {
      return false;
    }
    const ids = [...thread.memberIds].sort();
    return ids[0] === target[0] && ids[1] === target[1];
  }) || null;
}

function parseConversationId(conversationId) {
  if (conversationId.startsWith("group:")) {
    return { type: "group", targetId: conversationId.slice(6) };
  }
  return { type: "direct", targetId: conversationId.slice(7) };
}

function buildConversationId(kind, targetId) {
  return `${kind}:${targetId}`;
}

function resolveThreadFromConversation(state, userId, conversationId, createDirect = false) {
  const parsed = parseConversationId(conversationId);
  if (parsed.type === "group") {
    const thread = findThread(state, parsed.targetId);
    return thread && thread.memberIds.includes(userId) ? thread : null;
  }
  let thread = getDirectThreadBetween(state, userId, parsed.targetId);
  if (!thread && createDirect) {
    thread = { id: uid("t-dm"), type: "direct", title: "", avatar: "", description: "", memberIds: [userId, parsed.targetId].sort(), admins: [userId], createdBy: userId, createdAt: Date.now(), archivedBy: [] };
    state.threads.push(thread);
  }
  return thread;
}

function getContactEdit(state, ownerId, targetId) {
  const owner = findUser(state, ownerId);
  const edits = owner?.contactEdits || {};
  return edits[targetId] && typeof edits[targetId] === "object" ? edits[targetId] : {};
}

function touchUser(state, userId) {
  const user = findUser(state, userId);
  if (user) {
    user.lastSeenAt = Date.now();
  }
}

function canViewerSeePrivacy(state, viewerId, targetUserId, key) {
  if (!viewerId || viewerId === targetUserId) {
    return true;
  }
  return ensureSettingsRecord(state, targetUserId).privacy[key] !== "nobody";
}

function getUserPresence(state, userId) {
  const session = getSessionUserId();
  if (session === userId) {
    return "online";
  }
  const user = findUser(state, userId);
  if (!user) {
    return "offline";
  }
  const diffMinutes = Math.round((Date.now() - user.lastSeenAt) / 60000);
  if (diffMinutes < 20) {
    return "away";
  }
  return "offline";
}

function getUnreadCountForThread(state, userId, threadId) {
  return state.messages.filter((message) => message.threadId === threadId && message.senderId !== userId && message.receipts[userId] !== "read").length;
}

function getLastMessageForThread(state, threadId) {
  const items = state.messages.filter((message) => message.threadId === threadId);
  return items.length ? items[items.length - 1] : null;
}

function buildDirectEntry(state, userId, otherUser) {
  const thread = getDirectThreadBetween(state, userId, otherUser.id);
  const lastMessage = thread ? getLastMessageForThread(state, thread.id) : null;
  const edit = getContactEdit(state, userId, otherUser.id);
  const canSeeProfilePhoto = canViewerSeePrivacy(state, userId, otherUser.id, "profilePhoto");
  const canSeeLastSeen = canViewerSeePrivacy(state, userId, otherUser.id, "lastSeen");
  const presence = canSeeLastSeen ? getUserPresence(state, otherUser.id) : "private";
  return {
    id: buildConversationId("direct", otherUser.id),
    type: "direct",
    threadId: thread?.id || null,
    targetUserId: otherUser.id,
    title: String(edit.nickname || otherUser.name),
    subtitle: String(edit.label || otherUser.bio || otherUser.username),
    avatar: otherUser.avatar,
    photo: canSeeProfilePhoto ? otherUser.photo : "",
    canSeeProfilePhoto,
    canSeeLastSeen,
    presence,
    lastSeenAt: canSeeLastSeen ? otherUser.lastSeenAt : null,
    lastMessage,
    unreadCount: thread ? getUnreadCountForThread(state, userId, thread.id) : 0,
    timestamp: lastMessage?.createdAt || 0
  };
}

function buildGroupEntry(state, userId, thread) {
  const lastMessage = getLastMessageForThread(state, thread.id);
  return {
    id: buildConversationId("group", thread.id),
    type: "group",
    threadId: thread.id,
    targetUserId: null,
    title: thread.title,
    subtitle: thread.description || `${thread.memberIds.length} membros`,
    avatar: thread.avatar || buildInitials(thread.title),
    photo: thread.photo || "",
    canSeeProfilePhoto: false,
    canSeeLastSeen: false,
    presence: "group",
    lastSeenAt: null,
    lastMessage,
    unreadCount: getUnreadCountForThread(state, userId, thread.id),
    timestamp: lastMessage?.createdAt || thread.createdAt
  };
}

function ensureSettingsRecord(state, userId) {
  if (!state.settings[userId]) {
    state.settings[userId] = normalizeSettingsRecord();
  } else {
    state.settings[userId] = normalizeSettingsRecord(state.settings[userId]);
  }
  return state.settings[userId];
}

function ensureDraftRecord(state, userId) {
  if (!state.drafts[userId]) {
    state.drafts[userId] = {};
  }
  return state.drafts[userId];
}

function normalizeAttachments(attachments) {
  const value = attachments || {};
  return { images: Array.isArray(value.images) ? value.images : [], docs: Array.isArray(value.docs) ? value.docs : [], audio: Array.isArray(value.audio) ? value.audio : [] };
}

function getSenderStatus(state, message, thread, userId) {
  if (message.senderId !== userId) {
    return "";
  }
  const peers = thread.memberIds.filter((memberId) => memberId !== userId);
  if (!peers.length) {
    return "read";
  }
  const statuses = peers.map((memberId) => {
    const receipt = message.receipts[memberId] || "sent";
    if (receipt === "read" && !canViewerSeePrivacy(state, userId, memberId, "readReceipts")) {
      return "delivered";
    }
    return receipt;
  });
  if (statuses.every((status) => status === "read")) {
    return "read";
  }
  if (statuses.some((status) => status === "delivered" || status === "read")) {
    return "delivered";
  }
  return "sent";
}

export async function ensureStore() {
  const existing = readState();
  if (existing && existing.version === 5) {
    writeState(existing);
    return;
  }
  if (existing) {
    writeState(existing);
    return;
  }
  const seed = await buildSeedState();
  writeState(seed);
}

export function getSessionUserId() {
  return localStorage.getItem(SESSION_KEY);
}

export function getCurrentUser() {
  const state = readState();
  const session = getSessionUserId();
  return state && session ? findUser(state, session) : null;
}

export function requireSession(redirectUrl = "index.html") {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = redirectUrl;
    return null;
  }
  return user;
}

export function redirectIfAuthenticated(redirectUrl = "chat.html") {
  if (getCurrentUser()) {
    window.location.href = redirectUrl;
  }
}

export function loginUser(identifier, password) {
  const state = readState();
  if (!state) {
    return { ok: false, error: "Store indisponivel" };
  }
  const normalized = String(identifier || "").trim().toLowerCase();
  const user = state.users.find((entry) => entry.username === normalized || entry.email === normalized);
  if (!user || user.password !== password) {
    return { ok: false, error: "Credenciais invalidas" };
  }
  localStorage.setItem(SESSION_KEY, user.id);
  markAllDeliveredForUser(user.id);
  return { ok: true, user };
}

export function registerUser(payload) {
  return withState((state) => {
    const name = String(payload.name || "").trim();
    const username = String(payload.username || "").trim().toLowerCase();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "").trim();
    if (!name || !username || !email || !password) {
      return { ok: false, error: "Preencha todos os campos" };
    }
    if (state.users.some((user) => user.username === username)) {
      return { ok: false, error: "Username ja existe" };
    }
    if (state.users.some((user) => user.email === email)) {
      return { ok: false, error: "Email ja existe" };
    }
    const user = normalizeUser({ id: uid("u"), name, username, email, password, avatar: buildInitials(name), bio: payload.bio || "Member", lastSeenAt: Date.now(), contactEdits: {} }, state.users.length);
    state.users.push(user);
    ensureSettingsRecord(state, user.id);
    ensureDraftRecord(state, user.id);
    localStorage.setItem(SESSION_KEY, user.id);
    return { ok: true, user };
  });
}

export function logoutUser() {
  withState((state) => {
    const current = getSessionUserId();
    if (!current) {
      return null;
    }
    const user = findUser(state, current);
    if (user) {
      user.lastSeenAt = Date.now();
    }
    return null;
  });
  localStorage.removeItem(SESSION_KEY);
}
export function getSettings(userId) {
  const state = readState();
  if (!state || !userId) {
    return normalizeSettingsRecord();
  }
  return normalizeSettingsRecord(ensureSettingsRecord(state, userId));
}

export function saveSettings(userId, patch) {
  withState((state) => {
    const current = ensureSettingsRecord(state, userId);
    state.settings[userId] = normalizeSettingsRecord({
      ...current,
      ...patch,
      privacy: {
        ...current.privacy,
        ...(patch?.privacy && typeof patch.privacy === "object" ? patch.privacy : {})
      }
    });
    return state.settings[userId];
  });
}

export function applyTheme(settings) {
  const theme = { ...DEFAULT_SETTINGS, ...settings };
  const root = document.documentElement.style;
  root.setProperty("--accent", theme.accent);
  root.setProperty("--accent-alt", theme.accentAlt);
  document.body.style.filter = `saturate(${theme.saturation || 1})`;
  if (theme.mode === "light") {
    root.setProperty("--bg", "#eff4fb");
    root.setProperty("--bg-soft", "#dde6f2");
    root.setProperty("--panel", "rgba(255, 255, 255, 0.94)");
    root.setProperty("--panel-strong", "rgba(255, 255, 255, 0.98)");
    root.setProperty("--surface", "rgba(11, 22, 38, 0.04)");
    root.setProperty("--surface-strong", "rgba(11, 22, 38, 0.08)");
    root.setProperty("--text", "#0b1626");
    root.setProperty("--muted", "#5c6c84");
    root.setProperty("--border", "rgba(11, 22, 38, 0.09)");
    root.setProperty("--shadow", "0 24px 54px rgba(11, 22, 38, 0.12)");
    document.body.style.background = "linear-gradient(180deg, #f3f7fb 0%, #e9eff8 100%)";
  } else {
    root.setProperty("--bg", "#08111f");
    root.setProperty("--bg-soft", "#0d1a2d");
    root.setProperty("--panel", "rgba(8, 16, 30, 0.88)");
    root.setProperty("--panel-strong", "rgba(10, 19, 35, 0.96)");
    root.setProperty("--surface", "rgba(255, 255, 255, 0.04)");
    root.setProperty("--surface-strong", "rgba(255, 255, 255, 0.08)");
    root.setProperty("--text", "#f5f8ff");
    root.setProperty("--muted", "#92a2bd");
    root.setProperty("--border", "rgba(255, 255, 255, 0.08)");
    root.setProperty("--shadow", "0 24px 64px rgba(0, 0, 0, 0.34)");
    document.body.style.background = "radial-gradient(circle at top left, rgba(53, 194, 255, 0.22), transparent 28%), radial-gradient(circle at top right, rgba(69, 224, 177, 0.18), transparent 26%), linear-gradient(180deg, #040a13 0%, #08111f 55%, #0d1727 100%)";
  }
}

export function applyDisplayPreferences(settings) {
  const theme = normalizeSettingsRecord(settings);
  const root = document.documentElement.style;
  const scaleMap = { sm: "0.95", md: "1", lg: "1.06" };
  root.setProperty("--font-scale", scaleMap[theme.fontScale] || "1");
  root.setProperty("--message-bubble-width", theme.wideBubbles ? "min(1280px, 100%)" : "min(1100px, 94%)");

  document.body.classList.toggle("compact-ui", theme.compactMode);
  document.body.classList.toggle("hide-avatars", !theme.showAvatars);
  document.body.classList.toggle("blur-media", theme.blurMedia);
  document.body.classList.toggle("wide-bubbles", theme.wideBubbles);
  document.body.classList.toggle("no-wallpaper-glow", !theme.wallpaperGlow);

  if (!theme.wallpaperGlow) {
    document.body.style.background = theme.mode === "light"
      ? "linear-gradient(180deg, #edf3fb 0%, #e5edf8 100%)"
      : "linear-gradient(180deg, #06101d 0%, #091425 100%)";
  } else if (theme.mode === "light") {
    document.body.style.background = "linear-gradient(180deg, #f3f7fb 0%, #e9eff8 100%)";
  } else {
    document.body.style.background = "radial-gradient(circle at top left, rgba(53, 194, 255, 0.22), transparent 28%), radial-gradient(circle at top right, rgba(69, 224, 177, 0.18), transparent 26%), linear-gradient(180deg, #040a13 0%, #08111f 55%, #0d1727 100%)";
  }
}

export function getAllUsers() {
  const state = readState();
  return state ? state.users : [];
}

export function getUserById(userId) {
  const state = readState();
  return state ? findUser(state, userId) : null;
}

export function getConversationEntries(userId, query = "", filter = "all") {
  const state = readState();
  if (!state) {
    return [];
  }
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const directEntries = state.users.filter((user) => user.id !== userId).map((user) => buildDirectEntry(state, userId, user));
  const groupEntries = state.threads.filter((thread) => thread.type === "group" && thread.memberIds.includes(userId)).map((thread) => buildGroupEntry(state, userId, thread));
  return [...directEntries, ...groupEntries]
    .filter((entry) => {
      if (filter === "direct" && entry.type !== "direct") {
        return false;
      }
      if (filter === "group" && entry.type !== "group") {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = `${entry.title} ${entry.subtitle}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((left, right) => {
      if (right.timestamp !== left.timestamp) {
        return right.timestamp - left.timestamp;
      }
      return left.title.localeCompare(right.title);
    });
}

export function getConversationDetails(userId, conversationId) {
  const state = readState();
  if (!state) {
    return null;
  }
  const parsed = parseConversationId(conversationId);
  if (parsed.type === "direct") {
    const target = findUser(state, parsed.targetId);
    if (!target) {
      return null;
    }
    const edit = getContactEdit(state, userId, target.id);
    const thread = getDirectThreadBetween(state, userId, target.id);
    const canSeeLastSeen = canViewerSeePrivacy(state, userId, target.id, "lastSeen");
    const canSeeProfilePhoto = canViewerSeePrivacy(state, userId, target.id, "profilePhoto");
    const presence = canSeeLastSeen ? getUserPresence(state, target.id) : "private";
    return {
      id: conversationId,
      threadId: thread?.id || null,
      type: "direct",
      title: edit.nickname || target.name,
      subtitle: edit.label || target.bio,
      avatar: target.avatar,
      photo: canSeeProfilePhoto ? target.photo : "",
      targetUser: target,
      memberIds: [userId, target.id],
      admins: [],
      canManage: true,
      description: edit.label || "",
      lastSeenAt: canSeeLastSeen ? target.lastSeenAt : null,
      canSeeLastSeen,
      canSeeProfilePhoto,
      presence
    };
  }
  const thread = findThread(state, parsed.targetId);
  if (!thread || !thread.memberIds.includes(userId)) {
    return null;
  }
  return {
    id: conversationId,
    threadId: thread.id,
    type: "group",
    title: thread.title,
    subtitle: thread.description || `${thread.memberIds.length} membros`,
    avatar: thread.avatar || buildInitials(thread.title),
    photo: thread.photo || "",
    targetUser: null,
    memberIds: thread.memberIds,
    admins: thread.admins,
    canManage: thread.admins.includes(userId),
    description: thread.description,
    lastSeenAt: null,
    canSeeLastSeen: false,
    canSeeProfilePhoto: false,
    presence: "group"
  };
}

export function getMessagesForConversation(userId, conversationId) {
  const state = readState();
  if (!state) {
    return [];
  }
  const thread = resolveThreadFromConversation(state, userId, conversationId, false);
  if (!thread) {
    return [];
  }
  return state.messages
    .filter((message) => message.threadId === thread.id)
    .map((message) => ({
      ...message,
      sender: findUser(state, message.senderId),
      thread,
      isPinned: message.pinnedBy.includes(userId),
      isFavorite: message.favoriteBy.includes(userId),
      senderStatus: getSenderStatus(state, message, thread, userId)
    }));
}

export function getDraft(userId, conversationId) {
  const state = readState();
  if (!state) {
    return "";
  }
  const drafts = ensureDraftRecord(state, userId);
  return typeof drafts[conversationId] === "string" ? drafts[conversationId] : "";
}

export function saveDraft(userId, conversationId, value) {
  withState((state) => {
    const drafts = ensureDraftRecord(state, userId);
    drafts[conversationId] = String(value || "");
    return drafts[conversationId];
  });
}

export function markAllDeliveredForUser(userId) {
  withState((state) => {
    state.messages.forEach((message) => {
      const thread = findThread(state, message.threadId);
      if (!thread || !thread.memberIds.includes(userId) || message.senderId === userId) {
        return;
      }
      if (message.receipts[userId] === "sent") {
        message.receipts[userId] = "delivered";
      }
    });
    touchUser(state, userId);
  });
}

export function markConversationRead(userId, conversationId) {
  withState((state) => {
    const thread = resolveThreadFromConversation(state, userId, conversationId, false);
    if (!thread) {
      return;
    }
    state.messages.forEach((message) => {
      if (message.threadId === thread.id && message.senderId !== userId) {
        message.receipts[userId] = "read";
      }
    });
    touchUser(state, userId);
  });
}

export function sendMessage(userId, conversationId, payload) {
  return withState((state) => {
    const thread = resolveThreadFromConversation(state, userId, conversationId, true);
    if (!thread) {
      return null;
    }
    const receipts = Object.fromEntries(thread.memberIds.map((memberId) => [memberId, memberId === userId ? "read" : "sent"]));
    const message = normalizeMessage({ id: uid("m"), threadId: thread.id, senderId: userId, text: payload.text || "", createdAt: Date.now(), editedAt: null, replyTo: payload.replyTo || null, attachments: normalizeAttachments(payload.attachments), pinnedBy: payload.pinned ? [userId] : [], favoriteBy: payload.favorite ? [userId] : [], reactions: {}, receipts }, state.messages.length, new Map(state.threads.map((item) => [item.id, item])));
    state.messages.push(message);
    touchUser(state, userId);
    return message;
  });
}

export function updateMessage(userId, messageId, nextText) {
  return withState((state) => {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message || message.senderId !== userId) {
      return false;
    }
    message.text = String(nextText || "").trim();
    message.editedAt = Date.now();
    return true;
  });
}

export function deleteMessage(userId, messageId) {
  return withState((state) => {
    const index = state.messages.findIndex((item) => item.id === messageId);
    if (index === -1 || state.messages[index].senderId !== userId) {
      return false;
    }
    state.messages.splice(index, 1);
    return true;
  });
}

export function toggleReaction(userId, messageId, token) {
  return withState((state) => {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message) {
      return false;
    }
    const current = Array.isArray(message.reactions[token]) ? message.reactions[token] : [];
    const wasActive = current.includes(userId);

    Object.keys(message.reactions).forEach((key) => {
      const users = Array.isArray(message.reactions[key]) ? message.reactions[key] : [];
      message.reactions[key] = users.filter((value) => value !== userId);
    });

    if (!wasActive) {
      message.reactions[token] = [...(Array.isArray(message.reactions[token]) ? message.reactions[token] : []), userId];
    }
    return true;
  });
}

export function togglePinned(userId, messageId) {
  return withState((state) => {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message) {
      return false;
    }
    const wasPinned = message.pinnedBy.includes(userId);
    state.messages.forEach((item) => {
      if (item.threadId === message.threadId) {
        item.pinnedBy = item.pinnedBy.filter((value) => value !== userId);
      }
    });
    if (!wasPinned) {
      message.pinnedBy.push(userId);
    }
    return true;
  });
}

export function toggleFavorite(userId, messageId) {
  return withState((state) => {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message) {
      return false;
    }
    if (message.favoriteBy.includes(userId)) {
      message.favoriteBy = message.favoriteBy.filter((value) => value !== userId);
    } else {
      message.favoriteBy.push(userId);
    }
    return true;
  });
}
export function getPinnedMessagesForUser(userId) {
  const state = readState();
  if (!state) {
    return [];
  }
  const latestByThread = new Map();
  state.messages
    .filter((message) => message.pinnedBy.includes(userId))
    .sort((left, right) => right.createdAt - left.createdAt)
    .forEach((message) => {
      if (!latestByThread.has(message.threadId)) {
        latestByThread.set(message.threadId, { ...message, thread: findThread(state, message.threadId), sender: findUser(state, message.senderId) });
      }
    });
  return [...latestByThread.values()];
}

export function getPinnedMessageForConversation(userId, conversationId) {
  const state = readState();
  if (!state) {
    return null;
  }
  const thread = resolveThreadFromConversation(state, userId, conversationId, false);
  if (!thread) {
    return null;
  }
  const pinned = state.messages
    .filter((message) => message.threadId === thread.id && message.pinnedBy.includes(userId))
    .sort((left, right) => right.createdAt - left.createdAt)[0];
  return pinned ? { ...pinned, thread, sender: findUser(state, pinned.senderId) } : null;
}

export function getFavoriteMessagesForUser(userId) {
  const state = readState();
  if (!state) {
    return [];
  }
  return state.messages
    .filter((message) => message.favoriteBy.includes(userId))
    .map((message) => ({ ...message, thread: findThread(state, message.threadId), sender: findUser(state, message.senderId) }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function searchMessagesForUser(userId, term) {
  const state = readState();
  if (!state) {
    return [];
  }
  const normalized = String(term || "").trim().toLowerCase();
  if (!normalized) {
    return [];
  }
  const allowedThreadIds = new Set(state.threads.filter((thread) => thread.memberIds.includes(userId)).map((thread) => thread.id));
  return state.messages.filter((message) => allowedThreadIds.has(message.threadId)).filter((message) => message.text.toLowerCase().includes(normalized)).map((message) => ({ ...message, thread: findThread(state, message.threadId), sender: findUser(state, message.senderId) })).sort((left, right) => right.createdAt - left.createdAt);
}

export function updateContact(userId, targetUserId, patch) {
  return withState((state) => {
    const owner = findUser(state, userId);
    if (!owner) {
      return false;
    }
    const next = { nickname: String(patch.nickname || "").trim(), label: String(patch.label || "").trim() };
    if (!next.nickname && !next.label) {
      delete owner.contactEdits[targetUserId];
    } else {
      owner.contactEdits[targetUserId] = next;
    }
    return true;
  });
}

export function updateUserProfile(userId, patch) {
  return withState((state) => {
    const user = findUser(state, userId);
    if (!user) {
      return { ok: false, error: "Conta nao encontrada" };
    }
    if (typeof patch.name === "string") {
      const nextName = patch.name.trim();
      if (nextName) {
        user.name = nextName;
        user.avatar = buildInitials(nextName);
      }
    }
    if (typeof patch.bio === "string") {
      user.bio = patch.bio.trim();
    }
    if (patch.clearPhoto) {
      user.photo = "";
    }
    if (typeof patch.photo === "string") {
      user.photo = patch.photo;
    }
    touchUser(state, userId);
    return { ok: true, user };
  });
}

export function createGroup(userId, payload) {
  return withState((state) => {
    const title = String(payload.title || "").trim();
    if (!title) {
      return { ok: false, error: "Defina um nome para o grupo" };
    }
    const memberIds = [...new Set([userId, ...(Array.isArray(payload.memberIds) ? payload.memberIds : [])])];
    if (memberIds.length < 2) {
      return { ok: false, error: "Escolha ao menos mais um membro" };
    }
    const thread = normalizeThread({
      id: uid("t-group"),
      type: "group",
      title,
      avatar: buildInitials(title),
      photo: typeof payload.photo === "string" ? payload.photo : "",
      description: String(payload.description || "").trim(),
      memberIds,
      admins: [userId],
      createdBy: userId,
      createdAt: Date.now(),
      archivedBy: []
    }, state.threads.length);
    state.threads.push(thread);
    return { ok: true, thread };
  });
}

export function updateGroup(userId, threadId, patch) {
  return withState((state) => {
    const thread = findThread(state, threadId);
    if (!thread || thread.type !== "group" || !thread.admins.includes(userId)) {
      return { ok: false, error: "Sem permissao" };
    }
    const previousTitle = thread.title;
    if (typeof patch.title === "string") {
      const nextTitle = patch.title.trim() || thread.title;
      thread.title = nextTitle;
      if (!patch.avatar && (!thread.avatar || thread.avatar === buildInitials(previousTitle))) {
        thread.avatar = buildInitials(nextTitle);
      }
    }
    if (typeof patch.description === "string") {
      thread.description = patch.description.trim();
    }
    if (typeof patch.avatar === "string") {
      thread.avatar = patch.avatar.trim().slice(0, 2).toUpperCase();
    }
    if (patch.clearPhoto) {
      thread.photo = "";
    }
    if (typeof patch.photo === "string") {
      thread.photo = patch.photo;
    }
    return { ok: true, thread };
  });
}

export function addGroupMembers(userId, threadId, memberIds) {
  return withState((state) => {
    const thread = findThread(state, threadId);
    if (!thread || thread.type !== "group" || !thread.admins.includes(userId)) {
      return { ok: false, error: "Sem permissao" };
    }
    const validIds = memberIds.filter((memberId) => findUser(state, memberId));
    thread.memberIds = [...new Set([...thread.memberIds, ...validIds])];
    return { ok: true, thread };
  });
}

export function toggleGroupAdmin(userId, threadId, targetUserId) {
  return withState((state) => {
    const thread = findThread(state, threadId);
    if (!thread || thread.type !== "group" || !thread.admins.includes(userId) || !thread.memberIds.includes(targetUserId)) {
      return { ok: false, error: "Sem permissao" };
    }
    if (thread.admins.includes(targetUserId)) {
      if (thread.admins.length === 1) {
        return { ok: false, error: "O grupo precisa de pelo menos um admin" };
      }
      thread.admins = thread.admins.filter((adminId) => adminId !== targetUserId);
    } else {
      thread.admins.push(targetUserId);
    }
    return { ok: true, thread };
  });
}

export function removeGroupMember(userId, threadId, targetUserId) {
  return withState((state) => {
    const thread = findThread(state, threadId);
    if (!thread || thread.type !== "group") {
      return { ok: false, error: "Grupo invalido" };
    }
    const allowed = thread.admins.includes(userId) || userId === targetUserId;
    if (!allowed) {
      return { ok: false, error: "Sem permissao" };
    }
    if (!thread.memberIds.includes(targetUserId)) {
      return { ok: false, error: "Membro nao encontrado" };
    }
    thread.memberIds = thread.memberIds.filter((memberId) => memberId !== targetUserId);
    thread.admins = thread.admins.filter((adminId) => adminId !== targetUserId);
    if (!thread.admins.length && thread.memberIds.length) {
      thread.admins = [thread.memberIds[0]];
    }
    if (thread.memberIds.length < 2) {
      state.threads = state.threads.filter((item) => item.id !== threadId);
      state.messages = state.messages.filter((message) => message.threadId !== threadId);
      return { ok: true, removedThread: true };
    }
    return { ok: true, thread };
  });
}

export function listUsersForPicker(userId, excludeIds = []) {
  const state = readState();
  if (!state) {
    return [];
  }
  const excluded = new Set([userId, ...excludeIds]);
  return state.users.filter((user) => !excluded.has(user.id));
}

export function exportState() {
  const state = readState();
  return state || normalizeState({ version: 5, users: [], threads: [], messages: [], settings: {}, drafts: {} });
}

export function importState(payload) {
  writeState(normalizeState(payload || {}));
}

export function clearAllData() {
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function formatClock(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(value) {
  const minutes = Math.max(0, Math.round((Date.now() - value) / 60000));
  if (minutes < 1) {
    return "agora";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.round(hours / 24)}d`;
}

export function clipText(value, size) {
  return String(value).length > size ? `${String(value).slice(0, size)}...` : String(value);
}

export function getConversationIdForGroup(threadId) {
  return buildConversationId("group", threadId);
}

export function getConversationIdForDirect(userId) {
  return buildConversationId("direct", userId);
}

export function getGroupMembers(threadId, viewerId = getSessionUserId()) {
  const state = readState();
  const thread = state ? findThread(state, threadId) : null;
  if (!thread) {
    return [];
  }
  return thread.memberIds
    .map((memberId) => {
      const member = findUser(state, memberId);
      if (!member) {
        return null;
      }
      return {
        ...member,
        photo: canViewerSeePrivacy(state, viewerId, member.id, "profilePhoto") ? member.photo : ""
      };
    })
    .filter(Boolean);
}
