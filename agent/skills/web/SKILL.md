---
name: web
description: Web search (DuckDuckGo) and page-to-text fetching via headless Chromium. Use when you need current information, documentation, or to read a URL.
---

# Web

```bash
~/.pi/agent/skills/web/web.ts ddgSearch "<query>" [limit=8]   # url, title, snippet per result
~/.pi/agent/skills/web/web.ts fetchPage <url>                 # readable text of page (JS rendered)
```

User says "search" → `ddgSearch`.
User says "fetch page" / "check the page" / "read the full page" → `fetchPage`.
Pipe `fetchPage` through `head -c 20000` or `rg` for large pages.
