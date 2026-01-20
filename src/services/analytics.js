import { supabase } from './supabase';

let currentSessionId = null;
let anonymousId = null;

export async function initAnalytics() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('anonymous_id')
        .eq('id', user.id)
        .maybeSingle();

    if (profile) {
        anonymousId = profile.anonymous_id;
        await startSession();
    }
    return anonymousId;
}

export async function startSession() {
    if (!anonymousId) return null;

    const deviceInfo = `${navigator.userAgent.substring(0, 200)}`;

    const { data, error } = await supabase
        .from('user_sessions')
        .insert({
            anonymous_id: anonymousId,
            device_info: deviceInfo
        })
        .select()
        .single();

    if (!error && data) {
        currentSessionId = data.id;
    }
    return currentSessionId;
}

export async function endSession() {
    if (!currentSessionId) return;

    await supabase
        .from('user_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', currentSessionId);

    currentSessionId = null;
}

export async function trackAction(actionType, actionData = {}) {
    if (!anonymousId) return;

    await supabase
        .from('user_actions')
        .insert({
            anonymous_id: anonymousId,
            session_id: currentSessionId,
            action_type: actionType,
            action_data: actionData
        });
}

export async function trackPageView(pageName) {
    await trackAction('page_view', { page: pageName });
}

export async function trackSoundPlay(soundId, soundName) {
    await trackAction('sound_play', { sound_id: soundId, sound_name: soundName });
}

export async function trackTestStart(testType) {
    await trackAction('test_start', { test_type: testType });
}

export async function trackChatMessage() {
    await trackAction('chat_message', {});
}

export async function saveTestAttempt(testType, results, durationSeconds = 0, testSettings = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { mode = 'both', difficulty = 'medium', questionCount = 10 } = testSettings;

    const { data, error } = await supabase
        .from('test_attempts')
        .insert({
            user_id: user.id,
            anonymous_id: anonymousId,
            test_type: testType,
            total_questions: results.total,
            correct_answers: results.correct,
            score_percent: results.score,
            duration_seconds: durationSeconds,
            details: results.details || [],
            mode,
            difficulty,
            question_count: questionCount
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving test attempt:', error);
    }
    return data;
}

export async function getMyStatistics() {
    if (!anonymousId) return null;

    const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .order('completed_at', { ascending: false });

    const { data: actions } = await supabase
        .from('user_actions')
        .select('action_type, created_at')
        .eq('anonymous_id', anonymousId)
        .order('created_at', { ascending: false })
        .limit(100);

    return {
        testAttempts: attempts || [],
        recentActions: actions || []
    };
}

export async function getAllStatisticsForAdmin() {
    const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .order('started_at', { ascending: false });

    const { data: actions } = await supabase
        .from('user_actions')
        .select('*')
        .order('created_at', { ascending: false });

    const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .order('completed_at', { ascending: false });

    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('anonymous_id, display_name, role, created_at');

    return {
        sessions: sessions || [],
        actions: actions || [],
        testAttempts: attempts || [],
        profiles: profiles || []
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

export function getAnonymousId() {
    return anonymousId;
}

export function resetAnalytics() {
    currentSessionId = null;
    anonymousId = null;
}
