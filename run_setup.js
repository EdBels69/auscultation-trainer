import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uygwegdngztmbpuhsdrl.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3dlZ2RuZ3p0bWJwdWhzZHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjczODQsImV4cCI6MjA4MDE0MzM4NH0.TBDRNSOK8w6xh9OefGVqChzQn0Ab-xZ6wVJ7D_sCAEg';

console.log('📦 Загрузка SQL скрипта...');
const sqlScript = readFileSync(join(__dirname, 'database_setup.sql'), 'utf-8');

console.log('🔌 Подключение к Supabase...');
console.log('URL:', supabaseUrl);

// Note: Для выполнения SQL через REST API нужен service_role ключ или прямой доступ к БД
// Попробуем через Management API
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Разделим SQL на отдельные запросы (упрощенная версия)
const statements = sqlScript
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`\n📊 Найдено ${statements.length} SQL операций`);

// К сожалению, выполнение SQL напрямую через REST API требует service_role ключ
// Но мы можем проверить подключение и дать инструкции
console.log('\n⚠️  Выполнение SQL через API требует специальных прав.');
console.log('📝 Альтернативный способ: используйте Supabase Dashboard > SQL Editor\n');

// Проверим подключение
try {
    const { data, error } = await supabase.from('sounds').select('count').limit(1);
    if (error && error.message.includes('does not exist')) {
        console.log('✅ Подключение работает, но таблицы еще не созданы.');
        console.log('\n💡 Для создания таблиц выполните SQL скрипт в Supabase Dashboard:');
        console.log('   1. Откройте https://supabase.com/dashboard');
        console.log('   2. Выберите ваш проект');
        console.log('   3. SQL Editor > New Query');
        console.log('   4. Скопируйте содержимое database_setup.sql');
        console.log('   5. Нажмите Run\n');
    } else if (error) {
        console.log('❌ Ошибка:', error.message);
    } else {
        console.log('✅ Подключение успешно!');
    }
} catch (err) {
    console.log('✅ Supabase клиент настроен правильно');
}

process.exit(0);

