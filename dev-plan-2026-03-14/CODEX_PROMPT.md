# GPT Codex / GPT-4.1 — Исчерпывающий промпт для доработки Auscultation Trainer

> **Инструкция по использованию:**
> Открой ChatGPT (модель GPT-4.1 / o3 / Codex), вставь всё содержимое этого файла как первое сообщение.
> Затем пиши задачи по одной из списка ниже.
> Для каждой задачи Codex выдаст готовый код — копируй в нужный файл, затем `npm run build` и заливай dist на Бегет.

---

## СИСТЕМНЫЙ КОНТЕКСТ (вставить один раз в начале диалога)

```
Ты — senior React разработчик. Ты помогаешь дорабатывать веб-приложение "Auscultation Trainer" — образовательную платформу для студентов-медиков.

ТЕХНИЧЕСКИЙ СТЕК:
- React 18.3 + Vite 6
- Ant Design 5.x (компоненты: Card, Button, Form, Input, Modal, Table, Tabs, Progress, Statistic, message, notification)
- Supabase (PostgreSQL БД + Auth + Storage + Edge Functions)
- WaveSurfer.js (аудиоплеер)
- Recharts (графики в дашборде)
- react-markdown (рендеринг Markdown)
- i18next + react-i18next (переводы — ещё не добавлены)

СТРУКТУРА ПРОЕКТА:
src/
  App.jsx                    — главный компонент, useState для currentSection
  components/
    Navigation.jsx           — Ant Design Menu горизонтальное, keys: learning/theory/test/chat/admin
    LearningSection.jsx      — обучение: TopicTree слева + аудиоплеер справа
    TheorySection.jsx        — теория: дерево + TipTap редактор
    TestSection.jsx          — тест: 10 вопросов, finishTest() — НЕ сохраняет результат
    AIChatSection.jsx        — чат с ИИ → fetch POST supabase/functions/v1/ai-chat
    AdminPanel.jsx           — управление контентом (только admin)
    AdminLogin.jsx           — supabase.auth.signInWithPassword
    AudioPlayer.jsx          — WaveSurfer плеер
    TopicTree.jsx            — Ant Design Tree для разделов
  services/
    supabase.js              — createClient + signIn/signOut/getUser
    api.js                   — CRUD: getSounds, addSound, updateSound, deleteSound, getLearningNodes...
  utils/
    testGenerator.js         — generateTest(audioRecords, count), calculateResults(questions, answers)

SUPABASE КОНФИГ (переменные окружения):
  VITE_SUPABASE_URL=https://wffsytybxvopwjknfiyb.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

ТЕКУЩИЕ ТАБЛИЦЫ В SUPABASE:
  sounds         (id, name, description, category, position, file_path, file_name, image_url, audiogram_url, linked_node_key, created_at)
  theory_nodes   (id, parent_id, title, content, type, sort_order, icon, created_at)
  learning_nodes (id, key, name, description, type, parent_key, order, is_hidden, image_url, audiogram_url, created_at)

ПРАВИЛА КОДИРОВАНИЯ:
- Всегда используй функциональные компоненты и хуки
- Стили предпочтительно inline объектами (проект уже использует этот стиль)
- Обработку ошибок делай через Ant Design message.error() или notification
- Весь текст интерфейса на русском (пока нет i18n)
- Не используй TypeScript — проект на чистом JS
- Import порядок: React → сторонние библиотеки → локальные компоненты → локальные сервисы/утилиты
- Каждый файл должен быть самодостаточным — не разбивай на мелкие вспомогательные файлы без необходимости
```

---

## ЗАДАЧИ — вставляй по одной после системного контекста

---

### ЗАДАЧА 1: Расширить форму регистрации (ФИО + статус)

```
Найди в проекте компонент с формой регистрации (скорее всего в App.jsx или отдельном AuthModal.jsx).

Текущее состояние: форма регистрации содержит поля: имя, email, пароль, подтверждение пароля.

Нужно сделать:
1. Добавить поля: Фамилия (обязательное), Имя (обязательное), Отчество (необязательное)
2. Добавить Select "Статус" с вариантами: Студент / Ординатор / Врач / Преподаватель
3. Добавить Input "Учебное заведение / место работы" (необязательное)
4. После успешного supabase.auth.signUp() — сделать upsert в таблицу profiles:
   {
     id: user.id,
     email: user.email,
     first_name: values.first_name,
     last_name: values.last_name,
     middle_name: values.middle_name || null,
     role: values.role,
     institution: values.institution || null
   }
5. Таблица profiles уже создана в Supabase (схема в PLAN.md)

Верни полный обновлённый компонент.
```

---

### ЗАДАЧА 2: Сохранение результатов теста в Supabase

