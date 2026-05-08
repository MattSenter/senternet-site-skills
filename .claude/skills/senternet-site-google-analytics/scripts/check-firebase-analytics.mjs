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

function getAccessToken() {
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
    throw new Error('Failed to get a Google Cloud access token. Run gcloud auth login first.');
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
