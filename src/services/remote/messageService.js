import { APP_CONFIG } from '../../config/appConfig.js';
import { supabase } from '../../lib/supabaseClient.js';
import { mapMessage } from '../../lib/dbMappers.js';

export async function listMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      message_attachments (
        id,
        type,
        file_name,
        file_path,
        public_url,
        created_at
      ),
      message_reactions (
        message_id,
        user_id,
        emoji,
        created_at
      ),
      message_mentions (
        message_id,
        user_id,
        created_at
      )
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMessage);
}

export async function sendMessage({
  conversationId,
  text = '',
  replyTo = null,
  kind = 'message',
  metadata = {},
  mentions = [],
  attachments = []
}) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      kind,
      text,
      metadata,
      reply_to: replyTo
    })
    .select()
    .single();

  if (error) throw error;
  if (attachments.length) {
    const attachmentRows = attachments.map((attachment) => ({
      message_id: data.id,
      type: attachment.type,
      file_name: attachment.fileName,
      file_path: attachment.filePath,
      public_url: attachment.publicUrl
    }));
    const { error: attachmentError } = await supabase.from('message_attachments').insert(attachmentRows);
    if (attachmentError) throw attachmentError;
  }
  if (mentions.length) {
    const mentionRows = [...new Set(mentions)].map((mentionedUserId) => ({
      message_id: data.id,
      user_id: mentionedUserId
    }));
    const { error: mentionError } = await supabase.from('message_mentions').insert(mentionRows);
    if (mentionError) throw mentionError;
  }
  return mapMessage(data);
}

export async function listMyFavoriteMessageIds() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('message_favorites')
    .select('message_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((row) => row.message_id).filter(Boolean);
}

export async function listMyHiddenMessageIds() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('message_hidden_for')
    .select('message_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((row) => row.message_id).filter(Boolean);
}

export async function listMyPinnedMessages() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('conversation_pins')
    .select('conversation_id, message_id')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function editOwnMessage(messageId, nextText) {
  const { data, error } = await supabase
    .from('messages')
    .update({ text: nextText, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return mapMessage(data);
}

export async function deleteOwnMessage(messageId) {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export async function hideMessageForMe(messageId) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { error } = await supabase
    .from('message_hidden_for')
    .upsert({
      message_id: messageId,
      user_id: userId
    }, {
      onConflict: 'message_id,user_id'
    });

  if (error) throw error;
}

export async function unhideMessageForMe(messageId) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { error } = await supabase
    .from('message_hidden_for')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function setMessageReaction(messageId, emoji) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data: current, error: currentError } = await supabase
    .from('message_reactions')
    .select('emoji')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (currentError) throw currentError;

  const { error: deleteError } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (deleteError) throw deleteError;
  if (current?.emoji === emoji) return null;

  const { data, error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleMessageFavorite(messageId) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data: current, error: currentError } = await supabase
    .from('message_favorites')
    .select('message_id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (currentError) throw currentError;
  if (current) {
    const { error } = await supabase.from('message_favorites').delete().eq('message_id', messageId).eq('user_id', userId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from('message_favorites').insert({ message_id: messageId, user_id: userId });
  if (error) throw error;
  return true;
}

export async function setPinnedMessage({ conversationId, messageId }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data: current, error: currentError } = await supabase
    .from('conversation_pins')
    .select('message_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (currentError) throw currentError;

  const { error: deleteError } = await supabase
    .from('conversation_pins')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (deleteError) throw deleteError;
  if (current?.message_id === messageId) return null;

  const { data, error } = await supabase
    .from('conversation_pins')
    .insert({ conversation_id: conversationId, user_id: userId, message_id: messageId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToConversationMessages(conversationId, callback) {
  const channel = supabase
    .channel(`${APP_CONFIG.conversationChannelPrefix}:${conversationId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, callback)
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToConversationDecorations(conversationId, callback) {
  const channel = supabase
    .channel(`${APP_CONFIG.conversationChannelPrefix}:${conversationId}:decorations`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_reactions'
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_favorites'
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversation_pins',
      filter: `conversation_id=eq.${conversationId}`
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_mentions'
    }, callback)
    .subscribe();

  return () => supabase.removeChannel(channel);
}
