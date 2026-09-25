---
name: web
description: Web search (DuckDuckGo) and page-to-text fetching through the user's LibreWolf browser. Use when you need current information, documentation, or to read a URL.
---

# Web

```bash
~/.pi/agent/skills/web/web.ts ddgSearch "<query>" [limit=8]   # url, title, snippet per result
~/.pi/agent/skills/web/web.ts fetchPage <url>                 # visible text of page (JS rendered)
```

Both drive a LibreWolf GUI window (profile `agent`, WebDriver BiDi on port 9222), auto-launching it if needed. The session is logged in to sites the user has signed into there.

User says "search" → `ddgSearch`.
User says "fetch page" / "check the page" / "read the full page" → `fetchPage`.
Pipe `fetchPage` through `head -c 20000` or `rg` for large pages.
For Reddit threads prefer `old.reddit.com` URLs (denser text).
Exit 2 = no results; ask the user to check the LibreWolf window for a CAPTCHA and retry.
"Maximum number of active sessions" = stale BiDi session; ask the user to restart LibreWolf.
