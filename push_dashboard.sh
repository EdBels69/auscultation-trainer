#!/bin/bash
# Запустите этот скрипт из папки с репозиторием auscultation-trainer
# Он скопирует новые файлы и сделает git push

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(pwd)"

echo "📦 Копируем обновлённые файлы..."

# Новый компонент Dashboard
cp "$SCRIPT_DIR/source_to_push/src/components/Dashboard.jsx" "$REPO_DIR/src/components/Dashboard.jsx"

# Обновлённые App.jsx и Navigation.jsx
cp "$SCRIPT_DIR/source_to_push/src/App.jsx" "$REPO_DIR/src/App.jsx"
cp "$SCRIPT_DIR/source_to_push/src/components/Navigation.jsx" "$REPO_DIR/src/components/Navigation.jsx"

# Обновлённый package.json (добавлен recharts)
cp "$SCRIPT_DIR/source_to_push/package.json" "$REPO_DIR/package.json"

echo "✅ Файлы скопированы"
echo ""
echo "📤 Делаем коммит и push..."

git add src/components/Dashboard.jsx src/App.jsx src/components/Navigation.jsx package.json
git commit -m "feat: add analytics dashboard with recharts

- Dashboard.jsx: 4 tabs (Обзор, Студенты, Анализ ошибок, Экспорт)
- KPI cards, activity charts, error analysis, sound accuracy
- Visible only to admin in navigation
- recharts@2.12.7 added"

git push origin main

echo ""
echo "🚀 Готово! GitHub Actions задеплоит на Beget автоматически."
echo "   Следить: https://github.com/EdBels69/auscultation-trainer/actions"
