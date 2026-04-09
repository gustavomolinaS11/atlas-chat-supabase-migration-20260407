import { APP_CONFIG } from '../../config/appConfig.js';
import { supabase } from '../../lib/supabaseClient.js';
import { mapProfile } from '../../lib/dbMappers.js';

export async function getMyProfile() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const [{ data: profile, error: profileError }, { data: preferences, error: preferencesError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_settings')
      .select('settings, privacy')
      .eq('user_id', userId)
      .single()
  ]);

  if (profileError) throw profileError;
  if (preferencesError) throw preferencesError;

  return mapProfile({
    ...profile,
    settings: preferences?.settings || {},
    privacy: preferences?.privacy || {}
  });
}

export async function updateMyProfile(patch) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: patch.name,
      bio: patch.bio,
      avatar_url: patch.avatarUrl,
      last_seen_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapProfile(data);
}

export async function updateMySettings(patch) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sessao ausente');

  const { data: current, error: currentError } = await supabase
    .from('user_settings')
    .select('settings, privacy')
    .eq('user_id', userId)
    .single();

  if (currentError) throw currentError;

  const nextSettings = {
    ...APP_CONFIG.defaults.settings,
    ...(current?.settings || {}),
    ...(patch.settings || {})
  };
  const nextPrivacy = {
    ...APP_CONFIG.defaults.privacy,
    ...(current?.privacy || {}),
    ...(patch.privacy || {})
  };

  const { data, error } = await supabase
    .from('user_settings')
    .update({ settings: nextSettings, privacy: nextPrivacy })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
