/**
 * Разрешение совместимости skill с фактической MCP-сессией.
 *
 * Модуль не обращается к сети. На вход подаётся снимок сессии:
 *   { server_version, tools: [...], sources: [...], connections: [...], resources: [...] }
 * Такой снимок собирается вызовами tools/list, list_sources, list_connections и list_resources.
 */

/** Сравнение semver-подобных версий вида "3.2.0". Возвращает -1, 0 или 1. */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Причина, по которой источник не готов, либо "ready".
 * Источник пригоден только при подключении connected и хотя бы одном queryable ресурсе.
 */
export function sourceStatus(session, source) {
  const sources = session.sources ?? [];
  const connections = session.connections ?? [];
  const resources = session.resources ?? [];

  if (!sources.includes(source)) return 'unsupported_by_server';

  const connection = connections.find((c) => c.source === source);
  if (!connection) return 'not_connected';
  if (connection.status === 'reauthorization_required') return 'auth_required';
  if (connection.status !== 'connected') return connection.status || 'error';

  const own = resources.filter((r) => r.source === source);
  if (own.length === 0) return 'no_resource';
  if (!own.some((r) => r.queryable === true)) return 'no_queryable_resource';

  return 'ready';
}

/**
 * Оценить один skill против снимка сессии.
 * Возвращает подробный отчёт, пригодный и для CI, и для показа пользователю.
 */
export function evaluateSkill(compat, skillName, session) {
  const spec = compat.skills?.[skillName];
  if (!spec) {
    throw new Error(`Skill "${skillName}" отсутствует в compatibility.json`);
  }

  const tools = new Set(session.tools ?? []);
  const missingRequiredTools = spec.required_tools.filter((t) => !tools.has(t));
  const availableOptionalTools = (spec.optional_tools ?? []).filter((t) => tools.has(t));
  const missingOptionalTools = (spec.optional_tools ?? []).filter((t) => !tools.has(t));

  const versionOk =
    session.server_version === undefined ||
    compareVersions(session.server_version, spec.min_server_version) >= 0;

  const requiredSources = spec.required_sources_any_of ?? [];
  const readySources = requiredSources.filter((s) => sourceStatus(session, s) === 'ready');
  const sourcesOk = requiredSources.length === 0 || readySources.length > 0;

  const blockers = [];
  if (!versionOk) {
    blockers.push(
      `Версия сервера ${session.server_version} ниже требуемой ${spec.min_server_version}`,
    );
  }
  if (missingRequiredTools.length > 0) {
    blockers.push(`Отсутствуют обязательные инструменты: ${missingRequiredTools.join(', ')}`);
  }
  if (!sourcesOk) {
    blockers.push(
      `Нет ни одного готового источника из: ${requiredSources
        .map((s) => `${s} (${sourceStatus(session, s)})`)
        .join(', ')}`,
    );
  }

  const optionalSourceStatuses = Object.fromEntries(
    (spec.optional_sources ?? []).map((s) => [s, sourceStatus(session, s)]),
  );

  return {
    skill: skillName,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
    min_server_version: spec.min_server_version,
    server_version: session.server_version ?? null,
    missing_required_tools: missingRequiredTools,
    available_optional_tools: availableOptionalTools,
    missing_optional_tools: missingOptionalTools,
    ready_required_sources: readySources,
    optional_source_statuses: optionalSourceStatuses,
    degrade: spec.degrade,
  };
}

/** Оценить все skills сразу. */
export function evaluateAll(compat, session) {
  return Object.keys(compat.skills).map((name) => evaluateSkill(compat, name, session));
}
