# CODEX SPRINT 3 — Прогресс студентов, профиль, унификация Auth

## Контекст проекта

Стек: React 18 + Vite + Supabase + Ant Design 5 + Recharts
Папка: `source_to_push/src/`
Схема БД:
- `profiles` (id, email, first_name, last_name, middle_name, role, institution)
- `test_attempts` (id, user_id, score_percent, correct_count, total_count, details, completed_at)
- `user_achievements` (id, user_id, achievement_key, unlocked_at)

Функции в `src/services/analytics.js`:
- `getMyTestHistory()` — история тестов текущего пользователя
- `getMyAchievements()` — достижения текущего пользователя
- `checkAndUnlockAchievements(testResults, testSettings)` — разблокировка

Константы:
- `ACHIEVEMENT_DEFINITIONS` — массив объектов `{key, label, description, icon}`

---

## ЗАДАЧА 1 — Раздел «Мой прогресс» для студентов

### Что создать
Новый компонент `src/components/ProfileSection.jsx`.

### Функциональность
Четыре блока на странице:

**Блок 1 — Краткая сводка (KPI-карточки)**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Тестов пройдено│  Средний балл   │  Лучший балл    │  Достижений     │
│       N         │     N%          │     N%          │    K / 7        │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```
Использовать `<Statistic>` из Ant Design, данные из `getMyTestHistory()` + `getMyAchievements()`.

**Блок 2 — График прогресса**
LineChart из Recharts. Ось X: дата теста (formatted `DD.MM`), ось Y: score_percent (0–100).
Данные: `test_attempts`, отсортированные по `completed_at` по возрастанию.
Показывать за последние 30 попыток максимум.
Добавить горизонтальную пунктирную линию на 70% (порог прохождения) цвета `#faad14`.

**Блок 3 — История тестов**
`<Table>` Ant Design с колонками:
- Дата (из `completed_at`, формат `DD.MM.YYYY HH:mm`)
- Балл (с `<Progress>` или цветным `<Tag>`: зелёный ≥70, красный <70)
- Правильно (correct_count / total_count)
- Режим (из details или просто прочерк если нет)

Пагинация: 10 записей на страницу. `scroll={{ x: 'max-content' }}`.

**Блок 4 — Достижения**
Сетка карточек 3 в ряд (на мобиле 2 в ряд, `xs={12} sm={8}`).
Для каждого из 7 достижений из `ACHIEVEMENT_DEFINITIONS`:
- Если разблокировано: белая карточка, иконка + label + description, зелёная галочка
- Если нет: серая карточка с `opacity: 0.45`, замок вместо галочки

### Интеграция в App.jsx
1. Добавить `case 'profile':` в switch renderSection → `<ProfileSection userProfile={userProfile} />`
2. В `handleSectionChange` — раздел `profile` требует логина (`!user` → открыть AuthModal)

### Интеграция в Navigation.jsx
Добавить пункт меню «Мой прогресс» с иконкой `<LineChartOutlined />` между «Теория» и «ИИ-помощник».
Показывать пункт только если `user` существует (скрыть для незалогиненных).
Key: `'profile'`.

---

## ЗАДАЧА 2 — Редактирование профиля в ProfileSection

В `ProfileSection.jsx` добавить в начало страницы карточку «Мой профиль».

### Что показывать
- ФИО (last_name + first_name + middle_name)
- Email (только показать, не редактировать)
- Роль (student/resident/doctor/teacher → читаемый лейбл)
- Учреждение

### Редактирование
Кнопка «Редактировать» (иконка `<EditOutlined />`). По клику поля становятся редактируемыми (Ant Design `Form` с `initialValues` из `userProfile`).
Поля для редактирования: Фамилия, Имя, Отчество, Учреждение.
Роль — **не редактируется** пользователем (только отображается).

При сохранении вызывать `updateUserProfile(values)` из `src/services/supabase.js`.

**Важно:** в `updateUserProfile` убрать строку `updated_at: new Date().toISOString()` — этой колонки нет в схеме `profiles`.

После сохранения: `message.success('Профиль обновлён')` + обновить локальный `userProfile` state (через `onProfileUpdate` callback пропс из App.jsx).

В App.jsx добавить пропс `onProfileUpdate` к `ProfileSection`, который делает:
```js
const handleProfileUpdate = useCallback((updatedProfile) => {
  setUserProfile(updatedProfile);
}, []);
```

---

## ЗАДАЧА 3 — Уведомление об ачивках

В `src/components/TestSection.jsx` в функции `finishTest`:
```js
// Заменить молчащий catch:
checkAndUnlockAchievements(testResults, { mode: testMode, difficulty })
  .then((unlocked) => {
    if (unlocked && unlocked.length > 0) {
      const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === unlocked[0]);
      if (def) message.success(`${def.icon} Достижение разблокировано: ${def.label}!`);
    }
  })
  .catch(() => {});
```

