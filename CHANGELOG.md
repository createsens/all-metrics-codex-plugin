# Журнал изменений

Формат: версия плагина, дата, изменения. Версия плагина не совпадает с версией сервера All Metrics и меняется независимо.

## 3.3.0 — 2026-09-14

Плагин стал универсальным для Codex и Claude и получил слой совместимости.

Добавлено:

- манифест Claude `.claude-plugin/marketplace.json` и `plugins/all-metrics/.claude-plugin/plugin.json`;
- машиночитаемый контракт совместимости `plugins/all-metrics/compatibility.json`: канонические 80 инструментов и 12 источников, минимальная версия сервера для каждого skill, обязательные и опциональные инструменты, требуемые источники и правило деградации;
- skill `all-metrics-diagnostics` — проверка авторизации, версии сервера, состава инструментов, источников и ресурсов, разбор кодов ошибок;
- skill `all-metrics-ppc-audit` — read-only аудит Google Ads и Яндекс Директа по девяти блокам проверок со справочником `references/checklist.md`;
- skill `all-metrics-website-audit` — технический SEO-аудит сайта со справочником операций `references/operations.md` и жёстким разделением сохранённого аудита, живого осмотра и нового обхода;
- skill `all-metrics-cross-source-report` — сквозной отчёт по всем источникам со справочником атрибуции `references/attribution.md`;
- `scripts/lib/capabilities.mjs` — определение доступных возможностей по фактической MCP-сессии;
- `scripts/validate-plugin.mjs` — валидация обоих манифестов, всех skills, ссылок, версий и имён MCP-инструментов;
- `scripts/capability-tests.mjs` и фикстуры `tests/fixtures` — 57 проверок на четырёх снимках сессии;
- `.github/workflows/ci.yml` — CI на каждый push и pull request;
- `COMPATIBILITY.md` — матрица skills, матрица клиентов и сценарий приёмки из одиннадцати шагов.

Изменено:

- `analyze-all-metrics` и `all-metrics-keyword-planner` получили обязательную проверку совместимости перед работой и перекрёстные ссылки на новые skills;
- README переписан под две экосистемы, со структурой репозитория и честным статусом проверки по клиентам;
- версия плагина отвязана от версии сервера All Metrics.

## 3.2.0 — 2026-08-30

- Синхронизация с релизом сервера All Metrics 3.2.0: Google Business Profile, 12 источников, 80 MCP-инструментов, 131 проверка Website.

## 3.1.3

- Обновление метаданных плагина AllMetrics 3.

## 3.1.0

- Обновление workflow Keyword Planner под MCP 1.4.
- Документирование источника App All Metrics 2.
- Первая публикация плагина All Metrics для Codex.
