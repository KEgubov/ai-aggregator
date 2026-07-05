# Запуск проекта на macOS

## Что нужно установить

| Инструмент | Рекомендация |
|------------|--------------|
| **Python** | 3.11+ (`python3 --version`) |
| **Node.js** | 18+ (`node --version`) |
| **npm** | идёт с Node.js |

Через Homebrew:

```bash
brew install python node
```

---

## 1. Клонирование и переход в проект

```bash
cd ~/path/to/agregation
```

Корень репозитория — папка, где лежат `backend/`, `frontend/`, `requirements.txt` и `.env`.

---

## 2. Переменные окружения

В корне проекта создайте или отредактируйте `.env`:

```env
GEMINI_API=ваш_ключ_google_gemini
GROQ_API=ваш_ключ_groq
```

Для чата с Gemini обязателен `GEMINI_API`. `GROQ_API` тоже требуется при старте бэкенда (загружается в `api_config.py`), даже если Groq не используется.

---

## 3. Бэкенд (терминал 1)

```bash
cd ~/path/to/agregation

# виртуальное окружение
python3 -m venv .venv
source .venv/bin/activate

# зависимости
pip install -r requirements.txt

# запуск API
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Проверка:

- Swagger: http://127.0.0.1:8000/docs
- Gemini: http://127.0.0.1:8000/gemini/chat?text=Привет

Команда `uvicorn` выполняется из **корня** проекта, не из `backend/`.

---

## 4. Фронтенд (терминал 2)

```bash
cd ~/path/to/agregation/frontend

npm install
npm run dev
```

Откройте: **http://localhost:5173**

Vite проксирует `/gemini` на `http://127.0.0.1:8000` (см. `frontend/vite.config.ts`), поэтому бэкенд должен быть запущен на порту **8000**.

---

## 5. Как пользоваться

1. Запустите бэкенд, затем фронтенд.
2. В интерфейсе выберите **Gemini 3.5 Flash** (модель по умолчанию).
3. Отправьте сообщение — запрос пойдёт на `GET /gemini/chat?text=...`.

---

## Частые проблемы на Mac

**`ModuleNotFoundError: No module named 'backend'`**  
Запускайте uvicorn из корня `agregation`, не из `backend/`.

**`ValidationError` при старте бэкенда**  
В `.env` нет `GEMINI_API` или `GROQ_API`.

**«Не удалось получить ответ от сервера» во фронтенде**

- бэкенд не запущен;
- неверный ключ Gemini;
- фронтенд запущен не через `npm run dev` (без proxy).

**Порт 8000 занят**

```bash
uvicorn backend.main:app --reload --port 8001
```

Тогда в `frontend/vite.config.ts` нужно сменить `target` на `http://127.0.0.1:8001`.

**Деактивация venv**

```bash
deactivate
```

---

## Кратко: два терминала

```bash
# Терминал 1 — API
cd ~/path/to/agregation
source .venv/bin/activate
uvicorn backend.main:app --reload

# Терминал 2 — UI
cd ~/path/to/agregation/frontend
npm run dev
```

PostgreSQL для текущего чата с Gemini **не нужен** — эндпоинт `/gemini/chat` работает без БД.
