# GitHub Models Integration Research & Implementation Plan

**Date**: February 24, 2026  
**Purpose**: Enhance LocalLLM-Router-Project with GitHub Models as a free, rate-limited middle tier

---

## Executive Summary

GitHub Models provides free access to premium AI models (GPT-4o, Claude, DeepSeek, Grok) that can serve as a strategic middle layer between our local Ollama instances and paid APIs. This creates a three-tier routing strategy that could significantly increase cost savings beyond the current two-tier system.

**Resource**: [GitHub Models Documentation](https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models)

---

## Current vs Proposed Architecture

### Current Two-Tier System
1. **Local Ollama** (free, unlimited) → menial tasks
2. **Paid APIs** (paid, high-rate) → complex tasks

### Proposed Three-Tier System
1. **Local Ollama** (free, unlimited) → menial/simple tasks
2. **GitHub Models** (free, rate-limited: 15-20 RPM, 150-450 RPD) → medium complexity tasks
3. **Paid APIs** (paid, high-rate) → production/complex tasks only

---

## GitHub Models Overview

### Available Models
- **OpenAI**: GPT-4o, GPT-4o-mini
- **Azure OpenAI**: GPT-4o variants
- **DeepSeek**: DeepSeek-V3
- **xAI**: Grok-beta, Grok-vision-beta
- **Meta**: Llama models
- **Mistral AI**: Various models

### Rate Limits (Free Tier)
- **Without Copilot subscription**: 15 RPM, 150 RPD
- **With Copilot subscription**: 20 RPM, 450 RPD
- Token limits vary by model

### Key Features
- Single API key for all models
- Playground for testing and comparison
- Side-by-side model comparison
- Chat history and preset management
- Compatible with Azure AI Inference SDK

### API Endpoint
```
https://models.inference.ai.azure.com
```

---

## Implementation Plan

### Phase 1: Core Router Enhancement

**File**: `scripts/github-models-router.js` (new)

```javascript
const axios = require('axios');

class GitHubModelsRouter {
  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://models.inference.ai.azure.com';
    
    // Rate limit tracking
    this.requestCounts = {
      'gpt-4o-mini': { count: 0, resetTime: Date.now() + 60000 },
      'deepseek-v3': { count: 0, resetTime: Date.now() + 60000 }
    };
    
    this.rateLimits = {
      'gpt-4o-mini': { rpm: 15, rpd: 150 },
      'deepseek-v3': { rpm: 20, rpd: 450 }
    };
  }

  async routeRequest(prompt, complexity = 'medium') {
    // Step 1: Try local Ollama for simple tasks
    if (complexity === 'low') {
      return await this.callOllama(prompt, 'qwen2.5-coder:7b');
    }

    // Step 2: Try GitHub Models for medium complexity
    if (complexity === 'medium') {
      const availableModel = this.checkGitHubModelsAvailability();
      if (availableModel) {
        try {
          return await this.callGitHubModels(prompt, availableModel);
        } catch (error) {
          console.log('GitHub Models exhausted, falling back to paid API');
        }
      }
    }

    // Step 3: Fall back to paid API for complex or when GitHub Models unavailable
    return await this.callPaidAPI(prompt);
  }

  checkGitHubModelsAvailability() {
    const now = Date.now();
    
    for (const [model, limits] of Object.entries(this.rateLimits)) {
      const tracker = this.requestCounts[model];
      
      // Reset counter if time window passed
      if (now > tracker.resetTime) {
        tracker.count = 0;
        tracker.resetTime = now + 60000;
      }
      
      // Return first available model
      if (tracker.count < limits.rpm) {
        return model;
      }
    }
    
    return null; // All GitHub Models exhausted
  }

  async callGitHubModels(prompt, model) {
    const tracker = this.requestCounts[model];
    tracker.count++;

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        messages: [{ role: 'user', content: prompt }],
        model: model,
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      source: 'github-models',
      model: model,
      content: response.data.choices[0].message.content,
      cost: 0 // Free tier
    };
  }

  async callOllama(prompt, model) {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false
    });

    return {
      source: 'ollama-local',
      model: model,
      content: response.data.response,
      cost: 0
    };
  }

  async callPaidAPI(prompt) {
    // Existing paid API logic
    console.log('Using paid API...');
    return { source: 'paid-api', cost: 0.001 };
  }

  // Complexity analyzer for auto-routing
  analyzeComplexity(prompt) {
    const indicators = {
      low: ['comment', 'format', 'simple', 'basic', 'fix typo', 'rename'],
      high: ['architecture', 'security audit', 'complex', 'refactor entire', 'design system']
    };

    const lowerPrompt = prompt.toLowerCase();
    
    if (indicators.low.some(word => lowerPrompt.includes(word))) {
      return 'low';
    }
    if (indicators.high.some(word => lowerPrompt.includes(word))) {
      return 'high';
    }
    
    return 'medium';
  }

  // Model comparison feature
  async compareModels(prompt) {
    const models = ['gpt-4o-mini', 'deepseek-v3'];
    const results = await Promise.all(
      models.map(m => this.callGitHubModels(prompt, m))
    );
    
    return {
      prompt: prompt,
      responses: results,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { GitHubModelsRouter };
```

