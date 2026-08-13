# AI Aggregator

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![asyncio](https://img.shields.io/badge/asyncio-async-00ADD8?style=flat)
![FastAPI](https://img.shields.io/badge/FastAPI-0.139+-009688?style=flat&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat&logo=postgresql&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00?style=flat)
![Alembic](https://img.shields.io/badge/Alembic-1.18+-F5A623?style=flat)
![Uvicorn](https://img.shields.io/badge/Uvicorn-0.49+-499848?style=flat)
![Pydantic](https://img.shields.io/badge/Pydantic-2.0+-E92063?style=flat)
![AuthX](https://img.shields.io/badge/AuthX-JWT-7B68EE?style=flat)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?style=flat&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

Агрегатор AI-моделей: REST API на FastAPI и фронтенд на React. Аутентификация через AuthX (JWT в cookie), данные в PostgreSQL, кэш в Redis. Генерация ответов через Gemini и Groq со стримингом.

Проект для портфолио. Демонстрирует backend и frontend: аутентификация, проектирование API, работа с БД, оркестрация нескольких LLM-провайдеров, Docker.

## 🚀 Возможности

- Регистрация и вход пользователей с JWT в cookie (AuthX)
- Защищённые маршруты (требуют валидный токен)
- Личные чаты: создание, список, удаление, участники
- Стриминг ответов от Gemini и Groq через единый оркестратор
- PostgreSQL + SQLAlchemy (asyncpg), миграции Alembic
- Кэширование в Redis
- Управление переменными окружения (Pydantic Settings)
- React + Vite + Tailwind UI
- Автоматическая документация API (Swagger UI)
- Запуск через Docker Compose

## 🛠 Технологии

- **FastAPI** — веб-фреймворк
- **AuthX** — аутентификация и JWT
- **PostgreSQL** — реляционная БД
- **SQLAlchemy** — ORM (async)
- **Alembic** — миграции базы данных
- **Redis** — кэш
- **Pydantic** — валидация данных и settings
- **Uvicorn** — ASGI-сервер
- **Gemini / Groq** — LLM-провайдеры
- **React + Vite + Tailwind** — фронтенд
- **Docker** — контейнеризация

## 🔐 Переменные окружения

Скопируйте `.env.example` в `.env` и заполните значения:

```bash
cp .env.example .env
```

Пример содержимого — файл [`.env.example`](.env.example):

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=ai_aggregator

# AuthX / JWT
JWT_SECRET_KEY=change-me-to-a-long-random-secret
JWT_ACCESS_COOKIE_NAME=access_token

# Redis
REDIS_URL=redis://localhost:6379/0

# LLM API keys
GEMINI_API=your_gemini_api_key
GROQ_API=your_groq_api_key
```
