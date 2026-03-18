import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uygwegdngztmbpuhsdrl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3dlZ2RuZ3p0bWJwdWhzZHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjczODQsImV4cCI6MjA4MDE0MzM4NH0.TBDRNSOK8w6xh9OefGVqChzQn0Ab-xZ6wVJ7D_sCAEg';

console.log('🔍 Проверка подключения к Supabase...\n');
console.log('URL:', supabaseUrl);
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Проверяем таблицу sounds
console.log('📊 Проверка таблицы "sounds"...');
try {
    const { data, error } = await supabase
        .from('sounds')
        .select('count')
        .limit(1);
    
    if (error) {
        if (error.message.includes('does not exist') || error.code === 'PGRST116') {
            console.log('❌ Таблица "sounds" НЕ существует');
        } else {
            console.log('❌ Ошибка:', error.message);
        }
    } else {
        console.log('✅ Таблица "sounds" существует!');
    }
} catch (err) {
    console.log('❌ Ошибка подключения:', err.message);
}

console.log('');

// Проверяем таблицу theory_nodes
console.log('📊 Проверка таблицы "theory_nodes"...');
try {
    const { data, error } = await supabase
        .from('theory_nodes')
        .select('count')
        .limit(1);
    
    if (error) {
        if (error.message.includes('does not exist') || error.code === 'PGRST116') {
            console.log('❌ Таблица "theory_nodes" НЕ существует');
        } else {
            console.log('❌ Ошибка:', error.message);
        }
    } else {
        console.log('✅ Таблица "theory_nodes" существует!');
    }
} catch (err) {
    console.log('❌ Ошибка подключения:', err.message);
}

console.log('');

// Проверяем таблицу learning_nodes
console.log('📊 Проверка таблицы "learning_nodes"...');
try {
    const { data, error } = await supabase
        .from('learning_nodes')
        .select('count')
        .limit(1);
    
    if (error) {
        if (error.message.includes('does not exist') || error.code === 'PGRST116') {
            console.log('❌ Таблица "learning_nodes" НЕ существует');
        } else {
            console.log('❌ Ошибка:', error.message);
        }
    } else {
        console.log('✅ Таблица "learning_nodes" существует!');
    }
} catch (err) {
    console.log('❌ Ошибка подключения:', err.message);
}

console.log('');

// Проверяем Storage buckets
console.log('📦 Проверка Storage buckets...');
try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.log('❌ Ошибка при проверке buckets:', error.message);
    } else {
        const bucketNames = data.map(b => b.name);
        console.log('Доступные buckets:', bucketNames.join(', ') || 'нет');
        
        if (bucketNames.includes('sounds')) {
            console.log('✅ Bucket "sounds" существует!');
        } else {
            console.log('❌ Bucket "sounds" НЕ существует');
        }
        
        if (bucketNames.includes('theory-media')) {
            console.log('✅ Bucket "theory-media" существует!');
        } else {
            console.log('⚠️  Bucket "theory-media" не существует (опциональный)');
        }
    }
} catch (err) {
    console.log('❌ Ошибка при проверке storage:', err.message);
}

console.log('\n' + '='.repeat(50));
console.log('📋 ИТОГОВАЯ ПРОВЕРКА');
console.log('='.repeat(50));

