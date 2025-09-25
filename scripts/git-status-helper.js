#!/usr/bin/env node

/**
 * Git Status Helper
 * Provides comprehensive information about uncommitted files and why they might be excluded
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

function getGitIgnoredFiles() {
  const gitignorePath = resolve('.gitignore');
  if (!existsSync(gitignorePath)) {
    return [];
  }

  const gitignoreContent = readFileSync(gitignorePath, 'utf8');
  return gitignoreContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.trim());
}

function checkGitStatus() {
  console.log(chalk.blue('\n📊 Git Status Report\n'));
  console.log(chalk.gray('═'.repeat(50)));

  // Get current branch
  const branch = runCommand('git branch --show-current');
  console.log(chalk.cyan('Current Branch:'), branch);

  // Get staged files
  const stagedFiles = runCommand('git diff --name-only --cached');
  if (stagedFiles) {
    console.log(chalk.green('\n✅ Staged files:'));
    stagedFiles.split('\n').forEach(file => {
      console.log(chalk.green(`   + ${file}`));
    });
  } else {
    console.log(chalk.gray('\n📭 No staged files'));
  }

  // Get modified files
  const modifiedFiles = runCommand('git diff --name-only');
  if (modifiedFiles) {
    console.log(chalk.yellow('\n⚠️  Modified files (not staged):'));
    modifiedFiles.split('\n').forEach(file => {
      console.log(chalk.yellow(`   M ${file}`));
    });
  }

  // Get untracked files
  const untrackedFiles = runCommand('git ls-files --others --exclude-standard');
  if (untrackedFiles) {
    console.log(chalk.red('\n❌ Untracked files:'));
    const ignoredPatterns = getGitIgnoredFiles();

    untrackedFiles.split('\n').forEach(file => {
      // Check if file matches any .gitignore pattern
      const isIgnored = ignoredPatterns.some(pattern => {
        // Simple pattern matching (not full gitignore pattern support)
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(file);
        }
        return file.includes(pattern) || file === pattern;
      });

      if (isIgnored) {
        console.log(chalk.gray(`   ? ${file} (matches .gitignore)`));
      } else {
        console.log(chalk.red(`   ? ${file}`));
      }
    });
  }

  // Get ignored files that exist
  const allIgnoredFiles = runCommand('git status --ignored --porcelain | grep "^!!"');
  if (allIgnoredFiles) {
    console.log(chalk.gray('\n🚫 Ignored files (in .gitignore):'));
    allIgnoredFiles.split('\n').forEach(line => {
      const file = line.replace('!! ', '');
      console.log(chalk.gray(`   - ${file}`));
    });
  }

  // Provide recommendations
  console.log(chalk.blue('\n💡 Recommendations:'));
  console.log(chalk.gray('═'.repeat(50)));

  if (modifiedFiles) {
    console.log(chalk.cyan('• Stage modified files:'), 'git add -u');
  }

  if (untrackedFiles) {
    console.log(chalk.cyan('• Stage all changes:'), 'git add .');
    console.log(chalk.cyan('• Stage specific file:'), 'git add <filename>');
  }

  console.log(chalk.cyan('• View detailed diff:'), 'git diff');
  console.log(chalk.cyan('• View staged diff:'), 'git diff --cached');
  console.log(chalk.cyan('• Commit with all tracked changes:'), 'git commit -am "message"');

  console.log('');
}

// Run the status check
checkGitStatus();