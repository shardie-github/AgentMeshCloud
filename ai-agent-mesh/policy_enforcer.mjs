#!/usr/bin/env node
/**
 * policy_enforcer.mjs
 *
 * Purpose: Enforce mesh-wide policies for AI agents: RBAC, model allowlists,
 * PII redaction, geo/data residency hints, parameter normalization, and audit output.
 * No external dependencies.
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';

function parseArgs(argv) {
  const args = { input: null, stdin: false, output: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--stdin') args.stdin = true;
  }
  return args;
}

const DEFAULT_POLICY = {
  modelAllowlist: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5', 'claude-3-haiku', 'gemini-1.5-pro', 'llama-3.1-70b', 'mistral-large'],
  maxTokens: 4096,
  temperatureRange: [0.0, 1.2],
  restrictedTools: ['shell.exec', 'fs.readFile', 'process.env'],
  piiRedaction: true,
  residency: { defaultRegion: 'us', allowedRegions: ['us', 'eu'] },
  roleModelDeny: [
    // Example: block using strongest models for unapproved roles
    { roles: ['guest', 'contractor'], models: ['gpt-4o', 'claude-3-5', 'llama-3.1-70b'] }
  ]
};

function redactPII(text) {
  if (!text) return text;
  const rules = [
    { name: 'email', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, rep: '[EMAIL]' },
    { name: 'ssn_us', re: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g, rep: '[SSN]' },
    { name: 'credit_card', re: /\b(?:\d[ -]*?){13,19}\b/g, rep: '[CARD]' }
  ];
  let out = text;
  for (const r of rules) out = out.replace(r.re, r.rep);
  return out;
}

function normalizeParams(params, policy) {
  const out = { ...params };
  if (typeof out.maxTokens === 'number' && out.maxTokens > policy.maxTokens) out.maxTokens = policy.maxTokens;
  if (typeof out.temperature === 'number') {
    const [minT, maxT] = policy.temperatureRange;
    if (out.temperature < minT) out.temperature = minT;
    if (out.temperature > maxT) out.temperature = maxT;
  }
  return out;
}

function isAllowedModel(model, policy, user) {
  if (!policy.modelAllowlist.includes(model)) return false;
  for (const rule of policy.roleModelDeny) {
    if ((user.roles || []).some(r => rule.roles.includes(r)) && rule.models.includes(model)) return false;
  }
  return true;
}

function denyReason(model, policy, user) {
  if (!policy.modelAllowlist.includes(model)) return `model_not_allowed:${model}`;
  for (const rule of policy.roleModelDeny) {
    if ((user.roles || []).some(r => rule.roles.includes(r)) && rule.models.includes(model)) return `role_denied_for_model:${model}`;
  }
  return null;
}

function hashPrompt(prompt) {
  return crypto.createHash('sha256').update(prompt || '').digest('hex');
}

function enforcePolicy({ user = {}, agent = {}, request = {}, context = {} }, policy = DEFAULT_POLICY) {
  const decision = { allow: true, actions: [], reasons: [], normalized: {}, audit: {} };

  // Model allowlist and role-based deny
  if (request.model && !isAllowedModel(request.model, policy, user)) {
    decision.allow = false;
    decision.reasons.push(denyReason(request.model, policy, user));
  }

  // Parameter normalization
  const normParams = normalizeParams({ maxTokens: request.maxTokens, temperature: request.temperature }, policy);
  if (normParams.maxTokens !== request.maxTokens) decision.actions.push('maxTokens_clamped');
  if (normParams.temperature !== request.temperature) decision.actions.push('temperature_clamped');

  // PII redaction
  let prompt = String(request.prompt || '');
  let redacted = prompt;
  if (policy.piiRedaction) {
    redacted = redactPII(prompt);
    if (redacted !== prompt) decision.actions.push('pii_redacted');
  }

  // Restricted tools
  const tools = Array.isArray(request.tools) ? request.tools : [];
  const restricted = tools.filter(t => policy.restrictedTools.includes(t));
  if (restricted.length) {
    decision.allow = false;
    decision.reasons.push('restricted_tools:' + restricted.join(','));
  }

  // Residency hint
  const region = context.region || policy.residency.defaultRegion;
  if (!policy.residency.allowedRegions.includes(region)) {
    decision.allow = false;
    decision.reasons.push('region_not_allowed:' + region);
  }

  decision.normalized = {
    ...request,
    prompt: redacted,
    maxTokens: normParams.maxTokens,
    temperature: normParams.temperature
  };

  decision.audit = {
    timestamp: new Date().toISOString(),
    user: { id: user.id, roles: user.roles || [], dept: user.department || null, region },
    agent: { id: agent.id, name: agent.name || null, tags: agent.tags || [] },
    model: request.model || null,
    prompt_sha256: hashPrompt(prompt),
    actions: decision.actions,
    reasons: decision.reasons
  };

  return decision;
}

async function readInput(args) {
  if (args.stdin) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  if (args.input) {
    const txt = await fs.readFile(args.input, 'utf8');
    return JSON.parse(txt);
  }
  throw new Error('Provide --stdin or --input <file.json>');
}

async function main() {
  const args = parseArgs(process.argv);
  const payload = await readInput(args);
  const decision = enforcePolicy(payload, DEFAULT_POLICY);
  const out = JSON.stringify(decision, null, 2) + '\n';
  if (args.output) await fs.writeFile(args.output, out, 'utf8');
  else process.stdout.write(out);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}

export { enforcePolicy };
