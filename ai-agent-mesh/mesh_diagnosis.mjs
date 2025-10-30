#!/usr/bin/env node
/**
 * mesh_diagnosis.mjs
 *
 * Purpose: Detect and classify AI agents (copilots, chatbots, pipelines, services)
 * across a mono-repo; cross-check with MCP registry; emit a normalized inventory
 * and risk flags. No external dependencies.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'out', '.turbo'
]);
const DEFAULT_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.py', '.go']);

function parseArgs(argv) {
  const args = { root: process.cwd(), registry: null, output: null, format: 'json', maxFiles: 5000 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i];
    else if (a === '--registry') args.registry = argv[++i];
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--format') args.format = argv[++i];
    else if (a === '--max-files') args.maxFiles = Number(argv[++i]);
  }
  return args;
}

function guessAgentTypeFromPath(p) {
  const lower = p.toLowerCase();
  if (lower.includes('copilot')) return 'copilot';
  if (lower.includes('chat') || lower.includes('assistant')) return 'chatbot';
  if (lower.includes('route') || lower.includes('controller') || lower.includes('service')) return 'service';
  if (lower.includes('pipeline') || lower.includes('scripts')) return 'pipeline';
  return 'service';
}

function detectVendorsFromContent(content) {
  const vendors = new Set();
  if (/from\s+['"]openai['"]/i.test(content) || /new\s+OpenAI\s*\(/.test(content) || /gpt-\d|gpt-4|gpt-4o/.test(content)) vendors.add('openai');
  if (/from\s+['"]anthropic['"]/i.test(content) || /claude[-_\s]?\d/i.test(content)) vendors.add('anthropic');
  if (/from\s+['"]@google-ai\//i.test(content) || /from\s+['"]@google-cloud['"]/i.test(content) || /gemini[-_\s]?\d/i.test(content)) vendors.add('google');
  if (/from\s+['"]@azure\/ai/i.test(content) || /AzureOpenAI|gpt-35|gpt-4o-mini/.test(content)) vendors.add('azure');
  if (/llama[-_\s]?\d/i.test(content)) vendors.add('meta');
  if (/mistral/i.test(content)) vendors.add('mistral');
  if (/bedrock|sagemaker|comprehend/i.test(content)) vendors.add('aws');
  if (/langchain/i.test(content)) vendors.add('langchain');
  return Array.from(vendors);
}

function findRiskFlags(content) {
  const flags = [];
  if (/process\.env\.[A-Z0-9_]*API_KEY/.test(content)) flags.push('api_key_in_codepath');
  if (/ssn|social security number/i.test(content)) flags.push('pii_ssn_pattern');
  if (/credit\s*card|\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/i.test(content)) flags.push('pii_credit_card_pattern');
  if (/systemPrompt\s*[:=]|prompt\s*[:=]\s*`|prompt\s*[:=]\s*"/i.test(content)) flags.push('hardcoded_prompt');
  if (/fetch\(.*openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com/i.test(content)) flags.push('direct_model_api_call');
  return flags;
}

async function* walk(dir, filters) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (DEFAULT_IGNORE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full, filters);
    } else {
      const ext = path.extname(e.name);
      if (DEFAULT_EXTS.has(ext)) yield full;
    }
  }
}

function inferAgentIdFromPath(p, repoRoots) {
  const segs = p.split(path.sep);
  for (const root of repoRoots) {
    const idx = segs.indexOf(root);
    if (idx !== -1) return root + ':' + segs.slice(idx + 1, idx + 3).join('/');
  }
  return path.basename(p);
}

function tryParseSimpleYaml(yamlText) {
  // Very small YAML subset parser: handles top-level scalars, arrays with '- ', and one-level nested maps.
  // For robust parsing, integrate PyYAML via subprocess; this is only a convenience.
  try {
    const lines = yamlText.split(/\r?\n/);
    const stack = [{ indent: -1, value: {} }];
    let current = stack[0].value;

    function setPath(obj, key, val) { obj[key] = val; }

    for (let raw of lines) {
      if (!raw.trim() || raw.trim().startsWith('#')) continue;
      const indent = raw.match(/^\s*/)[0].length;
      const line = raw.trim();
      while (stack.length && indent <= stack[stack.length - 1].indent) stack.pop();
      const parent = stack[stack.length - 1].value;

      if (line.startsWith('- ')) {
        const rest = line.slice(2);
        if (!Array.isArray(parent.items)) parent.items = [];
        if (rest.includes(':')) {
          const [k, v] = rest.split(/:(.*)/).map(s => s.trim());
          const node = {};
          node[k] = v ? coerce(v) : null;
          parent.items.push(node);
          stack.push({ indent, value: node });
        } else {
          parent.items.push(coerce(rest));
        }
      } else if (line.includes(':')) {
        const [k, v] = line.split(/:(.*)/).map(s => s.trim());
        if (v === '') {
          const obj = {};
          setPath(parent, k, obj);
          stack.push({ indent, value: obj });
        } else {
          setPath(parent, k, coerce(v));
        }
      }
    }
    return current;
  } catch {
    return null;
  }

  function coerce(v) {
    const t = v.replace(/^['"]|['"]$/g, '');
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (t === 'null') return null;
    if (!isNaN(Number(t))) return Number(t);
    if (t.startsWith('[') && t.endsWith(']')) {
      const inner = t.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map(x => x.trim().replace(/^['"]|['"]$/g, ''));
    }
    return t;
  }
}

async function readFileSafe(p) {
  try { return await fs.readFile(p, 'utf8'); } catch { return null; }
}

async function detectAgents(root, maxFiles) {
  const results = [];
  const repoRoots = ['apps', 'aiops', 'digital-twin', 'ecosystem', 'feedback', 'marketing', 'partners', 'growth', 'supabase'];
  let count = 0;
  for await (const file of walk(root)) {
    count++;
    if (count > maxFiles) break;
    const content = await readFileSafe(file);
    if (!content) continue;
    const vendors = detectVendorsFromContent(content);
    if (vendors.length === 0) continue;
    const id = inferAgentIdFromPath(file, repoRoots);
    const type = guessAgentTypeFromPath(file);
    const risks = findRiskFlags(content);
    results.push({ file, id, type, vendors, risks });
  }
  return results;
}

function aggregate(results) {
  const byId = new Map();
  for (const r of results) {
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, types: new Set(), vendors: new Set(), files: [], risks: new Set() });
    const a = byId.get(r.id);
    a.types.add(r.type);
    r.vendors.forEach(v => a.vendors.add(v));
    r.risks.forEach(v => a.risks.add(v));
    a.files.push(r.file);
  }
  return Array.from(byId.values()).map(a => ({
    id: a.id,
    types: Array.from(a.types),
    vendors: Array.from(a.vendors),
    risks: Array.from(a.risks),
    files: a.files
  }));
}

function asArray(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node;
  if (Array.isArray(node.items)) return node.items;
  return [node];
}

function matchAgainstRegistry(agents, registry) {
  if (!registry) return { matched: [], unmatched: agents };
  const regAgentsNode = registry.agents;
  const regAgents = Array.isArray(regAgentsNode) ? regAgentsNode : (regAgentsNode && Array.isArray(regAgentsNode.items) ? regAgentsNode.items : []);
  const regIds = new Set(regAgents.map(a => a.id).filter(Boolean));
  const matched = [];
  const unmatched = [];
  for (const a of agents) {
    if (regIds.has(a.id) || regAgents.some(r => a.id.startsWith(r.id || '') || a.files.some(f => asArray(r.repos).some(repo => typeof repo === 'string' && f.includes(repo))))) {
      matched.push(a);
    } else {
      unmatched.push(a);
    }
  }
  return { matched, unmatched };
}

function toYaml(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(obj)) return obj.map(v => pad + '- ' + toYaml(v, indent + 2).trimStart()).join('\n');
  if (obj && typeof obj === 'object') {
    return Object.entries(obj)
      .map(([k, v]) => {
        if (v && typeof v === 'object') return `${pad}${k}:\n${toYaml(v, indent + 2)}`;
        return `${pad}${k}: ${formatScalar(v)}`;
      }).join('\n');
  }
  return pad + String(obj);
}
function formatScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(x => JSON.stringify(x)).join(', ')}]`;
  return JSON.stringify(String(v));
}

async function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root);
  const [registryText] = await Promise.all([
    args.registry ? readFileSafe(path.resolve(args.registry)) : Promise.resolve(null)
  ]);
  const registry = registryText ? tryParseSimpleYaml(registryText) : null;

  const raw = await detectAgents(root, args.maxFiles);
  const aggregated = aggregate(raw);
  const { matched, unmatched } = matchAgainstRegistry(aggregated, registry);

  const report = {
    root,
    timestamp: new Date().toISOString(),
    counts: { files_scanned: Math.min(args.maxFiles, raw.length), agents_detected: aggregated.length, matched: matched.length, unmatched: unmatched.length },
    matched, unmatched,
    suggestions: unmatched.map(a => ({
      action: 'add_to_registry',
      agent_stub: {
        id: a.id,
        name: a.id.replace(/[:/]/g, ' ').replace(/\s+/g, ' ').trim(),
        type: a.types[0] || 'service',
        owner: 'TBD',
        repos: [],
        endpoints: [],
        models: [],
        capabilities: [],
        mcp: { servers: [] },
        tags: [],
        data_classification: 'internal'
      }
    }))
  };

  const outText = args.format === 'yaml' ? toYaml(report) + '\n' : JSON.stringify(report, null, 2) + '\n';
  if (args.output) {
    await fs.writeFile(path.resolve(args.output), outText, 'utf8');
    process.stdout.write(`Wrote report to ${path.resolve(args.output)}\n`);
  } else {
    process.stdout.write(outText);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
