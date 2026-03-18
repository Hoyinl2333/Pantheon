# Super Claude Code v4.4 — Complete Demo & Video Guide

## Feature Checklist (All 50+ Features)

### Overview Page (`/`)
- [ ] 6 stat cards (Sessions, Tokens, Active Processes, Teams, Skills, Queued)
- [ ] Active Processes live detection
- [ ] Token Summary with 7-day sparkline trend
- [ ] Recent Sessions grid
- [ ] Quick Actions (jump to Chat, Sessions, Toolbox, Tokens)

### Sessions (`/sessions`)
- [ ] Grid view / List view toggle
- [ ] ClaudeGlance color-coded session states
- [ ] Search by content
- [ ] Date filter + Model filter
- [ ] Star/favorite (persists)
- [ ] Session detail: full conversation with tool calls
- [ ] Card view / Terminal view toggle
- [ ] Markdown export
- [ ] "Open in Chat" button

### Chat (`/chat`)
- [ ] Send message with streaming response
- [ ] Slash commands: type `/` to trigger menu
- [ ] Arrow keys + Enter to select command
- [ ] Shift+Enter for multi-line input
- [ ] Drag & drop file attachment
- [ ] Tool call visualization (thinking → tool_use → text)
- [ ] ESC to cancel generation
- [ ] Execution status bar with timing
- [ ] Provider switcher (Claude / Codex)
- [ ] Model selector (claude-opus-4-6, gpt-5.4, gpt-5.4-fast, etc.)
- [ ] Dual-screen compare mode (Claude vs Codex)
- [ ] Permission mode (default/trust/plan/readOnly)
- [ ] Ctrl+K command palette
- [ ] Code block copy button
- [ ] Table copy (MD/CSV/Excel)

### Tokens (`/tokens`)
- [ ] Area chart with brush zoom
- [ ] Time range: 7d / 14d / 30d / all
- [ ] Model distribution pie chart
- [ ] Table view with pagination
- [ ] CSV export
- [ ] Today / This Week comparison stats

### Skill Tree (`/plugins/skill-tree`)
- [ ] List view: 49+ skills in 8 categories
- [ ] Graph view: React Flow hex nodes with tier bands (T1-T5)
- [ ] Search + status filter (All/Active/Setup/Plan)
- [ ] Category collapse/expand
- [ ] Skill detail panel (click any skill)
- [ ] "Verify Setup" detect button
- [ ] "Scan All" batch verification
- [ ] Dependency warning (amber alert when deps not met)
- [ ] Config fields (experiment-runner: SSH server selector)
- [ ] "Try It" usage examples (green box)
- [ ] "Smart Add" — AI-powered skill creation with dependency inference
- [ ] Custom skill CRUD (add/edit/delete with violet badge)
- [ ] "Open Page" navigation to related SCC page
- [ ] Language switch (EN ↔ CN) affects all labels
- [ ] Tier legend (Core/Basic/Mid/Adv/Expert) in graph view

### ARIS Research (`/plugins/aris-research`)
- [ ] Stage Pipeline: 6-stage research workflow
- [ ] Custom Pipeline: template selection (4 templates)
- [ ] Setup Wizard: research direction + template cards
- [ ] Design Canvas: drag skills from left panel
- [ ] Node connection with edges
- [ ] Node config: parameters + checkpoint toggle
- [ ] Execution Dashboard: live logs + mini DAG + file browser
- [ ] Checkpoint approval (yellow Approve/Reject buttons)
- [ ] Execution Report: auto-generated on completion
- [ ] Report: summary cards + timeline + save to workspace
- [ ] Workspace management (browse output files)
- [ ] Stage-skill sync (auto-update stage status)
- [ ] Exponential backoff polling (3s → 30s)

### Workflow Studio (`/plugins/agent-teams`)
- [ ] 5 preset templates (Pair Programming, TDD Squad, etc.)
- [ ] Team card view with member count
- [ ] Visual canvas editor (React Flow)
- [ ] Drag agent templates from palette
- [ ] Edit member: name, model, system prompt, tools
- [ ] Connect members with edges
- [ ] Auto-layout button
- [ ] Execute team: enter task → watch collaboration
- [ ] Execution history (clock icon → runs panel)
- [ ] Per-agent status in history (expandable)
- [ ] Team CRUD: create, edit, clone, delete
- [ ] i18n (EN/CN)
- [ ] Member validation (name, prompt required)

### API Management (`/plugins/api-management`)
- [ ] Card view of API keys
- [ ] Add key for 15+ providers
- [ ] Validate key (check icon)
- [ ] Query balance & models
- [ ] Usage charts (daily/cumulative)
- [ ] Custom base URL support

### Toolbox (`/toolbox`)
- [ ] 5 tabs: MCP / Skills & Commands / Hooks / Agents / Rules
- [ ] MCP marketplace (14 popular servers)
- [ ] Template store for skills/agents/rules
- [ ] AI Creator: describe → generate SKILL.md
- [ ] Import/Export
- [ ] Run button → Chat integration

### CLAUDE.md Editor (`/editor`)
- [ ] Split editor + preview
- [ ] Create new files
- [ ] Registry support
- [ ] Syntax highlighting

