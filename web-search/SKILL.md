---
name: web-search
description: Search the web and retrieve full page content from top results for any query.
metadata:
  require-secret: true
  require-secret-description: |
    Google Custom Search API credentials in the format: {API_KEY}:{CX_ID}

    Setup (one-time, free):
    1. Get an API key: https://console.cloud.google.com → Enable "Custom Search JSON API"
    2. Create a search engine: https://programmablesearchengine.google.com → New Search Engine → "Search the entire web" → copy the cx ID
    3. Enter as: your_api_key:your_cx_id (colon-separated, no spaces)

    Free quota: 100 queries/day.
---

# Web Search

Search the web for a query and automatically retrieve the full content of top results, returning them as context for answering the user's question.

## Instructions

Call the `run_js` tool using `index.html` and a JSON string for `data` with the following fields:

- **query**: Required. The search query. Use specific keywords that best represent the user's intent. Write the query in the same language as the user's question when searching for region-specific or language-specific content, or in English for broad technical topics.
- **max_results**: Optional. Number of top results to fetch full content for. Integer between 1 and 5, default is 2. Use fewer (1–2) for focused factual questions, more (3–5) for broad research tasks.

## Examples

- User: "2026年のAI動向を教えて" → `{ "query": "2026年 AI 動向 最新", "max_results": 2 }`
- User: "What is the latest version of Python?" → `{ "query": "Python latest version 2026", "max_results": 2 }`
- User: "How do I reverse a string in Rust?" → `{ "query": "Rust reverse string", "max_results": 2 }`
- User: "Compare React and Vue in 2026" → `{ "query": "React vs Vue 2026 comparison", "max_results": 3 }`

## Constraints

- Summarize the returned content concisely. Do not reproduce large sections verbatim.
- Always cite the source URLs in your response.
- Respond in the same language as the user's original prompt.
- If the results do not contain a relevant answer, state this clearly and suggest a refined query.
- For time-sensitive topics (news, versions, events), include the current year in the query.
