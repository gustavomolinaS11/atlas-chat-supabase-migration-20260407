import { supabase } from '../../lib/supabaseClient.js';
import { mapConversation } from '../../lib/dbMappers.js';

export async function listMyConversations() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      role,
      joined_at,
      last_read_at,
      conversations (
        id,
        type,
        title,
        photo_url,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    role: row.role,
    joinedAt: row.joined_at,
    lastReadAt: row.last_read_at,
    conversation: mapConversation(row.conversations)
  }));
}

export async function createGroupConversation({ title, memberIds = [], photoUrl = '' }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({
      type: 'group',
      title,
      photo_url: photoUrl,
      created_by: userId
    })
    .select()
    .single();

  if (conversationError) throw conversationError;

  const members = [...new Set([userId, ...memberIds])].map((memberId) => ({
    conversation_id: conversation.id,
    user_id: memberId,
    role: memberId === userId ? 'admin' : 'member'
  }));

  const { error: membersError } = await supabase.from('conversation_members').insert(members);
  if (membersError) throw membersError;

  return mapConversation(conversation);
}

export async function createOrGetDirectConversation(peerUserId) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data: existingIds, error: existingIdsError } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .in('user_id', [userId, peerUserId]);

  if (existingIdsError) throw existingIdsError;

  const counts = new Map();
  (existingIds || []).forEach((row) => {
    counts.set(row.conversation_id, (counts.get(row.conversation_id) || 0) + 1);
  });

  const directConversationId = [...counts.entries()].find(([, count]) => count === 2)?.[0];
  if (directConversationId) {
    const { data, error } = await supabase.from('conversations').select('*').eq('id', directConversationId).single();
    if (error) throw error;
    return mapConversation(data);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({ type: 'direct', created_by: userId })
    .select()
    .single();

  if (conversationError) throw conversationError;

  const { error: membersError } = await supabase.from('conversation_members').insert([
    { conversation_id: conversation.id, user_id: userId, role: 'admin' },
    { conversation_id: conversation.id, user_id: peerUserId, role: 'member' }
  ]);

  if (membersError) throw membersError;
  return mapConversation(conversation);
}

export async function updateGroupConversation(conversationId, patch) {
  const payload = {};
  if (typeof patch.title === 'string') payload.title = patch.title;
  if (typeof patch.photoUrl === 'string') payload.photo_url = patch.photoUrl;

  const { data, error } = await supabase
    .from('conversations')
    .update(payload)
    .eq('id', conversationId)
    .eq('type', 'group')
    .select()
    .single();

  if (error) throw error;
  return mapConversation(data);
}

export async function addGroupMembers(conversationId, memberIds) {
  const rows = [...new Set(memberIds)].map((userId) => ({
    conversation_id: conversationId,
    user_id: userId,
    role: 'member'
  }));
  const { error } = await supabase.from('conversation_members').upsert(rows, { onConflict: 'conversation_id,user_id' });
  if (error) throw error;
}

export async function setMemberRole(conversationId, userId, role) {
  const { error } = await supabase
    .from('conversation_members')
    .update({ role })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function removeGroupMember(conversationId, userId) {
  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}
