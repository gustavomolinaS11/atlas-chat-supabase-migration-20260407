import {
  addGroupMembers,
  applyDisplayPreferences,
  applyTheme,
  clipText,
  createGroup,
  deleteMessage,
  ensureStore,
  formatClock,
  formatRelative,
  getConversationDetails,
  getConversationEntries,
  getCurrentUser,
  getDraft,
  getGroupMembers,
  getMessagesForConversation,
  getPinnedMessageForConversation,
  getSettings,
  listUsersForPicker,
  logoutUser,
  markAllDeliveredForUser,
  markConversationRead,
  removeGroupMember,
  requireSession,
  saveDraft,
  sendMessage,
  toggleFavorite,
  toggleGroupAdmin,
  togglePinned,
  toggleReaction,
  updateGroup,
  updateMessage
} from "./store.js";

const currentUser = requireSession("index.html");
let userSettings = currentUser ? getSettings(currentUser.id) : null;

const REACTIONS = [
  { token: "like", label: "👍" },
  { token: "love", label: "❤️" },
  { token: "fire", label: "🔥" },
  { token: "wow", label: "😮" }
];

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0-6 1.1 2.6 2.8.5-.8 2.7 1.9 2-1.9 2 .8 2.7-2.8.5L12 21.5l-1.1-2.6-2.8-.5.8-2.7-1.9-2 1.9-2-.8-2.7 2.8-.5Z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17v2H5V5h5v2M14 7l5 5-5 5M19 12H9"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 1 1-4.6 11.1A6.5 6.5 0 0 1 10.5 4Zm9 15-4.1-4.1"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-5M12 8h.01M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 10h.01M15.5 10h.01M8 14a5 5 0 0 0 8 0M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10Z"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h.01M20 16l-5-5-4 4-2-2-5 5"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h6l5 5v13H8zM14 3v5h5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm0 0v4m-4-6a4 4 0 0 0 8 0"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5-3 2v4l-2 2-3-5-5-3 2-2h4Z"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.1L12 17.2 6.4 20l1.1-6.1L3 9.6l6.2-.9Z"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20 21 12 3 4l3 7 8 1-8 1Z"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h.01M12 12h.01M18 12h.01"/></svg>',
  reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8 5 12l5 4M5 12h10a4 4 0 0 1 4 4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 9-9-3.5-3.5-9 9ZM13 6l3.5 3.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 18 2-9 6 5 6-5 2 9Z"/></svg>',
  remove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>'
};

