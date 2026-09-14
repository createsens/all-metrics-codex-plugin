# Совместимость

## Две независимые версии

| Что | Версия | Где зафиксирована |
| --- | --- | --- |
| Плагин All Metrics (этот репозиторий) | 3.3.0 | `plugins/all-metrics/.codex-plugin/plugin.json`, `plugins/all-metrics/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `plugins/all-metrics/compatibility.json` |
| Сервер All Metrics (MCP) | 3.2.0 в production | ответ MCP-сервера, `compatibility.json` → `mcp.verified_server_versions` |

Версия плагина и версия сервера меняются независимо. Плагин — это версионированный интерфейс к возможностям сервера, а не его копия. Машиночитаемый контракт целиком лежит в [`plugins/all-metrics/compatibility.json`](plugins/all-metrics/compatibility.json), он же используется тестами и CI.

Правило совместимости: плагин версии X работает с сервером версии не ниже `mcp.min_server_version` и корректно деградирует на любом более старом или урезанном сервере, называя недостающие инструменты по именам.

## Матрица skills

| Skill | Минимальная версия сервера | Обязательные инструменты | Требуемый источник (любой из) | Поведение при отсутствии |
| --- | --- | --- | --- | --- |
| `all-metrics-diagnostics` | 3.0.0 | `get_current_user`, `list_sources`, `list_connections`, `list_resources` | — | Работает всегда, в том числе на урезанном сервере |
| `analyze-all-metrics` | 3.0.0 | те же + `list_fields`, `preview_data`, `start_query`, `get_query_status`, `get_query_results` | `google_ads`, `yandex_direct`, `google_analytics`, `yandex_metrica` | Без CRM не считает CPL, CPS, ROAS, ROI и говорит об этом |
| `all-metrics-keyword-planner` | 3.0.0 | те же + `keyword_planner` | `google_keyword_planner` | Не подменяет Keyword Planner Wordstat-ом без согласия пользователя |
| `all-metrics-website-audit` | 3.1.0 | те же + `website` | `website` | Без Search Console и Вебмастера раздел индексации помечается неполным |
| `all-metrics-ppc-audit` | 3.2.0 | те же + `list_setting_capabilities` | `google_ads`, `yandex_direct` | Неподключённая платформа получает статус `not_connected`, а не «проблем нет» |
| `all-metrics-cross-source-report` | 3.2.0 | те же + весь общий слой запросов | `google_ads`, `yandex_direct`, `google_analytics`, `yandex_metrica` | Каждый недоступный источник попадает в таблицу покрытия со статусом и причиной |

## Матрица клиентов

| Клиент | Способ установки | Skills | MCP | Проверено |
| --- | --- | --- | --- | --- |
| Codex (CLI и приложение) | `.agents/plugins/marketplace.json` | да | да, через `.mcp.json` | `NOT VERIFIED` — требуется прогон acceptance |
| Claude Code | `.claude-plugin/marketplace.json` | да | да, через `.mcp.json` | `NOT VERIFIED` — требуется прогон acceptance |
| Claude Desktop | Custom connector по URL MCP | нет, skills не применяются | да | `NOT VERIFIED` — требуется OAuth smoke-test |
| ChatGPT | App через `.app.json` | частично | да | `NOT VERIFIED` |

Статус `NOT VERIFIED` снимается только фактическим прогоном сценария приёмки, а не чтением кода.

## Определение возможностей во время работы

Skill обязан определять возможности по фактической сессии, а не по документации:

1. Прочитать реальный список инструментов сессии.
2. Вызвать `get_current_user` — проверка авторизации.
3. Вызвать `list_sources`, `list_connections`, `list_resources` с `selected_only=true` и `queryable_only=true`.
4. Источник считать готовым только при подключении `connected` и хотя бы одном `queryable` ресурсе.
5. При отсутствии обязательного инструмента — остановиться и назвать его точное имя и требуемую версию сервера.
6. При отсутствии опционального источника — продолжить и явно пометить раздел недоступным.

Эта логика реализована и покрыта тестами в [`scripts/lib/capabilities.mjs`](scripts/lib/capabilities.mjs).

## Базовая линия сервера 3.2.0

| Показатель | Значение |
| --- | --- |
| MCP-инструментов | 80 |
| Источников | 12 |
| Проверок Website | 131 |
| Транспорт | streamable HTTP |
| Авторизация | OAuth 2.1 с PKCE, scope `mcp:use` |
| URL | `https://test.abeslab.by/hub/mcp` |

Источники: `google_ads`, `google_keyword_planner`, `google_analytics`, `google_search_console`, `google_business_profile`, `yandex_direct`, `yandex_metrica`, `yandex_webmaster`, `yandex_wordstat`, `bitrix24`, `callrail`, `website`.

## Сценарий приёмки

Для каждого клиента выполняется один и тот же сценарий. Результат каждого шага фиксируется как `PASS`, `FAIL` или `NOT VERIFIED`.

1. Установка плагина из marketplace.
2. Плагин обнаружен клиентом, skills видны.
3. OAuth-авторизация проходит.
4. MCP `initialize` отвечает.
5. `tools/list` возвращает ожидаемое число инструментов.
6. `list_sources` возвращает ожидаемое число источников.
7. Один реальный read-only запрос возвращает данные.
8. Skill запускается и следует своему workflow.
9. Перезапуск клиента — авторизация сохраняется.
10. Обновление плагина из GitHub.
11. Повторный запрос после обновления работает.

## Как обновлять контракт при изменении сервера

1. Обновить `canonical.tools`, `canonical.sources` и `mcp.baseline` в `compatibility.json`.
2. Обновить `mcp.verified_server_versions`.
3. При появлении нового обязательного инструмента у skill — поднять его `min_server_version`.
4. Обновить фикстуры в `tests/fixtures` и, при необходимости, ожидания в `scripts/capability-tests.mjs`.
5. Прогнать `npm run check`.
6. Поднять версию плагина и записать изменение в [`CHANGELOG.md`](CHANGELOG.md).
