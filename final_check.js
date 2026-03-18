import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uygwegdngztmbpuhsdrl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3dlZ2RuZ3p0bWJwdWhzZHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjczODQsImV4cCI6MjA4MDE0MzM4NH0.TBDRNSOK8w6xh9OefGVqChzQn0Ab-xZ6wVJ7D_sCAEg';

console.log('🔍 Финальная проверка базы данных...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = ['sounds', 'theory_nodes', 'learning_nodes'];
let allGood = true;

for (const table of tables) {
    try {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error) {
            console.log(`❌ ${table}: ${error.message}`);
            allGood = false;
        } else {
            console.log(`✅ ${table}: таблица существует`);
        }
    } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
        allGood = false;
    }
}

// Проверка Storage
try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.log(`❌ Storage: ${error.message}`);
        allGood = false;
    } else {
        const buckets = data.map(b => b.name);
        if (buckets.includes('sounds')) {
            console.log('✅ Storage bucket "sounds" существует');
        } else {
            console.log('❌ Storage bucket "sounds" отсутствует');
            allGood = false;
        }
    }
} catch (err) {
    console.log(`❌ Storage: ${err.message}`);
    allGood = false;
}

console.log('\n' + '='.repeat(50));
if (allGood) {
    console.log('🎉 ВСЁ ОТЛИЧНО! База данных настроена правильно!');
    console.log('\n✅ Теперь перезагрузите страницу приложения:');
    console.log('   http://localhost:5173');
    console.log('\nОшибки загрузки данных должны исчезнуть!');
} else {
    console.log('⚠️  Есть проблемы, но основные таблицы созданы.');
}
console.log('='.repeat(50));

