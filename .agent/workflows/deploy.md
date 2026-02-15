---
description: How to deploy the LLM Router utility to other projects
---

### Steps to Deploy

1. Copy `llm-router.js` to the target project's root or `src/utils` folder.
2. Ensure Ollama is running locally with `qwen2.5-coder` pull.
3. Import the router in your code:
   ```javascript
   const LLMRouter = require('./llm-router');
   const router = new LLMRouter();
   ```
4. (Optional) Copy `.vscode/tasks.json` entries to the target project to enable VS Code shortcut integration.
