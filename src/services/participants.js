import { supabase } from './supabase';

/** Shared participant password — all 1000 IDs use the same one */
const PARTICIPANT_PASSWORD = 'auscult2026';

/**
 * Validate participant credentials.
 * @param {string} code — e.g. "AT-0001"
 * @param {string} password
 * @returns {{ participant: object|null, error: string|null }}
 */
export async function loginParticipant(code, password) {
  if (password !== PARTICIPANT_PASSWORD) {
    return { participant: null, error: 'Неверный пароль' };
  }

  const normalized = code.trim().toUpperCase();

  // Validate format
  if (!/^AT-\d{4}$/.test(normalized)) {
    return { participant: null, error: 'Неверный формат ID. Ожидается AT-0001 … AT-1000' };
  }

  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('code', normalized)
    .single();

  if (error || !data) {
    return { participant: null, error: 'ID участника не найден' };
  }

  return { participant: data, error: null };
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
