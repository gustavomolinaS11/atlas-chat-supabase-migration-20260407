import {
  addGroupMembers,
  applyDisplayPreferences,
  applyRemoteChatSnapshot,
  applyTheme,
  clearConversationHistory,
  clipText,
  deleteMessages,
  ensureStore,
  exportState,
  formatClock,
  formatRelative,
  getConversationDetails,
  getConversationEntries,
  getConversationIdForDirect,
  getCurrentUser,
  getDraft,
  getGroupMembers,
  getMessagesForConversation,
  getPinnedMessageForConversation,
  getSettings,
  importState,
  listUsersForPicker,
  logoutUser,
  markAllDeliveredForUser,
  markConversationRead,
  removeGroupMember,
  requireSession,
  saveDraft,
  sendMessage,
  setFavoriteMessages,
  toggleConversationArchived,
  toggleConversationPinned,
  toggleFavorite,
  toggleGroupAdmin,
  togglePinned,
  toggleReaction,
  upsertRemoteSessionUser,
  updateGroup,
  updateMessage
} from "./store.js";
import {
  getCurrentSession as getRemoteSession,
  signOutUser as signOutRemoteUser
} from "./src/services/remote/authService.js";
import { getMyProfile } from "./src/services/remote/profileService.js";
import {
  listMyContacts,
  searchProfiles,
  upsertMyContact
} from "./src/services/remote/contactService.js";
import {
  addGroupMembers as addRemoteGroupMembers,
  clearConversationForMe as clearRemoteConversationForMe,
  createGroupConversation,
  createOrGetDirectConversation,
  listConversationMembers,
  listMyConversations,
  markConversationRead as markRemoteConversationRead,
  removeGroupMember as removeRemoteGroupMember,
  setConversationArchived,
  setMemberRole,
  updateGroupConversation
} from "./src/services/remote/conversationService.js";
import {
  deleteOwnMessage,
  editOwnMessage,
  hideMessageForMe,
  listMessages,
  listMyFavoriteMessageIds,
  listMyHiddenMessageIds,
  listMyPinnedMessages,
  sendMessage as sendRemoteMessage,
  setMessageReaction,
  setPinnedMessage,
  toggleMessageFavorite
} from "./src/services/remote/messageService.js";
import {
  uploadConversationPhoto,
  uploadMessageAttachment
} from "./src/services/remote/storageService.js";
import { supabase } from "./src/lib/supabaseClient.js";

const currentUser = requireSession("index.html");
let userSettings = currentUser ? getSettings(currentUser.id) : null;
const CHAT_CACHE_VERSION = "v2";
const CHAT_CACHE_TTL = 1000 * 60 * 8;
const REMOTE_SYNC_MIN_INTERVAL = 3500;

const REACTIONS = [
  { token: "like", label: "👍" },
  { token: "love", label: "❤️" },
  { token: "fire", label: "🔥" },
  { token: "wow", label: "😮" }
];

const AUDIO_SPEEDS = [1, 1.5, 2];
const REMOTE_REALTIME_TABLES = [
  "conversations",
  "conversation_members",
  "user_contacts",
  "messages",
  "message_attachments",
  "message_mentions",
  "message_hidden_for",
  "message_reactions",
  "message_favorites",
  "conversation_pins"
];

const ICONS = {
  arrowLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 5 0 14"/><path d="m6 13 6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0-6 1.1 2.6 2.8.5-.8 2.7 1.9 2-1.9 2 .8 2.7-2.8.5L12 21.5l-1.1-2.6-2.8-.5.8-2.7-1.9-2 1.9-2-.8-2.7 2.8-.5Z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17v2H5V5h5v2M14 7l5 5-5 5M19 12H9"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 1 1-4.6 11.1A6.5 6.5 0 0 1 10.5 4Zm9 15-4.1-4.1"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-5M12 8h.01M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 10h.01M15.5 10h.01M8 14a5 5 0 0 0 8 0M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10Z"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h.01M20 16l-5-5-4 4-2-2-5 5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7.5 8.8 5h6.4L17 7.5h2A2 2 0 0 1 21 9.5v8A2 2 0 0 1 19 19.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm5 2.5a4 4 0 1 0 4 4 4 4 0 0 0-4-4Z"/></svg>',
  rotateCamera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7V4h-4.7l1.8 1.8A8 8 0 1 0 20 12"/><path d="M12 8v4l3 2"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h6l5 5v13H8zM14 3v5h5"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 1.5a2.5 2.5 0 1 0-2.5-2.5 2.5 2.5 0 0 0 2.5 2.5ZM3.5 20a5.5 5.5 0 0 1 11 0M14 20a4 4 0 0 1 7 0"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm0 0v4m-4-6a4 4 0 0 0 8 0"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 6 10 6-10 6Z" fill="currentColor" stroke="none"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5-3 2v4l-2 2-3-5-5-3 2-2h4Z"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.1L12 17.2 6.4 20l1.1-6.1L3 9.6l6.2-.9Z"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20 21 12 3 4l3 7 8 1-8 1Z"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h.01M12 12h.01M18 12h.01"/></svg>',
  reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8 5 12l5 4M5 12h10a4 4 0 0 1 4 4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 9-9-3.5-3.5-9 9ZM13 6l3.5 3.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 18 2-9 6 5 6-5 2 9Z"/></svg>',
  remove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v4H4zM6 11v8h12v-8M10 14h4"/></svg>',
  unarchive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v4H4zM6 11v8h12v-8M12 16v-6M9.5 12.5 12 10l2.5 2.5"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M4 12h9a6 6 0 1 1 0 12"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9V5h10v12h-4M5 9h10v10H5z"/></svg>',
  forward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5 21 12l-8 7M21 12H3"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
  select: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>'
};

const elements = {
  quickCreateBtn: document.getElementById("quick-create-btn"),
  quickCreateMenu: document.getElementById("quick-create-menu"),
  sessionMenuBtn: document.getElementById("session-menu-btn"),
  sessionMenu: document.getElementById("session-menu"),
  settingsLink: document.getElementById("settings-link"),
  sessionAvatar: document.getElementById("session-avatar"),
  sessionPopoverAvatar: document.getElementById("session-popover-avatar"),
  sessionName: document.getElementById("session-name"),
  sessionHandle: document.getElementById("session-handle"),
  threadSearch: document.getElementById("thread-search"),
  threadList: document.getElementById("thread-list"),
  mobileChatBackBtn: document.getElementById("mobile-chat-back-btn"),
  chatAvatar: document.getElementById("chat-avatar"),
  chatTitle: document.getElementById("chat-title"),
  chatSubtitle: document.getElementById("chat-subtitle"),
  conversationSearchBtn: document.getElementById("conversation-search-btn"),
  detailsBtn: document.getElementById("details-btn"),
  pinnedBanner: document.getElementById("pinned-banner"),
  mentionJumpBtn: document.getElementById("mention-jump-btn"),
  mentionJumpLabel: document.getElementById("mention-jump-label"),
  scrollBottomBtn: document.getElementById("scroll-bottom-btn"),
  selectionBar: document.getElementById("selection-bar"),
  selectionCount: document.getElementById("selection-count"),
  selectionHint: document.getElementById("selection-hint"),
  selectionCopyBtn: document.getElementById("selection-copy-btn"),
  selectionFavoriteBtn: document.getElementById("selection-favorite-btn"),
  selectionForwardBtn: document.getElementById("selection-forward-btn"),
  selectionDeleteBtn: document.getElementById("selection-delete-btn"),
  selectionCancelBtn: document.getElementById("selection-cancel-btn"),
  messages: document.getElementById("messages"),
  composerForm: document.getElementById("composer-form"),
  composer: document.getElementById("composer"),
  draftStatus: document.getElementById("draft-status"),
  typingIndicator: document.getElementById("typing-indicator"),
  attachmentPreview: document.getElementById("attachment-preview"),
  mentionPanel: document.getElementById("mention-panel"),
  imageInput: document.getElementById("image-input"),
  cameraInput: document.getElementById("camera-input"),
  docInput: document.getElementById("doc-input"),
  emojiBtn: document.getElementById("emoji-btn"),
  imageBtn: document.getElementById("image-btn"),
  cameraBtn: document.getElementById("camera-btn"),
  fileBtn: document.getElementById("file-btn"),
  voiceBtn: document.getElementById("voice-btn"),
  sendBtn: document.getElementById("send-btn"),
  emojiPanel: document.getElementById("emoji-panel"),
  replyBanner: document.getElementById("reply-banner"),
  replyText: document.getElementById("reply-text"),
  replyCancel: document.getElementById("reply-cancel"),
  conversationSearchPanel: document.getElementById("conversation-search-panel"),
  conversationSearchInput: document.getElementById("conversation-search-input"),
  conversationSearchResults: document.getElementById("conversation-search-results"),
  conversationMenuBtn: document.getElementById("conversation-menu-btn"),
  conversationMenu: document.getElementById("conversation-menu"),
  detailsDrawer: document.getElementById("details-drawer"),
  drawerTitle: document.getElementById("drawer-title"),
  drawerBody: document.getElementById("drawer-body"),
  modalLayer: document.getElementById("modal-layer"),
  modalKicker: document.getElementById("modal-kicker"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  lightbox: document.getElementById("lightbox"),
  lightboxImg: document.getElementById("lightbox-img"),
  cameraLayer: document.getElementById("camera-layer"),
  cameraVideo: document.getElementById("camera-video"),
  cameraStatus: document.getElementById("camera-status"),
  cameraCaptureBtn: document.getElementById("camera-capture-btn"),
  cameraFlipBtn: document.getElementById("camera-flip-btn"),
  cameraFallbackBtn: document.getElementById("camera-fallback-btn"),
  undoToast: document.getElementById("undo-toast"),
  bootOverlay: document.getElementById("boot-overlay"),
  bootStatus: document.getElementById("boot-status")
};

const state = {
  filter: "all",
  currentConversationId: null,
  replyTo: null,
  pendingImages: [],
  pendingDocs: [],
  pendingAudio: [],
  typingTimer: null,
  draftSaveTimer: null,
  pendingDraftSave: null,
  recorder: null,
  stream: null,
  recordingStartedAt: 0,
  recordingLevels: [],
  recordingWaveform: [],
  recordingMeterTimer: null,
  audioContext: null,
  audioAnalyser: null,
  audioSource: null,
  openMessageMenuId: null,
  openReactionPickerId: null,
  openConversationMenu: false,
  openQuickCreateMenu: false,
  openSessionMenu: false,
  pendingOpenMessageId: "",
  unreadMarker: null,
  mentionJumpMarker: null,
  selectionMode: false,
  selectedMessageIds: [],
  cameraStream: null,
  cameraOpening: false,
  cameraReady: false,
  cameraFacingMode: "environment",
  modalCleanup: null,
  undoTimer: null,
  undoToken: 0,
  detailsOpen: false,
  mobilePanel: "list",
  mentionSuggestions: [],
  mentionSelectedIndex: 0,
  mentionQueryRange: null,
  remoteSyncTimer: null,
  remoteSyncInFlight: null,
  remoteSyncQueued: false,
  remoteSyncViewportLock: null,
  stickFeedToBottomUntil: 0,
  remoteSyncMutedUntil: 0,
  lastRemoteSyncAt: 0,
  realtimeChannel: null,
  skipNextMessageClick: false,
  messageGesture: null,
  composerTypingActive: false
};

init();

async function init() {
  if (!currentUser) {
    return;
  }
  setBootStatus("Validando a sessao...");
  const remoteSession = await getRemoteSession().catch(() => null);
  if (!remoteSession?.user) {
    logoutUser();
    window.location.href = "index.html";
    return;
  }
  await ensureStore();
  const hydratedFromCache = hydrateRemoteChatCache(currentUser.id);
  setBootStatus(hydratedFromCache ? "Atualizando conversas..." : "Carregando conversas...");
  await syncRemoteProfile(remoteSession.user);
  syncUserSettings();
  markAllDeliveredForUser(currentUser.id);
  decorateStaticIcons();
  bindEvents();
  if (hydratedFromCache) {
    selectInitialConversation();
    renderAll();
  }
  await syncRemoteChatData({ rerender: false, preserveViewport: false });
  selectInitialConversation();
  renderAll();
  if (!focusMessageFromUrl()) {
    positionConversationViewport(state.pendingOpenMessageId);
  }
  state.pendingOpenMessageId = "";
  setupRealtimeSync();
  hideBootOverlay();
}

function setBootStatus(message) {
  if (elements.bootStatus) {
    elements.bootStatus.textContent = message;
  }
}

function hideBootOverlay() {
  elements.bootOverlay?.classList.add("hidden");
}

function getRemoteChatCacheKey(userId) {
  return `atlas-chat-remote-cache:${CHAT_CACHE_VERSION}:${userId}`;
}

function hydrateRemoteChatCache(userId) {
  if (!userId) {
    return false;
  }
  try {
    const raw = localStorage.getItem(getRemoteChatCacheKey(userId));
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.snapshot || !parsed?.savedAt || Date.now() - parsed.savedAt > CHAT_CACHE_TTL) {
      localStorage.removeItem(getRemoteChatCacheKey(userId));
      return false;
    }
    applyRemoteChatSnapshot(userId, parsed.snapshot);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function persistRemoteChatCache(userId, snapshot) {
  if (!userId || !snapshot) {
    return;
  }
  try {
    localStorage.setItem(getRemoteChatCacheKey(userId), JSON.stringify({
      savedAt: Date.now(),
      snapshot
    }));
  } catch (error) {
    console.error(error);
  }
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

async function syncRemoteChatData(options = {}) {
  const rerender = options.rerender !== false;
  const preserveViewport = options.preserveViewport !== false;
  if (state.remoteSyncInFlight) {
    state.remoteSyncQueued = true;
    return state.remoteSyncInFlight;
  }
  const shouldPreserveConversation = preserveViewport && Boolean(state.currentConversationId);
  const viewportLock = shouldPreserveConversation ? getLockedRemoteSyncViewport() : null;
  const keepBottom = shouldPreserveConversation
    ? (viewportLock?.keepBottom ?? (shouldStickFeedToBottom() || isFeedNearBottom()))
    : false;
  const feedSnapshot = shouldPreserveConversation && !keepBottom
    ? (viewportLock?.snapshot || captureFeedScrollState())
    : null;

  state.remoteSyncInFlight = (async () => {
  try {
    const [contacts, memberships] = await Promise.all([
      listMyContacts(),
      listMyConversations()
    ]);
    const conversationIds = memberships
      .map((entry) => entry?.conversation?.id)
      .filter(Boolean);
    const uniqueConversationIds = [...new Set(conversationIds)];
    const [memberRows, messageRows, favoriteMessageIds, hiddenMessageIds, pinnedMessages] = await Promise.all([
      Promise.all(uniqueConversationIds.map(async (conversationId) => [conversationId, await listConversationMembers(conversationId)])),
      Promise.all(uniqueConversationIds.map(async (conversationId) => [conversationId, await listMessages(conversationId)])),
      listMyFavoriteMessageIds(),
      listMyHiddenMessageIds(),
      listMyPinnedMessages()
    ]);
    const snapshot = {
      contacts,
      conversations: memberships,
      membersByConversation: Object.fromEntries(memberRows),
      messagesByConversation: Object.fromEntries(messageRows),
      favoriteMessageIds,
      hiddenMessageIds,
      pinnedMessageIdsByConversation: Object.fromEntries(
        (pinnedMessages || []).map((row) => [row.conversation_id, row.message_id])
      )
    };
    applyRemoteChatSnapshot(currentUser.id, snapshot);
    persistRemoteChatCache(currentUser.id, snapshot);
    state.lastRemoteSyncAt = Date.now();
    syncConversationSelection();
    refreshCurrentConversationMarkers();
    syncOpenConversationReadState();
    if (rerender) {
      renderAll();
      if (feedSnapshot && restoreFeedScrollState(feedSnapshot)) {
        return;
      }
      if (keepBottom && state.currentConversationId) {
        scrollMessagesToBottom();
      }
    }
  } catch (error) {
    console.error(error);
  }
  })();

  try {
    await state.remoteSyncInFlight;
  } finally {
    state.remoteSyncInFlight = null;
    if (state.remoteSyncQueued) {
      state.remoteSyncQueued = false;
      queueRemoteChatSync(80);
    }
  }
}

function queueRemoteChatSync(delay = 120, options = {}) {
  if (!currentUser) {
    return;
  }
  if (Number.isFinite(options.suppressRealtimeFor) && options.suppressRealtimeFor > 0) {
    state.remoteSyncMutedUntil = Date.now() + options.suppressRealtimeFor;
  }
  if (options.keepBottom || shouldStickFeedToBottom()) {
    lockRemoteSyncViewport("bottom");
  } else if (options.preserveCurrentPosition) {
    lockRemoteSyncViewport("preserve");
  }
  clearTimeout(state.remoteSyncTimer);
  state.remoteSyncTimer = window.setTimeout(() => {
    state.remoteSyncTimer = null;
    syncRemoteChatData({ rerender: true, preserveViewport: true });
  }, delay);
}

function setupRealtimeSync() {
  teardownRealtimeSync();
  const channel = supabase.channel(`atlas-chat-${currentUser.id}`);
  REMOTE_REALTIME_TABLES.forEach((table) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table
      },
      () => {
        if (Date.now() < state.remoteSyncMutedUntil) {
          return;
        }
        queueRemoteChatSync(90, { keepBottom: shouldStickFeedToBottom() || isFeedNearBottom() });
      }
    );
  });
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED" && Date.now() - state.lastRemoteSyncAt >= REMOTE_SYNC_MIN_INTERVAL) {
      queueRemoteChatSync(0);
    }
  });
  state.realtimeChannel = channel;
}

function teardownRealtimeSync() {
  clearTimeout(state.remoteSyncTimer);
  state.remoteSyncTimer = null;
  if (state.realtimeChannel) {
    supabase.removeChannel(state.realtimeChannel);
    state.realtimeChannel = null;
  }
}

function isFeedNearBottom(threshold = 96) {
  if (!elements.messages) {
    return true;
  }
  const distance = elements.messages.scrollHeight - (elements.messages.scrollTop + elements.messages.clientHeight);
  return distance <= threshold;
}

function captureFeedViewportAnchor() {
  if (!elements.messages) {
    return null;
  }
  const containerTop = elements.messages.getBoundingClientRect().top;
  const nodes = [...elements.messages.querySelectorAll(".message[id^='msg-']")];
  const anchor = nodes.find((node) => node.getBoundingClientRect().bottom >= containerTop + 8);
  if (!anchor) {
    return null;
  }
  return {
    id: anchor.id.replace(/^msg-/, ""),
    offsetTop: anchor.getBoundingClientRect().top - containerTop
  };
}

function captureFeedScrollState() {
  if (!elements.messages) {
    return null;
  }
  return {
    scrollTop: elements.messages.scrollTop,
    scrollHeight: elements.messages.scrollHeight,
    anchor: captureFeedViewportAnchor()
  };
}

