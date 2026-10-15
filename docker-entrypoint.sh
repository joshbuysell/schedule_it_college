#!/bin/sh
set -e
# Перший запуск: створюємо базу та імпортуємо розклад. Далі дані живуть у томі /data.
if [ ! -f /data/rozklad.db ]; then
  npx prisma db push --skip-generate
  npx tsx prisma/seed.ts
else
  npx prisma db push --skip-generate
fi
exec npm start
