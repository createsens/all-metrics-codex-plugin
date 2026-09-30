#!/usr/bin/env node
/**
 * Валидация универсального плагина All Metrics для Codex и Claude.
 *
 * Проверяет: оба marketplace-манифеста, оба plugin-манифеста, общий .mcp.json,
 * состав и корректность skills, ссылки внутри документации, согласованность версий
 * и то, что каждый упомянутый MCP-инструмент существует в каноническом списке.
 *
 * Запуск: node scripts/validate-plugin.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const PLUGIN_DIR = path.join(ROOT, 'plugins', 'all-metrics');

const errors = [];
let skillDirs = [];
const warnings = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) errors.push(message);
  return Boolean(condition);
}

function warn(condition, message) {
  checks += 1;
  if (!condition) warnings.push(message);
  return Boolean(condition);
}

function readJson(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    errors.push(`Нет файла ${relPath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    errors.push(`Невалидный JSON в ${relPath}: ${e.message}`);
    return null;
  }
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

/** Минимальный разбор YAML-frontmatter: только плоские скалярные ключи. */
function parseFrontmatter(text, file) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    errors.push(`${file}: нет YAML-frontmatter в начале файла`);
    return null;
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) {
    errors.push(`${file}: frontmatter не закрыт`);
    return null;
  }
  const block = text.slice(text.indexOf('\n') + 1, end);
  const out = {};
  let currentKey = null;
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (line === '') continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) {
      currentKey = m[1];
      out[currentKey] = m[2];
    } else if (currentKey && /^\s+/.test(rawLine)) {
      out[currentKey] += ` ${line.trim()}`;
    }
  }
  for (const key of Object.keys(out)) {
    let v = out[key].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[key] = v;
  }
  return { data: out, body: text.slice(end + 4) };
}

// ---------------------------------------------------------------- манифесты

const codexMarketplace = readJson('.agents/plugins/marketplace.json');
const claudeMarketplace = readJson('.claude-plugin/marketplace.json');
const codexPlugin = readJson('plugins/all-metrics/.codex-plugin/plugin.json');
const claudePlugin = readJson('plugins/all-metrics/.claude-plugin/plugin.json');
const mcp = readJson('plugins/all-metrics/.mcp.json');
const app = readJson('plugins/all-metrics/.app.json');
const compat = readJson('plugins/all-metrics/compatibility.json');

if (!codexMarketplace || !claudeMarketplace || !codexPlugin || !claudePlugin || !mcp || !compat) {
  report();
  process.exit(1);
}

// Codex marketplace
check(codexMarketplace.name === 'createsens', 'Codex marketplace: name должен быть "createsens"');
check(
  Array.isArray(codexMarketplace.plugins) && codexMarketplace.plugins.length > 0,
  'Codex marketplace: пустой список plugins',
);
for (const entry of codexMarketplace.plugins ?? []) {
  const src = entry.source?.path;
  check(Boolean(src), `Codex marketplace: у плагина ${entry.name} нет source.path`);
  if (src) check(exists(src), `Codex marketplace: путь ${src} не существует`);
}

// Claude marketplace
check(typeof claudeMarketplace.name === 'string', 'Claude marketplace: нет поля name');
check(Boolean(claudeMarketplace.owner?.name), 'Claude marketplace: нет owner.name');
check(
  Array.isArray(claudeMarketplace.plugins) && claudeMarketplace.plugins.length > 0,
  'Claude marketplace: пустой список plugins',
);
for (const entry of claudeMarketplace.plugins ?? []) {
  check(typeof entry.name === 'string', 'Claude marketplace: у записи нет name');
  const src = typeof entry.source === 'string' ? entry.source : entry.source?.path;
  check(Boolean(src), `Claude marketplace: у плагина ${entry.name} нет source`);
  if (src) check(exists(src), `Claude marketplace: путь ${src} не существует`);
  check(
    Boolean(entry.description) && entry.description.length <= 1024,
    `Claude marketplace: description плагина ${entry.name} пуст или длиннее 1024 символов`,
  );
}

// Оба marketplace описывают один и тот же набор плагинов
const codexNames = (codexMarketplace.plugins ?? []).map((p) => p.name).sort();
const claudeNames = (claudeMarketplace.plugins ?? []).map((p) => p.name).sort();
check(
  JSON.stringify(codexNames) === JSON.stringify(claudeNames),
  `Наборы плагинов расходятся: Codex [${codexNames}] против Claude [${claudeNames}]`,
);

// Версии
const versions = {
  'codex plugin.json': codexPlugin.version,
  'claude plugin.json': claudePlugin.version,
  'claude marketplace': claudeMarketplace.plugins?.[0]?.version,
  'compatibility.json': compat.plugin_version,
};
const distinct = [...new Set(Object.values(versions).filter(Boolean))];
check(
  distinct.length === 1,
  `Версии плагина расходятся: ${JSON.stringify(versions)}`,
);
check(
  /^\d+\.\d+\.\d+$/.test(String(codexPlugin.version)),
  `Версия ${codexPlugin.version} не соответствует формату x.y.z`,
);