### Settings (`/settings`)
- [ ] General/Bots/Advanced tabs
- [ ] Claude model selector
- [ ] Codex model selector (GPT-5.4, 5.4-fast, o3-pro, etc.)
- [ ] Telegram bot wizard (3-step)
- [ ] Feishu bot wizard
- [ ] Permission mode switcher
- [ ] Language switcher (EN/CN)

### Cross-cutting
- [ ] Dark mode (default)
- [ ] Page transition progress bar
- [ ] Loading skeletons on each page
- [ ] Sidebar navigation with page icons
- [ ] Keyboard shortcuts (1-8 page navigation)
- [ ] Responsive design (resize browser to test)
- [ ] PWA installable

---

## Video Script (4-5 min)

### Scene 1: Opening (15s)
**Shot:** Browser opens http://localhost:3000, Overview page loads
**Narration:** "Super Claude Code — a full-featured management dashboard for Claude Code."
**Action:** Pan across stat cards, quick hover on sparkline

### Scene 2: Chat (45s)
**Shot:** Navigate to Chat page
**Action sequence:**
1. Type "Hello, write me a Python fibonacci function" → Send
2. Show streaming response (thinking → code block)
3. Click copy button on code block
4. Type `/` → show slash command menu → select `/plan`
5. Switch provider to Codex in workspace bar
6. Show model dropdown: GPT-5.4, 5.4-fast, o3-pro

### Scene 3: Skill Tree (60s) ★ HIGHLIGHT
**Shot:** Navigate to Skill Tree
**Action sequence:**
1. Show list view — scroll through 8 categories
2. Click "Scan All" → watch skills turn green one by one
3. Click "Experiment Runner" → show config panel (SSH server dropdown)
4. Select A800-022 → Save → Verify Setup
5. Toggle to Graph view → show hex nodes with tier bands
6. Zoom out to show full tree, hover nodes
7. Click "Smart Add" → type "stock trading" → watch AI analyze
8. Show preview (main skill + dependencies) → confirm
9. New skills appear in tree with violet "Custom" badge
10. Switch language (Globe icon) → entire UI changes to Chinese

### Scene 4: ARIS Research (45s)
**Shot:** Navigate to ARIS Research
**Action sequence:**
1. Click "Custom Pipeline" → choose "Idea Discovery" template
2. Show canvas with 5 connected nodes
3. Click a node → show parameter config
4. Click "Execute" → show execution dashboard
5. Show live logs scrolling, mini DAG updating
6. After completion → show Report tab with timeline

### Scene 5: Workflow Studio (45s)
**Shot:** Navigate to Workflow Studio
**Action sequence:**
1. Show preset gallery → click "Pair Programming"
2. Click canvas icon → show visual editor
3. Drag a new agent from palette → connect it
4. Edit member → change model to GPT-5.4
5. Click Execute → enter "Review this code for bugs"
6. Show agents running sequentially
7. Click clock icon → show execution history

### Scene 6: Supporting Features (30s)
**Shot:** Quick montage
**Action sequence:**
1. Sessions → Grid view → search → star a session (5s)
2. Tokens → chart with brush zoom → CSV export (5s)
3. Toolbox → MCP marketplace → add a server (5s)
4. API Keys → add OpenAI key → validate → show balance (5s)
5. Settings → Telegram bot wizard (5s)
6. Ctrl+K → command palette (5s)

### Scene 7: Closing (15s)
**Shot:** Back to Overview
**Action:** Resize browser to show responsive design
**Final text overlay:** "Super Claude Code v4.4 — github.com/ChenYX24/Super-Claude-Code"

---

## Recording Tips

### Setup
1. **Resolution:** 1920x1080 (browser maximized)
2. **Browser:** Chrome/Edge, dark mode
3. **Dev server running:** `npm run dev` at http://localhost:3000
4. **Data:** Have some existing Claude Code sessions for content
5. **Network:** Stable internet for Claude CLI and Codex calls

### Tools
- **OBS Studio** (recommended): 30fps, 1080p, CRF 18-22
- **Post-production:** DaVinci Resolve (free) or CapCut
- **Speed up** waiting/loading to 2-4x
- **Add captions** for key actions (optional but professional)

### GIF for README
```bash
# Convert video segment to high-quality GIF
ffmpeg -i demo.mp4 -ss 00:00:05 -t 00:00:15 \
  -vf "fps=12,scale=960:-1:flags=lanczos" \
  -gifflags +transdiff demo.gif
```

### Screenshot Capture Checklist
Use browser DevTools > Device Toolbar > 1920x1080:
- [ ] Overview (with stats populated)
- [ ] Chat (with conversation + tool calls visible)
- [ ] Skill Tree list (3+ categories expanded, 1 selected)
- [ ] Skill Tree graph (zoomed out, full tree visible)
- [ ] ARIS canvas (nodes connected, pipeline running)
- [ ] Workflow Studio canvas (3+ members, edges)
- [ ] Tokens chart (with data, zoomed in)
- [ ] Settings (Telegram wizard open)

---

## README Badge Ideas
```markdown
![Version](https://img.shields.io/badge/version-4.4.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/license-MIT-green)
```
