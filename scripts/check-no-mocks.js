#!/usr/bin/env node

/**
 * Quality check script to enforce ZERO mock functionality and ZERO TODOs
 * Per the GOLDEN RULE in CLAUDE.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Patterns to detect mock functionality and TODOs
const FORBIDDEN_PATTERNS = [
  {
    pattern: /TODO:/gi,
    name: 'TODO comments',
    severity: 'error',
  },
  {
    pattern: /FIXME:/gi,
    name: 'FIXME comments',
    severity: 'error',
  },
  {
    pattern: /HACK:/gi,
    name: 'HACK comments',
    severity: 'error',
  },
  {
    pattern: /throw\s+new\s+Error\s*\(\s*['"`].*not\s+implemented/gi,
    name: 'Not implemented errors',
    severity: 'critical',
  },
  {
    pattern: /throw\s+new\s+Error\s*\(\s*['"`].*not\s+yet\s+implemented/gi,
    name: 'Not yet implemented errors',
    severity: 'critical',
  },
  {
    pattern: /\/\/\s*.*not\s+implemented/gi,
    name: 'Not implemented comments',
    severity: 'warning',
  },
  {
    pattern: /\/\/\s*.*temporary/gi,
    name: 'Temporary code comments',
    severity: 'warning',
  },
  {
    pattern: /\/\/\s*.*mock/gi,
    name: 'Mock comments (outside tests)',
    severity: 'warning',
  },
  {
    pattern: /\/\/\s*.*stub/gi,
    name: 'Stub comments',
    severity: 'warning',
  },
  {
    pattern: /\/\/\s*.*placeholder/gi,
    name: 'Placeholder comments',
    severity: 'warning',
  },
  {
    pattern: /\/\/\s*.*dummy/gi,
    name: 'Dummy comments',
    severity: 'warning',
  },
];

// Directories to check (excluding tests)
const DIRECTORIES_TO_CHECK = [
  'src/core',
  'src/grants',
  'src/providers',
  'src/utils',
  'src/cli',
  'src/config',
];

// Files to exclude from checks
const EXCLUDED_FILES = [
  /\.test\.ts$/,
  /\.test\.js$/,
  /\.spec\.ts$/,
  /\.spec\.js$/,
  /\.d\.ts$/,
  /node_modules/,
  /dist/,
  /coverage/,
];

/**
 * Check if a file should be excluded
 */
function shouldExcludeFile(filePath) {
  return EXCLUDED_FILES.some(pattern => pattern.test(filePath));
}

/**
 * Recursively get all TypeScript and JavaScript files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if ((file.endsWith('.ts') || file.endsWith('.js')) && !shouldExcludeFile(filePath)) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Check a file for forbidden patterns
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  FORBIDDEN_PATTERNS.forEach(({ pattern, name, severity }) => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        violations.push({
          file: path.relative(rootDir, filePath),
          line: index + 1,
          content: line.trim(),
          pattern: name,
          severity,
        });
      }
    });
  });

  return violations;
}

/**
 * Main function to run the quality check
 */
function main() {
  console.log(chalk.blue('🔍 Checking for mock functionality and TODOs...\n'));

  let allViolations = [];

  // Check each directory
  DIRECTORIES_TO_CHECK.forEach((dir) => {
    const fullPath = path.join(rootDir, dir);
    const files = getAllFiles(fullPath);

    files.forEach((file) => {
      const violations = checkFile(file);
      allViolations = allViolations.concat(violations);
    });
  });

  // Group violations by severity
  const criticalViolations = allViolations.filter(v => v.severity === 'critical');
  const errorViolations = allViolations.filter(v => v.severity === 'error');
  const warningViolations = allViolations.filter(v => v.severity === 'warning');

  // Display results
  if (criticalViolations.length > 0) {
    console.log(chalk.red.bold('❌ CRITICAL VIOLATIONS (Must be fixed immediately):'));
    criticalViolations.forEach(v => {
      console.log(chalk.red(`  ${v.file}:${v.line} - ${v.pattern}`));
      console.log(chalk.gray(`    ${v.content}`));
    });
    console.log();
  }

  if (errorViolations.length > 0) {
    console.log(chalk.red.bold('❌ ERROR VIOLATIONS (Must be fixed):'));
    errorViolations.forEach(v => {
      console.log(chalk.red(`  ${v.file}:${v.line} - ${v.pattern}`));
      console.log(chalk.gray(`    ${v.content}`));
    });
    console.log();
  }

  if (warningViolations.length > 0) {
    console.log(chalk.yellow.bold('⚠️  WARNING VIOLATIONS (Should be reviewed):'));
    warningViolations.forEach(v => {
      console.log(chalk.yellow(`  ${v.file}:${v.line} - ${v.pattern}`));
      console.log(chalk.gray(`    ${v.content}`));
    });
    console.log();
  }

  // Summary
  const totalViolations = allViolations.length;

  if (totalViolations === 0) {
    console.log(chalk.green.bold('✅ All checks passed! No mock functionality or TODOs found.'));
    console.log(chalk.green('The codebase meets the GOLDEN RULE standards.'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold(`❌ Quality check FAILED!`));
    console.log(chalk.red(`Found ${totalViolations} violation(s):`));
    console.log(chalk.red(`  - Critical: ${criticalViolations.length}`));
    console.log(chalk.red(`  - Errors: ${errorViolations.length}`));
    console.log(chalk.yellow(`  - Warnings: ${warningViolations.length}`));
    console.log();
    console.log(chalk.red.bold('Per the GOLDEN RULE in CLAUDE.md:'));
    console.log(chalk.red('ZERO mock functionality and ZERO TODOs are allowed in production code.'));
    console.log(chalk.red('All violations must be fixed or the code must be removed.'));

    // Exit with error if there are critical or error violations
    if (criticalViolations.length > 0 || errorViolations.length > 0) {
      process.exit(1);
    }
  }
}

// Run the check
main();