function restoreFeedViewportAnchor(anchor) {
  if (!anchor?.id || !elements.messages) {
    return false;
  }
  const node = document.getElementById(`msg-${anchor.id}`);
  if (!node) {
    return false;
  }
  const containerTop = elements.messages.getBoundingClientRect().top;
  const currentOffset = node.getBoundingClientRect().top - containerTop;
  elements.messages.scrollTop += currentOffset - anchor.offsetTop;
  return true;
}

function restoreFeedScrollState(snapshot) {
  if (!snapshot || !elements.messages) {
    return false;
  }
  const maxScrollTop = Math.max(0, elements.messages.scrollHeight - elements.messages.clientHeight);
  elements.messages.scrollTop = Math.min(snapshot.scrollTop, maxScrollTop);
  if (Math.abs(elements.messages.scrollTop - snapshot.scrollTop) <= 2) {
    renderScrollBottomButton();
    return true;
  }
  const restored = restoreFeedViewportAnchor(snapshot.anchor);
  renderScrollBottomButton();
  return restored;
}

function requestFeedStickToBottom(duration = 2600) {
  if (!state.currentConversationId) {
    return;
  }
  state.stickFeedToBottomUntil = Date.now() + duration;
}

function shouldStickFeedToBottom() {
  return Boolean(state.currentConversationId) && Date.now() < state.stickFeedToBottomUntil;
}

function releaseFeedStickToBottom() {
  state.stickFeedToBottomUntil = 0;
}

function lockRemoteSyncViewport(mode = "preserve") {
  if (!state.currentConversationId) {
    return;
  }
  state.remoteSyncViewportLock = {
    conversationId: state.currentConversationId,
    keepBottom: mode === "bottom",
    snapshot: mode === "preserve" ? captureFeedScrollState() : null
  };
}

function getLockedRemoteSyncViewport() {
  const lock = state.remoteSyncViewportLock;
  if (!lock || lock.conversationId !== state.currentConversationId) {
    state.remoteSyncViewportLock = null;
    return null;
  }
  state.remoteSyncViewportLock = null;
  return lock;
}

function syncUserSettings() {
  userSettings = getSettings(currentUser.id);
  applyTheme(userSettings);
  applyDisplayPreferences(userSettings);
}

function refreshCurrentConversationMarkers() {
  if (!state.currentConversationId) {
    state.unreadMarker = null;
    state.mentionJumpMarker = null;
    return;
  }
  state.unreadMarker = getUnreadMarkerForConversation(state.currentConversationId);
  state.mentionJumpMarker = getMentionJumpMarkerForConversation(state.currentConversationId);
}

function syncOpenConversationReadState() {
  if (!state.currentConversationId || document.visibilityState !== "visible") {
    return;
  }
  const unreadMarker = getUnreadMarkerForConversation(state.currentConversationId);
  if (!unreadMarker?.messageId) {
    refreshCurrentConversationMarkers();
    return;
  }
  markConversationRead(currentUser.id, state.currentConversationId);
  refreshCurrentConversationMarkers();
  syncRemoteReadState(state.currentConversationId);
}

async function syncRemoteReadState(conversationId) {
  const details = conversationId ? getConversationDetails(currentUser.id, conversationId) : null;
  if (!details?.isRemote || !details.threadId) {
    return;
  }
  try {
    await markRemoteConversationRead(details.threadId);
  } catch (error) {
    console.error(error);
  }
}

function decorateStaticIcons() {
  elements.quickCreateBtn.innerHTML = ICONS.plus;
  document.getElementById("quick-create-add-icon").innerHTML = ICONS.user;
  document.getElementById("quick-create-group-icon").innerHTML = ICONS.users;
  elements.settingsLink.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
  document.getElementById("logout-btn").innerHTML = ICONS.logout;
  elements.conversationSearchBtn.innerHTML = ICONS.search;
  elements.detailsBtn.innerHTML = ICONS.info;
  elements.conversationMenuBtn.innerHTML = ICONS.more;
  elements.mentionJumpBtn.querySelector(".mention-jump-icon").innerHTML = ICONS.arrowUp;
  elements.scrollBottomBtn.innerHTML = '<i class="fa-solid fa-arrow-down" aria-hidden="true"></i>';
  elements.mobileChatBackBtn.innerHTML = ICONS.arrowLeft;
  elements.selectionCopyBtn.innerHTML = ICONS.copy;
  elements.selectionFavoriteBtn.innerHTML = ICONS.star;
  elements.selectionForwardBtn.innerHTML = ICONS.forward;
  elements.selectionDeleteBtn.innerHTML = ICONS.trash;
  document.getElementById("drawer-close").innerHTML = ICONS.close;
  elements.emojiBtn.innerHTML = ICONS.smile;
  elements.imageBtn.innerHTML = ICONS.image;
  elements.cameraBtn.innerHTML = ICONS.camera;
  elements.fileBtn.innerHTML = ICONS.file;
  elements.voiceBtn.innerHTML = ICONS.mic;
  elements.sendBtn.innerHTML = ICONS.send;
  document.getElementById("modal-close").innerHTML = ICONS.close;
  document.getElementById("camera-close").innerHTML = ICONS.close;
  elements.cameraFlipBtn.innerHTML = `${ICONS.rotateCamera}<span>Rotacionar camera</span>`;
  syncComposerPrimaryAction();
}

function bindEvents() {
  elements.sessionMenuBtn.addEventListener("click", toggleSessionMenu);
  elements.threadSearch.addEventListener("input", renderThreads);
  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });
  elements.threadList.addEventListener("click", handleThreadClick);
  elements.composerForm.addEventListener("submit", handleSend);
  elements.composer.addEventListener("input", handleComposerInput);
  elements.composer.addEventListener("keydown", handleComposerKeydown);
  elements.composer.addEventListener("click", syncMentionSuggestions);
  elements.composer.addEventListener("keyup", handleComposerCursorChange);
  elements.composer.addEventListener("blur", () => stopComposerTyping());
  elements.mentionPanel.addEventListener("mousedown", (event) => event.preventDefault());
  elements.mentionPanel.addEventListener("click", handleMentionPanelClick);
  bindTapAction(elements.emojiBtn, toggleEmojiPanel);
  bindTapAction(elements.imageBtn, () => openInputPicker(elements.imageInput));
  bindTapAction(elements.cameraBtn, openCameraPreview);
  bindTapAction(elements.fileBtn, () => openInputPicker(elements.docInput));
  elements.imageInput.addEventListener("change", handleImageUpload);
  elements.cameraInput.addEventListener("change", handleImageUpload);
  elements.docInput.addEventListener("change", handleDocUpload);
  elements.voiceBtn.addEventListener("click", toggleRecording);
  elements.sendBtn.addEventListener("click", handlePrimaryComposerAction);
  elements.quickCreateBtn.addEventListener("click", toggleQuickCreateMenu);
  elements.quickCreateMenu.addEventListener("click", handleQuickCreateMenuClick);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  elements.conversationSearchBtn.addEventListener("click", toggleConversationSearch);
  elements.conversationMenuBtn.addEventListener("click", toggleConversationMenu);
  elements.conversationMenu.addEventListener("click", handleConversationMenuClick);
  document.getElementById("conversation-search-close").addEventListener("click", toggleConversationSearch);
  elements.conversationSearchInput.addEventListener("input", renderConversationSearch);
  elements.detailsBtn.addEventListener("click", toggleDetailsDrawer);
  elements.mobileChatBackBtn.addEventListener("click", handleMobileBack);
  elements.chatAvatar.addEventListener("click", handlePhotoTriggerClick);
  document.getElementById("drawer-close").addEventListener("click", closeDetailsDrawer);
  elements.pinnedBanner.addEventListener("click", handlePinnedBannerClick);
  elements.mentionJumpBtn.addEventListener("click", handleMentionJump);
  elements.scrollBottomBtn.addEventListener("click", handleScrollBottomClick);
  elements.messages.addEventListener("click", handleMessageClick);
  elements.drawerBody.addEventListener("click", handleDrawerClick);
  elements.selectionCopyBtn.addEventListener("click", handleSelectionCopy);
  elements.selectionFavoriteBtn.addEventListener("click", handleSelectionFavorite);
  elements.selectionForwardBtn.addEventListener("click", handleSelectionForward);
  elements.selectionDeleteBtn.addEventListener("click", handleSelectionDelete);
  elements.selectionCancelBtn.addEventListener("click", resetSelectionMode);
  elements.attachmentPreview.addEventListener("click", handleAttachmentPreviewClick);
  elements.replyCancel.addEventListener("click", clearReply);
    document.getElementById("modal-close").addEventListener("click", closeModal);
    elements.modalLayer.addEventListener("click", (event) => { if (event.target === elements.modalLayer) closeModal(); });
    document.addEventListener("click", handleOuterClick);
    document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
    elements.lightbox.addEventListener("click", (event) => { if (event.target === elements.lightbox) closeLightbox(); });
  document.getElementById("camera-close").addEventListener("click", closeCameraPreview);
  elements.cameraLayer.addEventListener("click", (event) => { if (event.target === elements.cameraLayer) closeCameraPreview(); });
  elements.cameraCaptureBtn.addEventListener("click", captureCameraFrame);
  elements.cameraFlipBtn.addEventListener("click", rotateCameraPreview);
  elements.cameraFallbackBtn.addEventListener("click", useCameraFileFallback);
  elements.messages.addEventListener("scroll", handleMessageFeedScroll, { passive: true });
  elements.messages.addEventListener("pointerdown", handleMessageGestureStart, { passive: true });
  elements.messages.addEventListener("pointermove", handleMessageGestureMove, { passive: true });
    elements.messages.addEventListener("pointerup", handleMessageGestureEnd, { passive: true });
    elements.messages.addEventListener("pointercancel", handleMessageGestureEnd, { passive: true });
    elements.messages.addEventListener("pointerleave", handleMessageGestureEnd, { passive: true });
    window.addEventListener("pageshow", refreshSessionState);
    window.addEventListener("beforeunload", flushPendingDraftSave);
    window.addEventListener("pagehide", teardownRealtimeSync);
    window.addEventListener("resize", handleViewportChange);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshSessionState();
      } else {
        flushPendingDraftSave();
        closeCameraPreview();
      }
    });
  }

function bindTapAction(element, handler) {
  if (!element) {
    return;
  }
  let lastTouchPointerUp = 0;
  element.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }
    lastTouchPointerUp = Date.now();
    event.preventDefault();
    handler(event);
  });
  element.addEventListener("click", (event) => {
    if (Date.now() - lastTouchPointerUp < 450) {
      return;
    }
    handler(event);
  });
}

function openInputPicker(input) {
  if (!input) {
    return;
  }
  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
  } catch {
    // fallback to click below
  }
  input.click();
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll(".filter-chip").forEach((button) => button.classList.toggle("active", button.dataset.filter === filter));
  syncConversationSelection();
  renderAll();
}

function syncTypingIndicatorVisibility() {
  const shouldShow = Boolean(
    userSettings.showTypingIndicator
    && state.currentConversationId
    && state.composerTypingActive
  );
  elements.typingIndicator.classList.toggle("hidden", !shouldShow);
}

function stopComposerTyping() {
  clearTimeout(state.typingTimer);
  state.typingTimer = null;
  if (!state.composerTypingActive) {
    syncTypingIndicatorVisibility();
    return;
  }
  state.composerTypingActive = false;
  syncTypingIndicatorVisibility();
}

function bumpComposerTyping() {
  if (!userSettings.showTypingIndicator) {
    stopComposerTyping();
    return;
  }
  state.composerTypingActive = true;
  syncTypingIndicatorVisibility();
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => {
    state.typingTimer = null;
    state.composerTypingActive = false;
    syncTypingIndicatorVisibility();
  }, 900);
}

function scheduleDraftSave(conversationId, value) {
  if (!conversationId) {
    return;
  }
  state.pendingDraftSave = { conversationId, value: String(value || "") };
  clearTimeout(state.draftSaveTimer);
  state.draftSaveTimer = window.setTimeout(() => {
    flushPendingDraftSave();
  }, 180);
}

function flushPendingDraftSave() {
  clearTimeout(state.draftSaveTimer);
  state.draftSaveTimer = null;
  if (!state.pendingDraftSave) {
    return;
  }
  const pending = state.pendingDraftSave;
  state.pendingDraftSave = null;
  saveDraft(currentUser.id, pending.conversationId, pending.value);
}

function selectInitialConversation() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("c");
  const canOpenFromUrl = fromUrl ? Boolean(getConversationDetails(currentUser.id, fromUrl)) : false;
  state.currentConversationId = canOpenFromUrl ? fromUrl : null;
  state.detailsOpen = false;
  if (state.currentConversationId) {
    state.unreadMarker = getUnreadMarkerForConversation(state.currentConversationId);
    state.mentionJumpMarker = getMentionJumpMarkerForConversation(state.currentConversationId);
    state.pendingOpenMessageId = state.unreadMarker?.messageId || "";
    markConversationRead(currentUser.id, state.currentConversationId);
    syncRemoteReadState(state.currentConversationId);
    state.mobilePanel = "chat";
  } else {
    state.unreadMarker = null;
    state.mentionJumpMarker = null;
    state.mobilePanel = "list";
  }
}

function renderAll() {
  renderSessionCard();
  renderThreads();
  renderConversation();
  renderConversationMenu();
  renderDrawer();
  syncFeedSpacing();
  syncResponsiveLayout();
}

function renderConversationPreserveViewport(options = {}) {
  const keepBottom = options.forceBottom || shouldStickFeedToBottom() || isFeedNearBottom();
  const feedSnapshot = keepBottom ? null : captureFeedScrollState();
  renderConversation();
  if (keepBottom) {
    scrollMessagesToBottom();
    return;
  }
  if (feedSnapshot && restoreFeedScrollState(feedSnapshot)) {
    return;
  }
  if (options.messageId) {
    scrollMessageIntoView(options.messageId, { behavior: "auto", block: "nearest" });
  }
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 940px)").matches;
}

function syncResponsiveLayout() {
  const mobile = isMobileViewport();
  document.body.classList.toggle("mobile-layout", mobile);
  document.body.classList.toggle("quick-create-open", mobile && state.openQuickCreateMenu);
  document.body.classList.toggle("mobile-view-list", mobile && state.mobilePanel === "list");
  document.body.classList.toggle("mobile-view-chat", mobile && state.mobilePanel === "chat");
  document.body.classList.toggle("mobile-view-details", mobile && state.mobilePanel === "details");
  elements.mobileChatBackBtn.classList.toggle("hidden", !mobile || !state.currentConversationId || state.mobilePanel !== "chat");
  const drawerClose = document.getElementById("drawer-close");
  if (drawerClose) {
    drawerClose.innerHTML = mobile ? ICONS.arrowLeft : ICONS.close;
    drawerClose.title = mobile ? "Voltar" : "Fechar";
  }
  if (mobile) {
    elements.detailsDrawer.classList.toggle("hidden", state.mobilePanel !== "details");
  } else {
    elements.detailsDrawer.classList.toggle("hidden", !state.detailsOpen);
  }
}

function handleViewportChange() {
  syncFeedSpacing();
  if (!isMobileViewport()) {
    document.body.classList.remove("mobile-view-list", "mobile-view-chat", "mobile-view-details");
    if (state.mobilePanel === "details" && state.currentConversationId) {
      state.detailsOpen = true;
    }
  } else if (!state.currentConversationId) {
    state.mobilePanel = "list";
    state.detailsOpen = false;
  } else if (state.detailsOpen) {
    state.mobilePanel = "details";
  } else if (state.mobilePanel === "list") {
    state.mobilePanel = "chat";
  }
  syncResponsiveLayout();
}

function handleMessageFeedScroll() {
  if (!state.currentConversationId) {
    renderScrollBottomButton();
    return;
  }
  if (isFeedNearBottom(36)) {
    requestFeedStickToBottom(2200);
    renderScrollBottomButton();
    return;
  }
  releaseFeedStickToBottom();
  renderScrollBottomButton();
}

function toggleDetailsDrawer() {
  if (!state.currentConversationId) {
    return;
  }
  if (isMobileViewport()) {
    state.detailsOpen = true;
    state.mobilePanel = state.mobilePanel === "details" ? "chat" : "details";
    if (state.mobilePanel !== "details") {
      state.detailsOpen = false;
    }
    syncResponsiveLayout();
    return;
  }
  state.detailsOpen = !state.detailsOpen;
  syncResponsiveLayout();
}

function closeDetailsDrawer() {
  state.detailsOpen = false;
  if (isMobileViewport()) {
    state.mobilePanel = state.currentConversationId ? "chat" : "list";
  }
  syncResponsiveLayout();
}

function handleMobileBack() {
  if (!isMobileViewport()) {
    return;
  }
  flushPendingDraftSave();
  if (state.mobilePanel === "details") {
    closeDetailsDrawer();
    return;
  }
  state.currentConversationId = null;
  state.unreadMarker = null;
  state.mentionJumpMarker = null;
  state.pendingOpenMessageId = "";
  state.selectionMode = false;
  state.selectedMessageIds = [];
  state.openMessageMenuId = null;
  state.openReactionPickerId = null;
  state.openConversationMenu = false;
  state.openSessionMenu = false;
  state.detailsOpen = false;
  state.mobilePanel = "list";
  setQuickCreateMenuOpen(false);
  elements.sessionMenu.classList.add("hidden");
  elements.conversationSearchPanel.classList.add("hidden");
  closeMentionPanel();
  clearReply();
  clearPending();
  history.replaceState(null, "", "chat.html");
  renderAll();
}

function getSelectedConversationMessages() {
  if (!state.currentConversationId) {
    return [];
  }
  const selectedIds = new Set(state.selectedMessageIds);
  return getMessagesForConversation(currentUser.id, state.currentConversationId).filter((message) => selectedIds.has(message.id));
}

function resetSelectionMode() {
  state.selectionMode = false;
  state.selectedMessageIds = [];
  state.openMessageMenuId = null;
  state.openReactionPickerId = null;
  renderAll();
}

function toggleMessageSelection(messageId) {
  const next = new Set(state.selectedMessageIds);
  if (next.has(messageId)) {
    next.delete(messageId);
  } else {
    next.add(messageId);
  }
  state.selectedMessageIds = [...next];
  if (!state.selectedMessageIds.length) {
    state.selectionMode = false;
  }
  renderAll();
}

