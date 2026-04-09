export function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    bio: row.bio || '',
    avatarUrl: row.avatar_url || '',
    lastSeenAt: row.last_seen_at,
    privacy: row.privacy || {},
    settings: row.settings || {}
  };
}

export function mapConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title || '',
    description: row.description || '',
    photoUrl: row.photo_url || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapConversationMember(row) {
  if (!row) return null;
  return {
    conversationId: row.conversation_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    lastReadAt: row.last_read_at,
    archivedAt: row.archived_at,
    clearedAt: row.cleared_at
  };
}

export function mapContact(row) {
  if (!row) return null;
  const profile = row.contact_profile || row.profiles || row.profile || null;
  return {
    ownerUserId: row.owner_user_id,
    contactUserId: row.contact_user_id,
    nickname: row.nickname || '',
    label: row.label || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: profile ? mapProfile(profile) : null
  };
}

export function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    kind: row.kind || 'message',
    text: row.text || '',
    metadata: row.metadata || {},
    replyTo: row.reply_to,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    attachments: Array.isArray(row.message_attachments) ? row.message_attachments : [],
    reactions: Array.isArray(row.message_reactions) ? row.message_reactions : [],
    mentions: Array.isArray(row.message_mentions) ? row.message_mentions : []
  };
}
