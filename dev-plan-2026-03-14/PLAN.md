# 🩺 Auscultation Trainer — План доработки
**Дата:** 14 марта 2026
**Стек:** React 18 + Vite + Supabase + Ant Design 5
**Деплой:** Бегет (статика) + Supabase (БД, Storage, Auth, Edge Functions)
**Репозиторий:** ветка `feature/sprint-1-admin` → затем `feature/sprint-2-ux` → `feature/sprint-3-i18n`

---

## Архитектурный контекст

```
src/
  App.jsx                  ← главный компонент, роутинг по секциям
  components/
    Navigation.jsx         ← меню (5 пунктов: learning/theory/test/chat/admin)
    LearningSection.jsx    ← обучение (дерево + аудиоплеер)
    TheorySection.jsx      ← теория (дерево + редактор TipTap)
    TestSection.jsx        ← тесты (10 вопросов, нет сохранения)
    AIChatSection.jsx      ← ИИ-чат → Supabase Edge Function ai-chat
    AdminPanel.jsx         ← управление контентом (только для admin@)
    AdminLogin.jsx         ← вход через supabase.auth.signInWithPassword
    AudioPlayer.jsx        ← плеер с WaveSurfer
    TopicTree.jsx          ← дерево разделов
  services/
    supabase.js            ← клиент Supabase + auth helpers
    api.js                 ← CRUD для sounds, theory_nodes, learning_nodes
  utils/
    testGenerator.js       ← генерация теста из audioRecords (без сохранения)

Supabase таблицы (текущие):
  sounds          — аудиозаписи
  theory_nodes    — теория
  learning_nodes  — структура обучения
```

---

## СПРИНТ 1 — Администрирование и сбор данных
**Ветка:** `feature/sprint-1-admin`
**Приоритет:** КРИТИЧЕСКИЙ — без этого дашборд не работает

### 1.1 Расширение регистрации (ФИО + статус)

**Файл:** `src/components/AuthModal.jsx` (или где находится форма регистрации)

Текущее поле: только `name` (одно поле "Ваше имя").

Нужно добавить:
- `last_name` — Фамилия (обязательное)
- `first_name` — Имя (обязательное)
- `middle_name` — Отчество (необязательное)
- `role` — Select: `student` | `resident` | `doctor` | `teacher`
- `institution` — Учебное заведение / место работы (необязательное)

При регистрации вызывать `supabase.auth.signUp()` затем сразу `upsert` в таблицу `profiles`.

### 1.2 Новая таблица `profiles` в Supabase

SQL для выполнения в Supabase → SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  role TEXT CHECK (role IN ('student','resident','doctor','teacher','admin')) DEFAULT 'student',
  institution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 1.3 Новая таблица `test_attempts` в Supabase

```sql
CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score_percent INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  details JSONB DEFAULT '[]',
  -- details format: [{ audioId, audioName, question, userAnswerId, correctAnswerId, isCorrect }]
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own attempts"
  ON test_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own attempts"
  ON test_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON test_attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
```

### 1.4 Сохранение результатов теста

**Файл:** `src/components/TestSection.jsx`

В функции `finishTest()` (после `setTestCompleted(true)`) добавить:

```javascript
import { supabase } from '../services/supabase';

const finishTest = async () => {
  const testResults = calculateResults(questions, userAnswers);
  setResults(testResults);
  setTestCompleted(true);

  // Сохранить попытку в Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const details = questions.map((q, i) => ({
        audioId: q.audioId,
        audioName: q.audioName,
        question: q.question,
        userAnswerId: userAnswers[i] || null,
        correctAnswerId: q.correctAnswerId,
        isCorrect: userAnswers[i] === q.correctAnswerId
      }));

      await supabase.from('test_attempts').insert({
        user_id: user.id,
        score_percent: testResults.percentage,
        correct_count: testResults.correct,
        total_count: testResults.total,
        details
      });
    }
  } catch (err) {
    console.error('Failed to save test attempt:', err);
    // Не прерываем UX — тихо логируем
  }
};
```

### 1.5 Сброс пароля

**Файл:** `src/components/AuthModal.jsx` (форма Вход)

Добавить кнопку-ссылку "Забыл пароль?" под полем пароля:

```javascript
const handleForgotPassword = async () => {
  if (!emailValue) {
    message.warning('Введите email в поле выше');
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
    redirectTo: 'http://edbels9i.beget.tech/#reset-password'
  });
  if (error) {
    message.error('Ошибка: ' + error.message);
  } else {
    message.success('Ссылка для сброса пароля отправлена на ' + emailValue);
  }
};
```

Также добавить обработчик на `#reset-password` хэш в `App.jsx` — показывать форму смены пароля если в URL есть `type=recovery`.