// Имена
check(
  codexPlugin.name === claudePlugin.name,
  `Имя плагина расходится: ${codexPlugin.name} против ${claudePlugin.name}`,
);
check(
  /^[a-z0-9-]+$/.test(String(claudePlugin.name)),
  `Имя плагина ${claudePlugin.name} должно быть в kebab-case`,
);
check(
  Boolean(claudePlugin.description) && claudePlugin.description.length <= 1024,
  'Claude plugin.json: description пуст или длиннее 1024 символов',
);
check(Boolean(claudePlugin.author?.name), 'Claude plugin.json: нет author.name');

// MCP
const servers = mcp.mcpServers ?? {};
check(Object.keys(servers).length > 0, '.mcp.json: нет серверов');
for (const [name, cfg] of Object.entries(servers)) {
  check(cfg.type === 'http', `.mcp.json: сервер ${name} должен иметь type=http`);
  check(
    typeof cfg.url === 'string' && cfg.url.startsWith('https://'),
    `.mcp.json: сервер ${name} должен иметь https URL`,
  );
  check(
    cfg.url === compat.mcp.url,
    `.mcp.json: URL сервера ${name} (${cfg.url}) расходится с compatibility.json (${compat.mcp.url})`,
  );
  check(
    name === compat.mcp.server,
    `.mcp.json: имя сервера ${name} расходится с compatibility.json (${compat.mcp.server})`,
  );
  for (const icon of cfg.icons ?? []) {
    check(
      exists(path.join('plugins/all-metrics', icon.src)),
      `.mcp.json: иконка ${icon.src} не найдена`,
    );
  }
}

// Codex-специфика
check(codexPlugin.mcpServers === './.mcp.json', 'Codex plugin.json: mcpServers должен указывать на ./.mcp.json');
check(claudePlugin.mcpServers === './.mcp.json', 'Claude plugin.json: mcpServers должен указывать на ./.mcp.json');
check(codexPlugin.skills === './skills/', 'Codex plugin.json: skills должен указывать на ./skills/');
check(claudePlugin.skills === './skills/', 'Claude plugin.json: skills должен указывать на ./skills/');
if (codexPlugin.interface?.composerIcon) {
  check(
    exists(path.join('plugins/all-metrics', codexPlugin.interface.composerIcon)),
    `Codex plugin.json: composerIcon ${codexPlugin.interface.composerIcon} не найден`,
  );
}
if (app) {
  check(Object.keys(app.apps ?? {}).length > 0, '.app.json: нет записей apps');
}

// ---------------------------------------------------------------- compatibility

const canonicalTools = new Set(compat.canonical?.tools ?? []);
const canonicalSources = new Set(compat.canonical?.sources ?? []);
check(
  canonicalTools.size === compat.mcp?.baseline?.tool_count,
  `compatibility.json: ${canonicalTools.size} инструментов против baseline.tool_count=${compat.mcp?.baseline?.tool_count}`,
);
check(
  canonicalSources.size === compat.mcp?.baseline?.source_count,
  `compatibility.json: ${canonicalSources.size} источников против baseline.source_count=${compat.mcp?.baseline?.source_count}`,
);

for (const [skillName, spec] of Object.entries(compat.skills ?? {})) {
  for (const tool of [...(spec.required_tools ?? []), ...(spec.optional_tools ?? [])]) {
    check(
      canonicalTools.has(tool),
      `compatibility.json: skill ${skillName} ссылается на неизвестный инструмент "${tool}"`,
    );
  }
  for (const source of [...(spec.required_sources_any_of ?? []), ...(spec.optional_sources ?? [])]) {
    check(
      canonicalSources.has(source),
      `compatibility.json: skill ${skillName} ссылается на неизвестный источник "${source}"`,
    );
  }
  check(
    /^\d+\.\d+\.\d+$/.test(String(spec.min_server_version)),
    `compatibility.json: skill ${skillName} имеет некорректный min_server_version`,
  );
  check(
    Boolean(spec.degrade),
    `compatibility.json: skill ${skillName} не описывает поведение при отсутствии источника`,
  );
}

// ---------------------------------------------------------------- skills

const skillsDir = path.join(PLUGIN_DIR, 'skills');
check(fs.existsSync(skillsDir), 'Нет каталога plugins/all-metrics/skills');

skillDirs = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory())
  : [];

check(skillDirs.length > 0, 'В каталоге skills нет ни одного skill');

const compatSkills = Object.keys(compat.skills ?? {}).sort();
check(
  JSON.stringify(skillDirs.slice().sort()) === JSON.stringify(compatSkills),
  `Состав skills расходится с compatibility.json: на диске [${skillDirs.sort()}], в контракте [${compatSkills}]`,
);

