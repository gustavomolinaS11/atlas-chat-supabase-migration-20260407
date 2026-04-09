import { supabase } from '../../lib/supabaseClient.js';
import { mapContact, mapProfile } from '../../lib/dbMappers.js';

async function getAuthUserId() {
  const { data: auth, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!auth.user?.id) throw new Error('Sessao ausente');
  return auth.user.id;
}

export async function listMyContacts() {
  const userId = await getAuthUserId();

  const { data, error } = await supabase
    .from('user_contacts')
    .select(`
      owner_user_id,
      contact_user_id,
      nickname,
      label,
      created_at,
      updated_at,
      contact_profile:profiles!user_contacts_contact_user_id_fkey (
        id,
        username,
        name,
        bio,
        avatar_url,
        last_seen_at
      )
    `)
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapContact);
}

export async function upsertMyContact({ contactUserId, nickname = '', label = '' }) {
  const userId = await getAuthUserId();

  const { data, error } = await supabase
    .from('user_contacts')
    .upsert({
      owner_user_id: userId,
      contact_user_id: contactUserId,
      nickname,
      label
    }, {
      onConflict: 'owner_user_id,contact_user_id'
    })
    .select(`
      owner_user_id,
      contact_user_id,
      nickname,
      label,
      created_at,
      updated_at,
      contact_profile:profiles!user_contacts_contact_user_id_fkey (
        id,
        username,
        name,
        bio,
        avatar_url,
        last_seen_at
      )
    `)
    .single();

  if (error) throw error;
  return mapContact(data);
}

export async function removeMyContact(contactUserId) {
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from('user_contacts')
    .delete()
    .eq('owner_user_id', userId)
    .eq('contact_user_id', contactUserId);

  if (error) throw error;
}

export async function searchProfiles(query) {
  const userId = await getAuthUserId();
  const normalized = String(query || '').trim();
  if (!normalized) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, name, bio, avatar_url, last_seen_at')
    .neq('id', userId)
    .or(`username.ilike.%${normalized}%,name.ilike.%${normalized}%`)
    .limit(20);

  if (error) throw error;
  return (data || []).map(mapProfile);
}
