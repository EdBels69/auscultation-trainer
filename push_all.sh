#!/bin/bash
# =============================================================
# Запустите из папки репозитория auscultation-trainer
# Пример: cd ~/repos/auscultation-trainer && bash /path/to/push_all.sh
# =============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/source_to_push"
REPO="$(pwd)"

echo "📦 Копируем обновлённые файлы..."

# Dashboard
cp "$SRC/src/components/Dashboard.jsx"    "$REPO/src/components/Dashboard.jsx"

# Навигация и App (дашборд + защита)
cp "$SRC/src/components/Navigation.jsx"   "$REPO/src/components/Navigation.jsx"
cp "$SRC/src/App.jsx"                     "$REPO/src/App.jsx"

# package.json (recharts)
cp "$SRC/package.json"                    "$REPO/package.json"

# TestSection с разбором ошибок
cp "$SRC/src/components/TestSection.jsx"  "$REPO/src/components/TestSection.jsx"

# AI chat → routerai.ru + deepseek
mkdir -p "$REPO/supabase/functions/ai-chat"
cp "$SRC/supabase/functions/ai-chat/index.ts" \
   "$REPO/supabase/functions/ai-chat/index.ts"

# GitHub Actions workflow
mkdir -p "$REPO/.github/workflows"
cp "$SRC/.github/workflows/deploy.yml"   "$REPO/.github/workflows/deploy.yml"

echo "✅ Файлы скопированы"
echo ""

git add \
  src/components/Dashboard.jsx \
  src/components/Navigation.jsx \
  src/components/TestSection.jsx \
  src/App.jsx \
  package.json \
  supabase/functions/ai-chat/index.ts \
  .github/workflows/deploy.yml

git commit -m "feat: dashboard, AI → routerai+deepseek, test review screen

- Analytics dashboard (admin only): KPI, charts, errors, CSV export
- AI chat: switched to routerai.ru / deepseek-v3.2, better system prompt
- Test results: full question review with audio replay per question
- Navigation: dashboard link visible only for admin role
- GitHub Actions: auto-deploy to Beget on push to main"

git push origin main

echo ""
echo "🚀 Задеплоено! Следить: https://github.com/EdBels69/auscultation-trainer/actions"
