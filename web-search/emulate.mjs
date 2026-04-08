/**
 * Emulator for the web-search skill.
 *
 * Runs the same logic as scripts/index.html and prints what would be
 * passed to the LLM as context, so you can inspect and tune the output
 * without deploying to a device.
 *
 * Usage:
 *   JINA_API_KEY=jina_xxx node emulate.mjs "your query here" [max_results]
 *
 * Examples:
 *   JINA_API_KEY=jina_xxx node emulate.mjs "最近のイスラエル情勢"
 *   JINA_API_KEY=jina_xxx node emulate.mjs "Python 3.13 new features" 3
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// --- Same constants as index.html ---
const MAX_CONTENT_CHARS = 2000;
const SEARCH_BASE = 'https://s.jina.ai/';
const READER_BASE = 'https://r.jina.ai/';

const getDomain = url => {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch (_) { return ''; }
};

// Mirror of the cleanContent function in scripts/index.html
const cleanContent = text => text
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) → text
  .replace(/https?:\/\/\S+/g, '')           // bare URLs
  .replace(/^\[[^\]]+\]:\s+\S+.*$/gm, '')   // reference-style link defs
  .replace(/^\*.*$/gm, '')                  // lines starting with *
  .replace(/\n{3,}/g, '\n\n')
  .trim();

async function run(query, maxResultsArg, apiKey) {
  query = query.trim();
  if (!query) { console.error('Error: query is required.'); process.exit(1); }

  const maxResults = Math.min(Math.max(1, parseInt(maxResultsArg) || 1), 2);

  const searchHeaders = { 'Accept': 'application/json' };
  if (apiKey) searchHeaders['Authorization'] = `Bearer ${apiKey}`;

  const readerHeaders = {
    ...searchHeaders,
    'X-Return-Format': 'markdown',
    'X-Retain-Images': 'none',
    'X-Remove-Selector': 'header, footer, nav, .ad, .ads, .advertisement, #sidebar, .sidebar, .navigation, .menu, .comments, .related, .share, .sns',
    'X-Timeout': '10',
  };

  // Load blocked-domains.json from local file (mirrors what the browser fetches)
  const blockedDomainsPromise = readFile(join(__dir, 'blocked-domains.json'), 'utf8')
    .then(text => new Set(JSON.parse(text).domains || []))
    .catch(() => { console.warn('[warn] Could not load blocked-domains.json, skipping filter.'); return new Set(); });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Query      : ${query}`);
  console.log(`max_results: ${maxResults}`);
  console.log(`API key    : ${apiKey ? apiKey.slice(0, 8) + '…' : '(none)'}`);
  console.log(`${'─'.repeat(60)}\n`);

  // Step 1: Search
  console.log('[1/3] Searching s.jina.ai …');
  let searchRes;
  try {
    searchRes = await fetch(SEARCH_BASE + encodeURIComponent(query), {
      headers: searchHeaders,
    });
  } catch (netErr) {
    console.error(`[NETWORK_ERROR] ${netErr.message}`);
    process.exit(1);
  }

  if (!searchRes.ok) {
    console.error(`[HTTP_${searchRes.status}] Search failed.${searchRes.status === 401 ? ' Check API key.' : ''}`);
    process.exit(1);
  }

  const searchData = JSON.parse(await searchRes.text());
  const blockedDomains = await blockedDomainsPromise;

  const hits = (searchData.data || [])
    .filter(hit => {
      const domain = getDomain(hit.url || '');
      const blocked = blockedDomains.has(domain);
      if (blocked) console.log(`  [blocked] ${domain}`);
      return domain && !blocked;
    })
    .slice(0, maxResults);

  console.log(`  → ${hits.length} result(s) after filtering\n`);

  if (hits.length === 0) {
    console.log('Result: No search results found for the given query.');
    process.exit(0);
  }

  // Step 2: Fetch content
  console.log('[2/3] Fetching page content via r.jina.ai …');
  const pages = await Promise.all(hits.map(async (hit, i) => {
    const title = hit.title || '(no title)';
    const url = hit.url || '';
    const fallbackContent = (hit.content || hit.description || '').slice(0, MAX_CONTENT_CHARS);

    if (!url) return { title, url, content: fallbackContent };

    try {
      const fetchRes = await fetch(READER_BASE + url, { headers: readerHeaders });
      if (!fetchRes.ok) {
        console.log(`  [${i + 1}] HTTP ${fetchRes.status} — using search snippet`);
        return { title, url, content: fallbackContent };
      }
      const fetchData = await fetchRes.json();
      const content = (cleanContent(fetchData.data?.content || '') || fallbackContent).slice(0, MAX_CONTENT_CHARS);
      console.log(`  [${i + 1}] OK — ${content.length} chars from ${getDomain(url)}`);
      return { title, url, content };
    } catch (e) {
      console.log(`  [${i + 1}] Error (${e.message}) — using search snippet`);
      return { title, url, content: fallbackContent };
    }
  }));

  // Step 3: Format — exactly as the LLM would receive it
  const output = pages
    .map((p, i) => `## [${i + 1}] ${p.title}\nSource: ${p.url}\n\n${p.content}`)
    .join('\n\n---\n\n');

  const tokenEstimate = Math.round(output.length * 1.5); // rough: ~1.5 tokens/char for Japanese

  console.log(`\n[3/3] Result sent to LLM:`);
  console.log(`${'═'.repeat(60)}`);
  console.log(output);
  console.log(`${'═'.repeat(60)}`);
  console.log(`\nStats:`);
  console.log(`  Characters : ${output.length}`);
  console.log(`  Token est. : ~${tokenEstimate} (rough estimate, actual varies by model)`);
}

// CLI entrypoint
const [,, query, maxResults] = process.argv;
const apiKey = process.env.JINA_API_KEY || '';

if (!query) {
  console.error('Usage: JINA_API_KEY=jina_xxx node emulate.mjs "query" [max_results]');
  process.exit(1);
}

run(query, maxResults, apiKey).catch(e => { console.error(e); process.exit(1); });
