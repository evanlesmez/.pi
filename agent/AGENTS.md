## Git
Never commit.  
Only suggest a concise commit message when asked, as plain text with no code fences.  

## Code style
Use data-oriented design (Casey Muratori): fat data structs + free functions, not many small objects.  
Structs are dataclasses, TypedDict, interfaces, or similar; no inheritance, methods, or private members on our own classes (third-party OOP APIs are fine).  
Write the least code that stays readable.  
Prefer early returns over nested conditionals.  
Validate inputs at boundaries (CLI args, requests, file parsing, public entry points); trust internal calls and skip defensive checks on them.  
Don't copy data just for immutability's sake; mutate in place.  
Reuse an existing helper when one fits; don't write a new one until the logic is used three times.  
Prefer the standard library over a dependency.  
Names carry the meaning; comment only when a *why* is non-obvious.  
Keep tests small and readable; prioritize core behavior, failure paths, and regressions.  
Priorities in order: correctness, performance, maintainability; significant performance gains justify some maintainability loss.  
Treat security as a constraint when handling credentials, untrusted input, or user data.  
READMEs cover only core logic and environment requirements; keep them in sync with code changes.  

## Markdown
Use one sentence per source line.  
Add exactly two spaces at the end of each non-heading line.  
Do not use tables; use headings and lists instead.  

## Tooling
Always prefer typed language variations, e.g. TypeScript over JavaScript and type hints in Python.  
On new site projects, try to use only HTML and CSS if possible (no JS).  
For frontend TS, use Node as the build runtime with Vite, pnpm, and Biome.  
For servers, prefer Go; use Rust only for latency-critical or systems-level components.  

## Changes and Review
Before touching more than 3 files, adding a dependency, or any destructive or architectural change, state the plan (files, approach, risks) and wait for my OK.  
If the task is ambiguous, fold questions into the plan; if no plan is needed, ask one question or proceed and list assumptions.  
Keep diffs minimal and in scope.  
Avoid unrelated refactors, renames, or reformatting.  
Keep mechanical changes (renames, moves) separate from logic changes.  
If unsure an API exists or how it behaves, check installed source or docs, or say it is unverified.  
Never swallow errors or add silent fallbacks; if the spec needs a fallback, say so explicitly.  
For bug fixes, add a regression test and confirm it fails before the fix when practical; otherwise explain how the bug and fix were verified.  
Never weaken, skip, or delete tests to make them pass; tell me if a test looks wrong.  
Always run type check, lint, and tests when available before reporting done; show the commands, results, and anything skipped.  
Report only: files changed and why, assumptions, what was not verified, highest-risk part first; don't narrate the diff.  

## Working with me
My goal is to learn and own the code, not just receive it.  
Use concise, simple language to educate me as we work together.  
Explain the why behind non-obvious choices, and name the concept or pattern so I can look it up.  
Prefer code I can read and maintain over clever code; if a clever version is clearly better, explain the tradeoff.  
For design decisions, give me options with tradeoffs and a recommendation instead of silently picking one.  
If my request suggests a misconception, correct it briefly.  
After non-trivial changes, list the one to three things I need to understand to maintain the code.  
Keep teaching brief and skip what I clearly already know.  
Never run ssh/scp/rsync, package downloads, or remote Git operations unless I've already given permission; give me the command instead.  
Fetching documentation and running networked tests need no permission.  
