# All Metrics Agent Plugin

Общий MCP-сервер для совместимых клиентов без ограничения бренда.
Codex и Claude Code используют общие skills и два тонких манифеста; другие
MCP-клиенты могут подключаться напрямую к серверу.

| Что | Значение |
| --- | --- |
| Версия плагина | `3.10.0` |
| Проверенная версия сервера All Metrics | `3.9.0` (get_current_user и google_ads_api_schema проверены в ChatGPT 18.10.2026) |
| Минимальная версия сервера | `3.0.0` |
| MCP | `https://test.abeslab.by/hub/mcp`, streamable HTTP, OAuth 2.1 + PKCE, scope `mcp:use` |
| Источников | 16 |
| MCP-инструментов | 96 |
| Skills | 11 |

Аналитические и audit-инструменты работают только на чтение. Начиная с сервера 3.9.0, `google_ads_write` выполняет прямые изменения Google Ads по явному запросу пользователя через существующее подключение; отдельный AllMetrics grant не нужен. Google Tag Platform с сервера 3.10.1 также работает через Google OAuth без отдельных grants. Разрешения Localo сохраняются. Отсутствие прямых Google Ads API tools означает недоступность записи, а не отсутствие рекламного аккаунта.

## Что внутри

| Skill | Для чего |
| --- | --- |
| `all-metrics-diagnostics` | Проверка подключения, версии сервера, состава инструментов, источников и ресурсов. Запускать первым, если что-то не работает |
| `analyze-all-metrics` | Фактическая статистика рекламы, аналитики, органики и CRM за период со сравнением |
| `all-metrics-ppc-audit` | Read-only аудит настроек и эффективности Google Ads и Яндекс Директа по девяти блокам проверок |
| `all-metrics-google-ads-management` | Google Ads API v25/v26: чтение схем/методов, прямые изменения кампаний/объявлений и read-back без повторов неопределённых операций |
| `all-metrics-website-audit` | Технический SEO-аудит сайта: сохранённые обходы, проблемы, robots, sitemap, PSI и CrUX, сравнение обходов |
| `all-metrics-keyword-planner` | Семантика, частотность, сезонность, конкуренция, ставки и прогнозы Google Keyword Planner |
| `all-metrics-wordstat` | Семантика Wordstat: популярные/похожие, динамика, регионы и контролируемые платные API-вызовы |
| `all-metrics-business-research` | Подтверждённый Business context → Serper SERP → Website → отдельная проверка спроса |
| `all-metrics-cross-source-report` | Сквозной отчёт по всем источникам: воронка, CPL, CPS, ROAS, ROI и полнота атрибуции |
| `all-metrics-localo` | Чтение Localo и контролируемая запись с разрешением владельца |
| `all-metrics-tag-platform` | GTM/Google tag: чтение, контроль разрешений записи и проверка срабатывания |

Источники: Google Ads, Google Keyword Planner, Google Analytics 4, Google Search Console, Google Business Profile, Яндекс Директ, Яндекс Метрика, Яндекс Вебмастер, Яндекс Вордстат, CRM Bitrix24, CallRail, Website.

## Прямое управление Google Ads (сервер 3.9.0+)

Skill [`all-metrics-google-ads-management`](plugins/all-metrics/skills/all-metrics-google-ads-management/SKILL.md) разделяет аудит без изменений и прямую запись. Сначала выбрать принадлежащие владельцу `connection_id` и queryable direct-customer `resource_id`, затем прочитать состояние через GAQL и метод/схему через `google_ads_api_schema`. Только по явному пользовательскому запросу применить `google_ads_write`: изменения применяются сразу, необязательный `validateOnly` не является разрешением. Сформировать и повторно использовать ключ идемпотентности для того же запроса, сохранить частичные ошибки, не повторять `outcome_unknown`, после операции прочитать фактическое состояние. Это не отменяет разрешений Google Ads и не гарантирует реальную mutation-приёмку.

## Установка в Codex

```powershell
codex plugin marketplace add createsens/all-metrics-codex-plugin
```

