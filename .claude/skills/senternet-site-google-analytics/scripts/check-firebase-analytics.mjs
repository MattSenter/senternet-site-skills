#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function printUsage() {
  console.error('Usage: node scripts/check-firebase-analytics.mjs [PROJECT_ID]');
}

function readFirebaseProjectId() {
  const rcPath = path.resolve(process.cwd(), '.firebaserc');
  if (!fs.existsSync(rcPath)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
    const projects = data.projects || {};
    return projects.default || projects.prod || projects.dev || null;
  } catch {
    return null;
  }
}

function getProjectId() {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const value = args[i];
    if (value === '--project' || value === '-p') {
      return args[i + 1] || null;
    }
    if (value.startsWith('--project=')) {
      return value.slice('--project='.length) || null;
    }
    if (!value.startsWith('-')) {
      return value;
    }
  }

  return readFirebaseProjectId();
}

function isSandboxConfigError(error) {
  const message = [
    error?.message,
    error?.stderr?.toString?.(),
    error?.stdout?.toString?.(),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  return (
    message.includes('workspace sandbox') ||
    message.includes('outside the workspace') ||
    message.includes('outside workspace') ||
    message.includes('permission denied') ||
    message.includes('eacces') ||
    message.includes('eperm') ||
    message.includes('cannot access') ||
    message.includes('config directory') ||
    message.includes('~/.config')
  );
}

function getAccessToken() {
  let activeAccount = '';
  try {
    activeAccount = execFileSync('gcloud', ['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = error?.stderr?.toString?.().trim();
    if (stderr) {
      console.error(stderr);
    }
    if (isSandboxConfigError(error)) {
      throw new Error('The sandbox cannot read the active gcloud config under ~/.config. Run gcloud auth login in your terminal, then rerun this check from Step 1a.');
    }
  }

  if (!activeAccount) {
    throw new Error('No active gcloud account found. Run BROWSER=open gcloud auth login, then rerun this check.');
  }

  try {
    return execFileSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = error?.stderr?.toString?.().trim();
    if (stderr) {
      console.error(stderr);
    }
    if (isSandboxConfigError(error)) {
      throw new Error('The sandbox cannot read the active gcloud config under ~/.config. Run gcloud auth login in your terminal, then rerun this check from Step 1a.');
    }
    throw new Error('Failed to get a Google Cloud access token.');
  }
}

async function main() {
  const projectId = getProjectId();
  if (!projectId) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  console.log(`Firebase project ID: ${projectId}`);

  const token = getAccessToken();
  const url = `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}/analyticsDetails`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    const property = data.analyticsProperty || {};
    const streamMappings = Array.isArray(data.streamMappings) ? data.streamMappings : [];
    console.log('Firebase Analytics link: linked');
    if (property.id) {
      console.log(`Analytics property ID: ${property.id}`);
    }
    if (property.displayName) {
      console.log(`Analytics property name: ${property.displayName}`);
    }
    if (property.analyticsAccountId) {
      console.log(`Analytics account ID: ${property.analyticsAccountId}`);
    }
    if (streamMappings.length > 0) {
      console.log(`Analytics stream mappings: ${streamMappings.length}`);
      for (const mapping of streamMappings) {
        if (mapping?.app) {
          console.log(`- App: ${mapping.app}`);
        }
        if (mapping?.streamId) {
          console.log(`  Stream ID: ${mapping.streamId}`);
        }
        if (mapping?.measurementId) {
          console.log(`  Measurement ID: ${mapping.measurementId}`);
        }
      }
    } else {
      console.log('Analytics stream mappings: none');
      console.log('Firebase web stream: missing');
      process.exitCode = 3;
      return;
    }
    process.exitCode = 0;
    return;
  }

  if (response.status === 404) {
    console.log('Firebase Analytics link: not linked');
    process.exitCode = 2;
    return;
  }

  const body = await response.text();
  console.error(`Firebase Analytics check failed: HTTP ${response.status}`);
  if (body) {
    console.error(body);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