### 1.6 Страница профиля пользователя

Добавить новый раздел `profile` в навигацию (иконка UserOutlined) с:
- ФИО и статус (редактируемые)
- Статистика: всего тестов, средний балл, лучший балл
- График последних 10 попыток (Recharts LineChart)
- Список последних попыток с датой и результатом

### 1.7 Исправить дашборд (analytics.js)

**Новый файл:** `src/services/analytics.js`

```javascript
import { supabase } from './supabase';

export async function getAllStatisticsForAdmin() {
  const [profilesRes, attemptsRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('test_attempts').select('*').order('completed_at', { ascending: false })
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (attemptsRes.error) throw attemptsRes.error;

  return {
    profiles: profilesRes.data || [],
    testAttempts: attemptsRes.data || [],
    sessions: [],   // опционально в будущем
    actions: []     // опционально в будущем
  };
}

export function exportToCSV(data, filename) {
  const headers = ['ФИО', 'Email', 'Роль', 'Дата', 'Результат %', 'Правильных', 'Всего'];
  const rows = data.map(a => [
    a.profiles?.last_name + ' ' + a.profiles?.first_name,
    a.profiles?.email,
    a.profiles?.role,
    new Date(a.completed_at).toLocaleDateString('ru'),
    a.score_percent,
    a.correct_count,
    a.total_count
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
}
```

---

## СПРИНТ 2 — UX и функциональность

### 2.1 Исправить баг с кнопкой в ИИ-чате

**Файл:** `src/components/AIChatSection.jsx`
(в репозитории — может называться `AIQuizSection.jsx` в старой версии)

Проблема: `onKeyPress` устарел + React + Ant Design TextArea конфликт.

Заменить `onKeyPress` на `onKeyDown`:

```javascript
// БЫЛО:
onKeyPress={C}

// СТАЛО:
onKeyDown={(e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();  // функция отправки
  }
}}
```

Также убедиться что `onChange` правильно обновляет state:
```javascript
onChange={(e) => setMessage(e.target.value)}
```

### 2.2 Улучшить промпт ИИ-помощника

В Supabase Edge Function `ai-chat` найти системный промпт и заменить на:

```
Ты — опытный преподаватель клинической медицины, специализирующийся на аускультации сердца и лёгких.
Ты помогаешь студентам-медикам, ординаторам и врачам разобраться в звуковых феноменах при аускультации.

СТИЛЬ ОБЩЕНИЯ:
- Отвечай на языке пользователя (русский или английский)
- Будь конкретным и клинически точным
- Используй структурированные ответы с примерами
- Если уместно — давай мнемонические правила
- Приводи патофизиологическое объяснение звукового феномена

ТЕМАТИКА (только это):
- Тоны сердца (S1, S2, S3, S4, дополнительные тоны)
- Сердечные шумы (систолические, диастолические, их характеристики)
- Точки аускультации сердца (Митральная, Трикуспидальная, Аортальная, Пульмональная, Боткина-Эрба)
- Дыхательные шумы (везикулярное, бронхиальное дыхание)
- Хрипы (сухие, влажные, крепитация), плевральный шум трения
- Дифференциальная диагностика по аускультативным данным

ОГРАНИЧЕНИЯ:
- Не давай рекомендации по лечению конкретных пациентов
- Если вопрос не по аускультации — вежливо направь к теме
- Не заменяй живое обучение и клинический опыт
```

### 2.3 Поиск и фильтрация звуков

**Файл:** `src/components/LearningSection.jsx`

Добавить над деревом разделов строку поиска + фильтры:

```javascript
const [searchQuery, setSearchQuery] = useState('');
const [filterType, setFilterType] = useState('all'); // 'all' | 'normal' | 'pathological'

// В filteredRecords добавить:
.filter(r => {
  if (filterType === 'normal') return r.category === 'cardiac' && r.name.toLowerCase().includes('норм');
  if (filterType === 'pathological') return !r.name.toLowerCase().includes('норм');
  return true;
})
.filter(r => searchQuery ?
  r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  : true
)
```

UI: `<Input.Search>` + `<Select>` с опциями Все / Норма / Патология.

### 2.4 Подключить react-markdown в LearningSection

**Файл:** `src/components/LearningSection.jsx`

```javascript
import ReactMarkdown from 'react-markdown';

// БЫЛО:
<div>{currentNode.description}</div>

// СТАЛО:
<div className="markdown-content">
  <ReactMarkdown>{currentNode.description || ''}</ReactMarkdown>
</div>
```

CSS для `.markdown-content`: стандартные стили для h1-h4, p, ul, ol, strong, em, code.

### 2.5 История тестов в профиле