const elements = {
  sessionAvatar: document.getElementById("session-avatar"),
  sessionName: document.getElementById("session-name"),
  sessionHandle: document.getElementById("session-handle"),
  threadSearch: document.getElementById("thread-search"),
  threadList: document.getElementById("thread-list"),
  chatAvatar: document.getElementById("chat-avatar"),
  chatTitle: document.getElementById("chat-title"),
  chatSubtitle: document.getElementById("chat-subtitle"),
  pinnedBanner: document.getElementById("pinned-banner"),
  messages: document.getElementById("messages"),
  composerForm: document.getElementById("composer-form"),
  composer: document.getElementById("composer"),
  draftStatus: document.getElementById("draft-status"),
  typingIndicator: document.getElementById("typing-indicator"),
  attachmentPreview: document.getElementById("attachment-preview"),
  imageInput: document.getElementById("image-input"),
  docInput: document.getElementById("doc-input"),
  emojiPanel: document.getElementById("emoji-panel"),
  replyBanner: document.getElementById("reply-banner"),
  replyText: document.getElementById("reply-text"),
  replyCancel: document.getElementById("reply-cancel"),
  conversationSearchPanel: document.getElementById("conversation-search-panel"),
  conversationSearchInput: document.getElementById("conversation-search-input"),
  conversationSearchResults: document.getElementById("conversation-search-results"),
  detailsDrawer: document.getElementById("details-drawer"),
  drawerTitle: document.getElementById("drawer-title"),
  drawerBody: document.getElementById("drawer-body"),
  modalLayer: document.getElementById("modal-layer"),
  modalKicker: document.getElementById("modal-kicker"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  lightbox: document.getElementById("lightbox"),
  lightboxImg: document.getElementById("lightbox-img")
};

const state = {
  filter: "all",
  currentConversationId: null,
  replyTo: null,
  pendingImages: [],
  pendingDocs: [],
  pendingAudio: [],
  typingTimer: null,
  recorder: null,
  stream: null,
  openMessageMenuId: null,
  openReactionPickerId: null,
  modalCleanup: null
};

init();

async function init() {
  if (!currentUser) {
    return;
  }
  await ensureStore();
  syncUserSettings();
  markAllDeliveredForUser(currentUser.id);
  decorateStaticIcons();
  bindEvents();
  selectInitialConversation();
  renderAll();
  scrollMessagesToBottom();
  focusMessageFromUrl();
}

function syncUserSettings() {
  userSettings = getSettings(currentUser.id);
  applyTheme(userSettings);
  applyDisplayPreferences(userSettings);
}

function decorateStaticIcons() {
  document.getElementById("new-group-btn").innerHTML = ICONS.plus;
  document.querySelector(".icon-link").innerHTML = ICONS.gear;
  document.getElementById("logout-btn").innerHTML = ICONS.logout;
  document.getElementById("conversation-search-btn").innerHTML = ICONS.search;
  document.getElementById("details-btn").innerHTML = ICONS.info;
  document.getElementById("drawer-close").innerHTML = ICONS.close;
  document.getElementById("emoji-btn").innerHTML = ICONS.smile;
  document.getElementById("image-btn").innerHTML = ICONS.image;
  document.getElementById("file-btn").innerHTML = ICONS.file;
  document.getElementById("voice-btn").innerHTML = ICONS.mic;
  document.getElementById("send-btn").innerHTML = ICONS.send;
  document.getElementById("modal-close").innerHTML = ICONS.close;
}

function bindEvents() {
  elements.threadSearch.addEventListener("input", renderThreads);
  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });
  elements.threadList.addEventListener("click", handleThreadClick);
  elements.composerForm.addEventListener("submit", handleSend);
  elements.composer.addEventListener("input", handleComposerInput);
  elements.composer.addEventListener("keydown", handleComposerKeydown);
  document.getElementById("emoji-btn").addEventListener("click", toggleEmojiPanel);
  document.getElementById("image-btn").addEventListener("click", () => elements.imageInput.click());
  document.getElementById("file-btn").addEventListener("click", () => elements.docInput.click());
  elements.imageInput.addEventListener("change", handleImageUpload);
  elements.docInput.addEventListener("change", handleDocUpload);
  document.getElementById("voice-btn").addEventListener("click", toggleRecording);
  document.getElementById("new-group-btn").addEventListener("click", openCreateGroupModal);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("conversation-search-btn").addEventListener("click", toggleConversationSearch);
  document.getElementById("conversation-search-close").addEventListener("click", toggleConversationSearch);
  elements.conversationSearchInput.addEventListener("input", renderConversationSearch);
  document.getElementById("details-btn").addEventListener("click", () => elements.detailsDrawer.classList.toggle("hidden"));
  document.getElementById("drawer-close").addEventListener("click", () => elements.detailsDrawer.classList.add("hidden"));
  elements.pinnedBanner.addEventListener("click", handlePinnedBannerClick);
  elements.messages.addEventListener("click", handleMessageClick);
  elements.drawerBody.addEventListener("click", handleDrawerClick);
  elements.attachmentPreview.addEventListener("click", handleAttachmentPreviewClick);
  elements.replyCancel.addEventListener("click", clearReply);
  document.getElementById("modal-close").addEventListener("click", closeModal);
  elements.modalLayer.addEventListener("click", (event) => { if (event.target === elements.modalLayer) closeModal(); });
  document.addEventListener("click", handleOuterClick);
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  elements.lightbox.addEventListener("click", (event) => { if (event.target === elements.lightbox) closeLightbox(); });
  window.addEventListener("pageshow", refreshSessionState);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshSessionState();
    }
  });
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll(".filter-chip").forEach((button) => button.classList.toggle("active", button.dataset.filter === filter));
  renderThreads();
}

function selectInitialConversation() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("c");
  const items = getConversationEntries(currentUser.id, "", state.filter);
  state.currentConversationId = items.find((item) => item.id === fromUrl)?.id || items[0]?.id || null;
  if (state.currentConversationId) {
    markConversationRead(currentUser.id, state.currentConversationId);
  }
}

