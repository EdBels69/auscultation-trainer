import { supabase } from './supabase';

/**
 * Validate participant credentials via server-side RPC.
 * Password is checked in PostgreSQL — never exposed to the client.
 * @param {string} code — e.g. "AT-0001" or "AT-ADM"
 * @param {string} password
 * @returns {{ participant: object|null, error: string|null }}
 */
export async function loginParticipant(code, password) {
  const normalized = code.trim().toUpperCase();

  // Basic format check
  if (!/^AT-[A-Z0-9]{1,4}$/.test(normalized)) {
    return { participant: null, error: 'Неверный формат ID' };
  }

  const { data, error } = await supabase.rpc('login_participant', {
    p_code: normalized,
    p_password: password,
  });

  if (error) {
    return { participant: null, error: 'Ошибка сервера' };
  }

  if (data?.error) {
    return { participant: null, error: data.error };
  }

  return { participant: data.participant, error: null };
}

/**
 * Get current participant from localStorage.
 */
export function getStoredParticipant() {
  try {
    const stored = localStorage.getItem('participant');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Store participant in localStorage.
 */
export function storeParticipant(participant) {
  localStorage.setItem('participant', JSON.stringify(participant));
}

/**
 * Clear stored participant (logout).
 */
export function clearParticipant() {
  localStorage.removeItem('participant');
}
