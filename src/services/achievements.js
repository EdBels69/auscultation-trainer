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
 *   theory_reader   — visited theory section (stored in localStorage, then awarded once)
 */
import { supabase } from './supabase';

const ALL_SURVEY_TYPES = ['demographics', 'sus', 'confidence_pre', 'confidence_post', 'feedback'];

/**
 * Award a badge if not already earned. Returns true if newly awarded.
 */
async function awardBadge(userId, badgeKey) {
    // Check if already earned
    const { data: existing } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_key', badgeKey)
        .maybeSingle();

    if (existing) return false;

    const { error } = await supabase
        .from('achievements')
        .insert({ user_id: userId, badge_key: badgeKey });

    if (error) {
        console.error(`Failed to award badge ${badgeKey}:`, error);
        return false;
    }
    return true;
}

/**
 * Check and award achievements after a test session is saved.
 * Call this after inserting a row into test_sessions.
 * @param {string} userId
 * @param {number} score — percentage 0–100
 */
export async function checkTestAchievements(userId, score) {
    const awarded = [];

    // first_session
    const { count } = await supabase
        .from('test_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (count >= 1 && await awardBadge(userId, 'first_session')) awarded.push('first_session');
    if (count >= 5 && await awardBadge(userId, 'five_sessions')) awarded.push('five_sessions');
    if (count >= 10 && await awardBadge(userId, 'ten_sessions')) awarded.push('ten_sessions');

    if (score >= 80 && await awardBadge(userId, 'score_80')) awarded.push('score_80');
    if (score >= 100 && await awardBadge(userId, 'score_100')) awarded.push('score_100');

    return awarded;
}

/**
 * Check and award achievements after a survey is submitted.
 * @param {string} userId
 * @param {string} surveyType — one of ALL_SURVEY_TYPES
 */
export async function checkSurveyAchievements(userId, surveyType) {
    const awarded = [];

    if (surveyType === 'sus' && await awardBadge(userId, 'sus_done')) {
        awarded.push('sus_done');
    }

    // Check if all surveys done
    const { data: done } = await supabase
        .from('survey_responses')
        .select('survey_type')
        .eq('user_id', userId);

    const doneTypes = new Set((done || []).map(r => r.survey_type));
    const allDone = ALL_SURVEY_TYPES.every(t => doneTypes.has(t));
    if (allDone && await awardBadge(userId, 'all_surveys')) {
        awarded.push('all_surveys');
    }

    return awarded;
}

/**
 * Award theory_reader badge (call once when user first visits theory section).
 */
export async function checkTheoryAchievement(userId) {
    if (!userId) return [];
    const awarded = [];
    if (await awardBadge(userId, 'theory_reader')) awarded.push('theory_reader');
    return awarded;
}

/**
 * Show a toast notification for newly awarded badges.
 * Pass the antd message API and an array of badge keys.
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
