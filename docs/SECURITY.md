# Security & Privacy Protocol

## 1. Credentials Management
- **NEVER** commit high-entropy strings, API keys, or personal tokens to the repository.
- Use `secrets.json` for local development. This file is explicitly ignored in `.gitignore`.
- For production/CI, use GitHub Secrets or environment variables.

## 2. Local vs Private Repos
- The `config/private/` directory is protected by `.gitignore`. 
- Use this directory for any data exports, logs containing PII, or internal documentation that should not be shared on GitHub.

## 3. Ollama Security
- Ensure your local Ollama instance is not exposed to the public internet (`OLLAMA_HOST=127.0.0.1`).
- The router defaults to `localhost:11434` to ensure traffic stays within the machine loopback.

## 4. Code Exfiltration Protection
- The `shouldUseLocal` function in `llm-router.js` acts as a security filter. 
- Avoid sending proprietary logic to public LLMs by marking sensitive files for "Local Only" processing.

## 5. Audit Trail
- All backups created by the helper (`*.bak`) are local and ignored by git.
- Review `.bak` files frequently to ensure no sensitive data was inadvertently modified.
