> **Archived 2026-09-28.** This early Node.js local-LLM router is superseded by `richardh-TITR/mac-ai-server-Inference-Router` (the current model gateway). Kept read-only as lineage. Audit: zebadee2kk/portfolio-management#69.

# Local LLM Router

Optimize your LLM usage by offloading menial tasks to local Ollama instances.

## Features
- **Routing Logic**: Intelligently decides when to use local vs public LLMs.
- **VS Code Integration**: Built-in tasks for common workflows.
- **Claude Code Ready**: Custom commands for local offloading.
- **Privacy First**: Built-in `.gitignore` and private configuration patterns to protect your secrets.

## Setup

1. **Install Ollama**: Ensure [Ollama](https://ollama.com/) is installed and running.
2. **Pull Models**:
   ```bash
   ollama pull qwen2.5-coder:7b
   ollama pull deepseek-coder:6.7b
   ```
3. **Configure Environment**: (Optional) Create a `.env` for custom URLs or API keys.

## Usage

### VS Code
- Open the Command Palette (`Ctrl+Shift+P`)
- Run `Tasks: Run Task`
- Select `Local LLM: Add Comments` (or other options)

### Command Line
```bash
node scripts/local-llm-helper.js comment path/to/file.js
```

### Claude Code
Run the provided PowerShell scripts in the `.claude/commands` directory.

## Repository Structure
- **Local (Private)**: The main development happens here. Use `.env` or `config/private/` for secrets.
- **Public (GitHub)**: Use this to share the utility code. The `.gitignore` ensures secrets never leave your machine.

---
*Created by Antigravity*
