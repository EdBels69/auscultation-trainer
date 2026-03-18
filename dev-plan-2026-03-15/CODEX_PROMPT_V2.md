# Codex Prompt — Sprint 2 · Auscultation Trainer
# Дата: 2026-03-15
# Ветка: feature/ai-chat-v2-mobile

---

## СИСТЕМНЫЙ КОНТЕКСТ

Репозиторий: auscultation-trainer
Стек: React 18 + Vite + Supabase + Ant Design 5 + Deno Edge Functions
Хостинг: Beget (static SPA) + Supabase (PostgreSQL, Auth, Storage, Edge Functions)
Supabase project ref: eyippmobwgulkkjrjpih
AI провайдер: routerai.ru, модель deepseek/deepseek-v3.2, ключ уже прописан в Edge Function

Все изменения — только в папке `source_to_push/`.
После всех задач запусти `npm run build` внутри `source_to_push/` и убедись, что сборка успешна (exit 0).

---

## ЗАДАЧА 1 — Переработка ИИ-помощника (AIChatSection)

### 1.1 App.jsx — добавить state и пробросить props

Файл: `source_to_push/src/App.jsx`

**Что изменить:**

1. Добавить state для последнего результата теста:
```jsx
const [lastTestResult, setLastTestResult] = useState(null);
// структура: { score: number, mode: string, difficulty: string, wrongCount: number }
```

2. Передать `onTestComplete` в TestSection:
```jsx
<TestSection
  audioRecords={audioRecords}
  onTestComplete={(results, settings) =>
    setLastTestResult({
      score: results.score,
      mode: settings.mode,
      difficulty: settings.difficulty,
      wrongCount: results.wrong
    })
  }
/>
```

3. Передать props в AIChatSection:
```jsx
<AIChatSection
  userProfile={userProfile}
  currentSection={currentSection}
  lastTestResult={lastTestResult}
/>
```

---

### 1.2 TestSection.jsx — вызов onTestComplete

Файл: `source_to_push/src/components/TestSection.jsx`

**Что изменить:**

Добавить prop `onTestComplete` в сигнатуру компонента:
```jsx
function TestSection({ audioRecords, onTestComplete }) {
```

В функции `finishTest`, ПОСЛЕ вызова `saveTestAttempt`, добавить:
```jsx
onTestComplete?.(testResults, { mode: testMode, difficulty, questionCount });
```

---

### 1.3 AIChatSection.jsx — полная переработка

Файл: `source_to_push/src/components/AIChatSection.jsx`

**Принять новые props:**
```jsx
function AIChatSection({ userProfile, currentSection, lastTestResult }) {
```

**Что реализовать — ВЕСЬ компонент переписать:**

#### Контекстная плашка (Context Badge)
Показывается вверху над чатом. Условная логика:
- Если `lastTestResult` не null → `"📋 Последний тест: ${lastTestResult.score}% · ${modeLabel} · ${lastTestResult.wrongCount} ошибок"`
- Если `currentSection === 'learning'` или `currentSection === 'theory'` → `"📖 Режим: изучение материала"`
- Иначе → не показывать плашку

Стиль: небольшой `<Alert type="info" showIcon={false}>` с маленьким шрифтом, закруглённый.

#### Chips с быстрыми вопросами
Показываются только когда `messages.length === 0` (до начала диалога).
Рендерить как ряд кнопок `<Button size="small" type="default">`.

Логика chips:
- Если `lastTestResult` есть:
  ```
  "Разбери мои ошибки в тесте"
  "Почему я путаю эти звуки?"
  "Дай клинический случай по теме"
  "Как лучше запомнить?"
  ```
- Если `lastTestResult` нет:
  ```
  "С чего начать изучение аускультации?"
  "Объясни тоны сердца I и II"
  "Чем крепитация отличается от хрипов?"
  "Дай клинический случай"
  ```

При клике на chip — вставить текст chip в `inputValue` и сразу отправить.

#### Передача контекста в API
В теле запроса к Edge Function добавить поле `context`:
```js
body: JSON.stringify({
  message: userMessage,
  history: messages.slice(-6),   // было -10, теперь -6
  context: {
    userRole: userProfile?.role || 'student',
    lastTestResult: lastTestResult || null,
    currentSection: currentSection || 'chat'
  }
})
```

#### Исправить устаревший обработчик клавиш
Заменить `onKeyPress` на `onKeyDown`:
```jsx
const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};
// в JSX: onKeyDown={handleKeyDown}
```

#### Welcome-экран с chips
Когда `messages.length === 0`, показывать:
1. Иконка RobotOutlined
2. Короткий заголовок "ИИ-помощник по аускультации"
3. Контекстная плашка (если есть контекст)
4. Chips с быстрыми вопросами
5. Поле ввода внизу

