import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadFile = async (bucket, file, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

export const deleteFile = async (bucket, path) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: displayName
            }
        }
    });
    return { data, error };
}

export async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    if (!data) {
        const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || '';
        const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                id: user.id,
                display_name: displayName,
                role: 'student'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating profile:', insertError);
            return { id: user.id, display_name: displayName, role: 'student' };
        }
        return newProfile;
    }

    return data;
}

export async function updateUserProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}
