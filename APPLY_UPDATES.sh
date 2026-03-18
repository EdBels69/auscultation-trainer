#!/bin/bash
# ============================================================
# Запустить из папки репозитория auscultation-trainer:
#   bash /путь/до/папки/APPLY_UPDATES.sh
# ============================================================

BUNDLE="$(cd "$(dirname "$0")" && pwd)/updates.bundle"

echo "📦 Применяем обновления из bundle..."
git fetch "$BUNDLE" main:bundle-updates

echo ""
echo "🔍 Новые коммиты:"
git log --oneline HEAD..bundle-updates

echo ""
echo "🔀 Объединяем..."
git merge bundle-updates --no-edit

echo ""
echo "📤 Push на GitHub..."
git push origin main

echo ""
echo "🚀 Готово! GitHub Actions задеплоит на Beget автоматически."
echo "   Следить: https://github.com/EdBels69/auscultation-trainer/actions"
