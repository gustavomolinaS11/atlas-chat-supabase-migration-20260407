import {
  readPersistedValue,
  removePersistedValue,
  writePersistedValue
} from "./src/lib/sessionPersistence.js";

const STATE_KEY = "atlas.state.v6";
const SESSION_KEY = "atlas.session.v4";
const USERS_URL = "data/users.json";
const THREADS_URL = "data/threads.json";
const MESSAGES_URL = "data/messages.json";
const ASSISTANT_USER_ID = "u-ia";

const DEFAULT_SETTINGS = {
  mode: "dark",
  accent: "#35c2ff",
  accentAlt: "#45e0b1",
  saturation: 1,
  fontScale: "md",
  bubbleSize: "sm",
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

const ASSISTANT_USER = {
  id: ASSISTANT_USER_ID,
  name: "IA",
  username: "ia",
  email: "ia@atlas.local",
  password: "__assistant__",
  avatar: "IA",
  photo: "",
  bio: "Guia do Atlas: conversa de forma natural e ajuda com contatos, grupos, mencoes, audio, privacidade, atalhos e fluxo mobile.",
  kind: "assistant",
  lastSeenAt: Date.now(),
  contactIds: [],
  pinnedConversationIds: [],
  contactEdits: {}
};

const ASSISTANT_TOPIC_DEFINITIONS = [
  {
    id: "groups",
    label: "grupos",
    patterns: [/\bgrupo\b/, /\bgrupos\b/, /\badmin\b/, /\bmembro\b/, /\bmembros\b/, /\bparticipante\b/, /\bparticipantes\b/, /\bpromov/, /\bremov.*grupo/, /foto do grupo/, /editar grupo/],
    response: "Em grupos voce resolve tudo pelo painel de detalhes: editar nome, foto e descricao, ver membros, adicionar ou remover pessoas e trocar cargos de admin. Essas mudancas tambem aparecem como atualizacao dentro do chat."
  },
  {
    id: "contacts",
    label: "contatos",
    patterns: [/\bcontato\b/, /\bcontatos\b/, /\busuario\b/, /\bagenda\b/, /adicionar contato/, /novo chat/, /\bperfil\b.*\badicionar\b/],
    response: "Para contato, use o botao + e busque pelo usuario sem @. Se a pessoa estiver em um grupo com voce, tambem da para adicionar direto pela lista de membros."
  },
  {
    id: "mentions",
    label: "mencoes",
    patterns: [/\bmenc/, /\bmarc/, /@/, /\bcitar\b/],
    response: "Em grupos, digite @ que a lista de participantes abre na hora. Quem for marcado recebe destaque e a conversa fica sinalizada ate a mencao ser vista."
  },
  {
    id: "conversation-management",
    label: "organizacao da conversa",
    patterns: [/\bfix/, /\bpin\b/, /\barquiv/, /\bhistor/, /\blimpar conversa/, /\btopo\b/],
    response: "Voce pode fixar conversa no topo, arquivar para tirar da lista principal e limpar o seu historico sem mexer no restante do grupo ou do privado."
  },
  {
    id: "message-delete",
    label: "apagando mensagens",
    patterns: [/\bapag/, /\bexclu/, /\bremov.*mensagem/, /apagar pra mim/, /apagar para mim/, /apagar pra todos/, /apagar para todos/],
    response: "No apagar, existe diferenca entre apagar so para voce e apagar para todos quando a mensagem for sua. Isso vale tanto pelo menu quanto pela selecao multipla."
  },
  {
    id: "reactions",
    label: "reacoes e favoritos",
    patterns: [/\bfavorit/, /\bestrela/, /\breag/, /\bemoji\b/, /\bcurti/, /\bpin\b.*mensagem/],
    response: "Cada usuario pode deixar uma reacao por mensagem. Favoritos e pins continuam individuais, entao cada pessoa organiza o chat do proprio jeito."
  },
  {
    id: "audio",
    label: "audio",
    patterns: [/\baudio\b/, /\bvoz\b/, /\bmicrofone\b/, /\bgravar\b/, /\bwave\b/, /\bonda\b/],
    response: "Se o campo estiver vazio, o botao principal vira microfone. Voce grava, revisa e envia dali mesmo, sem sair do composer."
  },
  {
    id: "media",
    label: "camera e anexos",
    patterns: [/\bcamera\b/, /\bfoto\b/, /\bimagem\b/, /\banexo\b/, /\barquivo\b/, /\bdocumento\b/, /\bupload\b/],
    response: "Imagem, documento e camera saem do composer. Foto de grupo e avatar tambem entram nesse fluxo de upload e sincronizam com a conversa."
  },
  {
    id: "settings",
    label: "configuracoes e privacidade",
    patterns: [/\btema\b/, /\bprivacidade\b/, /\bconfig/, /\bleitura\b/, /\bonline\b/, /\bvisto\b/, /\bultima vez\b/, /\bultimo acesso\b/, /\bfoto de perfil\b/, /\bperfil\b/],
    response: "Em Configuracoes voce ajusta tema, privacidade, leitura, online, foto de perfil e comportamento visual. As regras de privacidade valem de forma reciproca."
  },
  {
    id: "navigation",
    label: "navegacao e mobile",
    patterns: [/\bmobile\b/, /\bcelular\b/, /\bvoltar\b/, /\btela cheia\b/, /\bscroll\b/, /\bfim da conversa\b/, /\bseta\b/, /\bcomposer\b/, /\bgesto\b/, /\bswipe\b/, /\barrast/],
    response: "No celular a conversa ocupa a tela toda, existe botao de voltar, gesto para responder e um atalho para voltar direto ao fim quando voce sobe o historico."
  },
  {
    id: "sync",
    label: "sincronizacao e desempenho",
    patterns: [/\bsincron/, /\bdispositivo\b/, /\bpc\b/, /\bcomputador\b/, /\bcache\b/, /\brealtime\b/, /\bdelay\b/, /\blento\b/, /\btrav/, /\bperformance\b/],
    response: "Hoje o chat sincroniza pelo Supabase. Quando algo parece lento, o ideal e mostrar primeiro na interface e deixar o banco confirmar em segundo plano."
  },
  {
    id: "reply",
    label: "respostas e busca",
    patterns: [/\brespost/, /\breply\b/, /\bbuscar\b/, /\bmensagem original\b/, /\bpular\b/, /\bprivado\b/, /\bdm\b/, /\bconversa privada\b/],
    response: "Voce pode responder mensagens, tocar na resposta para voltar na original, buscar dentro da conversa e abrir o privado ao tocar numa mencao."
  }
];

const ASSISTANT_TOPIC_BY_ID = Object.fromEntries(ASSISTANT_TOPIC_DEFINITIONS.map((topic) => [topic.id, topic]));

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

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String))];
}

function sanitizeUsername(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function isValidUsername(value) {
  return /^[a-z0-9._-]{3,}$/.test(String(value || ""));
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
  const bubbleSize = ["xs", "sm", "md", "lg", "xl"].includes(source.bubbleSize)
    ? source.bubbleSize
    : (normalizeBoolean(source.wideBubbles, false) ? "lg" : DEFAULT_SETTINGS.bubbleSize);
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    fontScale,
    bubbleSize,
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

function normalizeClearMap(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([, timestamp]) => Number.isFinite(Number(timestamp)) && Number(timestamp) > 0)
      .map(([userId, timestamp]) => [String(userId), Number(timestamp)])
  );
}

