# Skills

Agent skills for Spotnote: instructions a coding agent loads when the task calls
for them.

| Skill | What it does |
| --- | --- |
| [`spotnote-setup`](spotnote-setup/SKILL.md) | Sets up Spotnote in a Vite app: installs it, adds `spotnote()` to the Vite config, and, if you want, connects your agent through spotnote-mcp. |

## Install

Copy the skill's folder where your agent looks for skills. For Claude Code, for
all your projects:

```bash
git clone --depth 1 https://github.com/harukikuri/spotnote /tmp/spotnote
mkdir -p ~/.claude/skills
cp -r /tmp/spotnote/skills/spotnote-setup ~/.claude/skills/
```

Or for one project only, copy it into that project's `.claude/skills/`.

Then ask your agent: `Set up Spotnote in this app.`
