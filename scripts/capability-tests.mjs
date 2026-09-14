#!/usr/bin/env node
/**
 * Тесты слоя совместимости: каждый skill проверяется против зафиксированных
 * снимков MCP-сессии из tests/fixtures.
 *
 * Запуск: node scripts/capability-tests.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { evaluateSkill, evaluateAll, compareVersions, sourceStatus } from './lib/capabilities.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const compat = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'plugins/all-metrics/compatibility.json'), 'utf8'),
);

const fixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures', `${name}.json`), 'utf8'));

const full = fixture('full-3.2.0');
const legacy = fixture('legacy-3.0.0');
const empty = fixture('no-connections');
const partial = fixture('partial-reauth');

let passed = 0;
const failures = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function assertEqual(name, actual, expected) {
  assert(name, actual === expected, `получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`);
}

// --------------------------------------------------------- сравнение версий

assert('compareVersions: 3.2.0 > 3.1.0', compareVersions('3.2.0', '3.1.0') === 1);
assert('compareVersions: 3.0.0 < 3.2.0', compareVersions('3.0.0', '3.2.0') === -1);
assert('compareVersions: равные версии', compareVersions('3.2.0', '3.2.0') === 0);
assert('compareVersions: 3.10.0 > 3.9.0', compareVersions('3.10.0', '3.9.0') === 1);
assert('compareVersions: короткая форма 3.2 == 3.2.0', compareVersions('3.2', '3.2.0') === 0);

// --------------------------------------------------------- статусы источников

assertEqual('full: google_ads готов', sourceStatus(full, 'google_ads'), 'ready');
assertEqual('legacy: website не поддержан сервером', sourceStatus(legacy, 'website'), 'unsupported_by_server');
assertEqual('empty: google_ads не подключён', sourceStatus(empty, 'google_ads'), 'not_connected');
assertEqual(
  'partial: google_business_profile требует реавторизации',
  sourceStatus(partial, 'google_business_profile'),
  'auth_required',
);
assertEqual('partial: website без пригодного ресурса', sourceStatus(partial, 'website'), 'no_queryable_resource');
assertEqual('partial: yandex_direct не подключён', sourceStatus(partial, 'yandex_direct'), 'not_connected');

// --------------------------------------------------------- полный сервер

for (const result of evaluateAll(compat, full)) {
  assert(`full: ${result.skill} готов`, result.status === 'ready', result.blockers.join('; '));
  assert(
    `full: ${result.skill} не имеет недостающих обязательных инструментов`,
    result.missing_required_tools.length === 0,
    result.missing_required_tools.join(', '),
  );
  assert(
    `full: ${result.skill} видит все опциональные инструменты`,
    result.missing_optional_tools.length === 0,
    result.missing_optional_tools.join(', '),
  );
}

// --------------------------------------------------------- старый сервер

const legacyWebsite = evaluateSkill(compat, 'all-metrics-website-audit', legacy);
assertEqual('legacy: website-audit заблокирован', legacyWebsite.status, 'blocked');
assert(
  'legacy: website-audit называет недостающий инструмент website',
  legacyWebsite.missing_required_tools.includes('website'),
  legacyWebsite.missing_required_tools.join(', '),
);

const legacyPpc = evaluateSkill(compat, 'all-metrics-ppc-audit', legacy);
assertEqual('legacy: ppc-audit заблокирован по версии и инструментам', legacyPpc.status, 'blocked');
assert(
  'legacy: ppc-audit объясняет несоответствие версии',
  legacyPpc.blockers.some((b) => b.includes('3.2.0')),
  legacyPpc.blockers.join('; '),
);
assert(
  'legacy: ppc-audit называет недостающий list_setting_capabilities',
  legacyPpc.missing_required_tools.includes('list_setting_capabilities'),
);

const legacyAnalyze = evaluateSkill(compat, 'analyze-all-metrics', legacy);
assertEqual('legacy: analyze-all-metrics остаётся рабочим', legacyAnalyze.status, 'ready');
assert(
  'legacy: analyze-all-metrics помечает недоступный google_business_profile',
  legacyAnalyze.missing_optional_tools.includes('google_business_profile'),
);
assertEqual(
  'legacy: analyze-all-metrics видит google_business_profile как неподдержанный',
  legacyAnalyze.optional_source_statuses.google_business_profile,
  'unsupported_by_server',
);

const legacyKp = evaluateSkill(compat, 'all-metrics-keyword-planner', legacy);
assertEqual('legacy: keyword-planner работает на 3.0.0', legacyKp.status, 'ready');

// --------------------------------------------------------- нет подключений

const emptyResults = evaluateAll(compat, empty);
for (const result of emptyResults) {
  if (result.skill === 'all-metrics-diagnostics') {
    assertEqual('empty: diagnostics остаётся доступным', result.status, 'ready');
  } else {
    assertEqual(`empty: ${result.skill} заблокирован`, result.status, 'blocked');
    assert(
      `empty: ${result.skill} блокируется именно из-за источников, а не инструментов`,
      result.missing_required_tools.length === 0 &&
        result.blockers.some((b) => b.includes('готового источника')),
      result.blockers.join('; '),
    );
  }
}

// --------------------------------------------------------- частичное подключение

const partialAnalyze = evaluateSkill(compat, 'analyze-all-metrics', partial);
assertEqual('partial: analyze-all-metrics готов по Google Ads', partialAnalyze.status, 'ready');
assert(
  'partial: analyze-all-metrics видит только готовые источники',
  JSON.stringify(partialAnalyze.ready_required_sources) === JSON.stringify(['google_ads', 'google_analytics']),
  JSON.stringify(partialAnalyze.ready_required_sources),
);
assertEqual(
  'partial: analyze-all-metrics помечает bitrix24 как не подключённый',
  partialAnalyze.optional_source_statuses.bitrix24,
  'not_connected',
);

const partialWebsite = evaluateSkill(compat, 'all-metrics-website-audit', partial);
assertEqual('partial: website-audit заблокирован без пригодного ресурса', partialWebsite.status, 'blocked');
assert(
  'partial: website-audit не жалуется на инструменты',
  partialWebsite.missing_required_tools.length === 0,
);

const partialPpc = evaluateSkill(compat, 'all-metrics-ppc-audit', partial);
assertEqual('partial: ppc-audit готов по единственной платформе', partialPpc.status, 'ready');
assert(
  'partial: ppc-audit видит только Google Ads',
  JSON.stringify(partialPpc.ready_required_sources) === JSON.stringify(['google_ads']),
  JSON.stringify(partialPpc.ready_required_sources),
);

// --------------------------------------------------------- контракт

assert(
  'контракт: неизвестный skill вызывает ошибку',
  (() => {
    try {
      evaluateSkill(compat, 'no-such-skill', full);
      return false;
    } catch {
      return true;
    }
  })(),
);

// --------------------------------------------------------- отчёт

for (const f of failures) console.log(`ПРОВАЛ  ${f}`);
console.log('');
console.log(`Проверок: ${passed + failures.length}; пройдено: ${passed}; провалено: ${failures.length}`);
process.exit(failures.length > 0 ? 1 : 0);
