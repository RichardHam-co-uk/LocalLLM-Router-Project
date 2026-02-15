#!/usr/bin/env pwsh
# .claude/commands/local-llm.ps1
param (
    [string]$action,
    [string]$filePath
)

node scripts/local-llm-helper.js $action $filePath
