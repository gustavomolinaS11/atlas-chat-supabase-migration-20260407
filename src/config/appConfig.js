export const APP_CONFIG = {
  storageBuckets: {
    avatars: 'avatars',
    conversationMedia: 'conversation-media',
    messageUploads: 'message-uploads'
  },
  presenceChannelPrefix: 'atlas-presence',
  conversationChannelPrefix: 'atlas-conversation',
  defaults: {
    privacy: {
      lastSeen: 'everyone',
      profilePhoto: 'everyone',
      readReceipts: 'everyone'
    },
    settings: {
      mode: 'dark',
      accent: '#35c2ff',
      accentAlt: '#45e0b1',
      saturation: 1,
      fontScale: 'md',
      bubbleSize: 'sm',
      compactMode: false,
      showAvatars: true,
      showMessageTime: true,
      showTypingIndicator: true,
      enterToSend: true,
      showSidebarPreview: true,
      showReactionBar: true,
      blurMedia: false,
      wideBubbles: false,
      wallpaperGlow: true
    }
  }
};
