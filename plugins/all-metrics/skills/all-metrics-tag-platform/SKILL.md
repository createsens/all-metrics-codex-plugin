---
name: all-metrics-tag-platform
description: Анализировать Google Tag Manager и Google tag, управлять тегами, триггерами, переменными, пользовательским кодом и версиями, проверять сценарии через MCP AllMetrics. Использовать для GTM, gtag.js, dataLayer, Consent Mode и задач установки или публикации тегов.
---

# Google Tag Platform through AllMetrics

Contract: [compatibility.json](../../compatibility.json), skills["all-metrics-tag-platform"].

Minimum server: 3.7.0. Verify actual tools before acting; a skill does not prove server support.
Use the same connected AllMetrics identity/link_id consistently. Required tools:
`get_current_user`, `list_sources`, `list_connections`, `list_resources`,
`google_tag_manager`, `google_tag`, `google_tag_manager_write`, `google_tag_write`,
`tag_runtime_inspect`, `tag_scenario_test`.

1. Discover source/connection/resource and confirm the owner. GTM and Google tag are
   separate sources over the same canonical Google API paths. Read capabilities for
   the exact method and schemas; never invent native tag type keys or provider fields.
2. Read live configuration and chosen workspace separately. Inspect firing/blocking
   triggers, variable dependencies, paused tags, consent and existing tracking before
   proposing changes. For metrics use the existing GA4/Ads read sources.
3. Observe the site with tag_runtime_inspect. Configuration reads do not prove firing,
   and network requests do not prove destination ingestion. Report unavailable layers.
4. Writes require a grant. request_grant returns an owner approval URL; let the owner
   choose resources/action classes. Grants are persistent until revoked and bound to
   the authenticated MCP client. Never approve a grant for the owner or copy another
   owner's credential. Continue independent reads while approval is pending.
5. Create a separate workspace for a new scenario. Every mutation uses prepare with
   method/arguments/idempotency_key, then execute the returned action_id, then status.
   Prepare is read-only at Google; execute performs the saved action. Show concrete
   changes and immediate effects. Low-level API supports custom HTML/JS/templates,
   bulk_update, server containers and administrative operations where Google permits.
6. Compile/preview and read back. Use newWorkspacePath after version creation.
   Resolve conflicts explicitly; never call a compiler error a successful version.
7. Active tests use tag_scenario_test with explicit steps/expectations and
   allow_side_effects=true only for the user's chosen scenario, preferably a test page.
   This can submit forms and send real hits. Do not silently perform a purchase or
   production submission just to prove a tag. Poll the returned run, never restart it
   to obtain status.
8. Publication is a separate prepare/execute action on an exact version after the
   user's subsequent explicit publication command. Adding a tag is not permission to
   publish it. Re-publishing an older version is another publication action.
9. Never resend outcome_unknown. Read actual state and reconcile before preparing a
   new action. Idempotency keys must not be reused with different arguments. A changed
   fingerprint requires a new diff/action. Recheck grants after revocation/reconnection.

Google tag configs, destinations, combining tags, moving IDs and admin changes may
affect live configuration immediately; workspace publication does not protect these.
gtag.js is a browser library, not a CMS editing REST API. Arbitrary code delivery needs
a loaded GTM container and compatible CSP. If absent, retrieve installation snippet
and explain that it must be installed before GTM code can run.

Capabilities documentation is not live verification. Use LOCAL/STAGING/PRODUCTION and
NOT VERIFIED/BLOCKED precisely. Keep token, cookie, form-value and caller PII out of chat.
