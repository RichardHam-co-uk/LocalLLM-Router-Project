# Design Document: LLM Router

## Goal
To reduce token burn on public LLMs by automatically identifying "trivial" coding tasks and routing them to high-performance local models like Qwen or DeepSeek via Ollama.

## Architecture
- **Router (llm-router.js)**: A standalone class that manages logic for routing.
- **Helper CLI (scripts/local-llm-helper.js)**: A thin wrapper that allows terminal-based execution, perfect for VS Code tasks or shell scripts.
- **Integration Layer**: Lightweight configuration for VS Code (`tasks.json`) and Claude Code (`.claude/`).

## Decision Logic
The router uses `shouldUseLocal(taskType, codeLength)` to decide:
- **Local**: Formatting, JSDoc, Explanations, Unit test boilerplate for single functions.
- **Public**: Entire project refactoring, complex bug debugging, architectural planning.

## Privacy Model
- **Isolation**: Traffic to `localhost:11434` never leaves the machine.
- **Sanitization**: (Future) Plans to add a filter to strip sensitive strings before sending to any LLM.