function normalizeUser(user, index) {
  return {
    id: String(user.id || `u-${index + 1}`),
    name: String(user.name || `User ${index + 1}`),
    username: sanitizeUsername(String(user.username || `user${index + 1}`)),
    email: String(user.email || `user${index + 1}@atlas.local`).toLowerCase(),
    password: String(user.password || "demo123"),
    avatar: String(user.avatar || buildInitials(user.name || `U${index + 1}`)).slice(0, 2).toUpperCase(),
    photo: typeof user.photo === "string" ? user.photo : "",
    bio: String(user.bio || "Team"),
    kind: user.kind === "assistant" ? "assistant" : "user",
    lastSeenAt: Number.isFinite(user.lastSeenAt) ? user.lastSeenAt : Date.now(),
    contactIds: uniqueStrings(user.contactIds).filter((contactId) => contactId !== String(user.id || `u-${index + 1}`)),
    pinnedConversationIds: uniqueStrings(user.pinnedConversationIds),
    contactEdits: user.contactEdits && typeof user.contactEdits === "object" ? user.contactEdits : {}
  };
}

function normalizeThread(thread, index) {
  const type = thread.type === "group" ? "group" : "direct";
  const memberIds = uniqueStrings(thread.memberIds);
  return {
    id: String(thread.id || `t-${index + 1}`),
    type,
    remote: Boolean(thread.remote),
    title: String(thread.title || ""),
    avatar: String(thread.avatar || ""),
    photo: typeof thread.photo === "string" ? thread.photo : "",
    description: String(thread.description || ""),
    memberIds,
    admins: uniqueStrings(thread.admins),
    createdBy: String(thread.createdBy || memberIds[0] || ""),
    createdAt: Number.isFinite(thread.createdAt) ? thread.createdAt : Date.now(),
    archivedBy: uniqueStrings(thread.archivedBy),
    clearedAtBy: normalizeClearMap(thread.clearedAtBy)
  };
}

function normalizeMessage(message, index, threadMap) {
  const thread = threadMap.get(String(message.threadId || ""));
  const members = thread ? thread.memberIds : [];
  const attachments = message.attachments || {};
  const reactions = message.reactions && typeof message.reactions === "object" ? message.reactions : {};
  const receipts = message.receipts && typeof message.receipts === "object" ? { ...message.receipts } : {};
  const kind = message.kind === "system" ? "system" : "message";
  members.forEach((memberId) => {
    if (!receipts[memberId]) {
      receipts[memberId] = memberId === String(message.senderId || "") ? "read" : "sent";
    }
  });
  return {
    id: String(message.id || `m-${index + 1}`),
    threadId: String(message.threadId || ""),
    senderId: String(message.senderId || ""),
    kind,
    text: String(message.text || ""),
    createdAt: Number.isFinite(message.createdAt) ? message.createdAt : Date.now() - index * 60000,
    editedAt: Number.isFinite(message.editedAt) ? message.editedAt : null,
    replyTo: message.replyTo ? String(message.replyTo) : null,
    attachments: {
      images: Array.isArray(attachments.images) ? attachments.images : [],
      docs: Array.isArray(attachments.docs) ? attachments.docs : [],
      audio: Array.isArray(attachments.audio) ? attachments.audio : []
    },
    pinnedBy: uniqueStrings(message.pinnedBy),
    favoriteBy: uniqueStrings(message.favoriteBy),
    hiddenFor: uniqueStrings(message.hiddenFor),
    mentions: uniqueStrings(message.mentions).filter((userId) => members.includes(userId)),
    reactions: Object.fromEntries(Object.entries(reactions).map(([token, userIds]) => [token, uniqueStrings(userIds)])),
    receipts
  };
}

function extractMentionedUserIds(state, thread, senderId, text) {
  if (!thread || !String(text || "").includes("@")) {
    return [];
  }
  const usernames = new Set();
  for (const match of String(text || "").matchAll(/@([a-z0-9._-]{3,})/gi)) {
    usernames.add(sanitizeUsername(match[1]));
  }
  if (!usernames.size) {
    return [];
  }
  return state.users
    .filter((user) => usernames.has(sanitizeUsername(user.username)) && thread.memberIds.includes(user.id) && user.id !== senderId)
    .map((user) => user.id);
}

function buildSystemReceipts(memberIds) {
  return Object.fromEntries(uniqueStrings(memberIds).map((memberId) => [memberId, "read"]));
}

function appendSystemMessage(state, thread, actorId, text) {
  if (!thread || thread.type !== "group") {
    return null;
  }
  const content = String(text || "").trim();
  if (!content) {
    return null;
  }
  const message = normalizeMessage({
    id: uid("m-system"),
    threadId: thread.id,
    senderId: actorId,
    kind: "system",
    text: content,
    createdAt: Date.now(),
    receipts: buildSystemReceipts(thread.memberIds)
  }, state.messages.length, new Map(state.threads.map((item) => [item.id, item])));
  state.messages.push(message);
  return message;
}

function normalizeState(input) {
  const seededUsers = (Array.isArray(input.users) ? input.users : []).map(normalizeUser);
  const users = seededUsers.some((user) => user.id === ASSISTANT_USER_ID)
    ? seededUsers
    : [...seededUsers, normalizeUser(ASSISTANT_USER, seededUsers.length)];
  const threads = (Array.isArray(input.threads) ? input.threads : []).map(normalizeThread);
  const validUserIds = new Set(users.map((user) => user.id));
  const cleanedThreads = threads
    .map((thread) => ({
      ...thread,
      memberIds: thread.memberIds.filter((memberId) => validUserIds.has(memberId)),
      admins: thread.admins.filter((adminId) => validUserIds.has(adminId)),
      archivedBy: thread.archivedBy.filter((userId) => validUserIds.has(userId)),
      clearedAtBy: Object.fromEntries(Object.entries(thread.clearedAtBy).filter(([userId]) => validUserIds.has(userId)))
    }))
    .filter((thread) => thread.type === "group" ? thread.memberIds.length >= 2 : thread.memberIds.length === 2);
  const migratedUsers = users.map((user) => {
    const directThreadContacts = cleanedThreads
      .filter((thread) => thread.type === "direct" && thread.memberIds.includes(user.id))
      .map((thread) => thread.memberIds.find((memberId) => memberId !== user.id))
      .filter(Boolean);
    return {
      ...user,
      contactIds: uniqueStrings([...user.contactIds.filter((contactId) => validUserIds.has(contactId) && contactId !== user.id), ...directThreadContacts]),
      pinnedConversationIds: uniqueStrings(user.pinnedConversationIds)
    };
  });
  const threadMap = new Map(cleanedThreads.map((thread) => [thread.id, thread]));
  const messages = (Array.isArray(input.messages) ? input.messages : [])
    .map((message, index) => normalizeMessage(message, index, threadMap))
    .filter((message) => threadMap.has(message.threadId));
  const settings = input.settings && typeof input.settings === "object"
    ? Object.fromEntries(Object.entries(input.settings).map(([userId, value]) => [userId, normalizeSettingsRecord(value)]))
    : {};
  const normalizedState = {
    version: 8,
    users: migratedUsers,
    threads: cleanedThreads,
    messages: messages.sort((left, right) => left.createdAt - right.createdAt),
    settings,
    drafts: input.drafts && typeof input.drafts === "object" ? input.drafts : {}
  };
  normalizedState.users
    .filter((user) => !isAssistantUser(user))
    .forEach((user) => seedAssistantConversation(normalizedState, user.id));
  normalizedState.messages.sort((left, right) => left.createdAt - right.createdAt);
  return normalizedState;
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
  return normalizeState({ version: 8, users, threads, messages, settings: {}, drafts: {} });
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
    thread = {
      id: uid("t-dm"),
      type: "direct",
      title: "",
      avatar: "",
      description: "",
      memberIds: [userId, parsed.targetId].sort(),
      admins: [userId],
      createdBy: userId,
      createdAt: Date.now(),
      archivedBy: [],
      clearedAtBy: {}
    };
    state.threads.push(thread);
    const owner = findUser(state, userId);
    if (owner) {
      owner.contactIds = uniqueStrings([...owner.contactIds, parsed.targetId]);
    }
  }
  return thread;
}

