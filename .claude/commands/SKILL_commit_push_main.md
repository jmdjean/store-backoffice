# SKILL - Commit & Push (direct to main)

## Objective
Standardize the final git flow when the user asks to commit and push changes.

---

## Required flow
1. Confirm the stage scope is complete.
2. Run lint/tests when available.
3. Review `git status`.
4. Create one clear commit message ending with `[ready]`.
5. Push to `main`.

## Rules
- Use only when the user explicitly asks for commit/push.
- Do not include unrelated files.
- Never use destructive git commands unless explicitly requested.
- The commit summary text must be written in English.

## Example
```bash
git pull
git add <files>
git commit -m "<short summary> [ready]"
git push origin main
```