```
Файл: src/components/TestSection.jsx

Текущее состояние: функция finishTest() вычисляет результат и показывает его на экране, но не сохраняет в базу данных.

Нужно сделать:
1. Импортировать supabase из '../services/supabase'
2. В функции finishTest() после setTestCompleted(true) добавить async сохранение:
   - Получить текущего пользователя: supabase.auth.getUser()
   - Если пользователь авторизован — вставить запись в таблицу test_attempts:
     {
       user_id: user.id,
       score_percent: testResults.percentage,
       correct_count: testResults.correct,
       total_count: testResults.total,
       details: questions.map((q, i) => ({
         audioId: q.id || q.audioId,
         audioName: q.audioName || q.name,
         question: q.question,
         userAnswerId: userAnswers[i] || null,
         correctAnswerId: q.correctAnswerId,
         isCorrect: userAnswers[i] === q.correctAnswerId
       }))
     }
   - Если не авторизован — тихо пропустить (не блокировать UI)
   - Ошибки логировать в console.error(), не показывать пользователю
3. Не изменять логику отображения результата — только добавить сохранение

Верни полный обновлённый компонент TestSection.jsx.
```

---

### ЗАДАЧА 3: Кнопка "Отправить" в ИИ-чате не работает

```
Файл: src/components/AIChatSection.jsx (в репозитории может называться AIQuizSection.jsx или ChatSection.jsx)

Проблема: пользователь вводит текст в Ant Design TextArea, но кнопка "Отправить" остаётся неактивной или не реагирует. Причина — конфликт между onKeyPress (устаревший) и React synthetic events.

Нужно сделать:
1. Убедиться что onChange на TextArea правильно обновляет state:
   onChange={(e) => setMessage(e.target.value)}
2. Заменить onKeyPress на onKeyDown:
   onKeyDown={(e) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
   }}
3. Кнопка должна быть disabled только если message.trim() === '' или loading === true
4. Не менять логику отправки запроса к Supabase Edge Function — только починить UX

Верни полный обновлённый компонент.
```

---

### ЗАДАЧА 4: Создать файл analytics.js для дашборда

```
Нужно создать новый файл src/services/analytics.js.

Dashboard.jsx уже существует и импортирует:
  import { getAllStatisticsForAdmin, exportToCSV } from '../services/analytics';

Функция getAllStatisticsForAdmin() должна:
1. Параллельно запросить из Supabase:
   - Таблицу profiles (все пользователи)
   - Таблицу test_attempts (все попытки, отсортированные по completed_at DESC)
2. Вернуть объект:
   {
     profiles: [...],
     testAttempts: [...],
     sessions: [],     // пустой массив (пока не реализовано)
     actions: []       // пустой массив (пока не реализовано)
   }

Функция exportToCSV(attempts, filename) должна:
1. Принять массив попыток
2. Сформировать CSV с заголовками: Дата, Результат%, Правильных, Всего
3. Добавить BOM (\uFEFF) для корректного открытия в Excel
4. Скачать файл через временный <a> элемент

Если таблица profiles или test_attempts не существует в Supabase — функция должна вернуть пустые массивы без ошибки (try/catch с fallback).

Верни полный файл src/services/analytics.js.
```

---

### ЗАДАЧА 5: Страница профиля пользователя

```
Создать новый компонент src/components/ProfileSection.jsx.

Компонент получает props: { audioRecords } (не используется, но передаётся для единообразия)

Должен отображать:
1. Заголовок "Мой профиль"
2. Карточку с данными пользователя:
   - ФИО (из таблицы profiles: last_name + first_name + middle_name)
   - Email (из auth)
   - Статус (role из profiles: student → "Студент", resident → "Ординатор", doctor → "Врач", teacher → "Преподаватель")
   - Кнопка "Редактировать" — открывает Modal с формой редактирования ФИО/статуса
3. Блок статистики (Ant Design Statistic в Row/Col):
   - Всего тестов
   - Средний балл (%)
   - Лучший балл (%)
   - Последняя активность (дата)
4. LineChart (Recharts) — последние 10 попыток, ось X — дата, ось Y — score_percent
5. Таблица (Ant Design Table) последних 20 попыток:
   - Дата
   - Результат (Tag: красный <60%, жёлтый 60-80%, зелёный >80%)
   - Правильных / Всего

Данные загружать из Supabase:
- supabase.from('profiles').select('*').eq('id', user.id).single()
- supabase.from('test_attempts').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(20)

Добавить ProfileSection в App.jsx с ключом 'profile'.
Добавить в Navigation.jsx пункт меню: { key: 'profile', label: 'Профиль', icon: <UserOutlined /> }

Верни: ProfileSection.jsx, обновлённый App.jsx и обновлённый Navigation.jsx.
```

---

### ЗАДАЧА 6: Кнопка "Забыл пароль"

```
Найди компонент с формой входа (вкладка "Вход" в модальном окне авторизации).

Добавь под полем пароля ссылку-кнопку "Забыл пароль?":
- Стиль: type="link", fontSize 12, цвет #635bff
- При клике: если поле email заполнено — вызвать supabase.auth.resetPasswordForEmail(email, { redirectTo: 'http://edbels9i.beget.tech' })
- Если email пустой — показать message.warning('Введите email выше')
- При успехе — message.success('Письмо со ссылкой отправлено на ' + email)
- При ошибке — message.error(error.message)

Верни обновлённый компонент с формой входа.
```