function renderAll() {
  renderSessionCard();
  renderThreads();
  renderConversation();
  renderDrawer();
}

function renderSessionCard() {
  const sessionUser = getCurrentUser() || currentUser;
  paintAvatar(elements.sessionAvatar, sessionUser, sessionUser.name);
  elements.sessionName.textContent = sessionUser.name;
  elements.sessionHandle.textContent = `@${sessionUser.username}`;
}

function renderThreads() {
  const items = getConversationEntries(currentUser.id, elements.threadSearch.value, state.filter);
  elements.threadList.innerHTML = "";
  if (!items.length) {
    elements.threadList.innerHTML = '<div class="empty-block">Nenhuma conversa encontrada.</div>';
    return;
  }
  items.forEach((item) => {
    const subtitle = userSettings.showSidebarPreview
      ? (item.lastMessage ? clipText(item.lastMessage.text, 54) : item.subtitle)
      : item.subtitle;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thread-item${item.id === state.currentConversationId ? " active" : ""}${!userSettings.showAvatars ? " no-avatar" : ""}`;
    button.dataset.conversationId = item.id;
    button.innerHTML = `
      ${renderAvatarMarkup(item, "thread-avatar", item.title)}
      <div class="thread-main">
        <div class="thread-line"><strong>${escapeHtml(item.title)}</strong><span>${userSettings.showMessageTime && item.lastMessage ? formatRelative(item.lastMessage.createdAt) : ""}</span></div>
        <div class="thread-subline"><span class="presence-dot ${item.presence}"></span><span>${escapeHtml(subtitle)}</span></div>
      </div>
      ${item.unreadCount ? `<span class="unread-badge">${item.unreadCount}</span>` : ""}
    `;
    elements.threadList.appendChild(button);
  });
}
function renderConversation() {
  const details = state.currentConversationId ? getConversationDetails(currentUser.id, state.currentConversationId) : null;
  const messages = state.currentConversationId ? getMessagesForConversation(currentUser.id, state.currentConversationId) : [];
  paintAvatar(elements.chatAvatar, details || { avatar: "AT" }, details?.title || "Conversa");
  elements.chatTitle.textContent = details?.title || "Selecione uma conversa";
  elements.chatSubtitle.textContent = details ? buildSubtitle(details) : "Troque entre contas e grupos";
  renderPinnedBanner();
  elements.messages.innerHTML = "";
  if (!details) {
    elements.messages.innerHTML = '<div class="empty-block tall">Escolha um contato ou grupo para conversar.</div>';
    elements.composer.value = "";
    elements.conversationSearchResults.innerHTML = "";
    elements.typingIndicator.classList.add("hidden");
    renderReplyBanner([]);
    renderAttachmentPreview();
    return;
  }
  if (!messages.length) {
    elements.messages.innerHTML = '<div class="empty-block tall">Nenhuma mensagem ainda nesta conversa.</div>';
  } else {
    messages.forEach((message) => {
      const article = document.createElement("article");
      article.className = `message${message.senderId === currentUser.id ? " mine" : ""}`;
      article.id = `msg-${message.id}`;
      article.dataset.messageId = message.id;
      article.innerHTML = `
        <div class="message-head">
          <div>
            <strong>${escapeHtml(message.sender?.name || "Conta")}</strong>
            ${userSettings.showMessageTime ? `<span class="muted-line">${formatClock(message.createdAt)}</span>` : ""}
          </div>
          <div class="message-head-actions">
            ${message.senderId === currentUser.id ? `<span class="check-status ${message.senderStatus}">${statusIcon(message.senderStatus)}</span>` : ""}
            <button class="icon-btn mini" data-action="toggle-menu" type="button" title="Opcoes">${ICONS.more}</button>
          </div>
        </div>
        ${message.replyTo ? renderReplySnippet(messages, message.replyTo) : ""}
        <div class="message-text">${renderText(message.text)}</div>
        ${renderAttachments(message.attachments)}
        <div class="message-reactions">${renderReactionButtons(message)}</div>
        ${renderFlags(message)}
        <div class="message-menu ${state.openMessageMenuId === message.id ? "" : "hidden"}">
          <button class="icon-btn mini" data-action="reply" type="button" title="Responder">${ICONS.reply}</button>
          ${message.senderId === currentUser.id ? `<button class="icon-btn mini" data-action="edit" type="button" title="Editar">${ICONS.edit}</button>` : ""}
          <button class="icon-btn mini" data-action="pin" type="button" title="Pin">${ICONS.pin}</button>
          <button class="icon-btn mini" data-action="favorite" type="button" title="Favoritar">${ICONS.star}</button>
          ${message.senderId === currentUser.id ? `<button class="icon-btn mini" data-action="delete" type="button" title="Apagar">${ICONS.trash}</button>` : ""}
        </div>
      `;
      elements.messages.appendChild(article);
    });
  }
  elements.composer.value = getDraft(currentUser.id, state.currentConversationId);
  renderReplyBanner(messages);
  renderAttachmentPreview();
  renderConversationSearch();
  elements.typingIndicator.classList.toggle("hidden", !userSettings.showTypingIndicator);
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
        ${renderAvatarMarkup(details, "member-avatar detail-avatar", details.title)}
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

function renderMemberRow(details, member) {
  const isAdmin = details.admins.includes(member.id);
  const canManageMember = details.canManage && member.id !== currentUser.id;
  return `
    <div class="member-row">
      ${renderAvatarMarkup(member, "member-avatar", member.name)}
      <div class="member-meta">
        <strong>${escapeHtml(member.name)}</strong>
        <span class="muted-line">@${escapeHtml(member.username)}</span>
      </div>
      ${isAdmin ? '<span class="role-chip">Admin</span>' : ""}
      ${canManageMember ? `<div class="member-actions"><button class="icon-btn mini" data-drawer-action="toggle-admin" data-user-id="${member.id}" type="button" title="Admin">${ICONS.crown}</button><button class="icon-btn mini" data-drawer-action="remove-member" data-user-id="${member.id}" type="button" title="Remover">${ICONS.remove}</button></div>` : ""}
    </div>
  `;
}

function renderFlags(message) {
  const flags = [];
  if (message.isPinned) {
    flags.push('<span class="flag-chip">Fixada</span>');
  }
  if (message.isFavorite) {
    flags.unshift(`<span class="favorite-badge" title="Favorita">${ICONS.star}</span>`);
  }
  return flags.length ? `<div class="flag-row">${flags.join("")}</div>` : "";
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

function renderAttachments(attachments) {
  const images = attachments.images.map((src) => `<img class="bubble-image" src="${src}" alt="imagem" data-image="${src}">`).join("");
  const docs = attachments.docs.map((doc) => `<a class="doc-pill" href="${doc.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.name)}</a>`).join("");
  const audio = attachments.audio.map((item) => `<audio controls src="${item.url}"></audio>`).join("");
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
  if (!userSettings.showReactionBar) {
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
  if (!state.replyTo) {
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
  const items = [
    ...state.pendingImages.map((item, index) => ({ kind: "image", label: `Imagem ${index + 1}`, index })),
    ...state.pendingDocs.map((item, index) => ({ kind: "doc", label: item.name, index })),
    ...state.pendingAudio.map((item, index) => ({ kind: "audio", label: `Audio ${index + 1}`, index }))
  ];
  if (!items.length) {
    elements.attachmentPreview.classList.add("hidden");
    elements.attachmentPreview.innerHTML = "";
    return;
  }
  elements.attachmentPreview.classList.remove("hidden");
  elements.attachmentPreview.innerHTML = items.map((item) => `<button class="attachment-chip" data-kind="${item.kind}" data-index="${item.index}" type="button">${escapeHtml(item.label)}<span>x</span></button>`).join("");
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
  state.currentConversationId = conversationId;
  state.openMessageMenuId = null;
  state.openReactionPickerId = null;
  clearReply();
  clearPending();
  markConversationRead(currentUser.id, conversationId);
  history.replaceState(null, "", `chat.html?c=${encodeURIComponent(conversationId)}`);
  renderAll();
  scrollMessagesToBottom();
}

function handleComposerInput() {
  if (!state.currentConversationId) {
    return;
  }
  saveDraft(currentUser.id, state.currentConversationId, elements.composer.value);
  elements.draftStatus.textContent = "Draft salvo";
  if (!userSettings.showTypingIndicator) {
    elements.typingIndicator.classList.add("hidden");
    return;
  }
  elements.typingIndicator.classList.remove("hidden");
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => elements.typingIndicator.classList.add("hidden"), 900);
}

function handleComposerKeydown(event) {
  const shouldSendOnEnter = userSettings.enterToSend;
  const wantsShortcutSend = event.key === "Enter" && (event.ctrlKey || event.metaKey);
  if ((shouldSendOnEnter && event.key === "Enter" && !event.shiftKey) || (!shouldSendOnEnter && wantsShortcutSend)) {
    event.preventDefault();
    handleSend(event);
  }
}

function handleSend(event) {
  event.preventDefault();
  if (!state.currentConversationId) {
    return;
  }
  const text = elements.composer.value.trim();
  if (!text && !state.pendingImages.length && !state.pendingDocs.length && !state.pendingAudio.length) {
    return;
  }
  sendMessage(currentUser.id, state.currentConversationId, {
    text,
    replyTo: state.replyTo,
    attachments: { images: [...state.pendingImages], docs: [...state.pendingDocs], audio: [...state.pendingAudio] }
  });
  elements.composer.value = "";
  saveDraft(currentUser.id, state.currentConversationId, "");
  clearReply();
  clearPending();
  renderAll();
  scrollMessagesToBottom();
}

async function handleImageUpload(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    state.pendingImages.push(await fileToDataUrl(file));
  }
  renderAttachmentPreview();
  event.target.value = "";
}

async function handleDocUpload(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    state.pendingDocs.push({ name: file.name, url: await fileToDataUrl(file) });
  }
  renderAttachmentPreview();
  event.target.value = "";
}

async function toggleRecording() {
  if (state.recorder) {
    state.recorder.stop();
    document.getElementById("voice-btn").classList.remove("active");
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const recorder = new MediaRecorder(state.stream);
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = async () => {
      state.pendingAudio.push({ url: await blobToDataUrl(new Blob(chunks, { type: "audio/webm" })) });
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
      state.recorder = null;
      document.getElementById("voice-btn").classList.remove("active");
      renderAttachmentPreview();
    };
    recorder.start();
    state.recorder = recorder;
    document.getElementById("voice-btn").classList.add("active");
  } catch {
    alert("Microfone indisponivel.");
  }
}

function handleMessageClick(event) {
  const target = event.target.closest("button, img");
  if (!target) {
    return;
  }
  if (target.matches("img[data-image]")) {
    openLightbox(target.dataset.image);
    return;
  }
  const article = target.closest(".message");
  const messageId = article?.dataset.messageId;
  if (!messageId) {
    return;
  }
  const action = target.dataset.action;
  if (action === "toggle-menu") {
    state.openReactionPickerId = null;
    state.openMessageMenuId = state.openMessageMenuId === messageId ? null : messageId;
    renderConversation();
    return;
  }
  if (action === "toggle-reactions") {
    state.openMessageMenuId = null;
    state.openReactionPickerId = state.openReactionPickerId === messageId ? null : messageId;
    renderConversation();
    return;
  }
  if (action === "reply") {
    state.replyTo = messageId;
    renderConversation();
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
    if (confirm("Apagar esta mensagem?")) {
      deleteMessage(currentUser.id, messageId);
      renderAll();
    }
    return;
  }
  if (action === "pin") {
    togglePinned(currentUser.id, messageId);
    state.openReactionPickerId = null;
    renderConversation();
    return;
  }
  if (action === "favorite") {
    toggleFavorite(currentUser.id, messageId);
    state.openReactionPickerId = null;
    renderConversation();
    return;
  }
  if (action === "react") {
    toggleReaction(currentUser.id, messageId, target.dataset.reaction);
    state.openReactionPickerId = null;
    renderConversation();
  }
}

function handleDrawerClick(event) {
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
  if (action === "toggle-admin") {
    const result = toggleGroupAdmin(currentUser.id, details.threadId, button.dataset.userId);
    if (!result.ok) alert(result.error);
    renderAll();
  }
  if (action === "remove-member") {
    if (!confirm("Remover este membro do grupo?")) {
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
    const result = removeGroupMember(currentUser.id, details.threadId, currentUser.id);
    if (!result.ok) alert(result.error);
    selectInitialConversation();
    renderAll();
  }
}

function handleAttachmentPreviewClick(event) {
  const button = event.target.closest(".attachment-chip");
  if (!button) {
    return;
  }
  const index = Number(button.dataset.index);
  if (button.dataset.kind === "image") state.pendingImages.splice(index, 1);
  if (button.dataset.kind === "doc") state.pendingDocs.splice(index, 1);
  if (button.dataset.kind === "audio") state.pendingAudio.splice(index, 1);
  renderAttachmentPreview();
}

function handlePinnedBannerClick(event) {
  const button = event.target.closest("[data-message-id]");
  if (!button) {
    return;
  }
  focusMessage(button.dataset.messageId);
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
  if (state.openReactionPickerId && !event.target.closest(".reaction-strip")) {
    state.openReactionPickerId = null;
    renderConversation();
  }
}

function handleLogout() {
  logoutUser();
  window.location.href = "index.html";
}

function openEditMessageModal(messageId) {
  const message = getMessagesForConversation(currentUser.id, state.currentConversationId).find((item) => item.id === messageId);
  if (!message) return;
  openFormModal({ kicker: "Mensagem", title: "Editar mensagem", fields: `<label class="field"><span>Texto</span><textarea name="text" rows="5">${escapeHtml(message.text)}</textarea></label>`, submitLabel: "Salvar", onSubmit: (form) => { updateMessage(currentUser.id, messageId, form.get("text")); closeModal(); renderAll(); } });
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
    onSubmit: (form) => {
      const result = createGroup(currentUser.id, {
        title: form.get("title"),
        description: form.get("description"),
        memberIds: form.getAll("member"),
        photo: pendingPhoto
      });
      if (!result.ok) { alert(result.error); return; }
      closeModal();
      selectConversation(`group:${result.thread.id}`);
    }
  });
}