// Токены, похожие на имена инструментов, но инструментами не являющиеся.
const NOT_A_TOOL = new Set([
  'gclid', 'yclid', 'utm_source', 'utm_medium', 'result_source', 'saved', 'new_crawl',
  'live_inspect', 'connection_id', 'resource_id', 'external_id', 'selected_only',
  'queryable_only', 'force_refresh', 'idempotency_key', 'include_performance',
  'include_adult_keywords', 'campaign_query', 'whole_site', 'min_server_version',
  'avg_monthly_searches', 'monthly_search_volumes', 'competition_index', 'close_variants',
  'low_top_of_page_bid', 'high_top_of_page_bid', 'currency_code', 'search_term_view',
  'auth_required', 'resource_disabled', 'not_connected', 'no_resource', 'no_queryable_resource',
  'unsupported_by_server', 'generate_ideas', 'historical_metrics', 'ad_group_themes',
  'list_plans', 'get_plan', 'targeting_resolution', 'cdf_evidence', 'cdf_enabled',
  'start_crawl', 'crawl_status', 'list_audits', 'latest_audit', 'get_audit', 'crawl_urls',
  'business_manage', 'search_keywords', 'ad_group_id', 'api_does_not_exposed',
]);
const TOOLISH = /^(list_|get_|start_|run_|preview_|analyze_|google_|yandex_|keyword_planner$|website$|callrail$)/;

/** Сбор относительных markdown-ссылок. */
function markdownLinks(text) {
  const out = [];
  const re = /\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}

for (const dir of skillDirs) {
  const skillPath = path.join(skillsDir, dir);
  const skillFile = path.join(skillPath, 'SKILL.md');
  if (!check(fs.existsSync(skillFile), `${dir}: нет SKILL.md`)) continue;

  const raw = fs.readFileSync(skillFile, 'utf8');
  const parsed = parseFrontmatter(raw, `${dir}/SKILL.md`);
  if (!parsed) continue;
  const { data, body } = parsed;

  check(data.name === dir, `${dir}/SKILL.md: name="${data.name}" не совпадает с именем каталога`);
  check(
    /^[a-z0-9-]+$/.test(String(data.name)) && String(data.name).length <= 64,
    `${dir}/SKILL.md: name должен быть kebab-case и не длиннее 64 символов`,
  );
  check(
    Boolean(data.description) && data.description.length <= 1024,
    `${dir}/SKILL.md: description пуст или длиннее 1024 символов (сейчас ${data.description?.length ?? 0})`,
  );
  warn(
    (data.description?.length ?? 0) >= 120,
    `${dir}/SKILL.md: description короче 120 символов — модель хуже выбирает skill`,
  );
  check(
    body.includes('compatibility.json'),
    `${dir}/SKILL.md: нет ссылки на контракт совместимости compatibility.json`,
  );

  // Codex-манифест skill
  const openai = path.join(skillPath, 'agents', 'openai.yaml');
  check(fs.existsSync(openai), `${dir}: нет agents/openai.yaml для Codex`);
  if (fs.existsSync(openai)) {
    const y = fs.readFileSync(openai, 'utf8');
    check(y.includes(compat.mcp.url), `${dir}/agents/openai.yaml: URL MCP расходится с compatibility.json`);
    check(new RegExp(`value:\\s*["']?${compat.mcp.server}["']?(?:\\s|$)`).test(y), `${dir}/agents/openai.yaml: имя MCP-сервера расходится`);
  }

  // Ссылки и упомянутые инструменты во всех markdown-файлах skill
  const mdFiles = [skillFile];
  const refDir = path.join(skillPath, 'references');
  if (fs.existsSync(refDir)) {
    for (const f of fs.readdirSync(refDir)) {
      if (f.endsWith('.md')) mdFiles.push(path.join(refDir, f));
    }
  }

  for (const file of mdFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');

    for (const link of markdownLinks(text)) {
      if (/^[a-z]+:\/\//.test(link) || link.startsWith('#')) continue;
      const target = path.resolve(path.dirname(file), link.split('#')[0]);
      check(fs.existsSync(target), `${rel}: битая ссылка "${link}"`);
    }

    const mentioned = new Set();
    const re = /`([a-z][a-z0-9_]{2,})`/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const token = m[1];
      if (NOT_A_TOOL.has(token)) continue;
      // Имя источника, не являющееся именем инструмента, — допустимая ссылка.
      if (canonicalSources.has(token) && !canonicalTools.has(token)) continue;
      if (!TOOLISH.test(token)) continue;
      mentioned.add(token);
    }
    for (const token of mentioned) {
      check(
        canonicalTools.has(token),
        `${rel}: упомянут инструмент "${token}", которого нет в каноническом списке All Metrics`,
      );
    }
  }
}

// ---------------------------------------------------------------- отчёт

function report() {
  for (const w of warnings) console.log(`ПРЕДУПРЕЖДЕНИЕ  ${w}`);
  for (const e of errors) console.log(`ОШИБКА          ${e}`);
  console.log('');
  console.log(
    `Проверок: ${checks}; ошибок: ${errors.length}; предупреждений: ${warnings.length}; skills: ${skillDirs.length}`,
  );
}

report();
process.exit(errors.length > 0 ? 1 : 0);
