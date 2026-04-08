---
name: web-search
description: Search the web and retrieve full page content from top results for any query.
metadata:
  require-secret: true
  require-secret-description: "Jina.ai API key. Get a free key at https://jina.ai (sign up → API Keys). The free tier includes 10 million tokens."
---

# Web Search

Search the web for a query and automatically retrieve the full content of top results, returning them as context for answering the user's question.

## Instructions

Call the `run_js` tool using `index.html` and a JSON string for `data` with the following fields:

- **query**: Required. The search query. Use specific keywords that best represent the user's intent. Write the query in the same language as the user's question when searching for region-specific or language-specific content, or in English for broad technical topics.
- **max_results**: Optional. Number of top results to fetch full content for. 1 or 2, default is 1. Use 2 only when a single result is unlikely to contain the full answer.

## Examples

- User: "2026年のAI動向を教えて" → `{ "query": "2026年 AI 動向 最新" }`
- User: "What is the latest version of Python?" → `{ "query": "Python latest version 2026" }`
- User: "How do I reverse a string in Rust?" → `{ "query": "Rust reverse string" }`
- User: "Compare React and Vue in 2026" → `{ "query": "React vs Vue 2026 comparison", "max_results": 2 }`

## Constraints

- Summarize the returned content concisely. Do not reproduce large sections verbatim.
- Always cite the source URLs in your response.
- Respond in the same language as the user's original prompt.
- If the results do not contain a relevant answer, state this clearly and suggest a refined query.
- For time-sensitive topics (news, versions, events), include the current year in the query.
