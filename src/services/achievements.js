/**
 * Achievements / Badges service
 *
 * Badges:
 *   first_session   — first test completed
 *   score_80        — score ≥ 80% in any session
 *   score_100       — score 100% in any session
 *   five_sessions   — 5 test sessions completed
 *   ten_sessions    — 10 test sessions completed
 *   sus_done        — SUS questionnaire submitted
 *   all_surveys     — all 5 survey types submitted
 *   theory_reader   — visited theory section
 *
 * Supports both auth users (user_id) and anonymous participants (participant_id).
 * The `idField` parameter controls which column to use ('user_id' or 'participant_id').
 */
import { supabase } from './supabase';

const ALL_SURVEY_TYPES = ['demographics', 'sus', 'confidence_pre', 'confidence_post', 'feedback'];

/**
 * Award a badge if not already earned. Returns true if newly awarded.
 * @param {string} identityId - UUID of user or participant
 * @param {string} badgeKey
 * @param {string} idField - 'user_id' or 'participant_id'
 */
async function awardBadge(identityId, badgeKey, idField = 'participant_id') {
    // Check if already earned
    const { data: existing } = await supabase
        .from('achievements')
        .select('id')
        .eq(idField, identityId)
        .eq('badge_key', badgeKey)
        .maybeSingle();

    if (existing) return false;

    const payload = { badge_key: badgeKey };
    payload[idField] = identityId;

    const { error } = await supabase
        .from('achievements')
        .insert(payload);

    if (error) {
        console.error(`Failed to award badge ${badgeKey}:`, error);
        return false;
    }
    return true;
}

/**
 * Check and award achievements after a test session is saved.
 * @param {string} identityId - UUID of user or participant
 * @param {number} score — percentage 0–100
 * @param {string} idField - 'user_id' or 'participant_id'
 */
export async function checkTestAchievements(identityId, score, idField = 'participant_id') {
    const awarded = [];

    const { count } = await supabase
        .from('test_sessions')
        .select('id', { count: 'exact', head: true })
        .eq(idField, identityId);

    if (count >= 1 && await awardBadge(identityId, 'first_session', idField)) awarded.push('first_session');
    if (count >= 5 && await awardBadge(identityId, 'five_sessions', idField)) awarded.push('five_sessions');
    if (count >= 10 && await awardBadge(identityId, 'ten_sessions', idField)) awarded.push('ten_sessions');

    if (score >= 80 && await awardBadge(identityId, 'score_80', idField)) awarded.push('score_80');
    if (score >= 100 && await awardBadge(identityId, 'score_100', idField)) awarded.push('score_100');

    return awarded;
}

/**
 * Check and award achievements after a survey is submitted.
 * @param {string} identityId - UUID of user or participant
 * @param {string} surveyType — one of ALL_SURVEY_TYPES
 * @param {string} idField - 'user_id' or 'participant_id'
 */
export async function checkSurveyAchievements(identityId, surveyType, idField = 'participant_id') {
    const awarded = [];

    if (surveyType === 'sus' && await awardBadge(identityId, 'sus_done', idField)) {
        awarded.push('sus_done');
    }

    // Check if all surveys done
    const { data: done } = await supabase
        .from('survey_responses')
        .select('survey_type')
        .eq(idField, identityId);

    const doneTypes = new Set((done || []).map(r => r.survey_type));
    const allDone = ALL_SURVEY_TYPES.every(t => doneTypes.has(t));
    if (allDone && await awardBadge(identityId, 'all_surveys', idField)) {
        awarded.push('all_surveys');
    }

    return awarded;
}

/**
 * Award theory_reader badge.
 * @param {string} identityId
 * @param {string} idField - 'user_id' or 'participant_id'
 */
export async function checkTheoryAchievement(identityId, idField = 'participant_id') {
    if (!identityId) return [];
    const awarded = [];
    if (await awardBadge(identityId, 'theory_reader', idField)) awarded.push('theory_reader');
    return awarded;
}

/**
 * Show a toast notification for newly awarded badges.
 */
export function notifyAchievements(messageApi, awardedKeys) {
    const BADGE_META = {
        first_session: { label: 'Первая тренировка', icon: '🎯' },
        score_80: { label: 'Отлично (≥80%)', icon: '⭐' },
        score_100: { label: 'Идеально (100%)', icon: '🏆' },
        five_sessions: { label: '5 тренировок', icon: '🔥' },
        ten_sessions: { label: '10 тренировок', icon: '💪' },
        sus_done: { label: 'SUS пройден', icon: '📋' },
        all_surveys: { label: 'Все анкеты заполнены', icon: '📊' },
        theory_reader: { label: 'Изучил теорию', icon: '📚' },
    };

    awardedKeys.forEach(key => {
        const meta = BADGE_META[key] || { label: key, icon: '🏅' };
        messageApi.success({
            content: `${meta.icon} Получено достижение: «${meta.label}»`,
            duration: 4,
        });
    });
}
