---
name: all-metrics-business-research
description: Исследовать бизнес, подтверждённый бриф, Google SERP-конкурентов и новые семантические направления через AllMetrics. Использовать для подготовки семантики сайта или рекламы из связанных ресурсов, Serper SERP и сайтов конкурентов. Не заменяет отчёты действующих кампаний и не создаёт бизнес или ключи через MCP.
---

# Business and semantic research

Использовать общий read-only MCP в любом совместимом клиенте. Требуется сервер 3.4.0; проверить фактические tools и actor через `get_current_user`. Требования — [compatibility.json](../../compatibility.json), `skills["all-metrics-business-research"]`.

1. Получить `list_businesses`. Если бизнес неоднозначен — предложить выбор, не угадывать. Создание бизнеса, подтверждение брифа, связи ресурсов и управление ключами выполняются владельцем в авторизованном UI.
2. Вызвать `get_business_context` и `list_business_resources`. Использовать только подтверждённые связи конкретных ресурсов, не весь OAuth connection. Отделять confirmed brief, source facts, draft/AI hypotheses и неизвестные ответы.
3. Для новых данных Google SERP вызвать `list_sources`, `list_connections`, `list_resources(source=google_serp,queryable_only=true)`, затем `google_serp` с явными country/language, business_id и подтверждёнными seeds: один query или до 30 queries. Первая страница Top 10; city/device не поддерживаются в v1.
4. Проверять snapshot IDs, observed_at, completeness и warnings. Кэш 24 часа; `force_refresh` означает новый расход credits. Фактический баланс неизвестен, один ключ нескольких аккаунтов использует общий баланс. Не выполнять покупки, автопополнения, повторы неоднозначного timeout и переключение на HTML-парсинг Google/Chrome/Browserless.
5. При quota/rate/provider error остановить очередь; сохранить успешно полученные datasets и показать неполное покрытие. Не трактовать ошибку или malformed JSON как пустую успешную выдачу.
6. SERP competitors выводить по evidence из business context: число запросов, appearances, best/average/median position, Top 3/10, URL и snapshot IDs. Не вводить arbitrary competitor_score. Бизнес-, SERP- и PPC-конкуренты — разные сущности.
7. Related searches и PAA — unverified seed backlog, не подтверждённый спрос. Выбор конкурента в UI создаёт WebsiteTarget с SERP evidence. Для явно запрошенного исследования неподключённого сайта использовать `website` с `inspect_external_url` (одна страница) или `crawl_external_site` (сайт); передать URL и business_id, без resource_id. Обход остаётся same-origin с SSRF/DNS/robots и лимитами Website Engine.
8. Новый crawl имеет UUID; опрашивать `crawl_status` до terminal. Читать sections по тому же UUID. Сохранённый аудит не называть новым. Serper отвечает «кто в выдаче», Website — «что внутри сайта».
9. Только отдельным подтверждённым действием проверять выбранные seeds/URL в `keyword_planner` или `yandex_wordstat` и подписывать географию, язык, operators, время и источник спроса. Не выполнять следующий платный этап автоматически.

В результате дать подтверждённый контекст, таблицу покрытия, воспроизводимые конкуренты, evidence-backed unverified seeds и ограничения. Master Semantic Database, кластеризация, gap и рекламная архитектура не заявляются реализованными этим workflow. Ключи и приватный provider JSON не запрашивать и не выводить.
