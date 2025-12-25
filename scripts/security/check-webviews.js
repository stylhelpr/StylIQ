#!/usr/bin/env node
/**
 * WebView Security Enforcement Script
 *
 * This script scans the codebase for WebView usage and enforces security requirements:
 * 1. All WebViews MUST use SECURE_WEBVIEW_DEFAULTS or TTS_WEBVIEW_DEFAULTS
 * 2. originWhitelist={['*']} is FORBIDDEN (allows javascript: XSS)
 * 3. createOnShouldStartLoadWithRequest MUST be present on non-TTS WebViews
 * 4. allowFileAccess and allowUniversalAccessFromFileURLs MUST be false/absent
 *
 * Usage: node scripts/security/check-webviews.js
 * Exit code: 0 = pass, 1 = fail
 *
 * @security This is a security-critical file. Changes require security review.
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../../apps/frontend/src');

// ANSI colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function findFilesWithWebView() {
  try {
    const result = execSync(
      `grep -rl "<WebView" "${SRC_DIR}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`,
      {encoding: 'utf8'},
    );
    return result
      .trim()
      .split('\n')
      .filter(f => f.length > 0);
  } catch (e) {
    return [];
  }
}

function extractWebViewBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip commented lines
    if (line.trim().startsWith('//')) continue;

    // Look for actual JSX WebView component: <WebView
    // Must have < before WebView (not useRef<WebView or RefObject<WebView)
    if (!/<WebView\b/.test(line)) continue;

    // Skip type annotations like useRef<WebView> or RefObject<WebView>
    if (/useRef<WebView|RefObject<WebView|React\.RefObject<WebView/.test(line)) continue;

    // Collect the full WebView block
    let blockLines = [line];
    let j = i + 1;

    // Check if it's a self-closing tag on same line
    if (line.includes('/>') && line.indexOf('/>') > line.indexOf('<WebView')) {
      blocks.push({
        startLine: lineNum,
        content: blockLines.join('\n'),
      });
      continue;
    }

    // Collect lines until we find the closing />
    while (j < lines.length) {
      const nextLine = lines[j];
      // Skip commented lines in the middle
      if (!nextLine.trim().startsWith('//')) {
        blockLines.push(nextLine);
        // Check for self-closing end
        if (nextLine.includes('/>')) {
          break;
        }
      }
      j++;

      // Safety limit
      if (blockLines.length > 60) break;
    }

    blocks.push({
      startLine: lineNum,
      content: blockLines.join('\n'),
    });
  }

  return blocks;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(path.join(__dirname, '../..'), filePath);
  const issues = [];

  // Skip the config file that defines the defaults
  if (relativePath.includes('webViewDefaults.ts')) {
    return {
      filePath: relativePath,
      issues: [],
      webViewCount: 0,
      compliant: true,
      isConfigFile: true,
    };
  }

  const blocks = extractWebViewBlocks(content);

  if (blocks.length === 0) {
    return {filePath: relativePath, issues: [], webViewCount: 0, compliant: true};
  }

  for (const block of blocks) {
    const blockContent = block.content;

    // Check for wildcard origin (BLOCKER)
    if (/originWhitelist=\{\s*\[\s*['"]?\*['"]?\s*\]\s*\}/.test(blockContent)) {
      issues.push({
        severity: 'BLOCKER',
        line: block.startLine,
        message: `originWhitelist={['*']} allows javascript: XSS attacks`,
      });
    }

    // Check for secure defaults
    const hasSecureDefaults = /\.\.\.(SECURE_WEBVIEW_DEFAULTS|TTS_WEBVIEW_DEFAULTS)/.test(blockContent);
    const isTtsWebView = /TTS_WEBVIEW_DEFAULTS|createTtsUrlHandler/.test(blockContent);

    if (!hasSecureDefaults) {
      issues.push({
        severity: 'BLOCKER',
        line: block.startLine,
        message: `Missing SECURE_WEBVIEW_DEFAULTS or TTS_WEBVIEW_DEFAULTS spread`,
      });
    }

    // Check for URL handler (required for non-TTS WebViews)
    const hasUrlHandler = /onShouldStartLoadWithRequest\s*=/.test(blockContent);
    if (!isTtsWebView && !hasUrlHandler) {
      issues.push({
        severity: 'HIGH',
        line: block.startLine,
        message: `Missing onShouldStartLoadWithRequest handler`,
      });
    }

    // Check for dangerous file access
    if (/allowFileAccess\s*=\s*\{?\s*true|allowUniversalAccessFromFileURLs\s*=\s*\{?\s*true|allowFileAccessFromFileURLs\s*=\s*\{?\s*true/.test(blockContent)) {
      issues.push({
        severity: 'BLOCKER',
        line: block.startLine,
        message: `Dangerous file access enabled`,
      });
    }
  }

  return {
    filePath: relativePath,
    issues,
    webViewCount: blocks.length,
    compliant: issues.length === 0,
  };
}

function checkForWildcardOriginInActiveCode() {
  // Check for wildcard origin that's NOT in commented code
  try {
    const result = execSync(
      `grep -rn "originWhitelist=.\\['\\*'\\]" "${SRC_DIR}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`,
      {encoding: 'utf8'},
    );

    const lines = result.trim().split('\n').filter(l => l.length > 0);
    // Filter out commented lines (check the actual code content after file:line:)
    const activeMatches = lines.filter(l => {
      const parts = l.split(':');
      if (parts.length >= 3) {
        const codeContent = parts.slice(2).join(':').trim();
        return !codeContent.startsWith('//');
      }
      return false;
    });
    return activeMatches;
  } catch (e) {
    return [];
  }
}

function main() {
  log(colors.bold, '\n========================================');
  log(colors.bold, '  WebView Security Enforcement Check');
  log(colors.bold, '========================================\n');

  const files = findFilesWithWebView();
  let blockerCount = 0;
  let highCount = 0;
  const inventory = [];

  log(colors.blue, `Scanning ${files.length} files with WebView references\n`);

  for (const file of files) {
    const result = analyzeFile(file);

    // Skip config files from inventory display
    if (result.isConfigFile) continue;

    inventory.push(result);

    if (result.issues.length > 0) {
      log(colors.red, `\n${colors.bold}${result.filePath}${colors.reset}${colors.red} (${result.webViewCount} WebView(s))`);

      for (const issue of result.issues) {
        const icon = issue.severity === 'BLOCKER' ? '🚫' : '⚠️';
        log(
          issue.severity === 'BLOCKER' ? colors.red : colors.yellow,
          `  ${icon} [${issue.severity}] Line ${issue.line}: ${issue.message}`,
        );
        if (issue.severity === 'BLOCKER') blockerCount++;
        if (issue.severity === 'HIGH') highCount++;
      }
    } else if (result.webViewCount > 0) {
      log(colors.green, `✅ ${result.filePath} (${result.webViewCount} WebView(s)) - COMPLIANT`);
    }
  }

  // Additional check for wildcard origins in active code
  const wildcardMatches = checkForWildcardOriginInActiveCode();
  if (wildcardMatches.length > 0) {
    log(colors.red, '\n🚫 BLOCKER: Active wildcard originWhitelist found:');
    for (const match of wildcardMatches) {
      log(colors.red, `  ${match}`);
      blockerCount++;
    }
  }

  // Summary table
  log(colors.bold, '\n========================================');
  log(colors.bold, '  WebView Inventory');
  log(colors.bold, '========================================\n');

  console.log('File                                                          | WebViews | Status');
  console.log('--------------------------------------------------------------|----------|--------');
  for (const item of inventory) {
    if (item.webViewCount === 0) continue;
    const status = item.compliant ? '✅ OK' : '❌ FAIL';
    const fileName = item.filePath.padEnd(60).slice(0, 60);
    console.log(`${fileName} | ${String(item.webViewCount).padStart(8)} | ${status}`);
  }

  log(colors.bold, '\n========================================');
  log(colors.bold, '  Final Result');
  log(colors.bold, '========================================\n');

  if (blockerCount > 0 || highCount > 0) {
    log(colors.red, `❌ FAILED: ${blockerCount} BLOCKER(s), ${highCount} HIGH issue(s) found`);
    log(colors.red, '\nYou MUST fix all issues before merging.\n');
    process.exit(1);
  } else {
    log(colors.green, '✅ PASSED: All WebViews are properly secured\n');
    process.exit(0);
  }
}

main();