function renderSelectionBar(messages) {
  if (!state.currentConversationId || !state.selectionMode) {
    elements.selectionBar.classList.add("hidden");
    elements.selectionCount.textContent = "0 mensagens";
    elements.selectionHint.textContent = "Selecao multipla ativa.";
    return;
  }
  const selectedIds = new Set(state.selectedMessageIds);
  const selectedMessages = messages.filter((message) => selectedIds.has(message.id));
  state.selectedMessageIds = selectedMessages.map((message) => message.id);
  const selectedCount = selectedMessages.length;
  const allFavorite = selectedCount > 0 && selectedMessages.every((message) => message.isFavorite);
  elements.selectionCount.textContent = selectedCount
    ? `${selectedCount} mensagem${selectedCount > 1 ? "ens" : ""} selecionada${selectedCount > 1 ? "s" : ""}`
    : "Selecionar mensagens";
  elements.selectionHint.textContent = selectedCount
    ? "Escolha uma acao para as mensagens marcadas."
    : "Clique nas mensagens para marcar varias de uma vez.";
  elements.selectionFavoriteBtn.setAttribute("title", allFavorite ? "Remover favoritas" : "Favoritar");
  elements.selectionFavoriteBtn.classList.toggle("active", allFavorite);
  elements.selectionDeleteBtn.disabled = selectedCount === 0;
  elements.selectionCopyBtn.disabled = selectedCount === 0;
  elements.selectionForwardBtn.disabled = selectedCount === 0;
  elements.selectionFavoriteBtn.disabled = selectedCount === 0;
  elements.selectionBar.classList.remove("hidden");
}

function getAttachmentCopySummary(attachments) {
  const labels = [];
  if (attachments?.images?.length) {
    labels.push(`${attachments.images.length} imagem(ns)`);
  }
  if (attachments?.docs?.length) {
    labels.push(`${attachments.docs.length} documento(s)`);
  }
  if (attachments?.audio?.length) {
    labels.push(`${attachments.audio.length} audio(s)`);
  }
  return labels.join(", ");
}