function openEditGroupModal(details) {
  let pendingPhoto = details.photo || "";
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
    onSubmit: (form) => {
      const result = updateGroup(currentUser.id, details.threadId, {
        title: form.get("title"),
        description: form.get("description"),
        avatar: form.get("avatar"),
        photo: pendingPhoto || undefined,
        clearPhoto: pendingPhoto === ""
      });
      if (!result.ok) { alert(result.error); return; }
      closeModal();
      renderAll();
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
    onSubmit: (form) => {
      const result = addGroupMembers(currentUser.id, details.threadId, form.getAll("member"));
      if (!result.ok) { alert(result.error); return; }
      closeModal();
      renderAll();
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
    <label class="picker-row" data-member-row="${user.id}">
      <input type="checkbox" name="member" value="${user.id}">
      <span>${escapeHtml(user.name)} <small>@${escapeHtml(user.username)}</small></span>
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
  config.onChange(initialPhoto);
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
  state.pendingImages = [];
  state.pendingDocs = [];
  state.pendingAudio = [];
}

function renderText(text) {
  return escapeHtml(text).replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, "<br>");
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
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function focusMessage(messageId) {
  const node = document.getElementById(`msg-${messageId}`);
  if (!node) return;
  node.classList.add("highlight");
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => node.classList.remove("highlight"), 1200);
}

function focusMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const messageId = params.get("m");
  if (messageId) {
    setTimeout(() => focusMessage(messageId), 200);
  }
}

function openLightbox(src) {
  elements.lightboxImg.src = src;
  elements.lightbox.classList.remove("hidden");
}

function closeLightbox() {
  elements.lightbox.classList.add("hidden");
  elements.lightboxImg.src = "";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function renderAvatarMarkup(subject, className, label) {
  const photo = subject?.photo || "";
  const avatar = subject?.avatar || "AT";
  return `<div class="${className}${photo ? " has-photo" : ""}">${photo ? `<img src="${photo}" alt="${escapeHtml(label || "Avatar")}">` : escapeHtml(avatar)}</div>`;
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

function refreshSessionState() {
  syncUserSettings();
  renderAll();
}