Для этого изменить `checkAndUnlockAchievements` в `analytics.js` — возвращать массив ключей разблокированных достижений (тех, где `unlockAchievement` вернул не null):
```js
export async function checkAndUnlockAchievements(testResults, testSettings = {}) {
    const unlocked = [];
    const history = await getMyTestHistory();

    const tryUnlock = async (key) => {
        const result = await unlockAchievement(key);
        if (result) unlocked.push(key);
    };

    if (history.length <= 1) await tryUnlock('first_test');
    if (testResults.score === 100) await tryUnlock('sharp_ear');
    if (testResults.score >= 70) {
        if (testSettings.mode === 'cardiac')   await tryUnlock('cardio_novice');
        if (testSettings.mode === 'pulmonary') await tryUnlock('pulmo_novice');
    }
    const highScoreCount = history.filter(a => a.score_percent >= 80).length;
    if (highScoreCount >= 10) await tryUnlock('auscult_expert');

    return unlocked;
}
```

Импортировать `ACHIEVEMENT_DEFINITIONS` в `TestSection.jsx` из `'../services/analytics'`.

---

## ЗАДАЧА 4 — Унификация Auth: удаление AdminLogin

### Проблема
`AdminPanel.jsx` управляет собственным auth-state (useState + onAuthStateChange) и показывает `AdminLogin.jsx` если сессии нет. Это дублирует логику App.jsx.

### Решение

**AdminPanel.jsx** — переработать:
1. Удалить `const [session, setSession] = useState(null)` и весь `useEffect` с `supabase.auth.getSession/onAuthStateChange`
2. Добавить пропс `userProfile` (передаётся из App.jsx)
3. `isAdmin` = `userProfile?.role === 'admin'`
4. Если `!userProfile` (не залогинен): показать `<Result status="403" title="Требуется авторизация" subTitle="Войдите в систему через кнопку в шапке страницы" />`
5. Если залогинен, но `!isAdmin`: показать `<Result status="403" title="Нет доступа" subTitle="Этот раздел только для администраторов" />`

**App.jsx** — в `case 'admin':` передать `userProfile={userProfile}` в `<AdminPanel>`:
```jsx
<AdminPanel
  audioRecords={audioRecords}
  onAudioRecordsUpdate={handleRecordsUpdate}
  userProfile={userProfile}
/>
```

**Удалить файл** `src/components/AdminLogin.jsx` — он больше не нужен.

Удалить импорт `AdminLogin` из `AdminPanel.jsx`.

---

## ЗАДАЧА 5 — Контекст последнего теста при перезагрузке

### Проблема
`lastTestResult` в App.jsx — React state, сбрасывается при F5. Чат открывается без контекста.

### Решение
В App.jsx, в `initAuth` после загрузки профиля, подгружать последний тест:
```js
import { getMyTestHistory } from './services/analytics';

// В initAuth, после setUserProfile(profile):
const history = await getMyTestHistory();
if (history.length > 0) {
  const last = history[0]; // уже отсортировано по убыванию
  setLastTestResult({
    score: last.score_percent,
    mode: last.details?.mode || 'both',
    difficulty: last.details?.difficulty || 'medium',
    wrongCount: (last.total_count || 0) - (last.correct_count || 0),
  });
}
```

Аналогично добавить в `handleAuthSuccess`.

---

## ЗАДАЧА 6 — Rate limiting AI чата (простой фронтовый throttle)

В `src/components/AIChatSection.jsx`:
- Добавить `const [lastMessageTime, setLastMessageTime] = useState(0)`
- В `handleSend` перед отправкой:
```js
const now = Date.now();
if (now - lastMessageTime < 3000) {
  message.warning('Подождите немного перед следующим сообщением');
  return;
}
setLastMessageTime(now);
```
Это простой 3-секундный throttle. Кнопка «Отправить» остаётся `disabled` пока идёт запрос (уже реализовано через `loading` state).

---

## ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Тип изменения |
|------|---------------|
| `src/components/ProfileSection.jsx` | Создать новый |
| `src/App.jsx` | Добавить case 'profile', передать пропсы, загружать lastTestResult |
| `src/components/Navigation.jsx` | Добавить пункт «Мой прогресс» |
| `src/components/AdminPanel.jsx` | Убрать внутренний auth, принять userProfile пропсом |
| `src/components/AdminLogin.jsx` | Удалить файл |
| `src/services/analytics.js` | `checkAndUnlockAchievements` возвращает массив unlocked |
| `src/components/TestSection.jsx` | Нотификация об ачивках |
| `src/components/AIChatSection.jsx` | 3-секундный throttle |
| `src/services/supabase.js` | Убрать `updated_at` из `updateUserProfile` |

---

## ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ

1. `npm run build --legacy-peer-deps` — должен завершиться без ошибок
2. Зайти как студент → увидеть пункт «Мой прогресс» в навигации
3. Пройти тест → в ProfileSection появляется запись в истории и точка на графике
4. Открыть AdminPanel → если не залогинен, видеть сообщение «Войдите через шапку»
5. Залогиниться → AdminPanel работает без AdminLogin

---

## ВАЖНО: ЧТО НЕ ТРОГАТЬ

- Весь AdminPanel кроме удаления внутреннего auth — загрузка аудио, управление структурой, теория, статистика остаются неизменными
- StructureManager, TheoryManager, AudioUploadForm — не трогать
- StatisticsPanel — не трогать
- Логику тестов в TestSection — не трогать кроме нотификации об ачивках
- supabase/functions/ai-chat/index.ts — не трогать