function buildClipboardPayload(messages) {
  return messages
    .map((message) => {
      const parts = [`${message.sender?.name || "Conta"} • ${formatClock(message.createdAt)}`];
      if (message.text) {
        parts.push(message.text);
      }
      const attachmentsLabel = getAttachmentCopySummary(message.attachments);
      if (attachmentsLabel) {
        parts.push(`[${attachmentsLabel}]`);
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "true");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function openHtmlModal(config) {
  elements.modalKicker.textContent = config.kicker;
  elements.modalTitle.textContent = config.title;
  elements.modalBody.innerHTML = config.html;
  config.afterOpen?.(elements.modalBody);
  elements.modalLayer.classList.remove("hidden");
}

async function handleSelectionCopy() {
  const selectedMessages = getSelectedConversationMessages();
  if (!selectedMessages.length) {
    return;
  }
  try {
    await copyText(buildClipboardPayload(selectedMessages));
  } catch {
    alert("Nao foi possivel copiar agora.");
    return;
  }
}

function handleSelectionFavorite() {
  const selectedMessages = getSelectedConversationMessages();
  if (!selectedMessages.length) {
    return;
  }
  const snapshot = exportState();
  const shouldFavorite = !selectedMessages.every((message) => message.isFavorite);
  setFavoriteMessages(currentUser.id, selectedMessages.map((message) => message.id), shouldFavorite);
  renderAll();
  showUndoToast(shouldFavorite ? "Mensagens marcadas como favoritas." : "Favoritas removidas.", snapshot, state.currentConversationId);
}

function buildForwardedText(message) {
  const prefix = `Encaminhada de ${message.sender?.name || "Conta"}`;
  return message.text ? `${prefix}\n${message.text}` : prefix;
}

function cloneAttachments(attachments) {
  return {
    images: [...(attachments?.images || [])],
    docs: (attachments?.docs || []).map((item) => ({ ...item })),
    audio: (attachments?.audio || []).map((item) => ({ ...item, waveform: [...(item.waveform || [])] }))
  };
}

function handleSelectionForward() {
  const selectedMessages = getSelectedConversationMessages();
  if (!selectedMessages.length) {
    return;
  }
  const entries = getConversationEntries(currentUser.id, "", "all");
  if (!entries.length) {
    alert("Nao ha conversas disponiveis para encaminhar.");
    return;
  }
  openFormModal({
    kicker: "Encaminhar",
    title: "Encaminhar mensagens",
    fields: `
      <label class="field"><span>Buscar conversa</span><input id="forward-search" type="search" placeholder="Nome ou grupo"></label>
      <div id="forward-picker" class="picker-list">${buildConversationPicker(entries)}</div>
    `,
    submitLabel: "Encaminhar",
    afterOpen: () => wireConversationPickerSearch(entries),
    onSubmit: (form) => {
      const targetIds = form.getAll("conversation");
      if (!targetIds.length) {
        alert("Selecione ao menos uma conversa.");
        return;
      }
      targetIds.forEach((conversationId) => {
        selectedMessages.forEach((message) => {
          sendMessage(currentUser.id, conversationId, {
            text: buildForwardedText(message),
            attachments: cloneAttachments(message.attachments)
          });
        });
      });
      closeModal();
      renderAll();
    }
  });
}

function handleSelectionDelete() {
  const selectedMessages = getSelectedConversationMessages();
  if (!selectedMessages.length) {
    return;
  }
  openDeleteMessagesModal(selectedMessages);
}

function openDeleteMessagesModal(messages) {
  const selectedMessages = Array.isArray(messages) ? messages : [];
  if (!selectedMessages.length) {
    return;
  }
  const allRemote = selectedMessages.every((message) => message.isRemote);
  const ownOnly = selectedMessages.every((message) => message.senderId === currentUser.id);
  openHtmlModal({
    kicker: "Apagar",
    title: `Apagar ${selectedMessages.length} mensagem${selectedMessages.length > 1 ? "ens" : ""}`,
    html: `
      <div class="modal-form">
        <div class="empty-block selection-modal-copy">
          Escolha se deseja apagar apenas para voce ou remover para todo mundo.
        </div>
        <div class="selection-modal-actions">
          <button id="delete-for-me-btn" class="ghost-btn wide" type="button">Apagar para mim</button>
          ${ownOnly ? '<button id="delete-for-all-btn" class="primary-btn wide" type="button">Apagar para todos</button>' : '<div class="field-note">Apagar para todos so funciona quando todas as mensagens selecionadas foram enviadas por voce.</div>'}
        </div>
      </div>
    `,
    afterOpen: (scope) => {
      scope.querySelector("#delete-for-me-btn")?.addEventListener("click", async () => {
        const snapshot = exportState();
        try {
          if (allRemote) {
            await Promise.all(selectedMessages.map((message) => hideMessageForMe(message.id)));
            await syncRemoteChatData();
          } else {
            deleteMessages(currentUser.id, selectedMessages.map((message) => message.id), "self");
          }
        } catch (error) {
          alert(error?.message || "Nao foi possivel apagar as mensagens para voce.");
          return;
        }
        state.selectionMode = false;
        state.selectedMessageIds = [];
        closeModal();
        renderAll();
        if (!allRemote) {
          showUndoToast("Mensagens apagadas para voce.", snapshot, state.currentConversationId);
        }
      });
      scope.querySelector("#delete-for-all-btn")?.addEventListener("click", async () => {
        if (!confirm("Isso vai apagar as mensagens para todo mundo. Confirmar?")) {
          return;
        }
        const snapshot = exportState();
        try {
          if (allRemote) {
            await Promise.all(selectedMessages.map((message) => deleteOwnMessage(message.id)));
            await syncRemoteChatData();
          } else {
            deleteMessages(currentUser.id, selectedMessages.map((message) => message.id), "everyone");
          }
        } catch (error) {
          alert(error?.message || "Nao foi possivel apagar as mensagens para todos.");
          return;
        }
        state.selectionMode = false;
        state.selectedMessageIds = [];
        closeModal();
        renderAll();
        if (!allRemote) {
          showUndoToast("Mensagens apagadas para todos.", snapshot, state.currentConversationId);
        }
      });
    }
  });
}

function buildConversationPicker(entries) {
  return entries
    .map((entry) => `
      <label class="picker-row picker-row-choice" data-conversation-row="${entry.id}">
        <input class="picker-row-input" type="checkbox" name="conversation" value="${entry.id}">
        <span class="picker-row-indicator" aria-hidden="true"></span>
        ${renderAvatarMarkup(entry, "member-avatar picker-avatar", entry.title)}
        <span class="picker-row-copy">
          <strong>${escapeHtml(entry.title)}</strong>
          <small>${entry.type === "group" ? "Grupo" : "Contato"}</small>
        </span>
      </label>
    `)
    .join("");
}

function wireConversationPickerSearch(entries) {
  const input = document.getElementById("forward-search");
  const picker = document.getElementById("forward-picker");
  if (!input || !picker) {
    return;
  }
  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();
    picker.querySelectorAll("[data-conversation-row]").forEach((row) => {
      const value = row.textContent.toLowerCase();
      row.classList.toggle("hidden", Boolean(term) && !value.includes(term));
    });
  });
}

function renderSessionCard() {
  const sessionUser = getCurrentUser() || currentUser;
  paintAvatar(elements.sessionAvatar, sessionUser, sessionUser.name);
  paintAvatar(elements.sessionPopoverAvatar, sessionUser, sessionUser.name);
  elements.sessionName.textContent = sessionUser.name;
  elements.sessionHandle.textContent = `@${sessionUser.username}`;
}

function renderThreads() {
  const items = getConversationEntries(currentUser.id, elements.threadSearch.value, state.filter);
  elements.threadList.innerHTML = "";
  if (!items.length) {
    const emptyText = state.filter === "archived"
      ? "Nenhuma conversa arquivada."
      : "Nenhuma conversa encontrada.";
    elements.threadList.innerHTML = `<div class="empty-block">${emptyText}</div>`;
    return;
  }
  items.forEach((item) => {
    const subtitle = userSettings.showSidebarPreview
      ? (item.lastMessage ? clipText(item.lastMessage.text || attachmentSummary(item.lastMessage.attachments) || item.subtitle, 54) : item.subtitle)
      : item.subtitle;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thread-item${item.id === state.currentConversationId ? " active" : ""}${item.hasUnreadMention ? " mention-alert" : ""}${!userSettings.showAvatars ? " no-avatar" : ""}`;
    button.dataset.conversationId = item.id;
    button.innerHTML = `
      ${renderAvatarMarkup(item, "thread-avatar", item.title)}
      <div class="thread-main">
        <div class="thread-line"><strong>${escapeHtml(item.title)}</strong><span>${userSettings.showMessageTime && item.lastMessage ? formatRelative(item.lastMessage.createdAt) : ""}</span></div>
        <div class="thread-subline"><span class="presence-dot ${item.presence}"></span><span>${escapeHtml(subtitle || (item.isArchived ? "Conversa arquivada" : "Sem mensagens"))}</span></div>
      </div>
      <div class="thread-side">
        ${item.hasUnreadMention ? `<span class="thread-badge mention-badge" title="Voce foi marcado(a)">@${item.mentionCount > 1 ? item.mentionCount : ""}</span>` : ""}
        ${item.isPinnedConversation ? `<span class="thread-badge thread-badge-icon" title="Fixada">${ICONS.pin}</span>` : ""}
        ${item.isArchived ? '<span class="thread-badge">Arquivada</span>' : ""}
        ${item.unreadCount ? `<span class="unread-badge">${item.unreadCount}</span>` : ""}
      </div>
    `;
    elements.threadList.appendChild(button);
  });
}

function renderConversationMenu() {
  const details = state.currentConversationId ? getConversationDetails(currentUser.id, state.currentConversationId) : null;
  const hasMessages = state.currentConversationId ? getMessagesForConversation(currentUser.id, state.currentConversationId).length > 0 : false;
  if (!details) {
    state.openConversationMenu = false;
    elements.conversationMenu.classList.add("hidden");
    elements.conversationMenu.innerHTML = "";
    elements.conversationMenuBtn.disabled = true;
    return;
  }
  elements.conversationMenuBtn.disabled = false;
  elements.conversationMenu.innerHTML = `
    <button class="context-menu-item" data-conversation-action="select-messages" type="button" ${hasMessages ? "" : "disabled"}>
      <span class="context-menu-icon">${ICONS.select}</span>
      <span>Selecionar mensagens</span>
    </button>
    <button class="context-menu-item" data-conversation-action="toggle-pin" type="button">
      <span class="context-menu-icon">${ICONS.pin}</span>
      <span>${details.isPinnedConversation ? "Desfixar conversa" : (details.type === "direct" ? "Fixar contato" : "Fixar conversa")}</span>
    </button>
    <button class="context-menu-item" data-conversation-action="toggle-archive" type="button">
      <span class="context-menu-icon">${details.isArchived ? ICONS.unarchive : ICONS.archive}</span>
      <span>${details.isArchived ? "Desarquivar conversa" : "Arquivar conversa"}</span>
    </button>
    <button class="context-menu-item danger" data-conversation-action="clear-history" type="button">
      <span class="context-menu-icon">${ICONS.trash}</span>
      <span>Limpar historico</span>
    </button>
  `;
  elements.conversationMenu.classList.toggle("hidden", !state.openConversationMenu);
}
function renderConversation() {
  const details = state.currentConversationId ? getConversationDetails(currentUser.id, state.currentConversationId) : null;
  const messages = state.currentConversationId ? getMessagesForConversation(currentUser.id, state.currentConversationId) : [];
  closeMentionPanel();
  paintAvatar(elements.chatAvatar, details || { avatar: "AT" }, details?.title || "Conversa");
  syncPhotoTrigger(elements.chatAvatar, details, details?.title || "Conversa");
  elements.chatTitle.textContent = details?.title || "Selecione uma conversa";
  elements.chatSubtitle.textContent = details ? buildSubtitle(details) : "Troque entre contas e grupos";
  renderPinnedBanner();
  renderMentionJumpButton();
  elements.messages.innerHTML = "";
  if (!details) {
    elements.conversationSearchBtn.disabled = true;
    elements.detailsBtn.disabled = true;
    elements.conversationSearchPanel.classList.add("hidden");
    elements.messages.innerHTML = '<div class="empty-block tall">Selecione um contato ou grupo para conversar.</div>';
    elements.composer.value = "";
    elements.conversationSearchResults.innerHTML = "";
    elements.typingIndicator.classList.add("hidden");
    elements.replyBanner.classList.add("hidden");
    elements.selectionBar.classList.add("hidden");
    renderAttachmentPreview();
    elements.composerForm.classList.add("hidden");
    setComposerEnabled(false);
    autoResizeComposer(true);
    stopComposerTyping();
    renderScrollBottomButton();
    return;
  }
  elements.conversationSearchBtn.disabled = false;
  elements.detailsBtn.disabled = false;
  renderSelectionBar(messages);
  elements.composerForm.classList.toggle("hidden", state.selectionMode);
  setComposerEnabled(!state.selectionMode);
  if (!messages.length) {
    elements.messages.innerHTML = '<div class="empty-block tall">Nenhuma mensagem ainda nesta conversa.</div>';
  } else {
    let lastDayKey = "";
    let currentGroup = null;
    let currentGroupCount = 0;
    messages.forEach((message, index) => {
      const messageDayKey = getConversationDayKey(message.createdAt);
      if (messageDayKey !== lastDayKey) {
        const dayDivider = document.createElement("div");
        dayDivider.className = "day-divider";
        dayDivider.innerHTML = `<span class="day-divider-pill">${escapeHtml(formatConversationDayLabel(message.createdAt))}</span>`;
        elements.messages.appendChild(dayDivider);
        lastDayKey = messageDayKey;
        currentGroup = null;
        currentGroupCount = 0;
      }
      const startsUnreadBlock = state.unreadMarker?.conversationId === state.currentConversationId && state.unreadMarker.messageId === message.id;
      if (startsUnreadBlock) {
        const divider = document.createElement("div");
        divider.className = "unread-divider";
        divider.innerHTML = `
          <span class="unread-divider-line" aria-hidden="true"></span>
          <span class="unread-divider-pill">Mensagens nao lidas</span>
          <span class="unread-divider-count">${state.unreadMarker.count}</span>
          <span class="unread-divider-line" aria-hidden="true"></span>
        `;
        elements.messages.appendChild(divider);
        currentGroup = null;
        currentGroupCount = 0;
      }
      if (message.kind === "system") {
        const eventNode = document.createElement("div");
        eventNode.className = "system-event";
        eventNode.innerHTML = `<span class="system-event-pill">${escapeHtml(message.text)}</span>`;
        elements.messages.appendChild(eventNode);
        currentGroup = null;
        currentGroupCount = 0;
        return;
      }
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const sameSenderAsPrevious = previousMessage?.senderId === message.senderId;
      const sameDayAsPrevious = previousMessage ? getConversationDayKey(previousMessage.createdAt) === messageDayKey : false;
      const continuesSequence = Boolean(currentGroup)
        && sameSenderAsPrevious
        && sameDayAsPrevious
        && !startsUnreadBlock;
      if (!continuesSequence) {
        currentGroup = document.createElement("div");
        currentGroup.className = `message-sequence${message.senderId === currentUser.id ? " mine" : ""}`;
        elements.messages.appendChild(currentGroup);
        currentGroupCount = 0;
      }
      const row = document.createElement("div");
      const isSelected = state.selectedMessageIds.includes(message.id);
      const showGroupMeta = details.type === "group"
        && message.senderId !== currentUser.id
        && !continuesSequence;
      const showSenderLabel = showGroupMeta;
      const showMessageAvatar = showGroupMeta && userSettings.showAvatars;
      const reactionMarkup = renderReactionButtons(message);
      const footerMarkup = renderMessageFooter(message, reactionMarkup);
      const bottomMetaMarkup = renderMessageBottomMeta(message);
      const menuTriggerMarkup = state.selectionMode
        ? ""
        : `<button class="message-menu-trigger" data-action="toggle-menu" type="button" title="Opcoes">${ICONS.more}</button>`;
      row.className = `message-row${message.senderId === currentUser.id ? " mine" : ""}`;
      row.dataset.messageId = message.id;
      row.innerHTML = `
        ${showMessageAvatar ? `<div class="message-avatar-wrap">${renderAvatarMarkup(message.sender || { avatar: "AT", photo: "" }, "member-avatar message-avatar", message.sender?.name || "Conta", { photoAction: true })}</div>` : ""}
        <div class="message-stack">
          ${showSenderLabel ? `<div class="message-sender-label">${escapeHtml(message.sender?.name || "Conta")}</div>` : ""}
          <article class="message${message.senderId === currentUser.id ? " mine" : ""}${isSelected ? " selected" : ""}${state.selectionMode ? " selection-enabled" : ""}" id="msg-${message.id}">
            ${state.selectionMode ? `<button class="message-select-btn${isSelected ? " active" : ""}" data-action="select-toggle" type="button" title="Selecionar">${isSelected ? ICONS.check : ""}</button>` : ""}
            ${menuTriggerMarkup ? `<div class="message-head"><div class="message-head-actions">${menuTriggerMarkup}</div></div>` : ""}
            ${message.replyTo ? renderReplySnippet(messages, message.replyTo) : ""}
            <div class="message-text">${renderText(message.text, message)}</div>
            ${renderAttachments(message.attachments)}
            ${footerMarkup}
            <div class="message-menu ${state.openMessageMenuId === message.id && !state.selectionMode ? "" : "hidden"}">
              <button class="icon-btn mini" data-action="reply" type="button" title="Responder">${ICONS.reply}</button>
              ${message.senderId === currentUser.id ? `<button class="icon-btn mini" data-action="edit" type="button" title="Editar">${ICONS.edit}</button>` : ""}
              <button class="icon-btn mini" data-action="pin" type="button" title="Pin">${ICONS.pin}</button>
              <button class="icon-btn mini" data-action="favorite" type="button" title="Favoritar">${ICONS.star}</button>
              ${message.senderId === currentUser.id ? `<button class="icon-btn mini" data-action="delete" type="button" title="Apagar">${ICONS.trash}</button>` : ""}
            </div>
          </article>
          ${bottomMetaMarkup}
        </div>
      `;
      currentGroup.appendChild(row);
      currentGroupCount += 1;
      currentGroup.classList.toggle("stacked", currentGroupCount > 1);
    });
    hydrateAudioPlayers(elements.messages);
  }
  elements.composer.value = getDraft(currentUser.id, state.currentConversationId);
  autoResizeComposer();
  syncComposerPrimaryAction();
  renderReplyBanner(messages);
  renderAttachmentPreview();
  renderConversationSearch();
  syncTypingIndicatorVisibility();
  window.requestAnimationFrame(renderScrollBottomButton);
}

function renderDrawer() {
  const details = state.currentConversationId ? getConversationDetails(currentUser.id, state.currentConversationId) : null;
  elements.drawerTitle.textContent = details?.title || "Conversa";
  if (!details) {
    elements.drawerBody.innerHTML = '<div class="empty-block">Selecione uma conversa.</div>';
    return;
  }
  if (details.type === "direct") {
    elements.drawerBody.innerHTML = `
      <div class="detail-profile">
        ${renderAvatarMarkup(details, "member-avatar detail-avatar", details.title, { photoAction: true })}
        <div class="detail-profile-meta">
          <strong>${escapeHtml(details.title)}</strong>
          <span class="muted-line">@${escapeHtml(details.targetUser.username)}</span>
          <span class="muted-line">${escapeHtml(buildSubtitle(details))}</span>
        </div>
      </div>
      <div class="detail-card">
        <div class="detail-line"><span>Nome</span><strong>${escapeHtml(details.targetUser.name)}</strong></div>
        <div class="detail-line"><span>Usuario</span><strong>@${escapeHtml(details.targetUser.username)}</strong></div>
        <div class="detail-line"><span>Descricao</span><strong>${escapeHtml(details.subtitle || details.targetUser.bio || "Sem descricao")}</strong></div>
        <div class="detail-line"><span>Ultima vez online</span><strong>${escapeHtml(details.canSeeLastSeen ? formatLastSeen(details.lastSeenAt, details.presence) : "Oculto")}</strong></div>
      </div>
    `;
    return;
  }
  const members = getGroupMembers(details.threadId, currentUser.id);
  elements.drawerBody.innerHTML = `
    <div class="detail-profile">
      ${renderAvatarMarkup(details, "member-avatar detail-avatar", details.title, { photoAction: true })}
      <div class="detail-profile-meta">
        <strong>${escapeHtml(details.title)}</strong>
        <span class="muted-line">${escapeHtml(buildSubtitle(details))}</span>
      </div>
    </div>
    <div class="detail-card">
      <div class="detail-line"><span>Descricao</span><strong>${escapeHtml(details.description || "Sem descricao")}</strong></div>
      <div class="detail-line"><span>Membros</span><strong>${members.length}</strong></div>
      <div class="detail-line"><span>Admins</span><strong>${details.admins.length}</strong></div>
    </div>
    <div class="detail-actions">
      ${details.canManage ? '<button class="ghost-btn compact" data-drawer-action="edit-group" type="button">Editar grupo</button><button class="ghost-btn compact" data-drawer-action="add-members" type="button">Adicionar membros</button>' : ""}
      <button class="ghost-btn compact danger" data-drawer-action="leave-group" type="button">Sair do grupo</button>
    </div>
    <div class="member-list">
      ${members.map((member) => renderMemberRow(details, member)).join("")}
    </div>
  `;
}

function renderPinnedBanner() {
  const pinned = state.currentConversationId ? getPinnedMessageForConversation(currentUser.id, state.currentConversationId) : null;
  if (!pinned) {
    elements.pinnedBanner.classList.add("hidden");
    elements.pinnedBanner.innerHTML = "";
    return;
  }
  const preview = pinned.text || attachmentSummary(pinned.attachments);
  elements.pinnedBanner.classList.remove("hidden");
  elements.pinnedBanner.innerHTML = `
    <button class="pinned-banner-card" data-message-id="${pinned.id}" type="button">
      <span class="pinned-banner-icon">${ICONS.pin}</span>
      <div class="pinned-banner-copy">
        <strong>Mensagem fixada</strong>
        <span>${escapeHtml(pinned.sender?.name || "Conta")} • ${escapeHtml(clipText(preview || "Mensagem", 180))}</span>
      </div>
    </button>
  `;
}

function renderMentionJumpButton() {
  const marker = state.mentionJumpMarker;
  if (!marker || marker.conversationId !== state.currentConversationId) {
    elements.mentionJumpBtn.classList.add("hidden");
    elements.mentionJumpLabel.textContent = "Ir para a mencao";
    return;
  }
  elements.mentionJumpLabel.textContent = marker.count > 1 ? `${marker.count} mencoes` : "Ir para a mencao";
  elements.mentionJumpBtn.classList.remove("hidden");
}

function renderScrollBottomButton() {
  if (!elements.scrollBottomBtn) {
    return;
  }
  const hasConversation = Boolean(state.currentConversationId);
  const hasMessages = Boolean(elements.messages?.querySelector(".message"));
  const shouldShow = hasConversation && hasMessages && !isFeedNearBottom(120);
  elements.scrollBottomBtn.classList.toggle("hidden", !shouldShow);
}

function handleScrollBottomClick() {
  requestFeedStickToBottom(3200);
  scrollMessagesToBottom();
  renderScrollBottomButton();
}

function renderMemberRow(details, member) {
  const isAdmin = details.admins.includes(member.id);
  const canManageMember = details.canManage && member.id !== currentUser.id;
  const knownContacts = new Set(getCurrentUser()?.contactIds || []);
  const canAddContact = member.id !== currentUser.id && !knownContacts.has(member.id);
  return `
    <div class="member-row">
      ${renderAvatarMarkup(member, "member-avatar", member.name, { photoAction: true })}
      <div class="member-meta">
        <strong>${escapeHtml(member.name)}</strong>
        <span class="muted-line">@${escapeHtml(member.username)}</span>
      </div>
      ${isAdmin ? '<span class="role-chip">Admin</span>' : ""}
      <div class="member-actions">
        ${canAddContact ? `<button class="icon-btn mini" data-drawer-action="add-contact" data-user-id="${member.id}" type="button" title="Adicionar contato">${ICONS.plus}</button>` : ""}
        ${canManageMember ? `<button class="icon-btn mini" data-drawer-action="toggle-admin" data-user-id="${member.id}" type="button" title="Admin">${ICONS.crown}</button><button class="icon-btn mini" data-drawer-action="remove-member" data-user-id="${member.id}" type="button" title="Remover">${ICONS.remove}</button>` : ""}
      </div>
    </div>
  `;
}

function renderMessageFooter(message, reactionMarkup) {
  const flags = [];
  if (message.isPinned) {
    flags.push('<span class="flag-chip">Fixada</span>');
  }
  const cornerActions = [];
  if (message.isFavorite) {
    cornerActions.push(`<span class="favorite-badge" title="Favorita">${ICONS.star}</span>`);
  }
  if (reactionMarkup) {
    cornerActions.push(reactionMarkup);
  }
  if (!flags.length && !cornerActions.length) {
    return "";
  }
  return `
    <div class="message-footer">
      <div class="flag-row">${flags.join("")}</div>
      ${cornerActions.length ? `<div class="message-corner-actions">${cornerActions.join("")}</div>` : ""}
    </div>
  `;
}

function renderMessageBottomMeta(message) {
  const parts = [];
  if (userSettings.showMessageTime) {
    parts.push(`<span class="muted-line">${formatClock(message.createdAt)}</span>`);
  }
  if (message.senderId === currentUser.id) {
    parts.push(`<span class="check-status ${message.senderStatus}">${statusIcon(message.senderStatus)}</span>`);
  }
  if (!parts.length) {
    return "";
  }
  return `<div class="message-bottom-meta${message.senderId === currentUser.id ? " mine" : ""}">${parts.join("")}</div>`;
}

function renderReplySnippet(messages, replyId) {
  const message = messages.find((item) => item.id === replyId);
  if (!message) {
    return "";
  }
  const preview = message.text || "Anexo";
  return `
    <button class="reply-snippet" data-action="jump-reply" data-reply-id="${message.id}" type="button">
      <strong>${escapeHtml(message.sender?.name || "Mensagem")}</strong>
      <span>${escapeHtml(clipText(preview, 90))}</span>
    </button>
  `;
}

function normalizeAudioAttachment(item) {
  if (item && typeof item === "object") {
    return {
      url: String(item.url || ""),
      previewUrl: typeof item.previewUrl === "string" ? item.previewUrl : "",
      mimeType: typeof item.mimeType === "string" ? item.mimeType : "",
      duration: Number.isFinite(Number(item.duration)) ? Math.max(0, Math.round(Number(item.duration))) : 0,
      waveform: Array.isArray(item.waveform) ? item.waveform.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : []
    };
  }
  return {
    url: typeof item === "string" ? item : "",
    previewUrl: "",
    mimeType: "",
    duration: 0,
    waveform: []
  };
}

function buildAudioSourceMarkup(audio) {
  const src = audio.previewUrl || audio.url;
  if (!src) {
    return "";
  }
  const typeAttr = audio.mimeType ? ` type="${escapeHtml(audio.mimeType)}"` : "";
  return `<audio class="audio-native" preload="metadata"><source src="${src}"${typeAttr}>Seu navegador nao conseguiu reproduzir este audio.</audio>`;
}

function compressWaveform(levels, size = 28) {
  const source = Array.isArray(levels) ? levels.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [];
  if (!source.length) {
    return Array.from({ length: size }, (_, index) => 0.1 + ((index % 5) * 0.035));
  }
  if (source.length === size) {
    return source.map((value) => Math.max(0.08, Math.min(1, value)));
  }
  const step = source.length / size;
  return Array.from({ length: size }, (_, index) => {
    const start = Math.floor(index * step);
    const end = Math.max(start + 1, Math.floor((index + 1) * step));
    const slice = source.slice(start, end);
    const average = slice.reduce((total, value) => total + value, 0) / slice.length;
    return Math.max(0.08, Math.min(1, average));
  });
}

function renderWaveform(levels, live = false) {
  const bars = compressWaveform(levels, live ? 48 : 52);
  return `
    <div class="waveform ${live ? "live" : "static"}" aria-hidden="true">
      ${bars.map((value) => `<span class="waveform-bar" style="--level:${value.toFixed(3)}"></span>`).join("")}
    </div>
  `;
}

function formatDurationLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatPlaybackRateLabel(rate) {
  const value = Number(rate) || 1;
  return `${value.toFixed(1).replace(".0", "")}x`;
}

function buildAudioPlayerMarkup(audio, label = "Audio") {
  const durationLabel = audio.duration ? formatDurationLabel(audio.duration) : "0:00";
  return `
    <div class="audio-player" data-duration="${audio.duration || 0}" data-rate="1">
      <div class="audio-player-row">
        <button class="audio-toggle-btn" data-audio-action="toggle" type="button" title="Reproduzir">${ICONS.play}</button>
        <div class="audio-wave-shell" data-audio-action="seek" role="button" tabindex="0" aria-label="Linha do audio">
          ${renderWaveform(audio.waveform)}
          <span class="audio-progress-line"></span>
        </div>
        <div class="audio-player-side">
          <span class="audio-time"><span data-audio-current>0:00</span> / <span data-audio-duration>${durationLabel}</span></span>
          <button class="audio-speed-btn" data-audio-action="speed" type="button" title="Velocidade de reproducao">1x</button>
        </div>
      </div>
      ${buildAudioSourceMarkup(audio)}
    </div>
  `;
}

function renderAudioBubble(item) {
  const audio = normalizeAudioAttachment(item);
  if (!(audio.previewUrl || audio.url)) {
    return "";
  }
  return `
    <div class="audio-card">
      <div class="audio-card-head">
        <strong>Audio</strong>
        <span class="muted-line">${audio.duration ? formatDurationLabel(audio.duration) : "Pronto para ouvir"}</span>
      </div>
      ${buildAudioPlayerMarkup(audio)}
    </div>
  `;
}

function renderAttachments(attachments) {
  const images = attachments.images.map((src) => `<img class="bubble-image" src="${src}" alt="imagem" data-image="${src}">`).join("");
  const docs = attachments.docs.map((doc) => `<a class="doc-pill" href="${doc.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.name)}</a>`).join("");
  const audio = attachments.audio.map((item) => renderAudioBubble(item)).join("");
  return images || docs || audio ? `<div class="attachment-row">${images}${docs}${audio}</div>` : "";
}

function attachmentSummary(attachments) {
  if (!attachments) {
    return "";
  }
  if (attachments.images?.length) {
    return `${attachments.images.length} imagem(ns)`;
  }
  if (attachments.docs?.length) {
    return attachments.docs[0]?.name || "Documento";
  }
  if (attachments.audio?.length) {
    return "Audio";
  }
  return "";
}

function renderReactionButtons(message) {
  if (!userSettings.showReactionBar || state.selectionMode) {
    return "";
  }
  const counts = REACTIONS
    .map((reaction) => {
      const count = Array.isArray(message.reactions[reaction.token]) ? message.reactions[reaction.token].length : 0;
      return count ? `<span class="reaction-count">${reaction.label}<span>${count}</span></span>` : "";
    })
    .join("");
  return `
    <div class="reaction-strip ${state.openReactionPickerId === message.id ? "open" : ""}">
      <button class="reaction-toggle" data-action="toggle-reactions" type="button" title="Reagir">${ICONS.smile}</button>
      <div class="reaction-options ${state.openReactionPickerId === message.id ? "open" : ""}">
        ${REACTIONS.map((reaction) => {
          const active = Array.isArray(message.reactions[reaction.token]) && message.reactions[reaction.token].includes(currentUser.id);
          return `<button class="reaction-btn ${active ? "active" : ""}" data-action="react" data-reaction="${reaction.token}" type="button">${reaction.label}</button>`;
        }).join("")}
      </div>
      <div class="reaction-counts">${counts}</div>
    </div>
  `;
}

function renderReplyBanner(messages) {
  if (!state.replyTo || state.selectionMode) {
    elements.replyBanner.classList.add("hidden");
    return;
  }
  const message = messages.find((item) => item.id === state.replyTo);
  if (!message) {
    clearReply();
    return;
  }
  elements.replyText.textContent = clipText(message.text, 120);
  elements.replyBanner.classList.remove("hidden");
}

function renderAttachmentPreview() {
  const pieces = [];

  if (state.recorder) {
    const elapsed = state.recordingStartedAt ? (Date.now() - state.recordingStartedAt) / 1000 : 0;
    pieces.push(`
      <div class="recording-card">
        <div class="recording-card-head">
          <span class="recording-badge"><span class="recording-dot"></span>Gravando audio</span>
          <div class="recording-card-actions">
            <span class="muted-line recording-elapsed">${formatDurationLabel(elapsed)}</span>
            <button class="icon-btn mini" data-attachment-action="stop-recording" type="button" title="Parar gravacao">${ICONS.stop}</button>
          </div>
        </div>
        <div class="recording-wave-slot">${renderWaveform(state.recordingLevels, true)}</div>
      </div>
    `);
  }

  const chips = [
    ...state.pendingImages.map((item, index) => ({ kind: "image", label: `Imagem ${index + 1}`, index })),
    ...state.pendingDocs.map((item, index) => ({ kind: "doc", label: item.name, index }))
  ];
  if (chips.length) {
    pieces.push(`<div class="attachment-chip-row">${chips.map((item) => `<button class="attachment-chip" data-attachment-action="remove" data-kind="${item.kind}" data-index="${item.index}" type="button">${escapeHtml(item.label)}<span>${ICONS.close}</span></button>`).join("")}</div>`);
  }

  if (state.pendingAudio.length) {
    pieces.push(...state.pendingAudio.map((item, index) => {
      const audio = normalizeAudioAttachment(item);
      return `
        <div class="audio-preview-card">
          <div class="audio-card-head">
            <strong>Audio ${index + 1}</strong>
            <div class="recording-card-actions">
              <span class="muted-line">${audio.duration ? formatDurationLabel(audio.duration) : "0:00"}</span>
              <button class="icon-btn mini" data-attachment-action="remove" data-kind="audio" data-index="${index}" type="button" title="Remover audio">${ICONS.close}</button>
            </div>
          </div>
          ${buildAudioPlayerMarkup(audio, `Audio ${index + 1}`)}
        </div>
      `;
    }));
  }

  if (!pieces.length) {
    elements.attachmentPreview.classList.add("hidden");
    elements.attachmentPreview.innerHTML = "";
    syncComposerPrimaryAction();
    return;
  }
  elements.attachmentPreview.classList.remove("hidden");
  elements.attachmentPreview.innerHTML = pieces.join("");
  hydrateAudioPlayers(elements.attachmentPreview);
  syncComposerPrimaryAction();
}

function updateRecordingPreviewCard() {
  if (!state.recorder) {
    return;
  }
  const card = elements.attachmentPreview.querySelector(".recording-card");
  if (!card) {
    renderAttachmentPreview();
    return;
  }
  const elapsedNode = card.querySelector(".recording-elapsed");
  const waveformNode = card.querySelector(".recording-wave-slot");
  if (elapsedNode) {
    const elapsed = state.recordingStartedAt ? (Date.now() - state.recordingStartedAt) / 1000 : 0;
    elapsedNode.textContent = formatDurationLabel(elapsed);
  }
  if (waveformNode) {
    waveformNode.innerHTML = renderWaveform(state.recordingLevels, true);
  }
}

function setAudioToggleVisual(button, playing) {
  if (!button) {
    return;
  }
  button.innerHTML = playing ? ICONS.pause : ICONS.play;
  button.setAttribute("title", playing ? "Pausar" : "Reproduzir");
}

function updateAudioPlayerUI(player) {
  if (!player) {
    return;
  }
  const audio = player.querySelector(".audio-native");
  const toggle = player.querySelector('[data-audio-action="toggle"]');
  const currentNode = player.querySelector("[data-audio-current]");
  const durationNode = player.querySelector("[data-audio-duration]");
  const speedButton = player.querySelector('[data-audio-action="speed"]');
  if (!audio || !toggle || !currentNode || !durationNode) {
    return;
  }
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Number(player.dataset.duration || 0);
  const current = Number.isFinite(audio.currentTime) && audio.currentTime > 0 ? audio.currentTime : 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  player.style.setProperty("--audio-progress", `${(progress * 100).toFixed(3)}%`);
  currentNode.textContent = formatDurationLabel(current);
  durationNode.textContent = formatDurationLabel(duration);
  player.classList.toggle("is-playing", !audio.paused && !audio.ended);
  setAudioToggleVisual(toggle, !audio.paused && !audio.ended);
  if (speedButton) {
    speedButton.textContent = formatPlaybackRateLabel(audio.playbackRate || Number(player.dataset.rate || 1));
  }
}

function pauseOtherAudioPlayers(activePlayer) {
  document.querySelectorAll(".audio-player").forEach((player) => {
    if (player === activePlayer) {
      return;
    }
    const audio = player.querySelector(".audio-native");
    if (audio && !audio.paused) {
      audio.pause();
    }
    updateAudioPlayerUI(player);
  });
}

function hydrateAudioPlayers(root) {
  if (!root) {
    return;
  }
  root.querySelectorAll(".audio-player").forEach((player) => {
    if (player.dataset.audioHydrated === "true") {
      updateAudioPlayerUI(player);
      return;
    }
    const audio = player.querySelector(".audio-native");
    if (!audio) {
      return;
    }
    const rate = Number(player.dataset.rate || 1);
    audio.playbackRate = AUDIO_SPEEDS.includes(rate) ? rate : 1;
    const sync = () => updateAudioPlayerUI(player);
    ["loadedmetadata", "durationchange", "timeupdate", "play", "pause", "ended", "seeked"].forEach((eventName) => {
      audio.addEventListener(eventName, sync);
    });
    player.dataset.audioHydrated = "true";
    player.dataset.duration = player.dataset.duration || "0";
    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        player.dataset.duration = String(audio.duration);
      }
    });
    sync();
  });
}

