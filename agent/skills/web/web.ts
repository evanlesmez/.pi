#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-run=librewolf --allow-env=LOCALAPPDATA,XDG_DATA_HOME,HOME,PATH,DISPLAY,WAYLAND_DISPLAY

const [cmd, arg, n]: (string | undefined)[] = Deno.args;
const PORT = 9222;
const WS_URL = `ws://127.0.0.1:${PORT}/session`;
const PROFILE_DIR = `${
  Deno.env.get("LOCALAPPDATA") ?? Deno.env.get("XDG_DATA_HOME") ??
    `${Deno.env.get("HOME")}/.local/share`
}/librewolf-agent`;
const LAUNCH_ARGS = [
  "--profile",
  PROFILE_DIR,
  "--no-remote",
  "--class",
  "librewolf-agent",
  "--remote-debugging-port",
  String(PORT),
  "--remote-allow-origins",
  `ws://localhost:${PORT}`,
];

type Result = { url: string; title: string; snippet: string };
type Page = { text: string; links: [string, string][] };
type BidiMessage = {
  id?: number;
  type?: string;
  message?: string;
  result?: {
    context?: string;
    type?: string;
    result?: { value?: string };
    exceptionDetails?: { text?: string };
  };
};

const connect = (): Promise<WebSocket | null> =>
  new Promise((r) => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => r(ws);
    ws.onerror = () => r(null);
  });

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const exists = (path: string): boolean => {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
};

const onPath = (bin: string): boolean =>
  (Deno.env.get("PATH") ?? "").split(Deno.build.os === "windows" ? ";" : ":")
    .some((d) => exists(`${d}/${bin}`) || exists(`${d}/${bin}.exe`));

const hasDisplay = (): boolean =>
  Deno.build.os === "windows" || Deno.build.os === "darwin" ||
  !!(Deno.env.get("DISPLAY") || Deno.env.get("WAYLAND_DISPLAY"));

// null = no browser reachable (not running, no tunnel, can't launch) -> plain fetch
async function browser(): Promise<WebSocket | null> {
  let ws = await connect();
  if (ws || !hasDisplay() || !onPath("librewolf")) return ws;
  Deno.mkdirSync(PROFILE_DIR, { recursive: true });
  new Deno.Command("librewolf", {
    args: LAUNCH_ARGS,
    detached: true,
    stdin: "null",
    stdout: "null",
    stderr: "null",
  }).spawn().unref();
  for (let i = 0; i < 30 && !ws; i++) {
    await sleep(500);
    ws = await connect();
  }
  if (!ws) throw new Error(`LibreWolf did not open port ${PORT}`);
  return ws;
}

async function librewolfEval(
  ws: WebSocket,
  url: string,
  expression: string,
): Promise<string> {
  let id = 0;
  const pending = new Map<number, (m: BidiMessage) => void>();
  ws.onmessage = (e) => {
    const m: BidiMessage = JSON.parse(e.data as string);
    if (m.id) pending.get(m.id)?.(m);
  };
  const send = (method: string, params: object): Promise<BidiMessage> =>
    new Promise((r) => {
      ws.send(JSON.stringify({ id: ++id, method, params }));
      pending.set(id, r);
    });
  let session = await send("session.new", { capabilities: {} });
  for (let i = 0; i < 100 && session.type === "error"; i++) {
    await sleep(300);
    session = await send("session.new", { capabilities: {} });
  }
  if (session.type === "error") {
    throw new Error(`BiDi: ${session.message} (restart LibreWolf)`);
  }
  const context = (await send("browsingContext.create", { type: "tab" }))
    .result?.context;
  try {
    await send("browsingContext.navigate", { context, url, wait: "complete" });
    const r = await send("script.evaluate", {
      expression,
      target: { context },
      awaitPromise: true,
    });
    if (r.type === "error" || r.result?.type === "exception") {
      throw new Error(`eval: ${r.message ?? r.result?.exceptionDetails?.text}`);
    }
    return r.result?.result?.value ?? "";
  } finally {
    await send("browsingContext.close", { context });
    await send("session.end", {});
    ws.close();
  }
}

