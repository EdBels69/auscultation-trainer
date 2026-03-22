import { supabase } from './supabase';

/**
 * Generate a random participant code like "AT-7K3M"
 * Uses only uppercase letters + digits, excluding confusable chars (0/O, 1/I/L)
 */
function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AT-${code}`;
}

/**
 * Create a new anonymous participant.
 * Returns { participant, error }
 */
export async function createParticipant({ full_name, role, year_of_study, institution }) {
  // Try up to 5 times in case of code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from('participants')
      .insert({
        code,
        full_name,
        role: role || 'student',
        year_of_study: year_of_study || null,
        institution: institution || 'ФГБОУ ВО РязГМУ Минздрава России',
      })
      .select()
      .single();

    if (!error) {
      return { participant: data, error: null };
    }

    // If unique constraint violation on code, retry
    if (error.code === '23505') continue;

    return { participant: null, error };
  }

  return { participant: null, error: { message: 'Не удалось сгенерировать уникальный код' } };
}

/**
 * Find participant by code.
 * Returns { participant, error }
 */
export async function findParticipantByCode(code) {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('code', normalized)
    .single();

  return { participant: data, error };
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