### Phase 2: Analytics & Monitoring

**File**: `scripts/github-models-analytics.js` (new)

```javascript
class CostAnalytics {
  constructor() {
    this.metrics = {
      ollamaRequests: 0,
      githubModelsRequests: 0,
      paidAPIRequests: 0,
      estimatedSavings: 0,
      totalTokens: {
        ollama: 0,
        githubModels: 0,
        paidAPI: 0
      }
    };
  }

  logRequest(source, tokenCount = 0) {
    const costPerToken = {
      'ollama-local': 0,
      'github-models': 0, // Free tier
      'paid-api': 0.00002 // Example: GPT-4 pricing
    };

    // Track request count
    const requestKey = `${source.replace('-', '')}Requests`;
    if (this.metrics[requestKey] !== undefined) {
      this.metrics[requestKey]++;
    }

    // Track tokens
    const tokenKey = source.replace('-local', '').replace('-', '');
    if (this.metrics.totalTokens[tokenKey] !== undefined) {
      this.metrics.totalTokens[tokenKey] += tokenCount;
    }

    // Calculate savings from GitHub Models
    if (source === 'github-models') {
      this.metrics.estimatedSavings += tokenCount * costPerToken['paid-api'];
    }
  }

  generateReport() {
    const total = this.metrics.ollamaRequests + 
                  this.metrics.githubModelsRequests + 
                  this.metrics.paidAPIRequests;
    
    if (total === 0) {
      console.log('No requests logged yet.');
      return;
    }

    const githubModelsSavings = 
      (this.metrics.githubModelsRequests / total * 100).toFixed(1);
    const ollamaPercentage = 
      (this.metrics.ollamaRequests / total * 100).toFixed(1);
    const paidPercentage = 
      (this.metrics.paidAPIRequests / total * 100).toFixed(1);

    console.log(`
Cost Optimization Report
========================================
Routing Distribution:
  Local (Ollama):     ${this.metrics.ollamaRequests} requests (${ollamaPercentage}%)
  GitHub Models:      ${this.metrics.githubModelsRequests} requests (${githubModelsSavings}%)
  Paid APIs:          ${this.metrics.paidAPIRequests} requests (${paidPercentage}%)
  
Total Requests:       ${total}
========================================
Token Usage:
  Ollama:             ${this.metrics.totalTokens.ollama.toLocaleString()}
  GitHub Models:      ${this.metrics.totalTokens.githubModels.toLocaleString()}
  Paid API:           ${this.metrics.totalTokens.paidAPI.toLocaleString()}
========================================
Estimated savings from GitHub Models: $${this.metrics.estimatedSavings.toFixed(4)}
    `);
  }

  exportJSON(filepath = './analytics-report.json') {
    const fs = require('fs');
    fs.writeFileSync(filepath, JSON.stringify(this.metrics, null, 2));
    console.log(`Analytics exported to ${filepath}`);
  }
}

module.exports = { CostAnalytics };
```

### Phase 3: Configuration & Environment Setup

**Update `.env.example`**:
```bash
# Existing variables
OLLAMA_URL=http://localhost:11434

# New GitHub Models integration
GITHUB_TOKEN=your_github_personal_access_token_here

# Optional: Paid API fallback
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Required Dependencies**:
```bash
npm install axios dotenv
```

### Phase 4: VS Code Integration

**Add to `.vscode/tasks.json`**:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Local LLM: GitHub Models Status",
      "type": "shell",
      "command": "node",
      "args": ["scripts/github-models-status.js"],
      "problemMatcher": [],
      "group": "none"
    },
    {
      "label": "Local LLM: View Analytics",
      "type": "shell",
      "command": "node",
      "args": ["scripts/view-analytics.js"],
      "problemMatcher": [],
      "group": "none"
    },
    {
      "label": "Local LLM: Compare Models",
      "type": "shell",
      "command": "node",
      "args": ["scripts/compare-models.js", "${input:promptInput}"],
      "problemMatcher": [],
      "group": "none"
    }
  ],
  "inputs": [
    {
      "id": "promptInput",
      "type": "promptString",
      "description": "Enter prompt to compare across models"
    }
  ]
}
```

### Phase 5: Helper Scripts

**File**: `scripts/github-models-status.js` (new)

