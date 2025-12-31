/**
 * SECURITY CRITICAL FILE
 * Secrets are loaded ONLY from filesystem mounts.
 * No process.env access is allowed here.
 */

import * as fs from 'fs';
import * as path from 'path';

const CLOUD_RUN_SECRETS_PATH = '/secrets';
const LOCAL_SECRETS_PATH = path.resolve(__dirname, '../../secrets');

const cache = new Map<string, string>();

function getBasePath(): string {
  // Cloud Run: check if any secret mount exists under /secrets
  if (fs.existsSync(CLOUD_RUN_SECRETS_PATH)) {
    return CLOUD_RUN_SECRETS_PATH;
  }
  // Local dev: check for local secrets directory
  if (fs.existsSync(LOCAL_SECRETS_PATH)) {
    return LOCAL_SECRETS_PATH;
  }
  throw new Error('Secrets directory not found');
}

export function getSecret(name: string): string {
  if (cache.has(name)) return cache.get(name)!;

  const basePath = getBasePath();
  let file = path.join(basePath, name);

  // Cloud Run mounts secrets as directories - check for the file inside
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    // Try common patterns: /secrets/NAME/NAME or /secrets/NAME/latest
    const nameFile = path.join(file, name);
    const latestFile = path.join(file, 'latest');
    if (fs.existsSync(nameFile)) {
      file = nameFile;
    } else if (fs.existsSync(latestFile)) {
      file = latestFile;
    }
  }

  const value = fs.readFileSync(file, 'utf8').trim();

  cache.set(name, value);
  return value;
}

export function getSecretJson<T>(name: string): T {
  return JSON.parse(getSecret(name)) as T;
}

/**
 * Check if a secret file exists without reading it.
 * Used for health checks.
 */
export function secretExists(name: string): boolean {
  try {
    const basePath = getBasePath();
    let file = path.join(basePath, name);

    // Cloud Run mounts secrets as directories - check for the file inside
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      const nameFile = path.join(file, name);
      const latestFile = path.join(file, 'latest');
      if (fs.existsSync(nameFile)) {
        file = nameFile;
      } else if (fs.existsSync(latestFile)) {
        file = latestFile;
      }
    }

    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

/**
 * Verifies that all required secrets exist.
 * Throws if any are missing.
 * NEVER logs secret values.
 */
export function verifyRequiredSecrets(names: string[]): void {
  const missing: string[] = [];
  for (const name of names) {
    if (!secretExists(name)) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }
}
