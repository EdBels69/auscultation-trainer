import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// -------------------------------------------------------
// Storage helpers
// -------------------------------------------------------

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

// -------------------------------------------------------
// Auth helpers
// -------------------------------------------------------

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

/**
 * Регистрация нового пользователя с ФИО и ролью.
 *
 * profileData: {
 *   last_name, first_name, middle_name,
 *   role ('student'|'resident'|'doctor'|'teacher'),
 *   institution
 * }
 *
 * Для обратной совместимости profileData может быть строкой
 * (старый вызов signUp(email, pass, displayName)).
 */
export async function signUp(email, password, profileData = {}) {
    // Поддержка старого варианта вызова с одним строковым параметром
    if (typeof profileData === 'string') {
        profileData = { first_name: profileData };
    }

    const {
        last_name   = '',
        first_name  = '',
        middle_name = '',
        role        = 'student',
        institution = ''
    } = profileData;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { last_name, first_name, middle_name, role, institution }
        }
    });

    if (error) return { data, error };

    // Если email-подтверждение отключено — сессия есть сразу,
    // обновляем профиль с ФИО (триггер создал запись только с id+email).
    if (data?.user && data?.session) {
        await supabase
            .from('profiles')
            .update({
                last_name,
                first_name,
                middle_name,
                role,
                institution: institution || null
            })
            .eq('id', data.user.id);
    }

    return { data, error };
}

// -------------------------------------------------------
// Profile helpers
// -------------------------------------------------------

export async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    if (!data) {
        // Профиль не создан (редкий случай) — создаём из метаданных auth
        const meta = user.user_metadata || {};
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .upsert({
                id:          user.id,
                email:       user.email,
                last_name:   meta.last_name   || '',
                first_name:  meta.first_name  || '',
                middle_name: meta.middle_name || '',
                role:        meta.role        || 'student',
                institution: meta.institution || null
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating profile:', insertError);
            return { id: user.id, email: user.email, role: 'student' };
        }
        return newProfile;
    }

    // Если ФИО ещё не заполнены, но есть в метаданных — синхронизируем
    if (!data.first_name && user.user_metadata?.first_name) {
        const meta = user.user_metadata;
        const patch = {
            last_name:   meta.last_name   || data.last_name,
            first_name:  meta.first_name  || data.first_name,
            middle_name: meta.middle_name || data.middle_name,
            role:        meta.role        || data.role
        };
        await supabase.from('profiles').update(patch).eq('id', user.id);
        return { ...data, ...patch };
    }

    return data;
}

export async function updateUserProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates })
        .eq('id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    if (error) throw error;
}