```javascript
const { GitHubModelsRouter } = require('./github-models-router');

async function checkStatus() {
  const router = new GitHubModelsRouter();
  
  console.log('\\nGitHub Models Status Check\\n');
  console.log('Available Models:');
  
  for (const [model, limits] of Object.entries(router.rateLimits)) {
    const tracker = router.requestCounts[model];
    const remaining = limits.rpm - tracker.count;
    const percentage = (remaining / limits.rpm * 100).toFixed(1);
    
    console.log(`  ${model}:`);
    console.log(`    RPM: ${tracker.count}/${limits.rpm} used (${percentage}% available)`);
    console.log(`    Daily: ${limits.rpd} requests`);
    console.log();
  }
  
  const availableModel = router.checkGitHubModelsAvailability();
  if (availableModel) {
    console.log(`GitHub Models available: ${availableModel}`);
  } else {
    console.log('All GitHub Models rate limits exhausted, will use fallback');
  }
}

checkStatus();
```

---

## Integration with Existing Code

### Update `scripts/local-llm-helper.js`

```javascript
// Add at the top
const { GitHubModelsRouter } = require('./github-models-router');
const { CostAnalytics } = require('./github-models-analytics');

// Initialize
const router = new GitHubModelsRouter();
const analytics = new CostAnalytics();

// Replace existing routing logic with:
async function handleRequest(prompt, options = {}) {
  const complexity = options.complexity || router.analyzeComplexity(prompt);
  
  try {
    const result = await router.routeRequest(prompt, complexity);
    
    // Log for analytics
    analytics.logRequest(result.source, result.tokenCount || 100);
    
    return result;
  } catch (error) {
    console.error('Routing error:', error);
    throw error;
  }
}

// Add analytics report on exit
process.on('exit', () => {
  analytics.generateReport();
});
```

---

## Claude Code Integration

**File**: `.claude/commands/github-models-route.ps1` (new)

```powershell
# Route a prompt through GitHub Models tier
param(
    [Parameter(Mandatory=$true)]
    [string]$Prompt,
    
    [Parameter(Mandatory=$false)]
    [string]$Complexity = "medium"
)

node scripts/github-models-helper.js route "$Prompt" "$Complexity"
```

**File**: `scripts/github-models-helper.js` (new)

```javascript
const { GitHubModelsRouter } = require('./github-models-router');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const router = new GitHubModelsRouter();
  
  switch(command) {
    case 'route':
      const prompt = args[1];
      const complexity = args[2] || 'medium';
      const result = await router.routeRequest(prompt, complexity);
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case 'compare':
      const comparePrompt = args[1];
      const comparison = await router.compareModels(comparePrompt);
      console.log(JSON.stringify(comparison, null, 2));
      break;
      
    case 'status':
      const available = router.checkGitHubModelsAvailability();
      console.log(available ? `Available: ${available}` : 'All models exhausted');
      break;
      
    default:
      console.log('Unknown command. Use: route, compare, or status');
  }
}

main().catch(console.error);
```

---

## Security Considerations

### Token Management
- Store GitHub token in `.env` (already ignored by `.gitignore`)
- Never commit tokens to repository
- Use GitHub Personal Access Token (PAT) with minimal scopes:
  - No specific scopes required for GitHub Models access
  - Standard authentication token is sufficient

### Data Privacy
- GitHub Models processes data within your authenticated GitHub account
- No data sharing with external API providers (unless falling back to paid APIs)
- Maintains privacy-first approach of existing project
- Consider data residency requirements for sensitive codebases

### Rate Limit Security
- Implement exponential backoff for rate limit errors
- Log all rate limit hits for monitoring
- Alert when consistently hitting limits (may need Copilot subscription upgrade)

---

## Testing Strategy

### Unit Tests

**File**: `tests/github-models-router.test.js` (new)

```javascript
const { GitHubModelsRouter } = require('../scripts/github-models-router');

describe('GitHubModelsRouter', () => {
  let router;
  
  beforeEach(() => {
    router = new GitHubModelsRouter();
  });
  
  test('analyzeComplexity identifies low complexity tasks', () => {
    expect(router.analyzeComplexity('Add comments to function')).toBe('low');
    expect(router.analyzeComplexity('Fix typo in variable name')).toBe('low');
  });
  
  test('analyzeComplexity identifies high complexity tasks', () => {
    expect(router.analyzeComplexity('Complete security audit')).toBe('high');
    expect(router.analyzeComplexity('Refactor entire architecture')).toBe('high');
  });
  
  test('analyzeComplexity defaults to medium', () => {
    expect(router.analyzeComplexity('Explain this algorithm')).toBe('medium');
  });
  
  test('checkGitHubModelsAvailability returns model when available', () => {
    const available = router.checkGitHubModelsAvailability();
    expect(available).toBeTruthy();
  });
  
  test('rate limit tracking resets after time window', (done) => {
    router.requestCounts['gpt-4o-mini'].count = 15; // Max out
    router.requestCounts['gpt-4o-mini'].resetTime = Date.now() + 100;
    
    setTimeout(() => {
      const available = router.checkGitHubModelsAvailability();
      expect(available).toBe('gpt-4o-mini');
      done();
    }, 150);
  });
});
```