function cycleAudioPlayerSpeedFromTarget(target) {
  const button = target.closest('[data-audio-action="speed"]');
  if (!button) {
    return false;
  }
  const player = button.closest(".audio-player");
  const audio = player?.querySelector(".audio-native");
  if (!player || !audio) {
    return true;
  }
  const currentRate = Number(player.dataset.rate || audio.playbackRate || 1);
  const currentIndex = AUDIO_SPEEDS.findIndex((value) => Math.abs(value - currentRate) < 0.01);
  const nextRate = AUDIO_SPEEDS[(currentIndex + 1 + AUDIO_SPEEDS.length) % AUDIO_SPEEDS.length];
  player.dataset.rate = String(nextRate);
  audio.playbackRate = nextRate;
  updateAudioPlayerUI(player);
  return true;
}

function toggleAudioPlayerFromTarget(target) {
  const button = target.closest('[data-audio-action="toggle"]');
  if (!button) {
    return false;
  }
  const player = button.closest(".audio-player");
  const audio = player?.querySelector(".audio-native");
  if (!player || !audio) {
    return true;
  }
  if (audio.paused || audio.ended) {
    pauseOtherAudioPlayers(player);
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
  updateAudioPlayerUI(player);
  return true;
}

function seekAudioPlayerFromTarget(target, nativeEvent) {
  const shell = target.closest('[data-audio-action="seek"]');
  if (!shell) {
    return false;
  }
  const player = shell.closest(".audio-player");
  const audio = player?.querySelector(".audio-native");
  if (!player || !audio) {
    return true;
  }
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Number(player.dataset.duration || 0);
  if (!duration) {
    return true;
  }
  const rect = shell.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (nativeEvent.clientX - rect.left) / Math.max(rect.width, 1)));
  audio.currentTime = duration * ratio;
  updateAudioPlayerUI(player);
  return true;
}

function renderConversationSearch() {
  const term = elements.conversationSearchInput.value.trim().toLowerCase();
  elements.conversationSearchResults.innerHTML = "";
  if (!term || !state.currentConversationId) {
    return;
  }
  const items = getMessagesForConversation(currentUser.id, state.currentConversationId).filter((message) => message.text.toLowerCase().includes(term));
  if (!items.length) {
    elements.conversationSearchResults.innerHTML = '<div class="empty-block">Nada encontrado nesta conversa.</div>';
    return;
  }
  items.forEach((message) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "search-item";
    row.dataset.messageId = message.id;
    row.innerHTML = `<strong>${escapeHtml(message.sender?.name || "Conta")}</strong><span>${escapeHtml(clipText(message.text, 120))}</span><span class="muted-line">${formatClock(message.createdAt)}</span>`;
    row.addEventListener("click", () => focusMessage(message.id));
    elements.conversationSearchResults.appendChild(row);
  });
}

function toggleSessionMenu() {
  setQuickCreateMenuOpen(false);
  state.openConversationMenu = false;
  renderConversationMenu();
  state.openSessionMenu = !state.openSessionMenu;
  elements.sessionMenu.classList.toggle("hidden", !state.openSessionMenu);
}

function toggleQuickCreateMenu() {
  state.openSessionMenu = false;
  elements.sessionMenu.classList.add("hidden");
  state.openConversationMenu = false;
  renderConversationMenu();
  setQuickCreateMenuOpen(!state.openQuickCreateMenu);
}

function handleQuickCreateMenuClick(event) {
  const button = event.target.closest("button[data-quick-action]");
  if (!button) {
    return;
  }
  setQuickCreateMenuOpen(false);
  if (button.dataset.quickAction === "create-group") {
    openCreateGroupModal();
    return;
  }
  if (button.dataset.quickAction === "add-contact") {
    openAddContactModal();
  }
}

function setQuickCreateMenuOpen(open) {
  state.openQuickCreateMenu = open;
  elements.quickCreateMenu.classList.toggle("hidden", !open);
  elements.quickCreateBtn.classList.toggle("active", open);
  document.body.classList.toggle("quick-create-open", open && isMobileViewport());
}

function toggleConversationMenu() {
  if (!state.currentConversationId) {
    return;
  }
  state.openSessionMenu = false;
  elements.sessionMenu.classList.add("hidden");
  setQuickCreateMenuOpen(false);
  state.openConversationMenu = !state.openConversationMenu;
  renderConversationMenu();
}

function handleConversationMenuClick(event) {
  const button = event.target.closest("button[data-conversation-action]");
  if (!button || !state.currentConversationId) {
    return;
  }
  const details = getConversationDetails(currentUser.id, state.currentConversationId);
  if (!details) {
    return;
  }
  const snapshot = exportState();
  const previousConversationId = state.currentConversationId;
  const action = button.dataset.conversationAction;
  let toastLabel = "";

  if (action === "select-messages") {
    state.selectionMode = true;
    state.selectedMessageIds = [];
    state.openConversationMenu = false;
    state.openMessageMenuId = null;
    state.openReactionPickerId = null;
    renderAll();
    return;
  }

  if (action === "toggle-pin") {
    const pinned = toggleConversationPinned(currentUser.id, state.currentConversationId);
    toastLabel = pinned ? "Conversa fixada no topo." : "Conversa desafixada.";
  }
  if (action === "toggle-archive") {
    if (details.isRemote && details.threadId) {
      setConversationArchived(details.threadId, !details.isArchived)
        .then(() => syncRemoteChatData())
        .then(() => {
          state.openConversationMenu = false;
          syncConversationSelection();
          renderAll();
        })
        .catch((error) => alert(error?.message || "Nao foi possivel arquivar a conversa."));
      return;
    }
    const archived = toggleConversationArchived(currentUser.id, state.currentConversationId);
    toastLabel = archived ? "Conversa arquivada." : "Conversa desarquivada.";
  }
  if (action === "clear-history") {
    if (details.isRemote && details.threadId) {
      clearRemoteConversationForMe(details.threadId)
        .then(() => syncRemoteChatData())
        .then(() => {
          state.openConversationMenu = false;
          syncConversationSelection();
          renderAll();
        })
        .catch((error) => alert(error?.message || "Nao foi possivel limpar essa conversa."));
      return;
    }
    clearConversationHistory(currentUser.id, state.currentConversationId);
    toastLabel = "Historico limpo desta conversa.";
  }

  state.openConversationMenu = false;
  syncConversationSelection();
  renderAll();
  showUndoToast(toastLabel, snapshot, previousConversationId);
}

function syncConversationSelection() {
  if (!state.currentConversationId) {
    state.selectionMode = false;
    state.selectedMessageIds = [];
    state.detailsOpen = false;
    state.mobilePanel = "list";
    history.replaceState(null, "", "chat.html");
    return;
  }
  const entries = getConversationEntries(currentUser.id, elements.threadSearch.value, state.filter);
  if (entries.some((item) => item.id === state.currentConversationId)) {
    return;
  }
  state.selectionMode = false;
  state.selectedMessageIds = [];
  state.currentConversationId = null;
  state.detailsOpen = false;
  state.mobilePanel = "list";
  history.replaceState(null, "", "chat.html");
}

function showUndoToast(message, snapshot, previousConversationId = state.currentConversationId) {
  if (!message) {
    return;
  }
  state.undoToken += 1;
  const token = state.undoToken;
  clearTimeout(state.undoTimer);
  elements.undoToast.innerHTML = `
    <div class="undo-toast-copy">
      <strong>${escapeHtml(message)}</strong>
      <span>Voce pode desfazer pelos proximos 5 segundos.</span>
    </div>
    <button id="undo-toast-btn" class="ghost-btn compact" type="button">${ICONS.undo}<span>Desfazer</span></button>
    <div class="undo-toast-progress"></div>
  `;
  elements.undoToast.classList.remove("hidden");
  elements.undoToast.classList.add("visible");
  elements.undoToast.querySelector("#undo-toast-btn")?.addEventListener("click", () => {
    if (token !== state.undoToken) {
      return;
    }
    importState(snapshot);
    syncUserSettings();
    state.currentConversationId = previousConversationId;
    state.detailsOpen = false;
    state.mobilePanel = previousConversationId ? "chat" : "list";
    syncConversationSelection();
    renderAll();
    hideUndoToast();
  }, { once: true });
  state.undoTimer = setTimeout(() => {
    if (token === state.undoToken) {
      hideUndoToast();
    }
  }, 5000);
}

function hideUndoToast() {
  clearTimeout(state.undoTimer);
  state.undoTimer = null;
  elements.undoToast.classList.remove("visible");
  elements.undoToast.classList.add("hidden");
  elements.undoToast.innerHTML = "";
}

function handleThreadClick(event) {
  const button = event.target.closest(".thread-item");
  if (!button) {
    return;
  }
  selectConversation(button.dataset.conversationId);
}

function selectConversation(conversationId) {
  if (!conversationId) {
    return;
  }
  flushPendingDraftSave();
  stopComposerTyping();
  state.unreadMarker = getUnreadMarkerForConversation(conversationId);
  state.mentionJumpMarker = getMentionJumpMarkerForConversation(conversationId);
  const firstUnreadMessageId = state.unreadMarker?.messageId || "";
  state.selectionMode = false;
  state.selectedMessageIds = [];
  state.currentConversationId = conversationId;
  state.openMessageMenuId = null;
  state.openReactionPickerId = null;
  state.openConversationMenu = false;
  state.openSessionMenu = false;
  state.detailsOpen = false;
  state.mobilePanel = "chat";
  setQuickCreateMenuOpen(false);
  elements.sessionMenu.classList.add("hidden");
  elements.conversationSearchPanel.classList.add("hidden");
  clearReply();
  clearPending();
  markConversationRead(currentUser.id, conversationId);
  syncRemoteReadState(conversationId);
  history.replaceState(null, "", `chat.html?c=${encodeURIComponent(conversationId)}`);
  renderAll();
  positionConversationViewport(firstUnreadMessageId);
}

function closeMentionPanel() {
  state.mentionSuggestions = [];
  state.mentionSelectedIndex = 0;
  state.mentionQueryRange = null;
  elements.mentionPanel.innerHTML = "";
  elements.mentionPanel.classList.add("hidden");
}

function getMentionContext() {
  if (!state.currentConversationId) {
    return null;
  }
  const cursorStart = elements.composer.selectionStart ?? 0;
  const cursorEnd = elements.composer.selectionEnd ?? cursorStart;
  if (cursorStart !== cursorEnd) {
    return null;
  }
  const beforeCursor = elements.composer.value.slice(0, cursorStart);
  const match = beforeCursor.match(/(^|[\s(])@([a-z0-9._-]*)$/i);
  if (!match) {
    return null;
  }
  const details = getConversationDetails(currentUser.id, state.currentConversationId);
  if (!details || details.type !== "group") {
    return null;
  }
  return {
    details,
    query: sanitizeUsernameInput(match[2] || ""),
    start: cursorStart - (match[2] || "").length - 1,
    end: cursorStart
  };
}

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function renderMentionPanel() {
  if (!state.mentionQueryRange) {
    closeMentionPanel();
    return;
  }
  if (!state.mentionSuggestions.length) {
    elements.mentionPanel.innerHTML = '<div class="mention-empty">Nenhum participante encontrado.</div>';
    elements.mentionPanel.classList.remove("hidden");
    return;
  }
  elements.mentionPanel.innerHTML = state.mentionSuggestions.map((member, index) => `
    <button class="mention-item${index === state.mentionSelectedIndex ? " active" : ""}" data-user-id="${member.id}" type="button">
      ${renderAvatarMarkup(member, "member-avatar mention-avatar", member.name)}
      <span class="mention-copy">
        <strong>${escapeHtml(member.name)}</strong>
        <small>@${escapeHtml(member.username)}</small>
      </span>
    </button>
  `).join("");
  elements.mentionPanel.classList.remove("hidden");
}

function syncMentionSuggestions() {
  const context = getMentionContext();
  if (!context) {
    closeMentionPanel();
    return;
  }
  const previousActiveId = state.mentionSuggestions[state.mentionSelectedIndex]?.id || "";
  const suggestions = getGroupMembers(context.details.threadId, currentUser.id)
    .filter((member) => member.id !== currentUser.id)
    .filter((member) => {
      if (!context.query) {
        return true;
      }
      const username = sanitizeUsernameInput(member.username);
      const normalizedName = normalizeSearchValue(member.name);
      return username.includes(context.query) || normalizedName.includes(context.query);
    })
    .sort((left, right) => {
      const leftStarts = sanitizeUsernameInput(left.username).startsWith(context.query) ? 1 : 0;
      const rightStarts = sanitizeUsernameInput(right.username).startsWith(context.query) ? 1 : 0;
      if (leftStarts !== rightStarts) {
        return rightStarts - leftStarts;
      }
      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 7);
  state.mentionSuggestions = suggestions;
  state.mentionQueryRange = { start: context.start, end: context.end };
  const nextIndex = suggestions.findIndex((member) => member.id === previousActiveId);
  state.mentionSelectedIndex = nextIndex >= 0 ? nextIndex : 0;
  renderMentionPanel();
}

function applyMentionSuggestion(userId) {
  const member = state.mentionSuggestions.find((item) => item.id === userId);
  if (!member || !state.mentionQueryRange) {
    closeMentionPanel();
    return;
  }
  const mentionText = `@${member.username} `;
  const nextValue = `${elements.composer.value.slice(0, state.mentionQueryRange.start)}${mentionText}${elements.composer.value.slice(state.mentionQueryRange.end)}`;
  const nextCursor = state.mentionQueryRange.start + mentionText.length;
  elements.composer.value = nextValue;
  elements.composer.setSelectionRange(nextCursor, nextCursor);
  closeMentionPanel();
  handleComposerInput();
  elements.composer.focus();
}

function handleMentionPanelClick(event) {
  const button = event.target.closest("[data-user-id]");
  if (!button) {
    return;
  }
  applyMentionSuggestion(button.dataset.userId);
}

function handleComposerCursorChange(event) {
  if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter" || event.key === "Tab" || event.key === "Escape") {
    return;
  }
  syncMentionSuggestions();
}

function findMentionTargetByHandle(handle) {
  const normalizedHandle = sanitizeUsernameInput(handle);
  if (!normalizedHandle) {
    return null;
  }
  const details = state.currentConversationId ? getConversationDetails(currentUser.id, state.currentConversationId) : null;
  if (details?.type === "group") {
    const fromGroup = getGroupMembers(details.threadId, currentUser.id)
      .find((member) => sanitizeUsernameInput(member.username) === normalizedHandle);
    if (fromGroup) {
      return fromGroup;
    }
  }
  return listUsersForPicker(currentUser.id).find((user) => sanitizeUsernameInput(user.username) === normalizedHandle) || null;
}

async function openMentionDirectChat(handle) {
  const targetUser = findMentionTargetByHandle(handle);
  if (!targetUser || targetUser.id === currentUser.id) {
    return;
  }
  try {
    await upsertMyContact({ contactUserId: targetUser.id });
    await createOrGetDirectConversation(targetUser.id);
    await syncRemoteChatData();
  } catch (error) {
    console.error(error);
  }
  const nextConversationId = getConversationIdForDirect(targetUser.id) || `direct:${targetUser.id}`;
  selectConversation(nextConversationId);
}

function handleComposerInput() {
  autoResizeComposer();
  syncComposerPrimaryAction();
  if (!state.currentConversationId) {
    stopComposerTyping();
    closeMentionPanel();
    return;
  }
  syncMentionSuggestions();
  scheduleDraftSave(state.currentConversationId, elements.composer.value);
  elements.draftStatus.textContent = "Draft salvo";
  if (!elements.composer.value.trim()) {
    stopComposerTyping();
    return;
  }
  bumpComposerTyping();
}

function handleComposerKeydown(event) {
  if (!elements.mentionPanel.classList.contains("hidden")) {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && state.mentionSuggestions.length) {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      state.mentionSelectedIndex = (state.mentionSelectedIndex + delta + state.mentionSuggestions.length) % state.mentionSuggestions.length;
      renderMentionPanel();
      return;
    }
    if ((event.key === "Enter" || event.key === "Tab") && state.mentionSuggestions.length) {
      event.preventDefault();
      applyMentionSuggestion(state.mentionSuggestions[state.mentionSelectedIndex].id);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMentionPanel();
      return;
    }
  }
  const shouldSendOnEnter = userSettings.enterToSend;
  const wantsShortcutSend = event.key === "Enter" && (event.ctrlKey || event.metaKey);
  if ((shouldSendOnEnter && event.key === "Enter" && !event.shiftKey) || (!shouldSendOnEnter && wantsShortcutSend)) {
    event.preventDefault();
    handleSend(event);
  }
}