---

### ЗАДАЧА 7: Поиск и фильтрация в разделе Обучение

```
Файл: src/components/LearningSection.jsx

Добавить над блоком с аудиозаписями (перед списком filteredRecords) панель поиска:

1. State:
   const [searchQuery, setSearchQuery] = useState('');

2. UI компонент (Ant Design):
   <Input.Search
     placeholder="Поиск по названию..."
     value={searchQuery}
     onChange={(e) => setSearchQuery(e.target.value)}
     allowClear
     style={{ marginBottom: 16 }}
   />

3. Обновить filteredRecords (в useMemo) — добавить фильтрацию по searchQuery:
   .filter(r => {
     if (!searchQuery) return true;
     const q = searchQuery.toLowerCase();
     return (
       r.name?.toLowerCase().includes(q) ||
       r.description?.toLowerCase().includes(q) ||
       r.position?.toLowerCase().includes(q)
     );
   })

4. Показывать searchQuery только когда selectedNodeKey указывает на leaf-узел (не папку, а конкретный раздел с аудиозаписями).

Верни полный обновлённый компонент LearningSection.jsx.
```

---

### ЗАДАЧА 8: Подключить react-markdown в LearningSection

```
Файл: src/components/LearningSection.jsx

В компоненте уже используется description для узлов (currentNode.description).
Сейчас это plain text. Нужно рендерить как Markdown.

1. Добавить импорт: import ReactMarkdown from 'react-markdown';
   (пакет уже установлен в проекте)

2. Найти все места где рендерится description (их 2-3 в зависимости от типа узла):
   - В FOLDER VIEW: блок с описанием папки
   - В LEAF VIEW: блок с описанием листового узла

3. Заменить {currentNode.description} на:
   <ReactMarkdown>{currentNode.description || ''}</ReactMarkdown>

4. Добавить CSS класс markdown-content к контейнеру:
   <div className="markdown-content" style={...существующие стили...}>
     <ReactMarkdown>{currentNode.description || ''}</ReactMarkdown>
   </div>

5. В src/index.css или src/App.css добавить стили:
   .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: 12px; margin-bottom: 6px; }
   .markdown-content p { margin-bottom: 8px; line-height: 1.7; }
   .markdown-content ul, .markdown-content ol { padding-left: 20px; margin-bottom: 8px; }
   .markdown-content strong { font-weight: 600; }
   .markdown-content code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }

Верни: обновлённый LearningSection.jsx и добавляемые CSS стили.
```

---

### ЗАДАЧА 9: Система достижений — базовая реализация

```
Создать систему достижений с минимальной реализацией.

1. Создать src/utils/achievements.js:
   - Массив ACHIEVEMENTS с 8 достижениями (см. список в PLAN.md)
   - Функцию checkAchievements(userId, testAttempts) — проверяет все достижения
     и возвращает массив ключей новых достижений которые нужно разблокировать
   - Функцию unlockAchievement(userId, achievementKey) — делает upsert в таблицу user_achievements
   - Функцию getUserAchievements(userId) — возвращает массив разблокированных ключей

2. В TestSection.jsx после сохранения попытки (задача 2):
   - Вызвать checkAchievements и unlockAchievement
   - Если есть новые достижения — показать notification.success с названием и иконкой

3. В ProfileSection.jsx (задача 5) добавить секцию "Достижения":
   - Сетка 4 колонки
   - Каждое достижение — Card 120x120px
   - Разблокированные: цветной эмодзи + название + описание
   - Заблокированные: серый фильтр (filter: grayscale(1) opacity(0.4))

SQL для таблицы (выполнить в Supabase):
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own achievements" ON user_achievements
  FOR ALL USING (auth.uid() = user_id);

Верни: achievements.js, обновлённый TestSection.jsx, обновлённый ProfileSection.jsx.
```

---

### ЗАДАЧА 10: Инструкция по деплою на Бегет

```
(Это не задача для кода — просто напомни порядок действий)

Объясни пошагово как после правок задеплоить React SPA на Beget shared hosting:
1. npm run build в папке проекта
2. Содержимое папки dist/ загрузить на Beget
3. Настройка .htaccess для SPA-роутинга
4. Проверить что переменные окружения .env правильно встроены в бандл (Vite встраивает VITE_* при сборке)
```

---

## СОВЕТЫ ПО ИСПОЛЬЗОВАНИЮ

- Вставляй задачи **по одной** — не все сразу
- После каждой задачи проверяй код перед копированием
- Для задач 1, 2, 3, 4 — сначала выполни SQL из PLAN.md в Supabase SQL Editor
- Порядок выполнения: 4 → 2 → 3 → 1 → 6 → 5 → 7 → 8 → 9
  (сначала бэкенд, потом UI)
- После каждых 2-3 задач: `npm run build` → тест локально → заливай на Бегет