### Integration Tests

Test scenarios:
1. **Low complexity → Ollama**: Verify simple tasks route to local
2. **Medium complexity → GitHub Models**: Verify mid-tier routes to GitHub
3. **High complexity → Paid API**: Verify complex tasks use paid tier
4. **Rate limit exhaustion**: Verify fallback when GitHub Models exhausted
5. **Model comparison**: Verify side-by-side comparison works

---

## Rollout Plan

### Stage 1: Local Development (Week 1)
- Implement core routing logic
- Add GitHub token to local `.env`
- Test with personal projects
- Validate rate limit tracking

### Stage 2: Analytics Integration (Week 2)
- Add cost tracking
- Implement reporting dashboard
- Export analytics data
- Tune complexity analyzer

### Stage 3: VS Code Integration (Week 3)
- Create VS Code tasks
- Add keyboard shortcuts
- Update documentation
- User acceptance testing

### Stage 4: Claude Code Integration (Week 4)
- PowerShell command scripts
- Test with Claude Code workflows
- Documentation updates
- Final testing

### Stage 5: Production Rollout (Week 5)
- Update README with new features
- Create migration guide
- Monitor performance
- Gather feedback

---

## Expected Benefits

### Cost Savings
- **Current**: ~90% savings (local Ollama vs paid APIs)
- **Projected**: ~95-97% savings (adding free GitHub Models tier)
- **Example**: 1000 medium-complexity requests/day
  - Before: 100 local (free) + 900 paid ($18)
  - After: 100 local (free) + 450 GitHub Models (free) + 450 paid ($9)
  - **Savings: $9/day = $270/month**

### Performance Benefits
- Access to premium models (GPT-4o, Claude) without cost
- Side-by-side model comparison for optimization
- Reduced latency for medium-complexity tasks (GitHub Models faster than local)

### Developer Experience
- Seamless integration with existing workflows
- VS Code task integration
- Analytics dashboard for optimization insights
- Model comparison for quality assessment

---

## Potential Challenges & Mitigations

### Challenge 1: Rate Limits
**Issue**: Free tier limits (15-20 RPM) may be insufficient for high-volume usage  
**Mitigation**: 
- Implement intelligent caching
- Consider Copilot subscription for 450 RPD
- Smart fallback to paid APIs
- Monitor usage patterns

### Challenge 2: Model Selection
**Issue**: Choosing optimal model for each task type  
**Mitigation**:
- Start with conservative complexity analyzer
- Use analytics to tune routing over time
- Implement A/B testing for model selection
- Allow manual override for power users

### Challenge 3: Authentication
**Issue**: Managing GitHub PAT securely  
**Mitigation**:
- Existing `.env` pattern already secure
- Clear documentation on token creation
- Minimal scope requirements
- Token rotation best practices

### Challenge 4: API Compatibility
**Issue**: GitHub Models API may differ from existing paid APIs  
**Mitigation**:
- Use Azure AI Inference SDK standard
- Abstract API calls behind router interface
- Comprehensive error handling
- Fallback mechanisms

---

## Future Enhancements

### Phase 6: Machine Learning Optimization
- Train complexity classifier on actual usage data
- Predict optimal model for specific task types
- Auto-tune rate limit allocation
- Personalized routing based on user patterns

### Phase 7: Advanced Analytics
- Web-based dashboard for analytics
- Real-time cost tracking
- Model performance comparison metrics
- Export to CSV/JSON for external analysis

### Phase 8: Multi-User Support
- Team-wide rate limit pooling
- User-specific routing preferences
- Centralized analytics for team insights
- Role-based model access

---

## References

- [GitHub Models Documentation](https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models)
- [Azure AI Inference SDK](https://learn.microsoft.com/en-us/azure/ai-studio/how-to/develop/inference-sdk)
- [GitHub Models Playground](https://github.com/marketplace/models)
- Current LocalLLM-Router-Project: [README.md](../README.md)

---

## Action Items for Developers

- [ ] Review this implementation plan
- [ ] Create GitHub Personal Access Token
- [ ] Install required dependencies (`axios`, `dotenv`)
- [ ] Implement `github-models-router.js`
- [ ] Implement `github-models-analytics.js`
- [ ] Update `local-llm-helper.js` with new routing logic
- [ ] Add VS Code tasks
- [ ] Create helper scripts
- [ ] Write unit tests
- [ ] Test integration locally
- [ ] Update main README.md
- [ ] Deploy to production

---

**Questions or Feedback**: Open an issue in the repository or contact the maintainer.

**Last Updated**: February 24, 2026
