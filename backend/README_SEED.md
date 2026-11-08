# Seed Artificial Users

## Как добавить искусственных пользователей в базу данных

### Шаг 1: Запустить SQL скрипт

```bash
cd ExpanseTrackerBackend
sqlite3 db.sqlite < seed-artificial-users.sql
```

Этот скрипт создаст:
- 8 искусственных пользователей (Alex, Sarah, Mike, Emma, David, Lisa, Tom, Julia)
- Доходы для каждого пользователя
- Цели для каждого пользователя с разными суммами

### Шаг 2: Создать челленджи из целей

После запуска SQL скрипта, вызовите API endpoint для создания челленджей:

```bash
curl -X POST http://localhost:3000/api/challenges/generate-artificial-users
```

Или через браузер/Postman:
- Method: POST
- URL: `http://localhost:3000/api/challenges/generate-artificial-users`

Этот endpoint:
1. Найдет всех искусственных пользователей в БД
2. Найдет их цели
3. Создаст челленджи на основе похожих целей (в пределах 20% разницы)
4. Добавит участников в челленджи

### Проверка

После этого на странице Challenges должны появиться челленджи с участниками!
