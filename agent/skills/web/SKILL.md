---
name: web
description: Web search and URL fetching (text + links) via the user's browser. Use for current info, docs, or reading a URL.
---

```bash
~/.pi/agent/skills/web/web.ts ddgSearch "<query>" [limit=8]   # url, title, snippet per result
~/.pi/agent/skills/web/web.ts fetchPage <url> [max=20000]     # visible text, then "## Links" (url  label); max=0 for all
```

Runs in a dedicated LibreWolf window (agent profile), logged in to sites the user signed into there.  
Use `fetchPage <url> 0 | rg <pattern>` to search a large page without truncation.  
Follow a result's URL from `## Links` to go deeper instead of searching again.  
For Reddit use `www.reddit.com` (`old.reddit.com` is empty when logged out).  
Follow hints printed on stderr.
