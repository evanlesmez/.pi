# .pi

My config for [pi](https://pi.dev), a coding agent harness.  

Clone into your home directory:

```sh
git clone git@github.com:evanlesmez/.pi.git ~/.pi
```

## Web skill on headless machines

`agent/skills/web/web.ts` runs on [Deno](https://deno.com) and picks a backend per call:

- LibreWolf on `127.0.0.1:9222` if something answers there (local browser or SSH tunnel).
- Otherwise it launches LibreWolf if it is on `PATH` and a display exists (`DISPLAY` or `WAYLAND_DISPLAY` on Linux).
- Otherwise plain `fetch`: DuckDuckGo HTML search with Bing as fallback, and pages without JavaScript or logins.

### Use your desktop browser from a server

A reverse SSH tunnel exposes the desktop LibreWolf debug port on the server, so the agent gets JavaScript rendering, your logins, and your home IP.  
Start LibreWolf on the desktop first (run any `web.ts` command there once), then from the desktop:

```sh
ssh -N -R 9222:localhost:9222 you@server
```

For a tunnel that reconnects, use `autossh -M 0 -N -R 9222:localhost:9222 you@server` or add `RemoteForward 9222 localhost:9222` to the host in `~/.ssh/config`.  
While the tunnel is up, any user on the server who can reach `localhost:9222` controls your logged-in browser, so only do this on servers you alone use.  
