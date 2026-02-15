// llm-router.js
const OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * LLMRouter
 * A utility to route simple LLM tasks to a local Ollama instance.
 */
class LLMRouter {
  constructor(options = {}) {
    this.ollamaUrl = options.ollamaUrl || OLLAMA_BASE_URL;
    this.defaultLocalModel = options.localModel || 'qwen2.5-coder:7b';
    this.temperature = options.temperature || 0.1;
  }

  /**
   * Directly query Ollama
   * @param {string} prompt - The prompt to send
   * @param {string|null} model - Specific model to use, or default
   * @returns {Promise<string>} - The generated response
   */
  async queryOllama(prompt, model = null) {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || this.defaultLocalModel,
          prompt: prompt,
          stream: false,
          options: { temperature: this.temperature }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Failed to connect to Ollama. Is it running?');
      throw error;
    }
  }

  /**
   * Helper to determine if a task should be routed locally
   * @param {string} taskType - Type of task (e.g., 'code_review')
   * @param {number} codeLength - Number of characters in the code
   * @returns {boolean}
   */
  shouldUseLocal(taskType, codeLength = 0) {
    const localTasks = [
      'code_review',
      'comment_generation',
      'simple_refactor',
      'variable_naming',
      'doc_generation',
      'unit_test_simple',
      'format_conversion',
      'regex_help'
    ];

    return localTasks.includes(taskType) && codeLength < 5000; // Increased to 5000 for local coder models
  }

  async generateComments(code, style = 'JSDoc') {
    const prompt = `Add ${style} comments to this code. Provide ONLY the final code with comments. Do not include markdown code blocks or explanations:\n\n${code}`;
    return await this.queryOllama(prompt);
  }

  async simpleRefactor(code, instruction) {
    const prompt = `Refactor the following code based on this instruction: "${instruction}".\n\nCode:\n${code}\n\nOutput only the refactored code. No explanations.`;
    return await this.queryOllama(prompt);
  }

  async suggestVariableNames(context, count = 5) {
    const prompt = `Suggest ${count} concise variable names for: ${context}\nOutput only the names, one per line.`;
    return await this.queryOllama(prompt);
  }

  async generateUnitTests(functionCode, framework = 'jest') {
    const prompt = `Generate ${framework} unit tests for the following code:\n\n${functionCode}\n\nOutput ONLY the test code.`;
    // Using deepseek-coder for tests if available, otherwise default
    return await this.queryOllama(prompt, 'deepseek-coder:6.7b');
  }

  async explainCode(code, detail = 'concise') {
    const prompt = `Provide a ${detail} explanation of this code:\n\n${code}`;
    return await this.queryOllama(prompt);
  }
}

// Export for CommonJS
if (typeof module !== 'undefined') {
  module.exports = LLMRouter;
}