async function handleSend(event) {
  event.preventDefault();
  if (!state.currentConversationId) {
    return;
  }
  if (state.recorder) {
    alert("Pare a gravacao antes de enviar a mensagem.");
    return;
  }
  const text = elements.composer.value.trim();
  if (!text && !state.pendingImages.length && !state.pendingDocs.length && !state.pendingAudio.length) {
    return;
  }
  const details = getConversationDetails(currentUser.id, state.currentConversationId);
  const localPayload = {
    text,
    replyTo: state.replyTo,
    attachments: {
      images: [...state.pendingImages],
      docs: [...state.pendingDocs],
      audio: state.pendingAudio.map((item) => {
        const audio = normalizeAudioAttachment(item);
        return {
          url: audio.url,
          mimeType: audio.mimeType,
          duration: audio.duration,
          waveform: audio.waveform
        };
      })
    }
  };
  let optimisticMessage = null;
  requestFeedStickToBottom(2000);
  try {
    if (details?.isRemote) {
      let conversationId = details.threadId;
      if (!conversationId && details.type === "direct" && details.targetUser?.id) {
        const remoteConversation = await createOrGetDirectConversation(details.targetUser.id);
        conversationId = remoteConversation.id;
      }
      if (!conversationId) {
        throw new Error("Conversa remota indisponivel");
      }
      optimisticMessage = sendMessage(currentUser.id, state.currentConversationId, localPayload);
      state.remoteSyncMutedUntil = Date.now() + 12000;
      renderAll();
      scrollMessagesToBottom();
      const uploaded = await uploadPendingRemoteAttachments(conversationId);
      await sendRemoteMessage({
        conversationId,
        text,
        replyTo: state.replyTo,
        attachments: uploaded.attachments,
        metadata: uploaded.metadata
      });
      queueRemoteChatSync(0, { keepBottom: true, suppressRealtimeFor: 900 });
    } else {
      sendMessage(currentUser.id, state.currentConversationId, localPayload);
    }
  } catch (error) {
    state.remoteSyncMutedUntil = 0;
    if (optimisticMessage?.id) {
      deleteMessages(currentUser.id, [optimisticMessage.id], "everyone");
      renderAll();
    }
    alert(error?.message || "Nao foi possivel enviar a mensagem agora.");
    return;
  }
  elements.composer.value = "";
  closeMentionPanel();
  autoResizeComposer(true);
  stopComposerTyping();
  flushPendingDraftSave();
  saveDraft(currentUser.id, state.currentConversationId, "");
  clearReply();
  clearPending();
  renderAll();
  scrollMessagesToBottom();
}

async function handleImageUpload(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    try {
      state.pendingImages.push(await fileToChatImageDataUrl(file));
    } catch {
      alert("Nao foi possivel processar essa imagem.");
    }
  }
  renderAttachmentPreview();
  event.target.value = "";
}

async function handleDocUpload(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    try {
      state.pendingDocs.push({ name: file.name, url: await fileToDataUrl(file) });
    } catch {
      alert("Nao foi possivel processar esse arquivo.");
    }
  }
  renderAttachmentPreview();
  event.target.value = "";
}

function cleanupRecordingMeter() {
  if (state.recordingMeterTimer) {
    window.clearInterval(state.recordingMeterTimer);
    state.recordingMeterTimer = null;
  }
  if (state.audioSource) {
    try {
      state.audioSource.disconnect();
    } catch {}
    state.audioSource = null;
  }
  state.audioAnalyser = null;
  if (state.audioContext) {
    const currentContext = state.audioContext;
    state.audioContext = null;
    try {
      currentContext.close();
    } catch {}
  }
}

function revokePendingAudioPreviewUrl(item) {
  const audio = normalizeAudioAttachment(item);
  if (audio.previewUrl && audio.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(audio.previewUrl);
  }
}

function revokeAllPendingAudioPreviewUrls() {
  state.pendingAudio.forEach(revokePendingAudioPreviewUrl);
}

function setVoiceRecordingState(active) {
  elements.voiceBtn.classList.toggle("active", active);
  elements.voiceBtn.innerHTML = active ? ICONS.stop : ICONS.mic;
  elements.voiceBtn.setAttribute("title", active ? "Parar gravacao" : "Audio");
  syncComposerPrimaryAction();
}

function stopRecordingStream() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
}

function startRecordingMeter(stream) {
  cleanupRecordingMeter();
  state.recordingStartedAt = Date.now();
  state.recordingLevels = Array.from({ length: 48 }, () => 0.1);
  state.recordingWaveform = [];

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    state.recordingMeterTimer = window.setInterval(() => {
      const level = 0.08 + Math.random() * 0.42;
      state.recordingLevels = [...state.recordingLevels.slice(-47), level];
      state.recordingWaveform.push(level);
      if (state.recordingWaveform.length > 140) {
        state.recordingWaveform.shift();
      }
      updateRecordingPreviewCard();
    }, 90);
    return;
  }

  try {
    state.audioContext = new AudioContextClass();
    state.audioAnalyser = state.audioContext.createAnalyser();
    state.audioAnalyser.fftSize = 128;
    state.audioAnalyser.smoothingTimeConstant = 0.84;
    state.audioSource = state.audioContext.createMediaStreamSource(stream);
    state.audioSource.connect(state.audioAnalyser);

    const buffer = new Uint8Array(state.audioAnalyser.frequencyBinCount);
    state.recordingMeterTimer = window.setInterval(() => {
      if (!state.audioAnalyser) {
        return;
      }
      state.audioAnalyser.getByteTimeDomainData(buffer);
      let total = 0;
      for (let index = 0; index < buffer.length; index += 1) {
        const normalized = (buffer[index] - 128) / 128;
        total += normalized * normalized;
      }
      const rms = Math.sqrt(total / buffer.length);
      const boostedLevel = Math.max(0.06, Math.min(1, (rms * 9.4) + 0.02));
      const previous = state.recordingLevels[state.recordingLevels.length - 1] || 0.08;
      const level = Math.max(0.06, Math.min(1, (previous * 0.28) + (boostedLevel * 0.72)));
      state.recordingLevels = [...state.recordingLevels.slice(-47), level];
      state.recordingWaveform.push(level);
      if (state.recordingWaveform.length > 140) {
        state.recordingWaveform.shift();
      }
      updateRecordingPreviewCard();
    }, 90);
  } catch {
    state.recordingMeterTimer = window.setInterval(() => {
      const level = 0.08 + Math.random() * 0.42;
      state.recordingLevels = [...state.recordingLevels.slice(-47), level];
      state.recordingWaveform.push(level);
      if (state.recordingWaveform.length > 140) {
        state.recordingWaveform.shift();
      }
      updateRecordingPreviewCard();
    }, 90);
  }
}

function pickAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  const probe = document.createElement("audio");
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/webm",
    "audio/ogg",
    "audio/mp4"
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type) && (probe.canPlayType(type) || probe.canPlayType(type.split(";")[0]))) || candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function getAudioDurationFromSource(src) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    let settled = false;
    const finish = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.oncanplaythrough = () => finish(audio.duration);
    audio.onerror = () => finish(0);
    window.setTimeout(() => finish(audio.duration), 4000);
    audio.src = src;
  });
}

async function toggleRecording() {
  if (state.recorder) {
    state.recorder.stop();
    setVoiceRecordingState(false);
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startRecordingMeter(state.stream);
    const chunks = [];
    const mimeType = pickAudioMimeType();
    const recorder = mimeType ? new MediaRecorder(state.stream, { mimeType }) : new MediaRecorder(state.stream);
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = async () => {
      const estimatedDuration = state.recordingStartedAt ? Math.max(1, Math.round((Date.now() - state.recordingStartedAt) / 1000)) : 0;
      const waveform = compressWaveform(state.recordingWaveform, 52);
      cleanupRecordingMeter();
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (blob.size > 0) {
        const previewUrl = URL.createObjectURL(blob);
        const measuredDuration = await getAudioDurationFromSource(previewUrl);
        state.pendingAudio.push({
          previewUrl,
          url: await blobToDataUrl(blob),
          mimeType: blob.type || recorder.mimeType || mimeType || "audio/webm",
          duration: measuredDuration || estimatedDuration,
          waveform
        });
      }
      stopRecordingStream();
      state.recordingStartedAt = 0;
      state.recordingLevels = [];
      state.recordingWaveform = [];
      state.recorder = null;
      setVoiceRecordingState(false);
      renderAttachmentPreview();
    };
    recorder.start(250);
    state.recorder = recorder;
    setVoiceRecordingState(true);
    renderAttachmentPreview();
  } catch {
    cleanupRecordingMeter();
    stopRecordingStream();
    setVoiceRecordingState(false);
    alert("Microfone indisponivel.");
  }
}

function clearMessageGesture() {
  if (!state.messageGesture) {
    return;
  }
  clearTimeout(state.messageGesture.longPressTimer);
  if (state.messageGesture.row?.isConnected) {
    state.messageGesture.row.classList.remove("gesture-active");
    state.messageGesture.row.style.removeProperty("--swipe-offset");
  }
  state.messageGesture = null;
}

function isMessageGestureTargetAllowed(target) {
  return !target.closest("button, a, input, textarea, select, label, .audio-player, .doc-pill, .reply-snippet");
}

function handleMessageGestureStart(event) {
  if (event.pointerType === "mouse" || state.openMessageMenuId || state.openReactionPickerId) {
    return;
  }
  const row = event.target.closest(".message-row");
  if (!row || !row.dataset.messageId || !isMessageGestureTargetAllowed(event.target)) {
    return;
  }
  clearMessageGesture();
  const gesture = {
    pointerId: event.pointerId,
    row,
    messageId: row.dataset.messageId,
    startX: event.clientX,
    startY: event.clientY,
    dx: 0,
    dy: 0,
    longPressTriggered: false,
    longPressTimer: window.setTimeout(() => {
      if (state.selectionMode || !state.messageGesture || state.messageGesture.messageId !== row.dataset.messageId) {
        return;
      }
      state.selectionMode = true;
      state.selectedMessageIds = [row.dataset.messageId];
      state.skipNextMessageClick = true;
      state.messageGesture.longPressTriggered = true;
      renderAll();
    }, 360)
  };
  state.messageGesture = gesture;
}

function handleMessageGestureMove(event) {
  const gesture = state.messageGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  gesture.dx = event.clientX - gesture.startX;
  gesture.dy = event.clientY - gesture.startY;
  if (Math.abs(gesture.dy) > 18 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
    clearMessageGesture();
    return;
  }
  if (gesture.longPressTriggered) {
    return;
  }
  if (gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
    clearTimeout(gesture.longPressTimer);
    gesture.row.classList.add("gesture-active");
    gesture.row.style.setProperty("--swipe-offset", `${Math.min(gesture.dx, 88)}px`);
  } else if (gesture.row.classList.contains("gesture-active")) {
    gesture.row.classList.remove("gesture-active");
    gesture.row.style.removeProperty("--swipe-offset");
  }
}

function handleMessageGestureEnd(event) {
  const gesture = state.messageGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  clearTimeout(gesture.longPressTimer);
  const shouldReply = !gesture.longPressTriggered && !state.selectionMode && gesture.dx >= 72 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
  const messageId = gesture.messageId;
  clearMessageGesture();
  if (gesture.longPressTriggered) {
    state.skipNextMessageClick = true;
    return;
  }
  if (shouldReply) {
    state.replyTo = messageId;
    state.skipNextMessageClick = true;
    renderConversationPreserveViewport({ messageId });
    elements.composer.focus();
  }
}

function handleMessageClick(event) {
  if (state.skipNextMessageClick) {
    state.skipNextMessageClick = false;
    return;
  }
  const articleTarget = event.target.closest(".message-row");
  if (state.selectionMode && articleTarget && !event.target.closest("button[data-action]") && !event.target.closest("a") && !event.target.closest("audio") && !event.target.closest("input")) {
    toggleMessageSelection(articleTarget.dataset.messageId);
    return;
  }
  const imageTarget = event.target.closest("img[data-image]");
  if (imageTarget) {
    if (state.selectionMode) {
      toggleMessageSelection(imageTarget.closest(".message-row")?.dataset.messageId);
      return;
    }
    openLightbox(imageTarget.dataset.image);
    return;
  }
  const photoTarget = event.target.closest("[data-photo-open='true']");
  if (photoTarget) {
    if (state.selectionMode && articleTarget?.dataset.messageId) {
      toggleMessageSelection(articleTarget.dataset.messageId);
      return;
    }
    openLightbox(photoTarget.dataset.photoSrc, photoTarget.dataset.photoLabel);
    return;
  }
  if (state.selectionMode && (event.target.closest(".audio-player") || event.target.closest(".doc-pill") || event.target.closest(".reply-snippet"))) {
    toggleMessageSelection(articleTarget?.dataset.messageId);
    return;
  }
  if (cycleAudioPlayerSpeedFromTarget(event.target)) {
    return;
  }
  if (toggleAudioPlayerFromTarget(event.target)) {
    return;
  }
  if (seekAudioPlayerFromTarget(event.target, event)) {
    return;
  }
  const target = event.target.closest("button");
  if (!target) {
    return;
  }
  const action = target.dataset.action;
  if (action === "open-mention") {
    event.preventDefault();
    openMentionDirectChat(target.dataset.mentionHandle);
    return;
  }
  const messageContainer = target.closest("[data-message-id]");
  const messageId = messageContainer?.dataset.messageId;
  const article = target.closest(".message") || document.getElementById(`msg-${messageId}`);
  if (!messageId) {
    return;
  }
  if (action === "select-toggle") {
    toggleMessageSelection(messageId);
    return;
  }
  if (state.selectionMode) {
    toggleMessageSelection(messageId);
    return;
  }
  if (action === "toggle-menu") {
    requestFeedStickToBottom();
    state.openReactionPickerId = null;
    state.openMessageMenuId = state.openMessageMenuId === messageId ? null : messageId;
    renderConversationPreserveViewport({ messageId, forceBottom: true });
    return;
  }
  if (action === "toggle-reactions") {
    requestFeedStickToBottom();
    state.openMessageMenuId = null;
    state.openReactionPickerId = state.openReactionPickerId === messageId ? null : messageId;
    renderConversationPreserveViewport({ messageId, forceBottom: true });
    return;
  }
  if (action === "reply") {
    requestFeedStickToBottom();
    state.replyTo = messageId;
    renderConversationPreserveViewport({ messageId, forceBottom: true });
    elements.composer.focus();
    return;
  }
  if (action === "jump-reply") {
    focusMessage(target.dataset.replyId);
    return;
  }
  if (action === "edit") {
    if (article.classList.contains("mine") === false) {
      return;
    }
    openEditMessageModal(messageId);
    return;
  }
  if (action === "delete") {
    if (article.classList.contains("mine") === false) {
      return;
    }
    const message = getMessagesForConversation(currentUser.id, state.currentConversationId).find((item) => item.id === messageId);
    if (!message) {
      return;
    }
    openDeleteMessagesModal([message]);
    return;
  }
  if (action === "pin") {
    requestFeedStickToBottom();
    const message = getMessagesForConversation(currentUser.id, state.currentConversationId).find((item) => item.id === messageId);
    state.openReactionPickerId = null;
    if (message?.isRemote) {
      setPinnedMessage({ conversationId: message.threadId, messageId })
        .then(() => queueRemoteChatSync(0, { keepBottom: true, suppressRealtimeFor: 700 }))
        .catch((error) => alert(error?.message || "Nao foi possivel fixar a mensagem."));
    } else {
      togglePinned(currentUser.id, messageId);
      renderConversationPreserveViewport({ messageId, forceBottom: true });
    }
    return;
  }
  if (action === "favorite") {
    requestFeedStickToBottom();
    const message = getMessagesForConversation(currentUser.id, state.currentConversationId).find((item) => item.id === messageId);
    state.openReactionPickerId = null;
    if (message?.isRemote) {
      toggleMessageFavorite(messageId)
        .then(() => queueRemoteChatSync(0, { keepBottom: true, suppressRealtimeFor: 700 }))
        .catch((error) => alert(error?.message || "Nao foi possivel favoritar a mensagem."));
    } else {
      toggleFavorite(currentUser.id, messageId);
      renderConversationPreserveViewport({ messageId, forceBottom: true });
    }
    return;
  }
  if (action === "react") {
    requestFeedStickToBottom();
    const message = getMessagesForConversation(currentUser.id, state.currentConversationId).find((item) => item.id === messageId);
    state.openReactionPickerId = null;
    if (message?.isRemote) {
      setMessageReaction(messageId, target.dataset.reaction)
        .then(() => queueRemoteChatSync(0, { keepBottom: true, suppressRealtimeFor: 700 }))
        .catch((error) => alert(error?.message || "Nao foi possivel reagir a essa mensagem."));
    } else {
      toggleReaction(currentUser.id, messageId, target.dataset.reaction);
      renderConversationPreserveViewport({ messageId, forceBottom: true });
    }
  }
}

function handleDrawerClick(event) {
  const photoTarget = event.target.closest("[data-photo-open='true']");
  if (photoTarget) {
    openLightbox(photoTarget.dataset.photoSrc, photoTarget.dataset.photoLabel);
    return;
  }
  const button = event.target.closest("button[data-drawer-action]");
  if (!button || !state.currentConversationId) {
    return;
  }
  const details = getConversationDetails(currentUser.id, state.currentConversationId);
  if (!details) {
    return;
  }
  const action = button.dataset.drawerAction;
  if (action === "edit-group") {
    openEditGroupModal(details);
  }
  if (action === "add-members") {
    openAddMembersModal(details);
  }
  if (action === "add-contact") {
    upsertMyContact({ contactUserId: button.dataset.userId })
      .then(() => syncRemoteChatData())
      .then(() => renderDrawer())
      .catch((error) => alert(error?.message || "Nao foi possivel adicionar esse contato."));
    return;
  }
  if (action === "toggle-admin") {
    if (details.isRemote) {
      const member = getGroupMembers(details.threadId, currentUser.id).find((item) => item.id === button.dataset.userId);
      const nextRole = details.admins.includes(button.dataset.userId) ? "member" : "admin";
      setMemberRole(details.threadId, button.dataset.userId, nextRole)
        .then(() => sendRemoteMessage({
          conversationId: details.threadId,
          kind: "system",
          text: nextRole === "admin"
            ? `${currentUser.name} promoveu ${member?.name || "um membro"} para admin.`
            : `${currentUser.name} removeu o cargo de admin de ${member?.name || "um membro"}.`
        }))
        .then(() => syncRemoteChatData())
        .then(() => renderAll())
        .catch((error) => alert(error?.message || "Nao foi possivel atualizar o cargo do membro."));
      return;
    }
    const result = toggleGroupAdmin(currentUser.id, details.threadId, button.dataset.userId);
    if (!result.ok) alert(result.error);
    renderAll();
  }
  if (action === "remove-member") {
    if (!confirm("Remover este membro do grupo?")) {
      return;
    }
    if (details.isRemote) {
      const member = getGroupMembers(details.threadId, currentUser.id).find((item) => item.id === button.dataset.userId);
      removeRemoteGroupMember(details.threadId, button.dataset.userId)
        .then(() => sendRemoteMessage({
          conversationId: details.threadId,
          kind: "system",
          text: `${currentUser.name} removeu ${member?.name || "um membro"} do grupo.`
        }))
        .then(() => syncRemoteChatData())
        .then(() => renderAll())
        .catch((error) => alert(error?.message || "Nao foi possivel remover esse membro."));
      return;
    }
    const result = removeGroupMember(currentUser.id, details.threadId, button.dataset.userId);
    if (!result.ok) alert(result.error);
    if (result.removedThread) {
      selectInitialConversation();
    }
    renderAll();
  }
  if (action === "leave-group") {
    if (!confirm("Sair deste grupo?")) {
      return;
    }
    if (details.isRemote) {
      removeRemoteGroupMember(details.threadId, currentUser.id)
        .then(() => syncRemoteChatData())
        .then(() => {
          selectInitialConversation();
          renderAll();
        })
        .catch((error) => alert(error?.message || "Nao foi possivel sair do grupo."));
      return;
    }
    const result = removeGroupMember(currentUser.id, details.threadId, currentUser.id);
    if (!result.ok) alert(result.error);
    selectInitialConversation();
    renderAll();
  }
}

