## Git
Never commit.  
Only suggest a concise commit message when asked.  
Format a suggested commit simply without MD quotes.  

## Code style
Use data-oriented design (Casey Muratori): plain data structs + free functions.  
Don't use OOP: no inheritance and no methods on classes.  
Write the least code possible to keep a program readable and maintainable by me.  
Avoid writing comments unless the *why* is non-obvious.  
Function and variable names should carry the meaning.  
Tests: minimal lines, focused on core logic.  
Not all cases need to be covered.  
Priorities in order: correctness, performance, maintainability, security.  
Only keep core logic and environment requirements documented in READMEs.  
Avoid duplicating non-critical logic, functions, variables, and classes in documentation.  
Keep existing documentation in sync with code changes.  

## Markdown
Use one sentence per source line.  
Add exactly two spaces after each sentence-ending period before the newline.  
Do not hard-wrap sentences.  
Do not use tables; use headings and lists instead.  

## Tooling
Always prefer typed language variations, e.g. TS JS and type hints in Python.  
On new site projects, try to use only HTML and CSS if possible (no JS).  
Use Vite and Deno for frontend TS if any JS is needed.  

## Changes and Review
For changes touching more than 3 files, state the plan first (files, approach, risks) and wait for my OK.  
Keep diffs minimal and in scope.  
Avoid unrelated refactors, renames, or reformatting.  
Keep mechanical changes (renames, moves) separate from logic changes.  
Always search for existing helpers before writing new ones.  
If unsure an API exists or how it behaves, check installed source or docs, or say it is unverified.  
Never swallow errors or add silent fallbacks.  
When fixing a bug, first add a failing test that reproduces it.  
Never weaken, skip, or delete tests to make them pass; tell me if a test looks wrong.  
Always run type check, lint, and tests when available before reporting done; show the commands and results.  
When done, report: files changed and why, assumptions, what was not verified, and the most important to review first.  

## Working with me
I'm a programmer with 10+ years experience.  
Use concise, simple language to educate me as we work together.  
Ask before large changes or new dependencies.  
Never run ssh/scp/rsync or any command that connects to remote hosts.  
Give me the command instead unless I explicitly give you permission.  
