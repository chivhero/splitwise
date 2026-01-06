#!/bin/bash
# Скрипт активации окружения проекта SplitWise

echo "🚀 Активация окружения SplitWise..."

# Активируем fnm и Node.js
export PATH="$HOME/.local/bin:$PATH"
eval "$(fnm env --shell bash)"
fnm use 20

echo "✅ Node.js $(node --version) активирован"
echo "✅ npm $(npm --version)"
echo ""
echo "📦 Доступные команды:"
echo "  npm run dev       - Запуск dev сервера"
echo "  npm test          - Запуск тестов"
echo "  npm run lint      - Проверка линтером"
echo "  npm run build     - Сборка для production"
echo ""
echo "🎯 Готово к работе!"
