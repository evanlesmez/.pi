---
name: web
description: Web search and URL fetching (text + links) via the user's browser or plain HTTP. Use for current info, docs, or reading a URL.
---

```bash
~/.pi/agent/skills/web/web.ts ddgSearch "<query>" [limit=8]   # url, title, snippet per result
~/.pi/agent/skills/web/web.ts fetchPage <url> [max=20000]     # visible text (max chars), then "## Links" (url  label, first 100); max=0 for all
```

Uses a dedicated LibreWolf window (agent profile, logged in to sites the user signed into there) when reachable, else plain HTTP fetch without JavaScript or logins.  
Use `fetchPage <url> 0 | rg <pattern>` to search a large page without truncation.  
Follow a result's URL from `## Links` to go deeper instead of searching again.  
For Reddit use `www.reddit.com`.  
Follow hints printed on stderr.