function getThreadClearTimestamp(thread, userId) {
  if (!thread || !thread.clearedAtBy || !userId) {
    return 0;
  }
  return Number.isFinite(thread.clearedAtBy[userId]) ? thread.clearedAtBy[userId] : 0;
}

function isMessageVisibleForUser(thread, userId, message) {
  return message.createdAt > getThreadClearTimestamp(thread, userId) && !message.hiddenFor.includes(userId);
}

function isAssistantUser(user) {
  return Boolean(user && user.kind === "assistant");
}

function normalizeAssistantText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function collectAssistantTopics(messageText, attachments) {
  const normalized = normalizeAssistantText(messageText);
  const topicIds = new Set();
  ASSISTANT_TOPIC_DEFINITIONS.forEach((topic) => {
    if (topic.patterns.some((pattern) => pattern.test(normalized))) {
      topicIds.add(topic.id);
    }
  });
  if (attachments?.audio?.length) {
    topicIds.add("audio");
  }
  if (attachments?.images?.length || attachments?.docs?.length) {
    topicIds.add("media");
  }
  return [...topicIds].map((topicId) => ASSISTANT_TOPIC_BY_ID[topicId]).filter(Boolean);
}

function collectAssistantContextTopics(state, threadId, userId, currentMessageId) {
  const collected = [];
  const seen = new Set();
  const history = state.messages
    .filter((item) => item.threadId === threadId && item.id !== currentMessageId)
    .slice(-8)
    .reverse();
  history.forEach((item) => {
    if (item.senderId !== userId) {
      return;
    }
    collectAssistantTopics(item.text, item.attachments).forEach((topic) => {
      if (!seen.has(topic.id)) {
        seen.add(topic.id);
        collected.push(topic);
      }
    });
  });
  return collected.slice(0, 2);
}

function buildAssistantSocialIntro(normalized, hasTopics) {
  if (/(^|\b)(oi|ola|opa|e ai|fala|salve|bom dia|boa tarde|boa noite)(\b|$)/.test(normalized)) {
    return hasTopics ? "Oi. Peguei seu ponto." : "Oi. Pode falar comigo de forma natural.";
  }
  if (/\b(valeu|obrigad|tmj|fechou|show|boa)\b/.test(normalized)) {
    return hasTopics ? "Boa. Vamos nessa." : "Boa. Se quiser continuar, eu acompanho o contexto.";
  }
  if (/\b(travou|travando|bugou|erro|lento|demora|ruim|nao foi|nao funciona|complicado)\b/.test(normalized)) {
    return "Entendi. Vamos por partes.";
  }
  if (/\b(tudo bem|como voce ta|como vc ta|ta ai|kkk|haha|rs|correria|cansado|cansada|sono|estressado|estressada)\b/.test(normalized)) {
    return hasTopics ? "Estou com voce." : "Estou por aqui. Posso conversar solto ou ir direto no ponto.";
  }
  return "";
}

function buildAssistantFallback(normalized, hasContextTopic) {
  if (!normalized) {
    return "Posso conversar de forma natural e tambem te orientar sobre grupos, contatos, mencoes com @, audio, privacidade, sincronizacao, mobile e atalhos do Atlas.";
  }
  if (/\b(explica melhor|detalha|aprofunda|continua|destrincha|passo a passo)\b/.test(normalized) && hasContextTopic) {
    return "Se quiser, eu detalho isso em passo a passo.";
  }
  if (/\b(ajuda|socorro|to perdido|estou perdido|me guia)\b/.test(normalized)) {
    return "Me fala do jeito que vier. Se misturar mais de um assunto, eu separo por partes e sigo com voce.";
  }
  return "Posso seguir em conversa natural tambem. Se voce misturar mais de um assunto, eu separo e respondo por partes.";
}

function buildAssistantReplyText(state, thread, userId, message) {
  const normalized = normalizeAssistantText(message?.text);
  const explicitTopics = collectAssistantTopics(message?.text, message?.attachments);
  const hasFollowUpTone = /\b(e no|e se|e isso|e essa|e esse|mas|tambem|outra coisa|nesse caso|continua|explica melhor|detalha|aprofunda)\b/.test(normalized);
  const contextTopics = explicitTopics.length ? [] : collectAssistantContextTopics(state, thread.id, userId, message?.id);
  const selectedTopics = explicitTopics.length ? explicitTopics.slice(0, 3) : (hasFollowUpTone ? contextTopics.slice(0, 2) : []);
  const intro = buildAssistantSocialIntro(normalized, selectedTopics.length > 0);
  if (selectedTopics.length > 1) {
    const topicLines = selectedTopics.map((topic) => `- ${topic.label}: ${topic.response}`);
    return [intro || "Peguei mais de um ponto aqui.", ...topicLines].filter(Boolean).join("\n");
  }
  if (selectedTopics.length === 1) {
    const prefix = hasFollowUpTone && !explicitTopics.length ? `Seguindo no assunto de ${selectedTopics[0].label}:` : "";
    return [intro, prefix, selectedTopics[0].response].filter(Boolean).join(" ");
  }
  return [intro, buildAssistantFallback(normalized, contextTopics.length > 0)].filter(Boolean).join(" ");
}