const get = (url: string, accept = "text/html"): Promise<Response> =>
  fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
      "accept-language": "en-US,en;q=0.9",
      accept,
    },
    signal: AbortSignal.timeout(20000),
  });

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
const decode = (s: string): string =>
  s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
    const c = e[1] === "x" || e[1] === "X"
      ? parseInt(e.slice(2), 16)
      : +e.slice(1);
    return c <= 0x10ffff ? String.fromCodePoint(c) : m;
  });
const inline = (html: string): string =>
  decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const firstMatch = (s: string, re: RegExp): string => s.match(re)?.[1] ?? "";

async function httpDdg(q: string): Promise<Result[]> {
  const html = await (await get(
    "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q),
  )).text();
  return html.split('class="result ').slice(1)
    .filter((c) => !c.includes("result--ad"))
    .map((c) => {
      const href = decode(firstMatch(c, /class="result__a" href="([^"]*)"/));
      return {
        url: new URL(href, "https://duckduckgo.com").searchParams.get("uddg") ??
          href,
        title: inline(firstMatch(c, /class="result__a"[^>]*>([\s\S]*?)<\/a>/)),
        snippet: inline(
          firstMatch(c, /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/),
        ),
      };
    });
}

async function httpBing(q: string): Promise<Result[]> {
  const html = await (await get(
    "https://www.bing.com/search?setlang=en&q=" + encodeURIComponent(q),
  )).text();
  return html.split('<li class="b_algo"').slice(1).map((c) => {
    const href = decode(firstMatch(c, /<h2[^>]*><a[^>]*href="([^"]*)"/));
    // Bing wraps results in /ck/a?...&u=a1<base64url target>
    const u = new URL(href, "https://www.bing.com").searchParams.get("u");
    return {
      url: u?.startsWith("a1")
        ? new TextDecoder().decode(
          Uint8Array.fromBase64(u.slice(2), { alphabet: "base64url" }),
        )
        : href,
      title: inline(firstMatch(c, /<h2[^>]*>([\s\S]*?)<\/h2>/)),
      snippet: inline(firstMatch(c, /<p[^>]*>([\s\S]*?)<\/p>/)),
    };
  });
}

const DDG_EXTRACT =
  `JSON.stringify([...document.querySelectorAll(".result:not(.result--ad)")].map(r => {
  const a = r.querySelector(".result__a");
  return { url: new URL(a?.href ?? "", location.href).searchParams.get("uddg") ?? a?.href ?? "",
           title: a?.innerText ?? "", snippet: r.querySelector(".result__snippet")?.innerText ?? "" };
}))`;

async function ddgSearch(q: string, n: number): Promise<void> {
  const ws = await browser();
  let results: Result[] = ws
    ? JSON.parse(
      await librewolfEval(
        ws,
        "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q),
        DDG_EXTRACT,
      ) || "[]",
    )
    : await httpDdg(q);
  if (!ws && !results.length) results = await httpBing(q);
  if (!results.length) {
    console.error(
      ws
        ? "No results — check the LibreWolf window for a CAPTCHA."
        : "No results — DuckDuckGo and Bing returned nothing or blocked this IP.",
    );
    Deno.exit(2);
  }
  results.slice(0, n).forEach((r) =>
    console.log(`${r.url}\n  ${r.title}\n  ${r.snippet}\n`)
  );
}

// Firefox's JSON viewer only renders the raw body after its "Raw Data" tab is clicked
const PAGE_EXTRACT = `document.contentType.includes("json")
  ? (async () => {
    document.querySelector(".tabs-menu-item.rawdata a")?.click();
    for (let i = 0; i < 40 && !document.querySelector("pre.data"); i++) await new Promise(r => setTimeout(r, 50));
    return JSON.stringify({ text: document.querySelector("pre.data")?.textContent ?? document.body.innerText, links: [] });
  })()
  : JSON.stringify({
  text: document.body.innerText,
  links: [...new Map([...document.links]
    .filter(a => a.protocol.startsWith("http") && a.innerText.trim())
    .map(a => [a.href.split("#")[0], a.innerText.trim().replace(/\\s+/g, " ")])).entries()]
})`;

const NON_TEXT =
  /<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi;
