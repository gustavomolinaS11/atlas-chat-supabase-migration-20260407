import { APP_CONFIG } from '../../config/appConfig.js';
import { supabase } from '../../lib/supabaseClient.js';
import { mapMessage } from '../../lib/dbMappers.js';

export async function listMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMessage);
}

export async function sendMessage({ conversationId, text = '', replyTo = null }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      text,
      reply_to: replyTo
    })
    .select()
    .single();

  if (error) throw error;
  return mapMessage(data);
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