function seedAssistantConversation(state, userId) {
  const assistant = findUser(state, ASSISTANT_USER_ID);
  const user = findUser(state, userId);
  if (!assistant || !user) {
    return null;
  }
  user.contactIds = uniqueStrings([...user.contactIds, ASSISTANT_USER_ID]);
  let thread = getDirectThreadBetween(state, userId, ASSISTANT_USER_ID);
  if (!thread) {
    thread = normalizeThread({
      id: uid("t-dm"),
      type: "direct",
      title: "",
      avatar: "",
      description: "",
      memberIds: [userId, ASSISTANT_USER_ID],
      admins: [userId],
      createdBy: ASSISTANT_USER_ID,
      createdAt: Date.now(),
      archivedBy: [],
      clearedAtBy: {}
    }, state.threads.length);
    state.threads.push(thread);
  }
  if (!state.messages.some((message) => message.threadId === thread.id)) {
    const threadMap = new Map(state.threads.map((item) => [item.id, item]));
    const receipts = { [ASSISTANT_USER_ID]: "read", [userId]: "read" };
    state.messages.push(normalizeMessage({
      id: uid("m"),
      threadId: thread.id,
      senderId: ASSISTANT_USER_ID,
      text: `Oi, ${user.name}. Eu sou a IA do Atlas e posso conversar com voce de forma natural enquanto te ajudo no sistema.`,
      createdAt: Date.now() - 1000,
      editedAt: null,
      replyTo: null,
      attachments: { images: [], docs: [], audio: [] },
      pinnedBy: [],
      favoriteBy: [],
      reactions: {},
      receipts
    }, state.messages.length, threadMap));
    state.messages.push(normalizeMessage({
      id: uid("m"),
      threadId: thread.id,
      senderId: ASSISTANT_USER_ID,
      text: "Se voce mandar mais de um assunto na mesma mensagem, eu separo e respondo por partes. Nao precisa falar em formato tecnico.",
      createdAt: Date.now(),
      editedAt: null,
      replyTo: null,
      attachments: { images: [], docs: [], audio: [] },
      pinnedBy: [],
      favoriteBy: [],
      reactions: {},
      receipts
    }, state.messages.length + 1, threadMap));
    state.messages.push(normalizeMessage({
      id: uid("m"),
      threadId: thread.id,
      senderId: ASSISTANT_USER_ID,
      text: "Eu consigo te ajudar com grupos, contatos, mencoes, audio, camera, mobile, sincronizacao, privacidade e tambem acompanhar conversas paralelas sem perder o contexto.",
      createdAt: Date.now() + 1,
      editedAt: null,
      replyTo: null,
      attachments: { images: [], docs: [], audio: [] },
      pinnedBy: [],
      favoriteBy: [],
      reactions: {},
      receipts
    }, state.messages.length + 2, threadMap));
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
  const viewerPrivacy = ensureSettingsRecord(state, viewerId).privacy[key];
  const targetPrivacy = ensureSettingsRecord(state, targetUserId).privacy[key];
  return viewerPrivacy !== "nobody" && targetPrivacy !== "nobody";
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
  const thread = findThread(state, threadId);
  if (!thread) {
    return 0;
  }
  return state.messages.filter((message) =>
    message.threadId === threadId
    && message.kind !== "system"
    && isMessageVisibleForUser(thread, userId, message)
    && message.senderId !== userId
    && message.receipts[userId] !== "read"
  ).length;
}

function getUnreadMentionCountForThread(state, userId, threadId) {
  const thread = findThread(state, threadId);
  if (!thread) {
    return 0;
  }
  return state.messages.filter((message) =>
    message.threadId === threadId
    && isMessageVisibleForUser(thread, userId, message)
    && message.senderId !== userId
    && message.receipts[userId] !== "read"
    && Array.isArray(message.mentions)
    && message.mentions.includes(userId)
  ).length;
}

function getLastMessageForThread(state, threadId, userId = null) {
  const thread = findThread(state, threadId);
  if (!thread) {
    return null;
  }
  const items = state.messages.filter((message) => message.threadId === threadId && (!userId || isMessageVisibleForUser(thread, userId, message)));
  return items.length ? items[items.length - 1] : null;
}

function buildDirectEntry(state, userId, otherUser) {
  const owner = findUser(state, userId);
  const thread = getDirectThreadBetween(state, userId, otherUser.id);
  const conversationId = buildConversationId("direct", otherUser.id);
  const lastMessage = thread ? getLastMessageForThread(state, thread.id, userId) : null;
  const unreadMentionCount = thread ? getUnreadMentionCountForThread(state, userId, thread.id) : 0;
  const edit = getContactEdit(state, userId, otherUser.id);
  const canSeeProfilePhoto = canViewerSeePrivacy(state, userId, otherUser.id, "profilePhoto");
  const canSeeLastSeen = canViewerSeePrivacy(state, userId, otherUser.id, "lastSeen");
  const presence = canSeeLastSeen ? getUserPresence(state, otherUser.id) : "private";
  return {
    id: conversationId,
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
    mentionCount: unreadMentionCount,
    hasUnreadMention: unreadMentionCount > 0,
    isRemote: Boolean(thread?.remote),
    timestamp: lastMessage?.createdAt || thread?.createdAt || 0,
    isArchived: Boolean(thread?.archivedBy.includes(userId)),
    isPinnedConversation: Boolean(owner?.pinnedConversationIds.includes(conversationId))
  };
}

function buildGroupEntry(state, userId, thread) {
  const owner = findUser(state, userId);
  const conversationId = buildConversationId("group", thread.id);
  const lastMessage = getLastMessageForThread(state, thread.id, userId);
  const unreadMentionCount = getUnreadMentionCountForThread(state, userId, thread.id);
  return {
    id: conversationId,
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
    mentionCount: unreadMentionCount,
    hasUnreadMention: unreadMentionCount > 0,
    isRemote: Boolean(thread.remote),
    timestamp: lastMessage?.createdAt || thread.createdAt,
    isArchived: thread.archivedBy.includes(userId),
    isPinnedConversation: Boolean(owner?.pinnedConversationIds.includes(conversationId))
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

function toTimestamp(value, fallback = 0) {
  if (Number.isFinite(Number(value))) {
    return Number(value);
  }
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildRemoteUserRecord(existingUser, profile) {
  const name = String(profile?.name || existingUser?.name || "Conta");
  const username = sanitizeUsername(String(profile?.username || existingUser?.username || "user"));
  return normalizeUser({
    id: String(profile?.id || existingUser?.id || uid("u")),
    name,
    username,
    email: String(existingUser?.email || `${username || "user"}@atlas.local`).toLowerCase(),
    password: String(existingUser?.password || "__supabase__"),
    avatar: buildInitials(name),
    photo: typeof profile?.avatarUrl === "string" ? profile.avatarUrl : (existingUser?.photo || ""),
    bio: String(profile?.bio || existingUser?.bio || "Member"),
    kind: "user",
    lastSeenAt: toTimestamp(profile?.lastSeenAt, existingUser?.lastSeenAt || Date.now()),
    contactIds: existingUser?.contactIds || [],
    pinnedConversationIds: existingUser?.pinnedConversationIds || [],
    contactEdits: existingUser?.contactEdits || {}
  }, 0);
}

function mapRemoteAttachmentsToLocal(message) {
  const attachments = { images: [], docs: [], audio: [] };
  const audioMeta = message?.metadata?.audio && typeof message.metadata.audio === "object" ? message.metadata.audio : {};
  (Array.isArray(message?.attachments) ? message.attachments : []).forEach((attachment) => {
    if (attachment.type === "image") {
      attachments.images.push(attachment.public_url);
      return;
    }
    if (attachment.type === "document") {
      attachments.docs.push({
        name: attachment.file_name || "Documento",
        url: attachment.public_url
      });
      return;
    }
    if (attachment.type === "audio") {
      const meta = audioMeta[attachment.file_name] && typeof audioMeta[attachment.file_name] === "object"
        ? audioMeta[attachment.file_name]
        : (audioMeta.default && typeof audioMeta.default === "object" ? audioMeta.default : {});
      attachments.audio.push({
        url: attachment.public_url,
        previewUrl: attachment.public_url,
        mimeType: meta.mimeType || "",
        duration: Number.isFinite(Number(meta.duration)) ? Number(meta.duration) : 0,
        waveform: Array.isArray(meta.waveform) ? meta.waveform : []
      });
    }
  });
  return attachments;
}

function mapRemoteReactionsToLocal(message) {
  return (Array.isArray(message?.reactions) ? message.reactions : []).reduce((result, reaction) => {
    const token = String(reaction.emoji || "").trim();
    if (!token) {
      return result;
    }
    if (!result[token]) {
      result[token] = [];
    }
    result[token].push(reaction.user_id);
    return result;
  }, {});
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
  if (existing && existing.version === 8) {
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
  return readPersistedValue(SESSION_KEY);
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

export function upsertRemoteSessionUser(profile, authUser = null) {
  return withState((state) => {
    if (!profile?.id) {
      return { ok: false, error: "Perfil remoto ausente" };
    }
    const email = String(authUser?.email || profile.email || `${profile.username || "user"}@atlas.local`).trim().toLowerCase();
    const nextPayload = {
      id: profile.id,
      name: String(profile.name || authUser?.user_metadata?.name || "Conta"),
      username: String(profile.username || authUser?.user_metadata?.username || email.split("@")[0] || "user"),
      email,
      password: "__supabase__",
      avatar: buildInitials(profile.name || authUser?.user_metadata?.name || "Conta"),
      photo: typeof profile.avatarUrl === "string" ? profile.avatarUrl : "",
      bio: String(profile.bio || "Member"),
      kind: "user",
      lastSeenAt: Date.now(),
      contactIds: [ASSISTANT_USER_ID],
      pinnedConversationIds: [],
      contactEdits: {}
    };
    const currentIndex = state.users.findIndex((user) => user.id === profile.id);
    if (currentIndex >= 0) {
      const current = state.users[currentIndex];
      state.users[currentIndex] = normalizeUser({
        ...current,
        ...nextPayload,
        contactIds: uniqueStrings([...(current.contactIds || []), ASSISTANT_USER_ID]),
        pinnedConversationIds: current.pinnedConversationIds || [],
        contactEdits: current.contactEdits || {}
      }, currentIndex);
    } else {
      state.users.push(normalizeUser(nextPayload, state.users.length));
    }
    const currentSettings = ensureSettingsRecord(state, profile.id);
    state.settings[profile.id] = normalizeSettingsRecord({
      ...currentSettings,
      ...(profile.settings && typeof profile.settings === "object" ? profile.settings : {}),
      privacy: {
        ...currentSettings.privacy,
        ...(profile.privacy && typeof profile.privacy === "object" ? profile.privacy : {})
      }
    });
    ensureDraftRecord(state, profile.id);
    seedAssistantConversation(state, profile.id);
    writePersistedValue(SESSION_KEY, profile.id);
    return { ok: true, user: findUser(state, profile.id) };
  });
}

export function applyRemoteChatSnapshot(userId, snapshot) {
  return withState((state) => {
    const currentUser = findUser(state, userId);
    if (!currentUser) {
      return { ok: false, error: "Sessao local ausente" };
    }

    const contactRows = Array.isArray(snapshot?.contacts) ? snapshot.contacts : [];
    const conversationRows = Array.isArray(snapshot?.conversations) ? snapshot.conversations : [];
    const membersByConversation = snapshot?.membersByConversation && typeof snapshot.membersByConversation === "object"
      ? snapshot.membersByConversation
      : {};
    const messagesByConversation = snapshot?.messagesByConversation && typeof snapshot.messagesByConversation === "object"
      ? snapshot.messagesByConversation
      : {};
    const favoriteMessageIds = new Set(Array.isArray(snapshot?.favoriteMessageIds) ? snapshot.favoriteMessageIds : []);
    const hiddenMessageIds = new Set(Array.isArray(snapshot?.hiddenMessageIds) ? snapshot.hiddenMessageIds : []);
    const pinnedMessageIdsByConversation = snapshot?.pinnedMessageIdsByConversation && typeof snapshot.pinnedMessageIdsByConversation === "object"
      ? snapshot.pinnedMessageIdsByConversation
      : {};

    const preservedAssistantUsers = state.users.filter((user) => isAssistantUser(user));
    const preservedAssistantThreads = state.threads.filter((thread) => thread.memberIds.includes(userId) && thread.memberIds.includes(ASSISTANT_USER_ID));
    const preservedAssistantThreadIds = new Set(preservedAssistantThreads.map((thread) => thread.id));
    const preservedAssistantMessages = state.messages.filter((message) => preservedAssistantThreadIds.has(message.threadId));

    const remoteUsers = new Map();
    const ensureRemoteUser = (profile) => {
      if (!profile?.id) {
        return null;
      }
      const existing = remoteUsers.get(profile.id) || state.users.find((user) => user.id === profile.id) || null;
      const nextUser = buildRemoteUserRecord(existing, profile);
      remoteUsers.set(nextUser.id, nextUser);
      return nextUser;
    };

    ensureRemoteUser({
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      bio: currentUser.bio,
      avatarUrl: currentUser.photo,
      lastSeenAt: currentUser.lastSeenAt
    });

    contactRows.forEach((contact) => {
      if (contact?.profile) {
        ensureRemoteUser(contact.profile);
      }
    });
    Object.values(membersByConversation).forEach((members) => {
      (Array.isArray(members) ? members : []).forEach((member) => {
        if (member?.profile) {
          ensureRemoteUser(member.profile);
        }
      });
    });

    const nextCurrentUser = remoteUsers.get(userId) || buildRemoteUserRecord(currentUser, currentUser);
    nextCurrentUser.contactIds = uniqueStrings([
      ASSISTANT_USER_ID,
      ...contactRows.map((contact) => contact.contactUserId)
    ]);
    nextCurrentUser.contactEdits = Object.fromEntries(
      contactRows
        .filter((contact) => contact.contactUserId)
        .map((contact) => [
          contact.contactUserId,
          {
            nickname: String(contact.nickname || ""),
            label: String(contact.label || "")
          }
        ])
    );
    remoteUsers.set(userId, nextCurrentUser);

    const remoteThreads = conversationRows
      .map((membership, index) => {
        const conversation = membership?.conversation;
        if (!conversation?.id) {
          return null;
        }
        const members = Array.isArray(membersByConversation[conversation.id]) ? membersByConversation[conversation.id] : [];
        return normalizeThread({
          id: conversation.id,
          type: conversation.type,
          remote: true,
          title: conversation.title || "",
          avatar: conversation.type === "group" ? buildInitials(conversation.title || "Grupo") : "",
          photo: conversation.photoUrl || "",
          description: conversation.description || "",
          memberIds: members.map((member) => member.userId),
          admins: members.filter((member) => member.role === "admin").map((member) => member.userId),
          createdBy: conversation.createdBy || members.find((member) => member.role === "admin")?.userId || userId,
          createdAt: toTimestamp(conversation.createdAt, Date.now()),
          archivedBy: membership.archivedAt ? [userId] : [],
          clearedAtBy: membership.clearedAt ? { [userId]: toTimestamp(membership.clearedAt, 0) } : {}
        }, index);
      })
      .filter(Boolean);

    const remoteMessages = [];
    remoteThreads.forEach((thread) => {
      const members = Array.isArray(membersByConversation[thread.id]) ? membersByConversation[thread.id] : [];
      const lastReadByUser = Object.fromEntries(members.map((member) => [member.userId, toTimestamp(member.lastReadAt, 0)]));
      const pinnedMessageId = pinnedMessageIdsByConversation[thread.id] || "";
      const remoteConversationMessages = Array.isArray(messagesByConversation[thread.id]) ? messagesByConversation[thread.id] : [];
      remoteConversationMessages.forEach((message, index) => {
        const createdAt = toTimestamp(message.createdAt, Date.now());
        const receipts = Object.fromEntries(thread.memberIds.map((memberId) => {
          if (memberId === message.senderId) {
            return [memberId, "read"];
          }
          return [memberId, lastReadByUser[memberId] && createdAt <= lastReadByUser[memberId] ? "read" : "delivered"];
        }));
        remoteMessages.push(normalizeMessage({
          id: message.id,
          threadId: thread.id,
          senderId: message.senderId,
          kind: message.kind || "message",
          text: message.text || "",
          createdAt,
          editedAt: message.editedAt ? toTimestamp(message.editedAt, 0) : null,
          replyTo: message.replyTo || null,
          attachments: mapRemoteAttachmentsToLocal(message),
          pinnedBy: pinnedMessageId === message.id ? [userId] : [],
          favoriteBy: favoriteMessageIds.has(message.id) ? [userId] : [],
          hiddenFor: hiddenMessageIds.has(message.id) ? [userId] : [],
          mentions: (Array.isArray(message.mentions) ? message.mentions : []).map((mention) => mention.user_id).filter(Boolean),
          reactions: mapRemoteReactionsToLocal(message),
          receipts
        }, index, new Map([[thread.id, thread]])));
      });
    });

    state.users = [...preservedAssistantUsers, ...remoteUsers.values()]
      .filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index);
    state.threads = [...remoteThreads, ...preservedAssistantThreads];
    state.messages = [...remoteMessages, ...preservedAssistantMessages].sort((left, right) => left.createdAt - right.createdAt);
    ensureSettingsRecord(state, userId);
    ensureDraftRecord(state, userId);
    seedAssistantConversation(state, userId);
    return {
      ok: true,
      users: state.users.length,
      threads: state.threads.length,
      messages: state.messages.length
    };
  });
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
  writePersistedValue(SESSION_KEY, user.id);
  markAllDeliveredForUser(user.id);
  return { ok: true, user };
}

export function registerUser(payload) {
  return withState((state) => {
    const name = String(payload.name || "").trim();
    const rawUsername = String(payload.username || "").trim();
    const username = sanitizeUsername(rawUsername);
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "").trim();
    if (!name || !rawUsername || !email || !password) {
      return { ok: false, error: "Preencha todos os campos" };
    }
    if (rawUsername !== username || !isValidUsername(username)) {
      return { ok: false, error: "Usuario sem acentos ou espacos. Use ao menos 3 caracteres: letras, numeros, . _ -" };
    }
    if (state.users.some((user) => user.username === username)) {
      return { ok: false, error: "Username ja existe" };
    }
    if (state.users.some((user) => user.email === email)) {
      return { ok: false, error: "Email ja existe" };
    }
    const user = normalizeUser({
      id: uid("u"),
      name,
      username,
      email,
      password,
      avatar: buildInitials(name),
      bio: payload.bio || "Member",
      kind: "user",
      lastSeenAt: Date.now(),
      contactIds: [ASSISTANT_USER_ID],
      pinnedConversationIds: [],
      contactEdits: {}
    }, state.users.length);
    state.users.push(user);
    seedAssistantConversation(state, user.id);
    ensureSettingsRecord(state, user.id);
    ensureDraftRecord(state, user.id);
    writePersistedValue(SESSION_KEY, user.id);
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
  removePersistedValue(SESSION_KEY);
}
export function getSettings(userId) {
  const state = readState();
  if (!state || !userId) {
    return normalizeSettingsRecord();
  }
  return normalizeSettingsRecord(ensureSettingsRecord(state, userId));
}

export function getDefaultSettings() {
  return normalizeSettingsRecord();
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
    root.setProperty("--input-bg", "rgba(11, 22, 38, 0.05)");
    root.setProperty("--card-bg", "rgba(255, 255, 255, 0.78)");
    root.setProperty("--card-bg-strong", "rgba(255, 255, 255, 0.9)");
    root.setProperty("--header-shell", "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.92))");
    root.setProperty("--composer-shell", "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(245, 249, 255, 0.98))");
    root.setProperty("--composer-shadow", "0 -10px 24px rgba(11, 22, 38, 0.08)");
    root.setProperty("--message-card-bg", "rgba(255, 255, 255, 0.88)");
    root.setProperty("--message-card-shadow", "0 12px 32px rgba(22, 36, 60, 0.08)");
    root.setProperty("--message-own-bg", "linear-gradient(135deg, rgba(53, 194, 255, 0.16), rgba(69, 224, 177, 0.12))");
    root.setProperty("--message-own-border", "rgba(53, 194, 255, 0.18)");
    root.setProperty("--message-text-shadow", "0 1px 0 rgba(255, 255, 255, 0.55)");
    root.setProperty("--toast-bg", "rgba(255, 255, 255, 0.98)");
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
    root.setProperty("--input-bg", "rgba(0, 0, 0, 0.2)");
    root.setProperty("--card-bg", "rgba(255, 255, 255, 0.04)");
    root.setProperty("--card-bg-strong", "rgba(255, 255, 255, 0.07)");
    root.setProperty("--header-shell", "linear-gradient(180deg, rgba(8, 18, 32, 0.98), rgba(8, 18, 32, 0.82))");
    root.setProperty("--composer-shell", "linear-gradient(180deg, rgba(8, 18, 32, 0.78), rgba(8, 18, 32, 0.95))");
    root.setProperty("--composer-shadow", "0 -10px 24px rgba(0, 0, 0, 0.18)");
    root.setProperty("--message-card-bg", "rgba(255, 255, 255, 0.07)");
    root.setProperty("--message-card-shadow", "0 10px 30px rgba(0, 0, 0, 0.16)");
    root.setProperty("--message-own-bg", "linear-gradient(135deg, rgba(53, 194, 255, 0.22), rgba(69, 224, 177, 0.16))");
    root.setProperty("--message-own-border", "rgba(53, 194, 255, 0.2)");
    root.setProperty("--message-text-shadow", "0 1px 0 rgba(0, 0, 0, 0.24)");
    root.setProperty("--toast-bg", "rgba(8, 18, 32, 0.96)");
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
  const bubbleWidthMap = {
    xs: "min(520px, 66%)",
    sm: "min(620px, 72%)",
    md: "min(760px, 78%)",
    lg: "min(900px, 82%)",
    xl: "min(1040px, 86%)"
  };
  const bubbleMinWidthMap = {
    xs: "220px",
    sm: "280px",
    md: "340px",
    lg: "420px",
    xl: "500px"
  };
  const bubbleImageWidthMap = {
    xs: "240px",
    sm: "280px",
    md: "320px",
    lg: "360px",
    xl: "420px"
  };
  const bubbleImageHeightMap = {
    xs: "172px",
    sm: "200px",
    md: "228px",
    lg: "258px",
    xl: "300px"
  };
  const audioCardWidthMap = {
    xs: "240px",
    sm: "280px",
    md: "330px",
    lg: "380px",
    xl: "440px"
  };
  root.setProperty("--font-scale", scaleMap[theme.fontScale] || "1");
  root.setProperty("--message-bubble-width", bubbleWidthMap[theme.bubbleSize] || bubbleWidthMap.sm);
  root.setProperty("--message-bubble-min-width", bubbleMinWidthMap[theme.bubbleSize] || bubbleMinWidthMap.sm);
  root.setProperty("--message-image-width", bubbleImageWidthMap[theme.bubbleSize] || bubbleImageWidthMap.sm);
  root.setProperty("--message-image-height", bubbleImageHeightMap[theme.bubbleSize] || bubbleImageHeightMap.sm);
  root.setProperty("--audio-card-width", audioCardWidthMap[theme.bubbleSize] || audioCardWidthMap.sm);

  document.body.classList.toggle("compact-ui", theme.compactMode);
  document.body.classList.toggle("hide-avatars", !theme.showAvatars);
  document.body.classList.toggle("blur-media", theme.blurMedia);
  document.body.classList.toggle("wide-bubbles", ["lg", "xl"].includes(theme.bubbleSize));
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
  const viewer = findUser(state, userId);
  if (!viewer) {
    return [];
  }
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const directUserIds = new Set(viewer.contactIds);
  state.threads
    .filter((thread) => thread.type === "direct" && thread.memberIds.includes(userId))
    .forEach((thread) => {
      const otherId = thread.memberIds.find((memberId) => memberId !== userId);
      if (otherId) {
        directUserIds.add(otherId);
      }
    });
  const directEntries = [...directUserIds]
    .map((otherUserId) => findUser(state, otherUserId))
    .filter((user) => user && user.id !== userId)
    .map((user) => buildDirectEntry(state, userId, user));
  const groupEntries = state.threads
    .filter((thread) => thread.type === "group" && thread.memberIds.includes(userId))
    .map((thread) => buildGroupEntry(state, userId, thread));
  return [...directEntries, ...groupEntries]
    .filter((entry) => {
      const matchesFilter = filter === "direct"
        ? entry.type === "direct" && !entry.isArchived
        : filter === "group"
          ? entry.type === "group" && !entry.isArchived
          : filter === "archived"
            ? entry.isArchived
            : !entry.isArchived;
      if (!matchesFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = `${entry.title} ${entry.subtitle}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((left, right) => {
      if (left.hasUnreadMention !== right.hasUnreadMention) {
        return left.hasUnreadMention ? -1 : 1;
      }
      if (left.isPinnedConversation !== right.isPinnedConversation) {
        return left.isPinnedConversation ? -1 : 1;
      }
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
  const owner = findUser(state, userId);
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
      presence,
      isRemote: Boolean(thread?.remote),
      isArchived: Boolean(thread?.archivedBy.includes(userId)),
      isPinnedConversation: Boolean(owner?.pinnedConversationIds.includes(conversationId))
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
    presence: "group",
    isRemote: Boolean(thread.remote),
    isArchived: thread.archivedBy.includes(userId),
    isPinnedConversation: Boolean(owner?.pinnedConversationIds.includes(conversationId))
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
    .filter((message) => message.threadId === thread.id && isMessageVisibleForUser(thread, userId, message))
    .map((message) => ({
      ...message,
      sender: findUser(state, message.senderId),
      thread,
      isRemote: Boolean(thread.remote),
      isPinned: message.pinnedBy.includes(userId),
      isFavorite: message.favoriteBy.includes(userId),
      mentionsCurrentUser: Array.isArray(message.mentions) && message.mentions.includes(userId),
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
      if (!thread || !thread.memberIds.includes(userId) || !isMessageVisibleForUser(thread, userId, message) || message.senderId === userId) {
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
      if (message.threadId === thread.id && isMessageVisibleForUser(thread, userId, message) && message.senderId !== userId) {
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
    const threadMap = new Map(state.threads.map((item) => [item.id, item]));
    const mentions = extractMentionedUserIds(state, thread, userId, payload.text || "");
    thread.archivedBy = thread.archivedBy.filter((memberId) => memberId !== userId && !mentions.includes(memberId));
    const receipts = Object.fromEntries(thread.memberIds.map((memberId) => [memberId, memberId === userId ? "read" : "sent"]));
    const message = normalizeMessage({
      id: uid("m"),
      threadId: thread.id,
      senderId: userId,
      text: payload.text || "",
      createdAt: Date.now(),
      editedAt: null,
      replyTo: payload.replyTo || null,
      attachments: normalizeAttachments(payload.attachments),
      pinnedBy: payload.pinned ? [userId] : [],
      favoriteBy: payload.favorite ? [userId] : [],
      mentions,
      reactions: {},
      receipts
    }, state.messages.length, threadMap);
    state.messages.push(message);

    const assistantId = thread.type === "direct" ? thread.memberIds.find((memberId) => memberId !== userId) : null;
    const assistantUser = assistantId ? findUser(state, assistantId) : null;
    if (isAssistantUser(assistantUser)) {
      const assistantReceipts = { [assistantId]: "read", [userId]: "read" };
      const assistantReply = normalizeMessage({
        id: uid("m"),
        threadId: thread.id,
        senderId: assistantId,
        text: buildAssistantReplyText(state, thread, userId, message),
        createdAt: Date.now() + 1,
        editedAt: null,
        replyTo: message.id,
        attachments: { images: [], docs: [], audio: [] },
        pinnedBy: [],
        favoriteBy: [],
        reactions: {},
        receipts: assistantReceipts
      }, state.messages.length + 1, threadMap);
      state.messages.push(assistantReply);
      touchUser(state, assistantId);
    }

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
    const thread = findThread(state, message.threadId);
    message.text = String(nextText || "").trim();
    message.mentions = extractMentionedUserIds(state, thread, userId, message.text);
    message.editedAt = Date.now();
    return true;
  });
}

export function deleteMessage(userId, messageId, mode = "everyone") {
  return withState((state) => {
    const index = state.messages.findIndex((item) => item.id === messageId);
    if (index === -1) {
      return false;
    }
    const message = state.messages[index];
    if (mode === "self") {
      if (!message.hiddenFor.includes(userId)) {
        message.hiddenFor.push(userId);
      }
      return true;
    }
    if (message.senderId !== userId) {
      return false;
    }
    state.messages.splice(index, 1);
    return true;
  });
}

export function deleteMessages(userId, messageIds, mode = "self") {
  return withState((state) => {
    const ids = uniqueStrings(messageIds);
    if (!ids.length) {
      return false;
    }
    if (mode === "everyone") {
      const removableIds = new Set(
        state.messages
          .filter((message) => ids.includes(message.id) && message.senderId === userId)
          .map((message) => message.id)
      );
      if (!removableIds.size) {
        return false;
      }
      state.messages = state.messages.filter((message) => !removableIds.has(message.id));
      return true;
    }
    let changed = false;
    state.messages.forEach((message) => {
      if (!ids.includes(message.id)) {
        return;
      }
      if (!message.hiddenFor.includes(userId)) {
        message.hiddenFor.push(userId);
        changed = true;
      }
    });
    return changed;
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

export function setFavoriteMessages(userId, messageIds, favorite = true) {
  return withState((state) => {
    const ids = new Set(uniqueStrings(messageIds));
    let changed = false;
    state.messages.forEach((message) => {
      if (!ids.has(message.id)) {
        return;
      }
      const alreadyFavorite = message.favoriteBy.includes(userId);
      if (favorite && !alreadyFavorite) {
        message.favoriteBy.push(userId);
        changed = true;
      }
      if (!favorite && alreadyFavorite) {
        message.favoriteBy = message.favoriteBy.filter((value) => value !== userId);
        changed = true;
      }
    });
    return changed;
  });
}

export function toggleConversationPinned(userId, conversationId) {
  return withState((state) => {
    const owner = findUser(state, userId);
    if (!owner) {
      return false;
    }
    const parsed = parseConversationId(conversationId);
    const accessible = parsed.type === "group"
      ? Boolean(resolveThreadFromConversation(state, userId, conversationId, false))
      : Boolean(findUser(state, parsed.targetId));
    if (!accessible) {
      return false;
    }
    const wasPinned = owner.pinnedConversationIds.includes(conversationId);
    owner.pinnedConversationIds = owner.pinnedConversationIds.filter((value) => value !== conversationId);
    if (!wasPinned) {
      owner.pinnedConversationIds.unshift(conversationId);
    }
    return !wasPinned;
  });
}

export function toggleConversationArchived(userId, conversationId) {
  return withState((state) => {
    const thread = resolveThreadFromConversation(state, userId, conversationId, false);
    if (!thread) {
      return false;
    }
    if (thread.archivedBy.includes(userId)) {
      thread.archivedBy = thread.archivedBy.filter((value) => value !== userId);
      return false;
    }
    thread.archivedBy.push(userId);
    return true;
  });
}

export function clearConversationHistory(userId, conversationId) {
  return withState((state) => {
    const thread = resolveThreadFromConversation(state, userId, conversationId, false);
    if (!thread) {
      return false;
    }
    thread.clearedAtBy = {
      ...(thread.clearedAtBy || {}),
      [userId]: Date.now()
    };
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
    .filter((message) => {
      const thread = findThread(state, message.threadId);
      return thread && isMessageVisibleForUser(thread, userId, message) && message.pinnedBy.includes(userId);
    })
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
    .filter((message) => message.threadId === thread.id && isMessageVisibleForUser(thread, userId, message) && message.pinnedBy.includes(userId))
    .sort((left, right) => right.createdAt - left.createdAt)[0];
  return pinned ? { ...pinned, thread, sender: findUser(state, pinned.senderId) } : null;
}

export function getFavoriteMessagesForUser(userId) {
  const state = readState();
  if (!state) {
    return [];
  }
  return state.messages
    .filter((message) => {
      const thread = findThread(state, message.threadId);
      return thread && isMessageVisibleForUser(thread, userId, message) && message.favoriteBy.includes(userId);
    })
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
  return state.messages
    .filter((message) => {
      const thread = findThread(state, message.threadId);
      return thread && allowedThreadIds.has(message.threadId) && isMessageVisibleForUser(thread, userId, message);
    })
    .filter((message) => message.text.toLowerCase().includes(normalized))
    .map((message) => ({ ...message, thread: findThread(state, message.threadId), sender: findUser(state, message.senderId) }))
    .sort((left, right) => right.createdAt - left.createdAt);
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
    const actor = findUser(state, userId);
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
    appendSystemMessage(state, thread, userId, `${actor?.name || "Conta"} criou o grupo.`);
    return { ok: true, thread };
  });
}

export function updateGroup(userId, threadId, patch) {
  return withState((state) => {
    const thread = findThread(state, threadId);
    if (!thread || thread.type !== "group" || !thread.admins.includes(userId)) {
      return { ok: false, error: "Sem permissao" };
    }
    const actor = findUser(state, userId);
    const previousTitle = thread.title;
    let hasVisualChange = false;
    if (typeof patch.title === "string") {
      const nextTitle = patch.title.trim() || thread.title;
      if (nextTitle !== thread.title) {
        hasVisualChange = true;
      }
      thread.title = nextTitle;
      if (!patch.avatar && (!thread.avatar || thread.avatar === buildInitials(previousTitle))) {
        thread.avatar = buildInitials(nextTitle);
      }
    }
    if (typeof patch.description === "string") {
      const nextDescription = patch.description.trim();
      if (nextDescription !== thread.description) {
        hasVisualChange = true;
      }
      thread.description = nextDescription;
    }
    if (typeof patch.avatar === "string") {
      const nextAvatar = patch.avatar.trim().slice(0, 2).toUpperCase();
      if (nextAvatar !== thread.avatar) {
        hasVisualChange = true;
      }
      thread.avatar = nextAvatar;
    }
    if (patch.clearPhoto) {
      if (thread.photo) {
        hasVisualChange = true;
      }
      thread.photo = "";
    }
    if (typeof patch.photo === "string") {
      if (patch.photo !== thread.photo) {
        hasVisualChange = true;
      }
      thread.photo = patch.photo;
    }
    if (hasVisualChange) {
      appendSystemMessage(state, thread, userId, `${actor?.name || "Conta"} atualizou as informacoes do grupo.`);
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
    const actor = findUser(state, userId);
    const currentMembers = new Set(thread.memberIds);
    const validIds = memberIds.filter((memberId) => findUser(state, memberId));
    const addedIds = validIds.filter((memberId) => !currentMembers.has(memberId));
    thread.memberIds = [...new Set([...thread.memberIds, ...validIds])];
    if (addedIds.length) {
      const names = addedIds
        .map((memberId) => findUser(state, memberId)?.name)
        .filter(Boolean)
        .join(", ");
      appendSystemMessage(state, thread, userId, `${actor?.name || "Conta"} adicionou ${names} ao grupo.`);
    }
    return { ok: true, thread };
  });
}

export function toggleGroupAdmin(userId, threadId, targetUserId) {
  return withState((state) => {
    const thread = findThread(state, threadId);
    if (!thread || thread.type !== "group" || !thread.admins.includes(userId) || !thread.memberIds.includes(targetUserId)) {
      return { ok: false, error: "Sem permissao" };
    }
    const actor = findUser(state, userId);
    const target = findUser(state, targetUserId);
    if (thread.admins.includes(targetUserId)) {
      if (thread.admins.length === 1) {
        return { ok: false, error: "O grupo precisa de pelo menos um admin" };
      }
      thread.admins = thread.admins.filter((adminId) => adminId !== targetUserId);
      appendSystemMessage(state, thread, userId, `${actor?.name || "Conta"} removeu ${target?.name || "um membro"} da administracao do grupo.`);
    } else {
      thread.admins.push(targetUserId);
      appendSystemMessage(state, thread, userId, `${actor?.name || "Conta"} promoveu ${target?.name || "um membro"} para admin.`);
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
    const actor = findUser(state, userId);
    const target = findUser(state, targetUserId);
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
    const updateText = userId === targetUserId
      ? `${target?.name || "Um membro"} saiu do grupo.`
      : `${actor?.name || "Conta"} removeu ${target?.name || "um membro"} do grupo.`;
    appendSystemMessage(state, thread, userId, updateText);
    return { ok: true, thread };
  });
}

export function listUsersForPicker(userId, excludeIds = []) {
  const state = readState();
  if (!state) {
    return [];
  }
  const excluded = new Set([userId, ...excludeIds]);
  return state.users.filter((user) => !excluded.has(user.id) && !isAssistantUser(user));
}

export function searchUsersByUsername(userId, query = "") {
  const state = readState();
  if (!state) {
    return [];
  }
  const owner = findUser(state, userId);
  if (!owner) {
    return [];
  }
  const normalized = sanitizeUsername(query);
  if (!normalized) {
    return [];
  }
  const existingContacts = new Set(owner.contactIds);
  return state.users
    .filter((user) => user.id !== userId && !isAssistantUser(user) && !existingContacts.has(user.id))
    .filter((user) => user.username.includes(normalized))
    .sort((left, right) => {
      const leftStarts = left.username.startsWith(normalized) ? 0 : 1;
      const rightStarts = right.username.startsWith(normalized) ? 0 : 1;
      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts;
      }
      return left.username.localeCompare(right.username);
    });
}

export function addContact(userId, targetUserId) {
  return withState((state) => {
    const owner = findUser(state, userId);
    const target = findUser(state, targetUserId);
    if (!owner || !target) {
      return { ok: false, error: "Contato nao encontrado" };
    }
    if (target.id === userId) {
      return { ok: false, error: "Nao e possivel adicionar a propria conta" };
    }
    if (owner.contactIds.includes(target.id)) {
      return { ok: false, error: "Esse contato ja foi adicionado" };
    }
    owner.contactIds = uniqueStrings([...owner.contactIds, target.id]);
    return { ok: true, user: target };
  });
}

export function exportState() {
  const state = readState();
  return state || normalizeState({ version: 8, users: [], threads: [], messages: [], settings: {}, drafts: {} });
}

export function importState(payload) {
  writeState(normalizeState(payload || {}));
}

export function clearAllData() {
  localStorage.removeItem(STATE_KEY);
  removePersistedValue(SESSION_KEY);
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