На странице профиля пользователя (п.1.6) показывать таблицу попыток:
- Дата и время
- Результат (score_percent с цветовой индикацией: <60% красный, 60-80% жёлтый, >80% зелёный)
- Детали: раскрывающийся список вопросов с правильными/неправильными ответами

### 2.6 Система достижений (Achievements)

**Новая таблица:**
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);
```

**Новый файл:** `src/utils/achievements.js`

```javascript
export const ACHIEVEMENTS = [
  { key: 'first_test',       icon: '🩺', title: 'Первый осмотр',       desc: 'Пройти первый тест',                condition: (stats) => stats.totalTests >= 1 },
  { key: 'cardio_novice',    icon: '❤️', title: 'Кардиолог-новичок',   desc: '5 тестов по кардиологии',           condition: (stats) => stats.cardioTests >= 5 },
  { key: 'pulmo_novice',     icon: '🫁', title: 'Пульмонолог-новичок', desc: '5 тестов по пульмонологии',         condition: (stats) => stats.pulmoTests >= 5 },
  { key: 'sharp_ear',        icon: '🎯', title: 'Меткий слух',         desc: '3 теста подряд с результатом >80%', condition: (stats) => stats.streak80 >= 3 },
  { key: 'week_streak',      icon: '🔥', title: 'Серия',               desc: '7 дней подряд с активностью',       condition: (stats) => stats.dayStreak >= 7 },
  { key: 'auscult_expert',   icon: '🏆', title: 'Эксперт аускультации',desc: '50 тестов с результатом >90%',      condition: (stats) => stats.tests90 >= 50 },
  { key: 'theory_reader',    icon: '📚', title: 'Теоретик',            desc: 'Открыть все разделы теории',        condition: (stats) => stats.theoryRead >= stats.theoryTotal },
  { key: 'polyglot',         icon: '🌍', title: 'Полиглот',            desc: 'Переключить язык на английский',    condition: (stats) => stats.usedEnglish === true },
];

export async function checkAndUnlockAchievements(userId, stats) {
  // После каждого теста вычислять новые достижения и записывать в Supabase
}
```

Показывать достижения в профиле как карточки 2×4, серые (заблокированные) и цветные (разблокированные).

---

## СПРИНТ 3 — Расширение

### 3.1 Переключатель языка (i18n)

**Пакеты:** `npm install i18next react-i18next`

**Новые файлы:**
- `src/i18n/ru.json` — все строки на русском
- `src/i18n/en.json` — все строки на английском
- `src/i18n/index.js` — инициализация i18next

В `Navigation.jsx` добавить кнопку-переключатель `RU | EN` справа от меню.

Пример `ru.json`:
```json
{
  "nav": {
    "learning": "Обучение",
    "theory": "Теория",
    "test": "Тест",
    "ai": "ИИ Помощник",
    "profile": "Профиль"
  },
  "learning": {
    "subsections": "Подразделы",
    "audioRecords": "Аудиозаписи",
    "noAudio": "Аудиозаписи пока не добавлены"
  }
}
```

### 3.2 Деплой на Бегет

После каждого спринта:
1. `npm run build` — собрать в `/dist`
2. Содержимое `/dist` залить в корень хостинга на Бегете через FTP или файловый менеджер
3. Убедиться что `.htaccess` или `_redirects` настроен для SPA (все пути → index.html)

**Файл `_redirects` (уже есть в beget_upload):**
```
/*  /index.html  200
```

**Файл `.htaccess` (добавить в корень на Бегете если нет):**
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## Текущие известные баги

| # | Описание | Файл | Приоритет |
|---|----------|------|-----------|
| 1 | ИИ-чат: кнопка "Отправить" не реагирует на ввод | AIChatSection.jsx | ВЫСОКИЙ |
| 2 | ИИ-чат: Edge Function возвращает 401 "User not found" | Supabase → ai-chat function | ВЫСОКИЙ |
| 3 | Дашборд: analytics.js не существует, импорт падает | Dashboard.jsx | ВЫСОКИЙ |
| 4 | TestSection: результаты не сохраняются в БД | TestSection.jsx | ВЫСОКИЙ |
| 5 | Регистрация: нет полей ФИО и статус | AuthModal.jsx | СРЕДНИЙ |
| 6 | LearningSection: description рендерится без Markdown | LearningSection.jsx | НИЗКИЙ |

---

## Что НЕ нужно менять

- Структура аудиозаписей и хранилище Supabase Storage — работает хорошо
- AudioPlayer с WaveSurfer — оставить как есть
- Визуализация аускультационных точек через картинки — оставить как есть
- AdminPanel (управление контентом) — работает, не трогать
- TheorySection + TipTap редактор — работает
- Структура learning_nodes и TopicTree — работает