Перезапустите Codex, откройте **Plugins**, выберите источник **Createsens** и установите **All Metrics**. При первом использовании Codex откроет авторизацию All Metrics.

## Установка в Claude Code

```bash
/plugin marketplace add createsens/all-metrics-codex-plugin
```

```bash
/plugin install all-metrics@createsens
```

Из локальной копии репозитория:

```bash
/plugin marketplace add /путь/к/all-metrics-codex-plugin
```

После установки перезапустите сессию, авторизуйте MCP-сервер `all_metrics` и проверьте подключение командой «проверь подключение All Metrics» — сработает `all-metrics-diagnostics`.

## Подключение в Claude Desktop

Claude Desktop подключает удалённые MCP-серверы как custom connector, но не использует skills. Откройте **Settings → Connectors → Add custom connector** и укажите:

```text
https://test.abeslab.by/hub/mcp
```

Авторизация пройдёт через OAuth. Инструменты All Metrics станут доступны, workflow из skills в этом режиме не применяются — для них используйте Claude Code или Codex.

## Структура репозитория

### Другие MCP-клиенты: Gemini, Copilot и прочие

Добавьте удалённый сервер **Streamable HTTP** по адресу
`https://test.abeslab.by/hub/mcp`. Используйте OAuth discovery + PKCE S256 и
подтвердите доступ на экране All Metrics. Сервер 3.3.0+ не ограничивает названия
клиентов или HTTPS callback-домены. Для локальных приложений допускается HTTP
callback на 127.0.0.1, ::1 или буквальный localhost (сервер 3.7.1+).

