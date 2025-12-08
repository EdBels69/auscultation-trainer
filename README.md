# 🩺 Auscultation Trainer

<div align="center">

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5.x-0170FE?logo=antdesign&logoColor=white)

**Интерактивное веб-приложение для обучения аускультации сердца и лёгких**

[🚀 Демо](https://audiotrainerv1.netlify.app) · [📖 Документация](#использование) · [🐛 Сообщить об ошибке](https://github.com/yourusername/auscultation-trainer/issues)

</div>

---

## 📋 О проекте

**Auscultation Trainer** — образовательная платформа для студентов-медиков и практикующих врачей, предназначенная для изучения и тренировки навыков аускультации. Приложение включает библиотеку звуков сердца и лёгких, теоретические материалы с интерактивными элементами, а также систему тестирования.

### ✨ Основные возможности

- 🎧 **Библиотека звуков** — обширная коллекция аудиозаписей нормальных и патологических звуков
- 📚 **Интерактивная теория** — структурированные материалы с изображениями и встроенными аудио-блоками
- ✍️ **Система тестирования** — проверка знаний с мгновенной обратной связью
- 🤖 **AI Quiz** — динамические вопросы, генерируемые искусственным интеллектом
- 🛠️ **Админ-панель** — полный контроль над контентом без необходимости в программировании

---

## 🖼️ Скриншоты

<details>
<summary>📸 Показать скриншоты</summary>

| Раздел обучения | Редактор теории |
|:---:|:---:|
| ![Learning](docs/screenshots/learning.png) | ![Editor](docs/screenshots/editor.png) |

| Тестирование | Админ-панель |
|:---:|:---:|
| ![Test](docs/screenshots/test.png) | ![Admin](docs/screenshots/admin.png) |

</details>

---

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- npm или yarn
- Аккаунт [Supabase](https://supabase.com) (бесплатный тариф подходит)

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/yourusername/auscultation-trainer.git
cd auscultation-trainer

# Установить зависимости
npm install

# Создать файл окружения
cp .env.example .env

# Добавить ключи Supabase в .env
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Запустить dev-сервер
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

---

## 🏗️ Архитектура

```
src/
├── components/
│   ├── LearningSection.jsx    # Раздел обучения
│   ├── TheorySection.jsx      # Просмотр теории
│   ├── TestSection.jsx        # Тестирование
│   ├── AIQuizSection.jsx      # AI-викторина
│   ├── AdminPanel.jsx         # Главное меню админки
│   ├── StructureManager.jsx   # Управление структурой обучения
│   ├── TheoryManager.jsx      # Управление теорией
│   └── editor/
│       ├── TheoryEditor.jsx   # WYSIWYG-редактор
│       ├── ImageExtension.jsx # Кастомное расширение изображений
│       └── AudioBlockExtension.jsx # Встраивание аудио
├── services/
│   └── supabase.js            # Клиент Supabase
├── utils/
│   └── structureUtils.js      # Утилиты для работы с деревом
└── App.jsx                    # Главный компонент
```

---

## 🛠️ Технологии

| Категория | Технология |
|-----------|------------|
| **Frontend** | React 18, Vite |
| **UI библиотека** | Ant Design 5 |
| **Редактор** | TipTap (ProseMirror) |
| **База данных** | Supabase (PostgreSQL) |
| **Хранилище файлов** | Supabase Storage |
| **Деплой** | Netlify |

---

## 📊 Структура базы данных

### Таблицы Supabase

```sql
-- Структура обучения (дерево категорий)
learning_structure (
  id, parent_id, node_key, name, type, icon, sort_order
)

-- Аудиозаписи
audio_records (
  id, node_id, name, description, audio_url, image_url, position
)

-- Структура теории
theory_structure (
  id, parent_id, node_key, title, content, icon, is_folder, sort_order
)
```

---

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание |
|------------|----------|
| `VITE_SUPABASE_URL` | URL вашего Supabase проекта |
| `VITE_SUPABASE_ANON_KEY` | Публичный ключ Supabase |
| `VITE_ADMIN_PASSWORD` | Пароль для входа в админ-панель |

---

## 📝 Использование

### Для студентов

1. Перейдите в раздел **Обучение** для прослушивания звуков
2. Используйте **Тесты** для проверки своих знаний
3. Изучайте **Теорию** с интерактивными материалами

### Для администраторов

1. Войдите в **Админ-панель** (кнопка в навигации)
2. **Управление звуками** — создание структуры категорий, загрузка аудио
3. **Управление теорией** — WYSIWYG-редактор с поддержкой изображений и аудио-блоков

---

## 🤝 Вклад в проект

Мы приветствуем любые предложения по улучшению!

1. Fork репозитория
2. Создайте ветку для фичи (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## 📄 Лицензия

Распространяется под лицензией MIT. См. файл [LICENSE](LICENSE) для подробностей.

---

## 👥 Авторы

- **Ваше имя** — *Разработка* — [@yourusername](https://github.com/yourusername)

---

## 🙏 Благодарности

- [Supabase](https://supabase.com) — за отличный BaaS
- [Ant Design](https://ant.design) — за красивые компоненты
- [TipTap](https://tiptap.dev) — за мощный редактор

---

<div align="center">

**⭐ Если проект был полезен, поставьте звезду!**

Made with ❤️ for medical education

</div>