#### Остальное поведение — без изменений
Отправка, история, очистка, скролл вниз — оставить как есть.

---

### 1.4 Edge Function ai-chat — новый системный промпт + контекст

Файл: `source_to_push/supabase/functions/ai-chat/index.ts`

**Что изменить:**

#### Интерфейс запроса
```typescript
interface ChatContext {
  userRole?: string;
  lastTestResult?: {
    score: number;
    mode: string;
    difficulty: string;
    wrongCount: number;
  } | null;
  currentSection?: string;
}

const { message, history = [], context = {} }:
  { message: string; history: ChatMessage[]; context: ChatContext }
  = await req.json();
```

#### Статичная часть промпта (BASE_PROMPT)
Заменить текущий SYSTEM_PROMPT на следующий:

```
Ты — Сергей Михайлович, опытный кардиолог и пульмонолог с 20-летним стажем
преподавания в медицинском университете. Ты куратор студента в цифровом
тренажёре аускультации.

СТИЛЬ ОБЩЕНИЯ:
- Отвечай кратко: 2–4 предложения, если студент не просит подробнее
- В конце КАЖДОГО ответа задавай один уточняющий или проверочный вопрос
- Используй конкретные клинические примеры, не абстрактные объяснения
- Не читай лекции — веди студента к пониманию через вопросы (сократический метод)
- Тон: дружелюбный, как опытный наставник, не строгий экзаменатор
- Обращение: на "ты"

ЭКСПЕРТИЗА:
- Сердечные шумы: систолические, диастолические, тоны I–IV
- Клапанные пороки: стеноз АК/МК, недостаточность АК/МК, ТК
- Лёгочные феномены: крепитация, сухие/влажные хрипы, бронхиальное дыхание,
  плевральный шум, ослабленное дыхание
- Точки и методика аускультации
- Патофизиология акустических феноменов
- Дифференциальная диагностика по аускультативной картине

ОГРАНИЧЕНИЯ:
- Отвечай только на вопросы об аускультации, кардиологии, пульмонологии
- Не давай конкретных назначений лечения для реальных пациентов
- При вопросе вне темы — вежливо верни к аускультации одной фразой

Язык ответов: русский.
```

#### Динамическая часть — функция buildContextBlock
```typescript
function buildContextBlock(ctx: ChatContext): string {
  const parts: string[] = [];

  const roleLabels: Record<string, string> = {
    student: "студент медицинского вуза",
    resident: "ординатор",
    doctor: "практикующий врач",
    teacher: "преподаватель"
  };
  parts.push(`УРОВЕНЬ СТУДЕНТА: ${roleLabels[ctx.userRole || "student"] || ctx.userRole}`);

  if (ctx.lastTestResult) {
    const t = ctx.lastTestResult;
    const modeLabel = t.mode === "cardiac" ? "кардиология"
      : t.mode === "pulmonary" ? "пульмонология"
      : "смешанный режим";
    const passed = t.score >= 70;
    parts.push(
      `ПОСЛЕДНИЙ ТЕСТ: ${t.score}% (${passed ? "сдан" : "не сдан"}), ` +
      `режим: ${modeLabel}, ошибок: ${t.wrongCount}.` +
      (!passed ? " Студент нуждается в дополнительной практике." : "")
    );
  }

  if (ctx.currentSection === "learning" || ctx.currentSection === "theory") {
    parts.push("ТЕКУЩИЙ РАЗДЕЛ: студент изучает обучающие материалы.");
  }

  return parts.length > 0
    ? "\n\nКОНТЕКСТ СТУДЕНТА:\n" + parts.join("\n")
    : "";
}
```

#### Сборка итогового промпта
```typescript
const systemPrompt = BASE_PROMPT + buildContextBlock(context);

const messages = [
  { role: "system", content: systemPrompt },
  ...history.slice(-6).map((msg: ChatMessage) => ({  // было -10, стало -6
    role: msg.role,
    content: msg.content
  })),
  { role: "user", content: message }
];
```

#### Параметры запроса к API — без изменений
Оставить: `temperature: 0.6`, `max_tokens: 1024`, URL и ключ не трогать.

---

## ЗАДАЧА 2 — Мобильная оптимизация

### 2.1 App.jsx — глобальный контейнер

Файл: `source_to_push/src/App.jsx`

В компоненте `<Content>` добавить адаптивный padding:
```jsx
<Content style={{
  padding: '0 24px',
  maxWidth: 1200,
  margin: '24px auto',
  width: '100%',
  boxSizing: 'border-box'
}}>
```

Добавить в `index.css` или создать глобальный CSS:
```css
@media (max-width: 768px) {
  .ant-layout-content {
    padding: 0 12px !important;
    margin: 12px auto !important;
  }
}
```

