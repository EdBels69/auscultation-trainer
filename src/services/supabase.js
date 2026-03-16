import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Send password reset email (redirects to our site, not Supabase dashboard)
export async function sendPasswordReset(email) {
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl,
  });
  return { error };
}

// Update password after reset (called after PASSWORD_RECOVERY event)
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

// Public user registration with role metadata
export async function signUp(email, password, metadata = {}) {
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl,
      data: metadata, // { full_name, role, year_of_study, institution }
    },
  });
  return { data, error };
}
