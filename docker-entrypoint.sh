#!/bin/sh
set -e
# Схема бази + імпорт розкладу лише в порожню базу; пароль адміністратора — з ADMIN_PASSWORD
npm run db:deploy
exec npm start
