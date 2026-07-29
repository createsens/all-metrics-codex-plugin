# All Metrics for Codex

Версия плагина: `1.1.0`. Требуемая версия production MCP: `1.4.0`.

Плагин подключает Codex к удалённому MCP All Metrics и добавляет два готовых workflow:

- анализ Google Ads, Яндекс Директа, GA4, Яндекс Метрики, Search Console и Bitrix24;
- исследование ключевых слов и прогнозы Google Keyword Planner.

## Установка

Добавьте marketplace:

```powershell
codex plugin marketplace add createsens/all-metrics-codex-plugin
```

Перезапустите Codex, откройте **Plugins**, выберите источник **Createsens** и установите **All Metrics**.

При первом использовании Codex откроет авторизацию All Metrics. Каждый пользователь входит под своей учётной записью и получает только доступные ему подключения и ресурсы.

## MCP

`https://test.abeslab.by/hub/mcp`

Transport: Streamable HTTP. Авторизация: OAuth с PKCE.

Плагин собран и проверен по зарегистрированному в ChatGPT подключению:

`plugin_asdk_app_6a67619a31f8819191ba12695f2f4fce`

В интерфейсе разработчика оно отображается как:

`dev-6a67619a31f8819191ba12695f2f4fce` / **All Metrics 2**.

GitHub-пакет подключается непосредственно к MCP этого приложения. Поэтому
установка не зависит от доступа к тестовой записи владельца: каждый пользователь
проходит собственную OAuth-авторизацию.

Проверенные источники:

- Google Ads;
- Google Keyword Planner;
- Google Analytics 4;
- Google Search Console;
- Яндекс Директ;
- Яндекс Метрика;
- CRM Bitrix24.

## Безопасность

Плагин предназначен только для чтения и аналитики. Он не изменяет рекламные кампании, подключения, CRM или Keyword Plans. Перед provider-запросом skill использует только ресурсы с `queryable=true`; отключённые ресурсы повторно не вызываются.
