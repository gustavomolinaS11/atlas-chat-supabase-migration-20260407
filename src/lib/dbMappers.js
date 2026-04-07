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
    photoUrl: row.photo_url || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    text: row.text || '',
    replyTo: row.reply_to,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at
  };
}