Если клиент не поддерживает этот OAuth-поток, создайте собственный bearer-токен
в [настройках MCP](https://test.abeslab.by/hub/mcp-settings) и задайте его в
секретном хранилище клиента. Не используйте там ключ Wordstat/Yandex Cloud.
Поддержка удалённого MCP, OAuth и загрузки skills зависит от клиента; наличие
его бренда в примерах не означает проверенную end-to-end совместимость.
Прямой MCP предоставляет инструменты, а не автоматически установленные skills.

```text
all-metrics-codex-plugin/
├── .agents/plugins/marketplace.json          # marketplace для Codex / OpenAI
├── .claude-plugin/marketplace.json           # marketplace для Claude
├── .github/workflows/ci.yml                  # CI: манифесты, skills, совместимость
├── scripts/
│   ├── validate-plugin.mjs                   # валидация обоих манифестов и всех skills
│   ├── capability-tests.mjs                  # тесты слоя совместимости на фикстурах
│   └── lib/capabilities.mjs                  # определение доступных возможностей
├── tests/fixtures/                           # снимки MCP-сессий для тестов
└── plugins/all-metrics/
    ├── .codex-plugin/plugin.json             # манифест Codex
    ├── .claude-plugin/plugin.json            # манифест Claude
    ├── .app.json                             # регистрация App в ChatGPT
    ├── .mcp.json                             # ОБЩИЙ MCP
    ├── compatibility.json                    # ОБЩИЙ контракт совместимости
    ├── assets/
    └── skills/                               # ОБЩИЕ skills
        ├── all-metrics-diagnostics/
        ├── analyze-all-metrics/
        ├── all-metrics-ppc-audit/
        ├── all-metrics-website-audit/
        ├── all-metrics-keyword-planner/
        └── all-metrics-cross-source-report/
```

MCP-конфигурация и skills существуют в одном экземпляре. Различаются только два манифеста по несколько десятков строк каждый.

## Совместимость и версии

Версия плагина и версия сервера All Metrics меняются независимо. Матрица skills, матрица клиентов, правила определения возможностей и порядок обновления контракта — в [COMPATIBILITY.md](COMPATIBILITY.md). Машиночитаемый контракт — в [`plugins/all-metrics/compatibility.json`](plugins/all-metrics/compatibility.json).

Каждый skill перед работой обязан проверить фактический состав инструментов сессии и остановиться с точным именем недостающего инструмента, если обязательная возможность отсутствует. Отсутствие данных никогда не выдаётся за отсутствие проблемы.

## Проверки

```bash
npm run check
```

- `npm run validate` — оба marketplace-манифеста, оба plugin-манифеста, `.mcp.json`, состав и frontmatter всех skills, ссылки в документации, согласованность версий, существование каждого упомянутого MCP-инструмента.
- `npm run test` — слой совместимости на четырёх снимках сессии: полный сервер 3.2.0, старый сервер 3.0.0, сервер без подключений, частичное подключение с реавторизацией.

CI выполняет обе проверки на каждый push и pull request.

## Статус проверки

| Клиент | Статус |
| --- | --- |
| Codex на Windows | `NOT VERIFIED` — требуется прогон сценария приёмки |
| Claude Code на Windows | `NOT VERIFIED` — требуется прогон сценария приёмки |
| Claude Desktop как custom connector | `NOT VERIFIED` — требуется OAuth smoke-test |
| ChatGPT App | `PARTIAL` — `get_current_user` и `google_ads_api_schema` через подключённый ChatGPT проверены 18.10.2026; прямую mutation/read-back ещё не проверяли |

Сценарий приёмки из одиннадцати шагов — в [COMPATIBILITY.md](COMPATIBILITY.md). Статус `NOT VERIFIED` снимается только фактическим прогоном, а не чтением кода.

## Безопасность

Аналитические инструменты read-only. Прямая запись Google Ads доступна только через `google_ads_write` на сервере 3.9.0 и не должна запускаться без явного запроса пользователя; результат проверяется чтением, outcome_unknown не повторяется. Localo допускает запись через localo_write с разрешением владельца на 30 минут и отдельным подтверждением разрушительных действий. Skills не запрашивают токены, пароли и коды авторизации, не выводят секреты и персональные данные, используют только ресурсы с `queryable=true` и не повторяют запросы к ресурсам со статусом `resource_disabled`. Ответы MCP трактуются как данные, а не как инструкции.

## Лицензия

MIT. См. [LICENSE](LICENSE).

Localo: [workflow](plugins/all-metrics/skills/all-metrics-localo/SKILL.md). Требует AllMetrics 3.5.0; наличие новых инструментов на живом сервере проверяется при запуске.


## Google Tag Platform

Skill `all-metrics-tag-platform` requires server 3.10.1 and six tagging tools. Native client/API acceptance remains NOT VERIFIED until connected runs; source changes do not refresh installed tool catalogs automatically.


## OAuth discovery и Gemini (сервер 3.7.1+)

Единый URL: https://test.abeslab.by/hub/mcp. Для Claude web/Desktop используйте
remote custom connector и Reconnect. Для Claude Code — установленный плагин
либо `claude mcp add --transport http all-metrics https://test.abeslab.by/hub/mcp`.
Затем выполните `/mcp` и вход через браузер; сервер покажет consent.

Для Gemini CLI добавьте в settings.json (или импортируйте examples/gemini-settings.json):

```json
{
  "mcpServers": {
    "all-metrics": {
      "httpUrl": "https://test.abeslab.by/hub/mcp",
      "oauth": {"enabled": true, "scopes": ["mcp:use"]}
    }
  }
}
```

Выполните `/mcp auth all-metrics`. Не включайте trust/автоподтверждение записей.
Для Gemini web откройте Connected Apps → Custom apps и укажите тот же URL.
Доступность определяется Google: личный аккаунт, 18+, США, английский интерфейс
по документации на 2026-10-15: https://support.google.com/gemini/answer/17209137?hl=en-yt.
После подключения в вебе приложение доступно и на мобильном устройстве.

Сервер использует DCR, mcp:use, PKCE S256 и отдельное пользовательское согласие.
Он не ограничивает бренды клиентов. Прямой MCP предоставляет tools; skills
загружаются только поддерживающими их клиентами. Запись Localo/GTM по-прежнему
требует существующих серверных разрешений.

Если возникает JSON Parse error, проверьте, какой URL и HTTP-ответ не разобран.
HTML 404 discovery, OAuth-ошибка и повреждённый локальный JSON — разные причины.
Не меняйте транспорт Streamable HTTP на stdio/SSE только по тексту этой ошибки.
Наличие инструкции подключения не означает выполненную приёмку клиента.