---

### 2.2 Navigation.jsx — мобильное меню

Файл: `source_to_push/src/components/Navigation.jsx`

Текущая реализация: горизонтальное меню `Menu mode="horizontal"` — на телефоне не помещается.

**Что реализовать:**

1. Добавить state: `const [drawerOpen, setDrawerOpen] = useState(false);`

2. Определить breakpoint через Ant Design hook:
```jsx
import { Grid } from 'antd';
const { useBreakpoint } = Grid;
// внутри компонента:
const screens = useBreakpoint();
const isMobile = !screens.md;
```

3. На мобильном (isMobile === true) — показывать:
   - Слева: логотип "Аускультация"
   - Справа: кнопка-бургер `<Button icon={<MenuOutlined />}>` + аватар пользователя
   - Горизонтальное меню скрыть

4. При клике на бургер — открывать `<Drawer placement="left" width={240}>` с вертикальным меню `<Menu mode="inline">` и теми же items.

5. Импортировать `MenuOutlined, Drawer` из соответствующих пакетов.

6. На десктопе — поведение без изменений.

---

### 2.3 AIChatSection.css — мобильные правки

Файл: `source_to_push/src/components/AIChatSection.css`

Добавить/расширить `@media (max-width: 768px)`:
```css
@media (max-width: 768px) {
  .ai-chat-section {
    padding: 8px 0;
  }

  .messages-container {
    max-height: calc(100vh - 280px);
  }

  .message-content {
    max-width: 88%;
    padding: 10px 12px;
  }

  .chat-container .ant-card-body {
    padding: 12px;
  }

  .chat-input-container {
    position: sticky;
    bottom: 0;
    background: #fff;
    padding-bottom: 8px;
  }

  .send-button {
    min-width: 44px;
    padding: 0 10px !important;
  }

  /* Скрыть текст кнопки "Отправить" на мобильном */
  .send-button span:not(.anticon) {
    display: none;
  }
}
```

---

### 2.4 TestSection.jsx — карточки на мобильном

Файл: `source_to_push/src/components/TestSection.jsx`

Найти `<Row gutter={16}` в блоке результатов (статистика: Балл / Правильно / Ошибок / Пропущено).
Изменить Col spans для мобильного:
```jsx
// было: <Col span={6}>
// стало:
<Col xs={12} sm={6}>
```
Применить ко всем четырём Col в блоке статистики результатов.

---

### 2.5 Dashboard.jsx — таблицы на мобильном

Файл: `source_to_push/src/components/Dashboard.jsx`

Для всех `<Table>` компонентов добавить `scroll={{ x: 'max-content' }}` если его нет.

Для `<Row gutter={[16, 16]}>` в KPI-блоке проверить, что все `<Col>` имеют `xs={12} sm={12} lg={6}` (не только `span={6}`).

---

### 2.6 Глобальный CSS — index.css или App.css

Файл: `source_to_push/src/index.css` (или App.css — смотри что существует)

Добавить в конец файла:
```css
/* ── Глобальная мобильная адаптация ─────────────────── */
@media (max-width: 768px) {
  /* Ant Design таблицы — горизонтальный скролл */
  .ant-table-wrapper {
    overflow-x: auto;
  }

  /* Заголовки разделов */
  h2.ant-typography {
    font-size: 20px !important;
  }

  /* Карточки — убрать горизонтальные отступы */
  .ant-card {
    border-radius: 8px !important;
  }

  /* Segmented — полная ширина */
  .ant-segmented {
    width: 100%;
  }
}
```

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

```
1.4  → Edge Function (промпт, контекст)
1.1  → App.jsx (state + props)
1.2  → TestSection.jsx (onTestComplete callback)
1.3  → AIChatSection.jsx (новый компонент)
2.2  → Navigation.jsx (мобильное меню)
2.3  → AIChatSection.css
2.4  → TestSection.jsx (мобильные Col)
2.5  → Dashboard.jsx (scroll таблиц)
2.6  → index.css (глобальные стили)
2.1  → App.jsx (Content padding)
BUILD → npm run build в source_to_push/
```

---

## ПРОВЕРОЧНЫЕ КРИТЕРИИ

- [ ] `npm run build` завершается без ошибок
- [ ] В AIChatSection.jsx нет `onKeyPress` (только `onKeyDown`)
- [ ] Edge Function принимает `context` объект без ошибок TypeScript
- [ ] `history.slice(-6)` — не более 6 сообщений истории
- [ ] На мобильном (width < 768px) Navigation показывает бургер-меню
- [ ] Chips отображаются до начала диалога и исчезают после первого сообщения
- [ ] Context badge появляется только при наличии lastTestResult