function handleAttachmentPreviewClick(event) {
  if (cycleAudioPlayerSpeedFromTarget(event.target)) {
    return;
  }
  if (toggleAudioPlayerFromTarget(event.target)) {
    return;
  }
  if (seekAudioPlayerFromTarget(event.target, event)) {
    return;
  }
  const button = event.target.closest("button[data-attachment-action]");
  if (!button) {
    return;
  }
  if (button.dataset.attachmentAction === "stop-recording") {
    if (state.recorder) {
      state.recorder.stop();
      setVoiceRecordingState(false);
    }
    return;
  }
  const index = Number(button.dataset.index);
  if (button.dataset.kind === "image") state.pendingImages.splice(index, 1);
  if (button.dataset.kind === "doc") state.pendingDocs.splice(index, 1);
  if (button.dataset.kind === "audio") {
    revokePendingAudioPreviewUrl(state.pendingAudio[index]);
    state.pendingAudio.splice(index, 1);
  }
  renderAttachmentPreview();
}

function handlePinnedBannerClick(event) {
  const button = event.target.closest("[data-message-id]");
  if (!button) {
    return;
  }
  focusMessage(button.dataset.messageId);
}

function handleMentionJump() {
  const marker = state.mentionJumpMarker;
  if (!marker || marker.conversationId !== state.currentConversationId) {
    return;
  }
  focusMessage(marker.messageId);
  state.mentionJumpMarker = null;
  renderMentionJumpButton();
}

function toggleConversationSearch() {
  elements.conversationSearchPanel.classList.toggle("hidden");
  if (!elements.conversationSearchPanel.classList.contains("hidden")) {
    elements.conversationSearchInput.focus();
  }
}

function toggleEmojiPanel() {
  if (!elements.emojiPanel.innerHTML) {
    elements.emojiPanel.innerHTML = REACTIONS.map((item) => `<button class="emoji-chip" data-emoji="${item.label}" type="button">${item.label}</button>`).join("") + ["😀", "😂", "😎", "🚀", "📎", "✅"].map((emoji) => `<button class="emoji-chip" data-emoji="${emoji}" type="button">${emoji}</button>`).join("");
    elements.emojiPanel.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-emoji]");
      if (!button) return;
      elements.composer.value += button.dataset.emoji;
      handleComposerInput();
      elements.composer.focus();
    });
  }
  elements.emojiPanel.classList.toggle("hidden");
}

function handleOuterClick(event) {
  const insideEmoji = event.target.closest("#emoji-panel") || event.target.closest("#emoji-btn");
  if (!insideEmoji) {
    elements.emojiPanel.classList.add("hidden");
  }
  const insideMention = event.target.closest("#mention-panel") || event.target.closest("#composer");
  if (!insideMention) {
    closeMentionPanel();
  }
  if (state.openReactionPickerId && !event.target.closest(".reaction-strip")) {
    requestFeedStickToBottom();
    state.openReactionPickerId = null;
    renderConversationPreserveViewport({ forceBottom: true });
  }
  if (state.openConversationMenu && !event.target.closest(".conversation-menu-wrap")) {
    state.openConversationMenu = false;
    renderConversationMenu();
  }
  if (state.openQuickCreateMenu && !event.target.closest(".quick-create-wrap")) {
    setQuickCreateMenuOpen(false);
  }
  if (state.openSessionMenu && !event.target.closest(".session-menu-wrap")) {
    state.openSessionMenu = false;
    elements.sessionMenu.classList.add("hidden");
  }
}

async function handleLogout() {
  flushPendingDraftSave();
  closeCameraPreview();
  cleanupRecordingMeter();
  stopRecordingStream();
  revokeAllPendingAudioPreviewUrls();
  teardownRealtimeSync();
  try {
    await signOutRemoteUser();
  } catch (error) {
    console.error(error);
  }
  logoutUser();
  window.location.href = "index.html";
}

function openEditMessageModal(messageId) {
  const message = getMessagesForConversation(currentUser.id, state.currentConversationId).find((item) => item.id === messageId);
  if (!message) return;
  openFormModal({
    kicker: "Mensagem",
    title: "Editar mensagem",
    fields: `<label class="field"><span>Texto</span><textarea name="text" rows="5">${escapeHtml(message.text)}</textarea></label>`,
    submitLabel: "Salvar",
    onSubmit: async (form) => {
      try {
        if (message.isRemote) {
          await editOwnMessage(messageId, form.get("text"));
          await syncRemoteChatData();
        } else {
          updateMessage(currentUser.id, messageId, form.get("text"));
        }
        closeModal();
        renderAll();
      } catch (error) {
        alert(error?.message || "Nao foi possivel editar a mensagem.");
      }
    }
  });
}

function openAddContactModal() {
  let selectedUserId = "";
  openFormModal({
    kicker: "Contato",
    title: "Adicionar contato",
    fields: `
      <label class="field">
        <span>Usuario</span>
        <input id="contact-username-search" type="text" autocomplete="off" placeholder="Digite o usuario sem @">
      </label>
      <div id="contact-search-feedback" class="muted-line">Digite o usuario para localizar a conta.</div>
      <div id="contact-search-results" class="picker-list"></div>
      <input id="contact-selected-user" type="hidden" name="targetUserId" value="">
    `,
    submitLabel: "Adicionar",
    afterOpen: (form, scope) => {
      const input = scope.querySelector("#contact-username-search");
      const feedback = scope.querySelector("#contact-search-feedback");
      const results = scope.querySelector("#contact-search-results");
      const selected = scope.querySelector("#contact-selected-user");
      let requestToken = 0;
      const renderResults = async () => {
        const token = ++requestToken;
        const query = sanitizeUsernameInput(input.value);
        input.value = query;
        results.innerHTML = "";
        selected.value = "";
        selectedUserId = "";
        if (!query) {
          feedback.textContent = "Digite o usuario para localizar a conta.";
          return;
        }
        feedback.textContent = "Buscando contas...";
        let matches = [];
        try {
          matches = await searchProfiles(query);
        } catch {
          feedback.textContent = "Nao foi possivel buscar contas agora.";
          return;
        }
        if (token !== requestToken) {
          return;
        }
        if (!matches.length) {
          feedback.textContent = "Nenhuma conta encontrada com esse usuario.";
          return;
        }
        feedback.textContent = matches.length === 1 ? "Conta encontrada." : `${matches.length} contas encontradas.`;
        matches.forEach((user) => {
          const row = document.createElement("button");
          row.type = "button";
          row.className = `picker-row picker-row-action${selectedUserId === user.id ? " active" : ""}`;
          row.innerHTML = `${renderAvatarMarkup(user, "member-avatar", user.name)}<span>${escapeHtml(user.name)} <small>@${escapeHtml(user.username)}</small></span>`;
          row.addEventListener("click", () => {
            selectedUserId = user.id;
            selected.value = user.id;
            results.querySelectorAll(".picker-row-action").forEach((item) => item.classList.remove("active"));
            row.classList.add("active");
            feedback.textContent = `Contato selecionado: @${user.username}`;
          });
          if (matches.length === 1 && user.username === query) {
            selectedUserId = user.id;
            selected.value = user.id;
            row.classList.add("active");
            feedback.textContent = `Contato selecionado: @${user.username}`;
          }
          results.appendChild(row);
        });
      };
      input.addEventListener("input", renderResults);
      input.focus();
    },
    onSubmit: async (form) => {
      const targetUserId = form.get("targetUserId");
      if (!targetUserId) {
        alert("Selecione um usuario valido para adicionar.");
        return;
      }
      try {
        await upsertMyContact({ contactUserId: targetUserId });
        await createOrGetDirectConversation(targetUserId);
        await syncRemoteChatData();
      } catch (error) {
        alert(error?.message || "Nao foi possivel adicionar esse contato.");
        return;
      }
      closeModal();
      selectConversation(`direct:${targetUserId}`);
    }
  });
}

function openCreateGroupModal() {
  const users = listUsersForPicker(currentUser.id);
  let pendingPhoto = "";
  openFormModal({
    kicker: "Grupo",
    title: "Novo grupo",
    fields: `
      <div class="modal-avatar-editor">
        <div id="group-photo-preview" class="profile-photo-frame">GP</div>
        <div class="modal-avatar-meta">
          <div class="profile-photo-actions">
            <label class="ghost-btn file-field" role="button" tabindex="0">
              <span>Foto do grupo</span>
              <input id="group-photo-input" type="file" accept="image/*" hidden>
            </label>
            <button id="group-photo-remove" class="ghost-btn" type="button">Remover</button>
          </div>
          <span class="muted-line">A foto aparece na lista de conversas e no topo do chat.</span>
        </div>
      </div>
      <label class="field"><span>Nome</span><input name="title" type="text" required></label>
      <label class="field"><span>Descricao</span><input name="description" type="text"></label>
      <label class="field"><span>Buscar pessoas</span><input id="member-search" type="search" placeholder="Buscar por nome ou usuario"></label>
      <div id="member-picker" class="picker-list">${buildMemberPicker(users)}</div>
    `,
    submitLabel: "Criar",
    afterOpen: (form, scope) => {
      wireMemberSearch(users);
      wireFileFieldKeyboard(scope);
      wireGroupPhotoPicker({
        scope,
        previewId: "group-photo-preview",
        inputId: "group-photo-input",
        removeId: "group-photo-remove",
        initialPhoto: "",
        getFallback: () => form.elements.title.value.trim() ? buildInitials(form.elements.title.value) : "GP",
        onChange: (value) => { pendingPhoto = value; }
      });
      form.elements.title.addEventListener("input", () => {
        if (!pendingPhoto) {
          paintAvatar(scope.querySelector("#group-photo-preview"), { avatar: form.elements.title.value.trim() ? buildInitials(form.elements.title.value) : "GP", photo: "" }, form.elements.title.value || "Grupo");
        }
      });
    },
    onSubmit: async (form) => {
      const title = String(form.get("title") || "").trim();
      if (!title) {
        alert("Defina um nome para o grupo.");
        return;
      }
      try {
        const conversation = await createGroupConversation({
          title,
          description: form.get("description"),
          memberIds: form.getAll("member")
        });
        if (pendingPhoto) {
          const photoUrl = await resolveConversationPhotoUrl(conversation.id, pendingPhoto);
          await updateGroupConversation(conversation.id, { photoUrl });
        }
        await sendRemoteMessage({
          conversationId: conversation.id,
          kind: "system",
          text: `${currentUser.name} criou o grupo.`
        });
        await syncRemoteChatData();
        closeModal();
        selectConversation(`group:${conversation.id}`);
      } catch (error) {
        alert(error?.message || "Nao foi possivel criar o grupo.");
      }
    }
  });
}

function openEditGroupModal(details) {
  let pendingPhoto = null;
  openFormModal({
    kicker: "Grupo",
    title: "Editar grupo",
    fields: `
      <div class="modal-avatar-editor">
        <div id="group-photo-preview" class="profile-photo-frame">${escapeHtml(details.avatar)}</div>
        <div class="modal-avatar-meta">
          <div class="profile-photo-actions">
            <label class="ghost-btn file-field" role="button" tabindex="0">
              <span>Trocar foto</span>
              <input id="group-photo-input" type="file" accept="image/*" hidden>
            </label>
            <button id="group-photo-remove" class="ghost-btn" type="button">Remover foto</button>
          </div>
          <span class="muted-line">Se nao houver foto, o grupo usa as iniciais do nome.</span>
        </div>
      </div>
      <label class="field"><span>Nome</span><input name="title" type="text" value="${escapeHtml(details.title)}"></label>
      <label class="field"><span>Descricao</span><input name="description" type="text" value="${escapeHtml(details.description || "")}"></label>
      <label class="field"><span>Avatar curto</span><input name="avatar" type="text" maxlength="2" value="${escapeHtml(details.avatar)}"></label>
    `,
    submitLabel: "Salvar",
    afterOpen: (form, scope) => {
      wireFileFieldKeyboard(scope);
      paintAvatar(scope.querySelector("#group-photo-preview"), { avatar: details.avatar, photo: details.photo || "" }, details.title);
      wireGroupPhotoPicker({
        scope,
        previewId: "group-photo-preview",
        inputId: "group-photo-input",
        removeId: "group-photo-remove",
        initialPhoto: details.photo || "",
        getFallback: () => form.elements.avatar.value.trim() || buildInitials(form.elements.title.value || details.title),
        onChange: (value) => { pendingPhoto = value; }
      });
      form.elements.title.addEventListener("input", () => {
        if (!pendingPhoto) {
          paintAvatar(scope.querySelector("#group-photo-preview"), { avatar: form.elements.avatar.value.trim() || buildInitials(form.elements.title.value || details.title), photo: "" }, form.elements.title.value || details.title);
        }
      });
      form.elements.avatar.addEventListener("input", () => {
        if (!pendingPhoto) {
          paintAvatar(scope.querySelector("#group-photo-preview"), { avatar: form.elements.avatar.value.trim() || buildInitials(form.elements.title.value || details.title), photo: "" }, form.elements.title.value || details.title);
        }
      });
    },
    onSubmit: async (form) => {
      try {
        if (details.isRemote) {
          const patch = {
            title: form.get("title"),
            description: form.get("description"),
            photoUrl: pendingPhoto === "" ? "" : undefined
          };
          if (typeof pendingPhoto === "string" && pendingPhoto) {
            patch.photoUrl = await resolveConversationPhotoUrl(details.threadId, pendingPhoto);
          }
          await updateGroupConversation(details.threadId, patch);
          await sendRemoteMessage({
            conversationId: details.threadId,
            kind: "system",
            text: `${currentUser.name} atualizou as informacoes do grupo.`
          });
          await syncRemoteChatData();
        } else {
          const result = updateGroup(currentUser.id, details.threadId, {
            title: form.get("title"),
            description: form.get("description"),
            avatar: form.get("avatar"),
            photo: pendingPhoto || undefined,
            clearPhoto: pendingPhoto === ""
          });
          if (!result.ok) { alert(result.error); return; }
        }
        closeModal();
        renderAll();
      } catch (error) {
        alert(error?.message || "Nao foi possivel atualizar o grupo.");
      }
    }
  });
}

function openAddMembersModal(details) {
  const users = listUsersForPicker(currentUser.id, details.memberIds);
  openFormModal({
    kicker: "Grupo",
    title: "Adicionar membros",
    fields: users.length
      ? `
        <label class="field"><span>Buscar pessoas</span><input id="member-search" type="search" placeholder="Buscar por nome ou usuario"></label>
        <div id="member-picker" class="picker-list">${buildMemberPicker(users)}</div>
      `
      : '<div class="empty-block">Nao ha mais usuarios disponiveis.</div>',
    submitLabel: "Adicionar",
    afterOpen: () => wireMemberSearch(users),
    onSubmit: async (form) => {
      const memberIds = form.getAll("member");
      try {
        if (details.isRemote) {
          await addRemoteGroupMembers(details.threadId, memberIds);
          if (memberIds.length) {
            const names = memberIds
              .map((memberId) => listUsersForPicker(currentUser.id).find((item) => item.id === memberId)?.name)
              .filter(Boolean);
            await sendRemoteMessage({
              conversationId: details.threadId,
              kind: "system",
              text: `${currentUser.name} adicionou ${names.join(", ") || "novos membros"} ao grupo.`
            });
          }
          await syncRemoteChatData();
        } else {
          const result = addGroupMembers(currentUser.id, details.threadId, memberIds);
          if (!result.ok) { alert(result.error); return; }
        }
        closeModal();
        renderAll();
      } catch (error) {
        alert(error?.message || "Nao foi possivel adicionar membros.");
      }
    }
  });
}

function openFormModal(config) {
  elements.modalKicker.textContent = config.kicker;
  elements.modalTitle.textContent = config.title;
  elements.modalBody.innerHTML = `<form id="modal-form" class="modal-form">${config.fields}<button class="primary-btn wide" type="submit">${config.submitLabel}</button></form>`;
  const form = elements.modalBody.querySelector("#modal-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    config.onSubmit(new FormData(form));
  });
  config.afterOpen?.(form, elements.modalBody);
  elements.modalLayer.classList.remove("hidden");
}

function buildMemberPicker(users) {
  return users.map((user) => `
    <label class="picker-row picker-row-choice" data-member-row="${user.id}">
      <input class="picker-row-input" type="checkbox" name="member" value="${user.id}">
      <span class="picker-row-indicator" aria-hidden="true"></span>
      ${renderAvatarMarkup(user, "member-avatar picker-avatar", user.name)}
      <span class="picker-row-copy">
        <strong>${escapeHtml(user.name)}</strong>
        <small>@${escapeHtml(user.username)}</small>
      </span>
    </label>
  `).join("");
}

function wireMemberSearch(users) {
  const input = document.getElementById("member-search");
  const picker = document.getElementById("member-picker");
  if (!input || !picker) {
    return;
  }

  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();
    picker.querySelectorAll("[data-member-row]").forEach((row) => {
      const matchUser = users.find((user) => user.id === row.getAttribute("data-member-row"));
      const haystack = `${matchUser?.name || ""} ${matchUser?.username || ""}`.toLowerCase();
      row.classList.toggle("hidden", term ? !haystack.includes(term) : false);
    });
  });
}

function wireFileFieldKeyboard(scope = document) {
  scope.querySelectorAll(".file-field[tabindex='0']").forEach((label) => {
    label.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        label.querySelector("input[type='file']")?.click();
      }
    });
  });
}

