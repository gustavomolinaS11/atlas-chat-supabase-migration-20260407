import { APP_CONFIG } from '../../config/appConfig.js';
import { supabase } from '../../lib/supabaseClient.js';

async function uploadFile(bucket, path, file, options = {}) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    ...options
  });
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return {
    path: data.path,
    url: publicUrlData.publicUrl
  };
}

export function uploadAvatar(userId, file) {
  return uploadFile(APP_CONFIG.storageBuckets.avatars, `${userId}/avatar-${Date.now()}`, file);
}

export function uploadConversationPhoto(conversationId, file) {
  return uploadFile(APP_CONFIG.storageBuckets.conversationMedia, `${conversationId}/cover-${Date.now()}`, file);
}

export function uploadMessageAttachment(conversationId, file) {
  return uploadFile(APP_CONFIG.storageBuckets.messageUploads, `${conversationId}/${Date.now()}-${file.name}`, file);
}
