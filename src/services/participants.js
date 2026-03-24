import { supabase } from './supabase';

/**
 * Validate participant credentials against the database.
 * Password is stored per-row in the `participants` table.
 * @param {string} code — e.g. "AT-0001" or "ADMIN"
 * @param {string} password
 * @returns {{ participant: object|null, error: string|null }}
 */
export async function loginParticipant(code, password) {
  const normalized = code.trim().toUpperCase();

  // Validate format: AT-XXXX or AT-ADM
  if (!/^AT-(\d{4}|ADM)$/.test(normalized)) {
    return { participant: null, error: 'Неверный формат ID' };
  }

  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('code', normalized)
    .single();

  if (error || !data) {
    return { participant: null, error: 'ID участника не найден' };
  }

  // Check password from DB
  if (data.password && data.password !== password) {
    return { participant: null, error: 'Неверный пароль' };
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
