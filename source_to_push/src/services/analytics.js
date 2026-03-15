import { supabase } from './supabase';

// -------------------------------------------------------
// Определения достижений
// -------------------------------------------------------

export const ACHIEVEMENT_DEFINITIONS = [
    {
        key: 'first_test',
        label: 'Первый тест',
        description: 'Прошли первый тест',
        icon: '🏁'
    },
    {
        key: 'cardio_novice',
        label: 'Кардиолог-новичок',
        description: 'Прошли кардио-тест с результатом ≥ 70%',
        icon: '❤️'
    },
    {
        key: 'pulmo_novice',
        label: 'Пульмонолог-новичок',
        description: 'Прошли пульмо-тест с результатом ≥ 70%',
        icon: '🫁'
    },
    {
        key: 'sharp_ear',
        label: 'Острый слух',
        description: 'Набрали 100% в любом тесте',
        icon: '👂'
    },
    {
        key: 'auscult_expert',
        label: 'Эксперт аускультации',
        description: 'Прошли 10 тестов с результатом ≥ 80%',
        icon: '🏆'
    },
    {
        key: 'theory_reader',
        label: 'Теоретик',
        description: 'Изучили все теоретические разделы',
        icon: '📚'
    },
    {
        key: 'polyglot',
        label: 'Полиглот',
        description: 'Переключили язык приложения',
        icon: '🌐'
    }
];

export function getAchievementDefinitions() {
    return ACHIEVEMENT_DEFINITIONS;
}

// -------------------------------------------------------
// Сохранение попытки теста
// -------------------------------------------------------

/**
 * Сохраняет результат теста в таблицу test_attempts.
 * Совместима с вызовом из TestSection: saveTestAttempt('local', testResults, duration, settings)
 */
export async function saveTestAttempt(testType, results, durationSeconds = 0, testSettings = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('test_attempts')
        .insert({
            user_id: user.id,
            score_percent: results.score,
            correct_count: results.correct,
            total_count: results.total,
            details: results.details || []
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving test attempt:', error);
        return null;
    }
    return data;
}

// -------------------------------------------------------
// История тестов текущего пользователя
// -------------------------------------------------------

export async function getMyTestHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

    if (error) {
        console.error('Error fetching test history:', error);
        return [];
    }
    return data || [];
}

export async function getMyStatistics() {
    const testAttempts = await getMyTestHistory();
    return { testAttempts };
}

// -------------------------------------------------------
// Достижения
// -------------------------------------------------------

export async function getMyAchievements() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

    if (error) {
        console.error('Error fetching achievements:', error);
        return [];
    }
    return data || [];
}

export async function unlockAchievement(achievementKey) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // upsert — игнорируем дубли (UNIQUE user_id + achievement_key)
    const { data, error } = await supabase
        .from('user_achievements')
        .upsert(
            { user_id: user.id, achievement_key: achievementKey },
            { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error('Error unlocking achievement:', error);
    }
    return data;
}

/**
 * Вызывается после каждого теста — проверяет и выдаёт достижения.
 * testResults: { score, correct, total, passed }
 * testSettings: { mode, difficulty, questionCount }
 */
export async function checkAndUnlockAchievements(testResults, testSettings = {}) {
    const history = await getMyTestHistory();
    const unlocked = [];

    const tryUnlock = async (key) => {
        const result = await unlockAchievement(key);
        if (result) unlocked.push(key);
    };

    // Первый тест
    if (history.length <= 1) {
        await tryUnlock('first_test');
    }

    // 100% в любом тесте
    if (testResults.score === 100) {
        await tryUnlock('sharp_ear');
    }

    // Первый успешный кардио/пульмо
    if (testResults.score >= 70) {
        if (testSettings.mode === 'cardiac')   await tryUnlock('cardio_novice');
        if (testSettings.mode === 'pulmonary') await tryUnlock('pulmo_novice');
    }

    // Эксперт: 10 тестов с ≥80%
    const highScoreCount = history.filter(a => a.score_percent >= 80).length;
    if (highScoreCount >= 10) {
        await tryUnlock('auscult_expert');
    }

    return unlocked;
}

// -------------------------------------------------------
// Статистика для администратора
// -------------------------------------------------------

export async function getAllStatisticsForAdmin() {
    const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .order('completed_at', { ascending: false });

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, last_name, first_name, middle_name, role, institution, email, created_at');

    const { data: achievements } = await supabase
        .from('user_achievements')
        .select('*')
        .order('unlocked_at', { ascending: false });

    return {
        testAttempts: attempts || [],
        profiles: profiles || [],
        achievements: achievements || []
    };
}

export function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                let cell = row[header];
                if (cell === null || cell === undefined) return '';
                if (typeof cell === 'object') cell = JSON.stringify(cell);
                cell = String(cell).replace(/"/g, '""');
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// -------------------------------------------------------
// Заглушки для обратной совместимости
// (таблиц user_sessions / user_actions в новой схеме нет)
// -------------------------------------------------------

export async function initAnalytics() { return null; }
export async function startSession()  { return null; }
export async function endSession()    {}
export async function trackAction()   {}
export async function trackPageView() {}
export async function trackSoundPlay() {}
export async function trackTestStart() {}
export async function trackChatMessage() {}
export function getAnonymousId()  { return null; }
export function resetAnalytics()  {}
