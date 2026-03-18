// Простой скрипт для проверки в браузере
// Откройте консоль браузера (F12) и выполните этот код

console.log('🔍 Проверка Supabase подключения...');

const supabaseUrl = 'https://uygwegdngztmbpuhsdrl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3dlZ2RuZ3p0bWJwdWhzZHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjczODQsImV4cCI6MjA4MDE0MzM4NH0.TBDRNSOK8w6xh9OefGVqChzQn0Ab-xZ6wVJ7D_sCAEg';

// Используем глобальный объект supabase из приложения, если он есть
if (typeof window !== 'undefined' && window.supabase) {
    console.log('✅ Supabase клиент найден в window');
    checkTables(window.supabase);
} else {
    // Импортируем напрямую
    import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({ createClient }) => {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        checkTables(supabase);
    });
}

async function checkTables(supabase) {
    const tables = ['sounds', 'theory_nodes', 'learning_nodes'];
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('count').limit(1);
            if (error) {
                if (error.message.includes('does not exist') || error.code === 'PGRST116' || error.code === '42P01') {
                    console.log(`❌ Таблица "${table}" НЕ существует`);
                } else {
                    console.log(`❌ Таблица "${table}": ${error.message}`);
                }
            } else {
                console.log(`✅ Таблица "${table}" существует!`);
            }
        } catch (err) {
            console.log(`❌ Ошибка при проверке "${table}":`, err.message);
        }
    }
    
    // Проверка storage
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            console.log('❌ Ошибка Storage:', error.message);
        } else {
            const buckets = data.map(b => b.name);
            console.log('📦 Storage buckets:', buckets);
            if (buckets.includes('sounds')) {
                console.log('✅ Bucket "sounds" существует!');
            }
        }
    } catch (err) {
        console.log('❌ Ошибка Storage:', err.message);
    }
}



