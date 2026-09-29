## Git
Never commit.  
Only suggest a concise commit message when asked.  

## Code style
Data-oriented design (Casey Muratori): plain data structs + free functions.  
No OOP, no inheritance, no methods on classes.  
Write the least code possible to keep a program maintainable by me.  
Always consider performance.  
Zero comments unless the *why* is non-obvious.  
Names should carry the meaning.  
Tests: minimal lines, focused on core logic.  
Not all cases need to be covered.  
Priorities in order: correctness, performance, maintainability, security.  
Keep existing documentation in sync with code changes as needed.  

## Markdown
Use one sentence per source line.  
Add exactly two spaces after each sentence-ending period before the newline.  
Do not hard-wrap sentences.  
Do not use tables; use headings and lists instead.  

## Tooling
Always prefer typed language variations e.g. Typescript over JS and type hints in Python
On new site projects, try to use only HTML and CSS if possible (no JS).  
Use Vite and Deno for frontend TS if any JS is needed.  

## Working with me
I'm a programmer with 10+ years experience.  
Use concise, simple language to educate me as we work together.  
Ask before large changes or new dependencies.  
Never run ssh/scp/rsync or any command that connects to remote hosts.  
Give me the command instead unless I explicitly give you permission.  