function wireGroupPhotoPicker(config) {
  const preview = config.scope.querySelector(`#${config.previewId}`);
  const input = config.scope.querySelector(`#${config.inputId}`);
  const removeButton = config.scope.querySelector(`#${config.removeId}`);
  if (!preview || !input || !removeButton) {
    return;
    }
    const initialPhoto = config.initialPhoto || "";
    paintAvatar(preview, { avatar: config.getFallback(), photo: initialPhoto }, "Grupo");
    input.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const photo = await fileToSquareDataUrl(file);
      config.onChange(photo);
      paintAvatar(preview, { avatar: config.getFallback(), photo }, "Grupo");
    } catch {
      alert("Nao foi possivel processar essa imagem.");
    }
    event.target.value = "";
  });
  removeButton.addEventListener("click", () => {
    config.onChange("");
    paintAvatar(preview, { avatar: config.getFallback(), photo: "" }, "Grupo");
  });
}

function closeModal() {
  elements.modalLayer.classList.add("hidden");
  elements.modalBody.innerHTML = "";
}

function buildSubtitle(details) {
  if (details.type === "group") {
    return details.description
      ? `${details.memberIds.length} membros • ${details.description}`
      : `${details.memberIds.length} membros`;
  }
  if (!details.canSeeLastSeen) {
    return "status privado";
  }
  return formatLastSeen(details.lastSeenAt, details.presence);
}

function clearReply() {
  state.replyTo = null;
  elements.replyBanner.classList.add("hidden");
}

function clearPending() {
  revokeAllPendingAudioPreviewUrls();
  state.pendingImages = [];
  state.pendingDocs = [];
  state.pendingAudio = [];
  state.recordingLevels = [];
  state.recordingWaveform = [];
  syncComposerPrimaryAction();
}

function extensionForMimeType(mimeType, fallback = "bin") {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("jpeg")) return "jpg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("pdf")) return "pdf";
  if (normalized.includes("json")) return "json";
  if (normalized.includes("plain")) return "txt";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("webm")) return "webm";
  return fallback;
}

function isStoragePolicyError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("row-level security")
    || message.includes("storage")
    || message.includes("bucket")
    || message.includes("permission");
}

async function dataUrlToFile(source, fileName, fallbackType = "application/octet-stream") {
  const response = await fetch(source);
  const blob = await response.blob();
  const type = blob.type || fallbackType;
  return new File([blob], fileName, { type });
}

async function uploadMessageAttachmentWithFallback(conversationId, file, source) {
  try {
    return await uploadMessageAttachment(conversationId, file);
  } catch (error) {
    if (isStoragePolicyError(error) && String(source || "").startsWith("data:")) {
      return {
        path: `inline/${conversationId}/${Date.now()}-${file.name}`,
        url: source
      };
    }
    throw error;
  }
}

async function uploadPendingRemoteAttachments(conversationId) {
  const attachments = [];
  const metadata = {};

  for (const [index, source] of state.pendingImages.entries()) {
    const file = await dataUrlToFile(source, `image-${Date.now()}-${index + 1}.jpg`, "image/jpeg");
    const uploaded = await uploadMessageAttachmentWithFallback(conversationId, file, source);
    attachments.push({
      type: "image",
      fileName: file.name,
      filePath: uploaded.path,
      publicUrl: uploaded.url
    });
  }

  for (const [index, doc] of state.pendingDocs.entries()) {
    const originalName = String(doc?.name || `documento-${index + 1}`);
    const file = await dataUrlToFile(doc.url, originalName);
    const uploaded = await uploadMessageAttachmentWithFallback(conversationId, file, doc.url);
    attachments.push({
      type: "document",
      fileName: file.name,
      filePath: uploaded.path,
      publicUrl: uploaded.url
    });
  }

  for (const [index, item] of state.pendingAudio.entries()) {
    const audio = normalizeAudioAttachment(item);
    const extension = extensionForMimeType(audio.mimeType, "webm");
    const fileName = `audio-${Date.now()}-${index + 1}.${extension}`;
    const file = await dataUrlToFile(audio.url, fileName, audio.mimeType || "audio/webm");
    const uploaded = await uploadMessageAttachmentWithFallback(conversationId, file, audio.url);
    attachments.push({
      type: "audio",
      fileName: file.name,
      filePath: uploaded.path,
      publicUrl: uploaded.url
    });
    if (!metadata.audio || typeof metadata.audio !== "object") {
      metadata.audio = {};
    }
    metadata.audio[file.name] = {
      duration: audio.duration || 0,
      waveform: Array.isArray(audio.waveform) ? audio.waveform : [],
      mimeType: audio.mimeType || file.type || "audio/webm"
    };
  }

  return { attachments, metadata };
}

async function resolveConversationPhotoUrl(conversationId, pendingPhoto) {
  if (!pendingPhoto) {
    return "";
  }
  if (!String(pendingPhoto).startsWith("data:")) {
    return pendingPhoto;
  }
  const photoFile = await dataUrlToFile(pendingPhoto, `group-photo-${Date.now()}.jpg`, "image/jpeg");
  try {
    const uploaded = await uploadConversationPhoto(conversationId, photoFile);
    return uploaded.url;
  } catch (error) {
    if (isStoragePolicyError(error)) {
      return pendingPhoto;
    }
    throw error;
  }
}

function setComposerEnabled(enabled) {
  elements.composer.disabled = !enabled;
  elements.emojiBtn.disabled = !enabled;
  elements.imageBtn.disabled = !enabled;
  elements.cameraBtn.disabled = !enabled;
  elements.fileBtn.disabled = !enabled;
  elements.voiceBtn.disabled = !enabled;
  elements.sendBtn.disabled = !enabled;
  elements.cameraFlipBtn.disabled = state.cameraOpening;
  syncComposerPrimaryAction();
}

function composerHasText() {
  return Boolean(elements.composer.value.trim());
}

function composerHasAttachments() {
  return Boolean(state.pendingImages.length || state.pendingDocs.length || state.pendingAudio.length);
}

function getPrimaryComposerActionMode() {
  if (state.recorder) {
    return "stop";
  }
  return composerHasText() || composerHasAttachments() ? "send" : "audio";
}

function syncComposerPrimaryAction() {
  const mode = getPrimaryComposerActionMode();
  elements.sendBtn.dataset.mode = mode;
  elements.sendBtn.classList.toggle("audio-mode", mode !== "send");
  if (mode === "stop") {
    elements.sendBtn.innerHTML = ICONS.stop;
    elements.sendBtn.setAttribute("title", "Parar gravacao");
  } else if (mode === "audio") {
    elements.sendBtn.innerHTML = ICONS.mic;
    elements.sendBtn.setAttribute("title", "Gravar audio");
  } else {
    elements.sendBtn.innerHTML = ICONS.send;
    elements.sendBtn.setAttribute("title", "Enviar");
  }
  const usePrimaryAudio = mode !== "send";
  elements.voiceBtn.classList.toggle("hidden", usePrimaryAudio);
}

function handlePrimaryComposerAction(event) {
  const mode = elements.sendBtn.dataset.mode || "send";
  if (mode === "send") {
    handleSend(event);
    return;
  }
  event.preventDefault();
  toggleRecording();
}

function autoResizeComposer(reset = false) {
  const computed = window.getComputedStyle(elements.composer);
  const minHeight = Number.parseFloat(computed.minHeight) || 58;
  const maxHeight = Number.parseFloat(computed.maxHeight) || 180;
  elements.composer.style.height = "auto";
  const nextHeight = reset ? minHeight : Math.min(elements.composer.scrollHeight, maxHeight);
  const finalHeight = Math.max(minHeight, nextHeight);
  elements.composer.style.height = `${finalHeight}px`;
  elements.composer.style.overflowY = elements.composer.scrollHeight > maxHeight ? "auto" : "hidden";
  syncFeedSpacing();
}

function syncFeedSpacing() {
  const inset = (elements.composerForm?.offsetHeight || 0) + (elements.replyBanner?.offsetHeight || 0) + 16;
  elements.messages.style.scrollPaddingBottom = `${Math.max(24, inset)}px`;
}

function renderText(text, message = null) {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  return linked
    .replace(/(^|[\s(])@([a-z0-9._-]{3,})/gi, (_, prefix, handle) => {
      const normalizedHandle = sanitizeUsernameInput(handle);
      const isCurrentUser = normalizedHandle === sanitizeUsernameInput(currentUser.username);
      const mentionedInPayload = Array.isArray(message?.mentions) && message.mentions.length
        ? message.mentionsCurrentUser && isCurrentUser
        : false;
      return `${prefix}<button class="mention-tag${isCurrentUser ? " self" : ""}${mentionedInPayload ? " intense" : ""}" data-action="open-mention" data-mention-handle="${escapeHtml(handle)}" type="button">@${escapeHtml(handle)}</button>`;
    })
    .replace(/\n/g, "<br>");
}

function sanitizeUsernameInput(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function statusIcon(status) {
  if (status === "read") return "✓✓";
  if (status === "delivered") return "✓✓";
  return "✓";
}

function scrollMessagesToBottom() {
  if (!elements.messages) {
    return;
  }
  const apply = () => {
    elements.messages.scrollTop = elements.messages.scrollHeight;
    renderScrollBottomButton();
  };
  apply();
  window.requestAnimationFrame(() => {
    apply();
    window.requestAnimationFrame(apply);
  });
}

function getFirstUnreadMessageId(conversationId) {
  return getUnreadMarkerForConversation(conversationId)?.messageId || "";
}

function getUnreadMarkerForConversation(conversationId) {
  if (!conversationId) {
    return null;
  }
  const unreadMessages = getMessagesForConversation(currentUser.id, conversationId).filter((message) => {
    if (message.kind === "system") {
      return false;
    }
    if (message.senderId === currentUser.id) {
      return false;
    }
    return (message.receipts?.[currentUser.id] || "sent") !== "read";
  });
  if (!unreadMessages.length) {
    return null;
  }
  return {
    conversationId,
    messageId: unreadMessages[0].id,
    count: unreadMessages.length
  };
}

function getMentionJumpMarkerForConversation(conversationId) {
  if (!conversationId) {
    return null;
  }
  const mentionMessages = getMessagesForConversation(currentUser.id, conversationId).filter((message) => {
    if (message.kind === "system" || message.senderId === currentUser.id) {
      return false;
    }
    return message.mentionsCurrentUser && (message.receipts?.[currentUser.id] || "sent") !== "read";
  });
  if (!mentionMessages.length) {
    return null;
  }
  return {
    conversationId,
    messageId: mentionMessages[0].id,
    count: mentionMessages.length
  };
}

function scrollMessageIntoView(messageId, options = {}) {
  const node = document.getElementById(`msg-${messageId}`);
  if (!node) {
    return false;
  }
  if (options.highlight) {
    node.classList.add("highlight");
    setTimeout(() => node.classList.remove("highlight"), 1200);
  }
  node.scrollIntoView({
    behavior: options.behavior || "smooth",
    block: options.block || "center"
  });
  window.requestAnimationFrame(renderScrollBottomButton);
  return true;
}

function positionConversationViewport(messageId) {
  window.requestAnimationFrame(() => {
    if (messageId && scrollMessageIntoView(messageId, { behavior: "auto", block: "start" })) {
      return;
    }
    scrollMessagesToBottom();
  });
}

function focusMessage(messageId) {
  scrollMessageIntoView(messageId, { behavior: "smooth", block: "center", highlight: true });
}

function focusMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const messageId = params.get("m");
  if (messageId) {
    setTimeout(() => focusMessage(messageId), 200);
    return true;
  }
  return false;
}

function handlePhotoTriggerClick(event) {
  const target = event.currentTarget || event.target.closest("[data-photo-open='true']");
  if (!target?.dataset.photoSrc) {
    return;
  }
  openLightbox(target.dataset.photoSrc, target.dataset.photoLabel);
}

function openLightbox(src, label = "preview") {
  elements.lightboxImg.src = src;
  elements.lightboxImg.alt = label;
  elements.lightbox.classList.remove("hidden");
}

function closeLightbox() {
  elements.lightbox.classList.add("hidden");
  elements.lightboxImg.src = "";
  elements.lightboxImg.alt = "preview";
}

async function openCameraPreview() {
  if (state.recorder) {
    alert("Pare a gravacao antes de abrir a camera.");
    return;
  }
  if (state.cameraOpening) {
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
    useCameraFileFallback();
    return;
  }
  state.cameraOpening = true;
  elements.cameraStatus.textContent = "Abrindo camera...";
  elements.cameraCaptureBtn.disabled = true;
  elements.cameraFlipBtn.disabled = true;
  elements.cameraLayer.classList.remove("hidden");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: state.cameraFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    stopCameraPreviewStream();
    state.cameraStream = stream;
    state.cameraReady = false;
    elements.cameraVideo.srcObject = stream;
    await waitForCameraMetadata(elements.cameraVideo);
    await elements.cameraVideo.play().catch(() => {});
    state.cameraReady = true;
    elements.cameraStatus.textContent = "Posicione a camera e capture a foto.";
    elements.cameraCaptureBtn.disabled = false;
    elements.cameraFlipBtn.disabled = false;
  } catch {
    closeCameraPreview();
    if (confirm("Nao foi possivel abrir a camera. Deseja usar o seletor do aparelho?")) {
      useCameraFileFallback();
    }
  } finally {
    state.cameraOpening = false;
  }
}

async function rotateCameraPreview() {
  if (state.cameraOpening || !navigator.mediaDevices?.getUserMedia) {
    return;
  }
  state.cameraFacingMode = state.cameraFacingMode === "environment" ? "user" : "environment";
  if (!elements.cameraLayer.classList.contains("hidden")) {
    await openCameraPreview();
  }
}

function waitForCameraMetadata(video) {
  if (video.readyState >= 1 && video.videoWidth && video.videoHeight) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const handleReady = () => {
      video.removeEventListener("loadedmetadata", handleReady);
      resolve();
    };
    video.addEventListener("loadedmetadata", handleReady, { once: true });
  });
}

function stopCameraPreviewStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
  state.cameraReady = false;
  elements.cameraVideo.pause();
  elements.cameraVideo.srcObject = null;
}

function closeCameraPreview() {
  stopCameraPreviewStream();
  elements.cameraLayer.classList.add("hidden");
  elements.cameraCaptureBtn.disabled = true;
  elements.cameraFlipBtn.disabled = false;
  elements.cameraStatus.textContent = "Abrindo camera...";
}

function useCameraFileFallback() {
  closeCameraPreview();
  elements.cameraInput.click();
}

async function captureCameraFrame() {
  if (!state.cameraReady) {
    return;
  }
  const width = elements.cameraVideo.videoWidth;
  const height = elements.cameraVideo.videoHeight;
  if (!width || !height) {
    return;
  }
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    alert("Canvas indisponivel.");
    return;
  }
  canvas.width = width;
  canvas.height = height;
  context.drawImage(elements.cameraVideo, 0, 0, width, height);
  try {
    state.pendingImages.push(canvasToChatImageDataUrl(canvas));
    renderAttachmentPreview();
    closeCameraPreview();
  } catch {
    alert("Nao foi possivel capturar essa foto.");
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressCanvasToChatImageDataUrl(sourceCanvas) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas indisponivel");
  }
  let maxSide = 1280;
  let quality = 0.82;
  let dataUrl = "";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
    const width = Math.max(1, Math.round(sourceCanvas.width * scale));
    const height = Math.max(1, Math.round(sourceCanvas.height * scale));
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(sourceCanvas, 0, 0, width, height);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= 950000) {
      return dataUrl;
    }
    maxSide = Math.max(640, Math.round(maxSide * 0.78));
    quality = Math.max(0.58, quality - 0.08);
  }
  return dataUrl || canvas.toDataURL("image/jpeg", 0.6);
}

function canvasToChatImageDataUrl(sourceCanvas) {
  return compressCanvasToChatImageDataUrl(sourceCanvas);
}

function fileToChatImageDataUrl(file) {
  return fileToDataUrl(file).then((source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        resolve(canvasToChatImageDataUrl(image));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = String(source);
  }));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToSquareDataUrl(file) {
  return fileToDataUrl(file).then((source) => new Promise((resolve, reject) => {
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
  }));
}

function buildInitials(value) {
  return String(value || "AT")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "AT";
}

function renderAvatarMarkup(subject, className, label, options = {}) {
  const photo = subject?.photo || "";
  const avatar = subject?.avatar || "AT";
  const content = photo ? `<img src="${photo}" alt="${escapeHtml(label || "Avatar")}">` : escapeHtml(avatar);
  const classes = `${className}${photo ? " has-photo" : ""}${photo && options.photoAction ? " avatar-photo-trigger" : ""}`;
  if (photo && options.photoAction) {
    return `<button class="${classes}" data-photo-open="true" data-photo-src="${escapeHtml(photo)}" data-photo-label="${escapeHtml(label || "Foto")}" type="button" title="Abrir foto">${content}</button>`;
  }
  return `<div class="${classes}">${content}</div>`;
}

function paintAvatar(element, subject, label) {
  if (!element) {
    return;
  }
  const photo = subject?.photo || "";
  element.classList.toggle("has-photo", Boolean(photo));
  element.innerHTML = photo
    ? `<img src="${photo}" alt="${escapeHtml(label || "Avatar")}">`
    : escapeHtml(subject?.avatar || "AT");
}

function syncPhotoTrigger(element, subject, label) {
  if (!element) {
    return;
  }
  const photo = subject?.photo || "";
  if (photo) {
    element.dataset.photoOpen = "true";
    element.dataset.photoSrc = photo;
    element.dataset.photoLabel = label || "Foto";
    element.title = `Abrir foto de ${label || "perfil"}`;
    element.disabled = false;
    element.classList.add("avatar-photo-trigger");
  } else {
    delete element.dataset.photoOpen;
    delete element.dataset.photoSrc;
    delete element.dataset.photoLabel;
    element.title = "";
    if ("disabled" in element) {
      element.disabled = true;
    }
    element.classList.remove("avatar-photo-trigger");
  }
}

function formatLastSeen(lastSeenAt, presence) {
  if (presence === "online") {
    return "online agora";
  }
  if (!lastSeenAt) {
    return "status indisponivel";
  }
  if (presence === "away") {
    return `ativo ha ${formatRelative(lastSeenAt)}`;
  }
  return `ultima vez online ${formatRelative(lastSeenAt)}`;
}

function getConversationDayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatConversationDayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart - dateStart) / 86400000);
  if (diffDays === 0) {
    return "Hoje";
  }
  if (diffDays === 1) {
    return "Ontem";
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function refreshSessionState() {
  syncUserSettings();
  renderAll();
  if (Date.now() - state.lastRemoteSyncAt >= REMOTE_SYNC_MIN_INTERVAL) {
    queueRemoteChatSync(0, { keepBottom: shouldStickFeedToBottom() || isFeedNearBottom() });
  }
}