const NON_CONTENT = /<(form|select|button|nav|aside)\b[\s\S]*?<\/\1>/gi;
const PAGE_CHROME = /<(header|footer)\b[\s\S]*?<\/\1>/gi;
const BLOCK_TAG =
  /<\/?(br|p|div|tr|ul|ol|table|section|blockquote|dd|dt|h[1-6])\b[^>]*>/gi;

function htmlToPage(html: string, base: string): Page {
  html = html.replace(NON_TEXT, "");
  const body = html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html;
  const content = html.replace(NON_CONTENT, "");
  const region = content.match(/<main\b[\s\S]*<\/main>/i)?.[0] ??
    content.match(/<article\b[\s\S]*<\/article>/i)?.[0] ??
    (content.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? content).replace(
      PAGE_CHROME,
      "",
    );
  const links = new Map<string, string>();
  for (
    const [, href, label] of body.matchAll(
      /<a\b[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )
  ) {
    const text = inline(label);
    if (!text) continue;
    try {
      const u = new URL(decode(href), base);
      if (u.protocol.startsWith("http")) links.set(u.href.split("#")[0], text);
    } catch { /* malformed href */ }
  }
  const pres: string[] = [];
  const text = decode(
    region
      .replace(
        /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi,
        (_, c: string) =>
          `\n\0${pres.push(decode(c.replace(/<[^>]+>/g, "")).trim()) - 1}\0\n`,
      )
      .replace(/\s+/g, " ")
      .replace(
        /<h([1-6])\b[^>]*>/gi,
        (_, l: string) => "\n" + "#".repeat(+l) + " ",
      )
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(BLOCK_TAG, "\n")
      .replace(/<\/?(td|th)\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n[\s]*/g, "\n")
    .replace(/\0(\d+)\0/g, (_, i: string) => "```\n" + pres[+i] + "\n```")
    .trim();
  return { text, links: [...links] };
}

async function httpPage(url: string): Promise<Page> {
  const r = await get(url, "text/markdown, text/html;q=0.9, */*;q=0.8");
  if (!r.ok) console.error(`hint: HTTP ${r.status} from ${r.url}`);
  const body = await r.text();
  return /html/.test(r.headers.get("content-type") ?? "")
    ? htmlToPage(body, r.url)
    : { text: body, links: [] };
}

const MAX_LINKS = 100;

async function fetchPage(url: string, max: number): Promise<void> {
  const ws = await browser();
  const { text, links }: Page = ws
    ? JSON.parse(await librewolfEval(ws, url, PAGE_EXTRACT))
    : await httpPage(url);
  const body = text.replace(/\n\s*\n+/g, "\n").trim();
  const shownLinks = max ? links.slice(0, MAX_LINKS) : links;
  console.log(
    (max ? body.slice(0, max) : body) +
      (shownLinks.length
        ? "\n\n## Links\n" +
          shownLinks.map(([href, label]) => `${href}  ${label}`).join("\n")
        : ""),
  );
  if (body.length < 200) {
    console.error(
      ws
        ? "hint: page nearly empty; it may need login. Ask the user to sign in in the agent LibreWolf window, or try another URL."
        : "hint: page nearly empty; it may need JavaScript or block bots. Retry with fetchPage https://r.jina.ai/<url>, or try another URL.",
    );
  }
  if (max && body.length > max) {
    console.error(
      `hint: text truncated at ${max} of ${body.length} chars; pass a larger max, or 0 for all and pipe through rg.`,
    );
  }
  if (shownLinks.length < links.length) {
    console.error(
      `hint: showing ${shownLinks.length} of ${links.length} links; pass max=0 for all.`,
    );
  }
}

if (cmd === "ddgSearch" && arg) await ddgSearch(arg, +(n ?? 8));
else if (cmd === "fetchPage" && arg) await fetchPage(arg, +(n ?? 20000));
else {
  console.error(
    "usage: web.ts ddgSearch <query> [limit=8] | web.ts fetchPage <url> [max=20000, 0=all]\n" +
      "ddgSearch: url, title, snippet per result\n" +
      "fetchPage: visible text (max chars), then '## Links' (url  label, first 100; max=0 for all)",
  );
  Deno.exit(1);
}
