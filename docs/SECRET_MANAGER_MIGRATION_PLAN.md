# Secret Manager Migration Plan

## FAANG-Grade Production Migration: Cloud Run Env Vars → GCP Secret Manager (File-Based Mounts)

**Date:** 2025-12-31
**Status:** IMPLEMENTED
**Target:** Investor-grade security posture, App Store release appropriate

---

## IMPLEMENTATION STATUS

All code changes have been completed. The following files were modified:

### Core Secrets Module
- `apps/backend-nest/src/config/secrets.ts` - **CREATED** - Centralized secrets module

### Updated Services (process.env → getSecret)
- `apps/backend-nest/src/main.ts` - Removed dotenv, added secrets verification
- `apps/backend-nest/src/db/pool.ts` - Lazy initialization with secrets
- `apps/backend-nest/src/utils/redisClient.ts` - Lazy initialization with secrets
- `apps/backend-nest/src/pinecone/pineconeUtils.ts` - Lazy initialization with secrets
- `apps/backend-nest/src/auth/jwt.strategy.ts` - Uses secrets module
- `apps/backend-nest/src/vertex/vertex.service.ts` - Uses secrets module for GCP
- `apps/backend-nest/src/notifications/notifications.service.ts` - Lazy Firebase init with secrets
- `apps/backend-nest/src/ai/ai.service.ts` - Removed custom dotenv loader, uses secrets
- `apps/backend-nest/src/ai/ai.controller.ts` - Uses secrets module
- `apps/backend-nest/src/product-services/product-search.service.ts` - Uses secrets module
- `apps/backend-nest/src/product-services/shopby-product-search.service.ts` - Uses secrets module
- `apps/backend-nest/src/services/discover.service.ts` - Uses secrets module
- `apps/backend-nest/src/shopping/shopping.controller.ts` - Uses secrets module
- `apps/backend-nest/src/upload/upload.service.ts` - Uses secrets module
- `apps/backend-nest/src/profile-upload/profile-upload.service.ts` - Uses secrets module
- `apps/backend-nest/src/wardrobe/wardrobe.service.ts` - Uses secrets module

### Configuration
- `apps/backend-nest/.gitignore` - Added `secrets/` directory

---

---

## 1. REPO AUDIT FINDINGS

### 1.1 Current Secret Access Patterns

The codebase currently uses **`process.env.*`** directly across 35+ files with **60+ unique secret/config references**. This violates the target architecture requirement of `fs.readFileSync` from mounted secret files.

### 1.2 Categorized Inventory

#### Category A: MUST CHANGE (Secrets - Critical Priority)

These are actual secrets that MUST be migrated to Secret Manager with file mounts:

| Secret Name | Current Pattern | Files Using | Priority |
|------------|-----------------|-------------|----------|
| `DATABASE_URL` | `process.env.DATABASE_URL` | `pool.ts:144`, `insert-test-data.ts:7` | P0 |
| `PINECONE_API_KEY` | `process.env.PINECONE_API_KEY!` | `pineconeUtils.ts:4` | P0 |
| `OPENAI_API_KEY` | `process.env.OPENAI_API_KEY` | `ai.service.ts:39` (+ custom loader) | P0 |
| `OPENAI_PROJECT_ID` | `process.env.OPENAI_PROJECT_ID` | `ai.service.ts:40` | P0 |
| `GOOGLE_APPLICATION_CREDENTIALS` | `process.env.GOOGLE_APPLICATION_CREDENTIALS!` | `vertex.service.ts:192`, `notifications.service.ts:19` | P0 |
| `FIREBASE_SERVICE_ACCOUNT` | `process.env.FIREBASE_SERVICE_ACCOUNT` | `notifications.service.ts:18` | P0 |
| `NOTIFICATIONS_FIREBASE2` | `process.env.NOTIFICATIONS_FIREBASE2` | `notifications.service.ts:16` | P0 |
| `NOTIFICATIONS_FIREBASE` | `process.env.NOTIFICATIONS_FIREBASE` | `notifications.service.ts:17` | P0 |
| `UPSTASH_REDIS_REST_URL` | `process.env.UPSTASH_REDIS_REST_URL!` | `redisClient.ts:5` | P0 |
| `UPSTASH_REDIS_REST_TOKEN` | `process.env.UPSTASH_REDIS_REST_TOKEN!` | `redisClient.ts:6` | P0 |
| `RAPIDAPI_KEY` | `process.env.RAPIDAPI_KEY` | `product-search.service.ts:27`, `shopby-product-search.service.ts:17`, `shopping.controller.ts:18`, `ai.service.ts:3199` | P0 |
| `SERPAPI_KEY` | `process.env.SERPAPI_KEY` | `product-search.service.ts:28`, `discover.service.ts:53`, `ai.controller.ts:113,280`, `ai.service.ts:885` | P0 |
| `AUTH0_ISSUER` | `process.env.AUTH0_ISSUER` | `jwt.strategy.ts:17,19` | P0 |
| `AUTH0_AUDIENCE` | `process.env.AUTH0_AUDIENCE` | `jwt.strategy.ts:20` | P0 |
| `TOMORROW_API_KEY` | `process.env.TOMORROW_API_KEY` | `ai.service.ts:126` | P0 |
| `UNSPLASH_ACCESS_KEY` | `process.env.UNSPLASH_ACCESS_KEY` | `ai.service.ts:3000` | P0 |
| `ANTHROPIC_KEY` | `process.env.ANTHROPIC_KEY` | `.env` (not found in code, may be unused) | P1 |

**OAuth Client Secrets (via ConfigService - Better Pattern):**

| Secret Name | Current Pattern | Files Using | Priority |
|------------|-----------------|-------------|----------|
| `<PLATFORM>_CLIENT_ID` | `configService.get()` | `oauth.service.ts:32,169` | P0 |
| `<PLATFORM>_CLIENT_SECRET` | `configService.get()` | `oauth.service.ts:33,170` | P0 |

Platforms: INSTAGRAM, TIKTOK, PINTEREST, THREADS, TWITTER, FACEBOOK, LINKEDIN

#### Category B: OPTIONAL CLEANUP (Config Values)

These are configuration values with sensible defaults - can remain as env vars or migrate for consistency:

| Config Name | Current Pattern | Files Using | Notes |
|------------|-----------------|-------------|-------|
| `GCS_BUCKET` / `GCS_BUCKET_NAME` | `process.env.GCS_BUCKET` | `product-search.service.ts:30`, `upload.service.ts:15`, `wardrobe.service.ts:2579` | Has hardcoded default |
| `GCS_PROFILE_BUCKET` | `process.env.GCS_PROFILE_BUCKET` | `profile-upload.service.ts:12` | Has default |
| `FIREBASE_PROJECT_ID` | `process.env.FIREBASE_PROJECT_ID` | `notifications.service.ts:21` | Not secret |
| `FIREBASE_MESSAGING_SENDER_ID` | `process.env.FIREBASE_MESSAGING_SENDER_ID` | `notifications.service.ts:22` | Not secret |
| `IOS_BUNDLE_ID` | `process.env.IOS_BUNDLE_ID` | `notifications.service.ts:23` | Not secret |
| `GCP_REGION` | `process.env.GCP_REGION` | `vertex.service.ts:197` | Has default |
| `VERTEX_*_MODEL` | `process.env.VERTEX_*_MODEL` | `vertex.service.ts:150-156` | Has defaults |
| `VERTEX_MAX_CONCURRENT` | `process.env.VERTEX_MAX_CONCURRENT` | `vertex.service.ts:161` | Has default |
| `PINECONE_INDEX` | `process.env.PINECONE_INDEX!` | `pineconeUtils.ts:7` | Config, not secret |
| `PC_DIMS` | `process.env.PC_DIMS` | `pineconeUtils.ts:10` | Has default |

#### Category C: SAFE / NO CHANGE (Runtime Config)

These are runtime configuration that should remain as env vars (set by Cloud Run platform):

| Config Name | Current Pattern | Files Using | Reason |
|------------|-----------------|-------------|--------|
| `PORT` | `process.env.PORT` | `main.ts:85` | Cloud Run sets this |
| `NODE_ENV` | `process.env.NODE_ENV` | `main.ts:88`, `pool.ts:121,175`, `wardrobe.service.ts:1528`, `scoring.ts:251` | Runtime detection |
| `FASTIFY_LOG_LEVEL` | `process.env.FASTIFY_LOG_LEVEL` | `main.ts:35` | Ops config |
| `SCHEDULE_NOTIFIER_INTERVAL_MS` | `process.env.SCHEDULE_NOTIFIER_INTERVAL_MS` | `main.ts:96` | Ops config |
| `DISABLE_FEEDBACK` | `process.env.DISABLE_FEEDBACK` | `wardrobe.service.ts:1123` | Feature flag |
| `USE_VERTEX` | `process.env.USE_VERTEX` | `ai.service.ts:207` | Feature flag |
| `DEFAULT_GENDER` | `process.env.DEFAULT_GENDER` | `ai.service.ts:600` | Config |
| `STYLE_DEBUG` | `process.env.STYLE_DEBUG` | `style.ts:170` | Debug flag |
| `WEATHER_DEBUG` | `process.env.WEATHER_DEBUG` | `weather.ts:48` | Debug flag |

### 1.3 Critical Anti-Patterns Found

1. **Module-level `process.env` access** (`redisClient.ts:5-6`, `pineconeUtils.ts:4,7`)
   - These execute BEFORE NestJS bootstraps
   - Cannot be replaced with dependency injection
   - Requires special handling with lazy initialization

2. **Custom dotenv loader** (`ai.service.ts:14-43`)
   - `loadOpenAISecrets()` manually parses `.env` files
   - Completely bypasses any config system
   - MUST be removed

3. **Non-null assertions on secrets** (`!` operator)
   - `process.env.RAPIDAPI_KEY!` in `shopping.controller.ts:18`
   - `process.env.PINECONE_API_KEY!` in `pineconeUtils.ts:4`
   - These will crash at runtime if secrets are missing

4. **Service Account JSON files referenced by path**
   - `vertex.service.ts:192` reads `GOOGLE_APPLICATION_CREDENTIALS` as file path
   - `notifications.service.ts:33` reads Firebase credential JSON from path
   - These patterns need special handling - mount the JSON content directly

---

## 2. TARGET ARCHITECTURE

### 2.1 Secrets Module Design

**File:** `apps/backend-nest/src/config/secrets.ts`

```typescript
// apps/backend-nest/src/config/secrets.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * Production-grade secrets accessor using file-based mounts from GCP Secret Manager.
 *
 * In production (Cloud Run): Secrets mounted at /secrets/<SECRET_NAME>
 * In development: Falls back to ./secrets/<SECRET_NAME> directory
 *
 * NO process.env access. NO dotenv. File-based only.
 */

const SECRETS_BASE_PATH = process.env.SECRETS_PATH || '/secrets';
const LOCAL_SECRETS_PATH = './secrets';

// Cached secret values to avoid repeated disk reads
const secretCache = new Map<string, string>();

/**
 * Determines the secrets directory path.
 * Production: /secrets (Cloud Run mount)
 * Development: ./secrets (local directory)
 */
function getSecretsBasePath(): string {
  if (fs.existsSync(SECRETS_BASE_PATH)) {
    return SECRETS_BASE_PATH;
  }
  if (fs.existsSync(LOCAL_SECRETS_PATH)) {
    return LOCAL_SECRETS_PATH;
  }
  throw new Error(
    `Secrets directory not found. Expected ${SECRETS_BASE_PATH} or ${LOCAL_SECRETS_PATH}`
  );
}

/**
 * Read a secret from the mounted secrets directory.
 * Throws if secret is missing and no default provided.
 */
export function getSecret(name: string, defaultValue?: string): string {
  // Check cache first
  if (secretCache.has(name)) {
    return secretCache.get(name)!;
  }

  const basePath = getSecretsBasePath();
  const secretPath = path.join(basePath, name);

  try {
    const value = fs.readFileSync(secretPath, 'utf8').trim();
    secretCache.set(name, value);
    return value;
  } catch (err: any) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(
      `Secret "${name}" not found at ${secretPath}. ` +
      `Ensure the secret is mounted in Cloud Run or exists in ${LOCAL_SECRETS_PATH}/`
    );
  }
}

/**
 * Read a JSON secret (e.g., service account credentials).
 * Returns parsed JSON object.
 */
export function getSecretJson<T = unknown>(name: string): T {
  const content = getSecret(name);
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Secret "${name}" is not valid JSON`);
  }
}

/**
 * Check if a secret exists without throwing.
 */
export function hasSecret(name: string): boolean {
  try {
    getSecret(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear the secret cache (useful for testing).
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

// ============================================================
// NAMED SECRET ACCESSORS (Type-safe, documented)
// ============================================================

// Database
export const getDatabaseUrl = () => getSecret('DATABASE_URL');

// Auth0
export const getAuth0Issuer = () => getSecret('AUTH0_ISSUER');
export const getAuth0Audience = () => getSecret('AUTH0_AUDIENCE');

// AI Services
export const getOpenAIApiKey = () => getSecret('OPENAI_API_KEY');
export const getOpenAIProjectId = () => getSecret('OPENAI_PROJECT_ID', '');
export const getTomorrowApiKey = () => getSecret('TOMORROW_API_KEY');
export const getAnthropicKey = () => getSecret('ANTHROPIC_KEY', '');

// Vector/Embeddings
export const getPineconeApiKey = () => getSecret('PINECONE_API_KEY');

// Product Search APIs
export const getRapidApiKey = () => getSecret('RAPIDAPI_KEY');
export const getSerpApiKey = () => getSecret('SERPAPI_KEY');

// Redis
export const getRedisUrl = () => getSecret('UPSTASH_REDIS_REST_URL');
export const getRedisToken = () => getSecret('UPSTASH_REDIS_REST_TOKEN');

// Unsplash
export const getUnsplashAccessKey = () => getSecret('UNSPLASH_ACCESS_KEY');

// GCP Service Account (JSON)
export const getGcpServiceAccount = () => getSecretJson('GCP_SERVICE_ACCOUNT_JSON');

// Firebase Service Account (JSON)
export const getFirebaseServiceAccount = () => getSecretJson('FIREBASE_SERVICE_ACCOUNT_JSON');

// OAuth Client Credentials (dynamic platform lookup)
export const getOAuthClientId = (platform: string) =>
  getSecret(`${platform.toUpperCase()}_CLIENT_ID`);
export const getOAuthClientSecret = (platform: string) =>
  getSecret(`${platform.toUpperCase()}_CLIENT_SECRET`);
```

### 2.2 Local Development Setup

**Local secrets directory structure:**

```
apps/backend-nest/
├── secrets/                      # Local development secrets (gitignored)
│   ├── DATABASE_URL              # Plain text file: postgresql://...
│   ├── PINECONE_API_KEY          # Plain text file: pcsk_...
│   ├── OPENAI_API_KEY            # Plain text file: sk-proj-...
│   ├── OPENAI_PROJECT_ID         # Plain text file: proj_...
│   ├── AUTH0_ISSUER              # Plain text file: https://...
│   ├── AUTH0_AUDIENCE            # Plain text file: https://...
│   ├── RAPIDAPI_KEY              # Plain text file
│   ├── SERPAPI_KEY               # Plain text file
│   ├── UPSTASH_REDIS_REST_URL    # Plain text file
│   ├── UPSTASH_REDIS_REST_TOKEN  # Plain text file
│   ├── TOMORROW_API_KEY          # Plain text file
│   ├── UNSPLASH_ACCESS_KEY       # Plain text file
│   ├── GCP_SERVICE_ACCOUNT_JSON  # Full JSON content
│   ├── FIREBASE_SERVICE_ACCOUNT_JSON # Full JSON content
│   ├── INSTAGRAM_CLIENT_ID       # OAuth
│   ├── INSTAGRAM_CLIENT_SECRET   # OAuth
│   └── ... (other OAuth secrets)
├── src/
└── ...
```

**Add to `.gitignore`:**

```
# Local secrets directory (NEVER commit)
secrets/
```

### 2.3 NestJS ConfigModule Integration (Optional)

For non-secret config values, continue using ConfigModule but load from secrets module for secrets:

```typescript
// apps/backend-nest/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as secrets from './config/secrets';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load non-secret config from env vars
      load: [() => ({
        port: parseInt(process.env.PORT || '3001', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        fastifyLogLevel: process.env.FASTIFY_LOG_LEVEL || 'error',
        // ... other non-secret config
      })],
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

---

## 3. GCP / CLOUD RUN CHANGES

### 3.1 Secret Manager Secret Names

**Naming Convention:** `STYLIQ_<CATEGORY>_<NAME>` (uppercase snake case)

| Secret Manager Name | Mount Path | Description |
|--------------------|------------|-------------|
| `STYLIQ_DB_DATABASE_URL` | `/secrets/DATABASE_URL` | PostgreSQL connection string |
| `STYLIQ_AUTH0_ISSUER` | `/secrets/AUTH0_ISSUER` | Auth0 domain URL |
| `STYLIQ_AUTH0_AUDIENCE` | `/secrets/AUTH0_AUDIENCE` | Auth0 API audience |
| `STYLIQ_AI_OPENAI_API_KEY` | `/secrets/OPENAI_API_KEY` | OpenAI API key |
| `STYLIQ_AI_OPENAI_PROJECT_ID` | `/secrets/OPENAI_PROJECT_ID` | OpenAI project ID |
| `STYLIQ_AI_TOMORROW_API_KEY` | `/secrets/TOMORROW_API_KEY` | Tomorrow.io weather API |
| `STYLIQ_AI_ANTHROPIC_KEY` | `/secrets/ANTHROPIC_KEY` | Anthropic Claude API |
| `STYLIQ_VECTOR_PINECONE_API_KEY` | `/secrets/PINECONE_API_KEY` | Pinecone vector DB |
| `STYLIQ_SEARCH_RAPIDAPI_KEY` | `/secrets/RAPIDAPI_KEY` | RapidAPI for product search |
| `STYLIQ_SEARCH_SERPAPI_KEY` | `/secrets/SERPAPI_KEY` | SerpAPI for Google Shopping |
| `STYLIQ_REDIS_URL` | `/secrets/UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `STYLIQ_REDIS_TOKEN` | `/secrets/UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `STYLIQ_MEDIA_UNSPLASH_KEY` | `/secrets/UNSPLASH_ACCESS_KEY` | Unsplash API |
| `STYLIQ_GCP_SERVICE_ACCOUNT` | `/secrets/GCP_SERVICE_ACCOUNT_JSON` | GCP service account JSON |
| `STYLIQ_FIREBASE_SERVICE_ACCOUNT` | `/secrets/FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase admin JSON |
| `STYLIQ_OAUTH_INSTAGRAM_CLIENT_ID` | `/secrets/INSTAGRAM_CLIENT_ID` | Instagram OAuth |
| `STYLIQ_OAUTH_INSTAGRAM_CLIENT_SECRET` | `/secrets/INSTAGRAM_CLIENT_SECRET` | Instagram OAuth |
| ... | ... | (Repeat for all OAuth platforms) |

### 3.2 Cloud Run Service Configuration

**gcloud CLI commands to create secrets and configure Cloud Run:**

```bash
# ============================================================
# STEP 1: Create secrets in Secret Manager
# ============================================================

# Database
echo -n 'postgresql://...' | gcloud secrets create STYLIQ_DB_DATABASE_URL --data-file=-

# Auth0
echo -n 'https://your-tenant.auth0.com/' | gcloud secrets create STYLIQ_AUTH0_ISSUER --data-file=-
echo -n 'https://api.stylhelpr.com' | gcloud secrets create STYLIQ_AUTH0_AUDIENCE --data-file=-

# AI Services
echo -n 'sk-proj-...' | gcloud secrets create STYLIQ_AI_OPENAI_API_KEY --data-file=-
echo -n 'proj_...' | gcloud secrets create STYLIQ_AI_OPENAI_PROJECT_ID --data-file=-
echo -n '...' | gcloud secrets create STYLIQ_AI_TOMORROW_API_KEY --data-file=-

# Vector DB
echo -n 'pcsk_...' | gcloud secrets create STYLIQ_VECTOR_PINECONE_API_KEY --data-file=-

# Search APIs
echo -n '...' | gcloud secrets create STYLIQ_SEARCH_RAPIDAPI_KEY --data-file=-
echo -n '...' | gcloud secrets create STYLIQ_SEARCH_SERPAPI_KEY --data-file=-

# Redis
echo -n 'https://...' | gcloud secrets create STYLIQ_REDIS_URL --data-file=-
echo -n 'AUod...' | gcloud secrets create STYLIQ_REDIS_TOKEN --data-file=-

# Media APIs
echo -n '...' | gcloud secrets create STYLIQ_MEDIA_UNSPLASH_KEY --data-file=-

# Service Account JSONs (from file)
gcloud secrets create STYLIQ_GCP_SERVICE_ACCOUNT --data-file=./stylhelpr-prod-12ff0cbcc3ed.json
gcloud secrets create STYLIQ_FIREBASE_SERVICE_ACCOUNT --data-file=./stylhelpr-prod-85685-7ca9f2f2ded8.json

# OAuth (repeat for each platform)
echo -n 'client_id_here' | gcloud secrets create STYLIQ_OAUTH_INSTAGRAM_CLIENT_ID --data-file=-
echo -n 'client_secret_here' | gcloud secrets create STYLIQ_OAUTH_INSTAGRAM_CLIENT_SECRET --data-file=-
# ... repeat for TIKTOK, PINTEREST, THREADS, TWITTER, FACEBOOK, LINKEDIN

# ============================================================
# STEP 2: Grant Cloud Run service account access
# ============================================================

SERVICE_ACCOUNT="your-service-account@project.iam.gserviceaccount.com"

# Grant secretAccessor role to all secrets
gcloud secrets add-iam-policy-binding STYLIQ_DB_DATABASE_URL \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# ... repeat for each secret (or use a loop)

# ============================================================
# STEP 3: Update Cloud Run service with secret mounts
# ============================================================

gcloud run services update styliq-backend \
  --region=us-central1 \
  --update-secrets="/secrets/DATABASE_URL=STYLIQ_DB_DATABASE_URL:latest" \
  --update-secrets="/secrets/AUTH0_ISSUER=STYLIQ_AUTH0_ISSUER:latest" \
  --update-secrets="/secrets/AUTH0_AUDIENCE=STYLIQ_AUTH0_AUDIENCE:latest" \
  --update-secrets="/secrets/OPENAI_API_KEY=STYLIQ_AI_OPENAI_API_KEY:latest" \
  --update-secrets="/secrets/OPENAI_PROJECT_ID=STYLIQ_AI_OPENAI_PROJECT_ID:latest" \
  --update-secrets="/secrets/TOMORROW_API_KEY=STYLIQ_AI_TOMORROW_API_KEY:latest" \
  --update-secrets="/secrets/PINECONE_API_KEY=STYLIQ_VECTOR_PINECONE_API_KEY:latest" \
  --update-secrets="/secrets/RAPIDAPI_KEY=STYLIQ_SEARCH_RAPIDAPI_KEY:latest" \
  --update-secrets="/secrets/SERPAPI_KEY=STYLIQ_SEARCH_SERPAPI_KEY:latest" \
  --update-secrets="/secrets/UPSTASH_REDIS_REST_URL=STYLIQ_REDIS_URL:latest" \
  --update-secrets="/secrets/UPSTASH_REDIS_REST_TOKEN=STYLIQ_REDIS_TOKEN:latest" \
  --update-secrets="/secrets/UNSPLASH_ACCESS_KEY=STYLIQ_MEDIA_UNSPLASH_KEY:latest" \
  --update-secrets="/secrets/GCP_SERVICE_ACCOUNT_JSON=STYLIQ_GCP_SERVICE_ACCOUNT:latest" \
  --update-secrets="/secrets/FIREBASE_SERVICE_ACCOUNT_JSON=STYLIQ_FIREBASE_SERVICE_ACCOUNT:latest" \
  --update-secrets="/secrets/INSTAGRAM_CLIENT_ID=STYLIQ_OAUTH_INSTAGRAM_CLIENT_ID:latest" \
  --update-secrets="/secrets/INSTAGRAM_CLIENT_SECRET=STYLIQ_OAUTH_INSTAGRAM_CLIENT_SECRET:latest"
  # ... add remaining OAuth secrets

# ============================================================
# STEP 4: Remove env var injection (AFTER code migration)
# ============================================================

gcloud run services update styliq-backend \
  --region=us-central1 \
  --remove-env-vars=DATABASE_URL,PINECONE_API_KEY,OPENAI_API_KEY,RAPIDAPI_KEY,...
```

### 3.3 IAM Configuration

**Principle of Least Privilege:**

```bash
# Create a dedicated service account for Cloud Run
gcloud iam service-accounts create styliq-backend-sa \
  --display-name="StylIQ Backend Service Account"

# Grant ONLY secretAccessor (read-only) to specific secrets
# DO NOT grant secretmanager.admin or broad roles

# Create a custom role with minimal permissions
gcloud iam roles create styliqSecretsReader \
  --project=stylhelpr-prod \
  --title="StylIQ Secrets Reader" \
  --permissions=secretmanager.versions.access

# Bind the custom role to the service account
gcloud projects add-iam-policy-binding stylhelpr-prod \
  --member="serviceAccount:styliq-backend-sa@stylhelpr-prod.iam.gserviceaccount.com" \
  --role="projects/stylhelpr-prod/roles/styliqSecretsReader"
```

---

## 4. DEPLOYMENT & ROLLOUT PLAN

### 4.1 Phase 1: Staging Deployment

```
Timeline: BEFORE any production changes

1. [ ] Create all secrets in Secret Manager (staging project)
2. [ ] Create local `secrets/` directory structure
3. [ ] Implement `src/config/secrets.ts` module
4. [ ] Update ALL files in Category A to use new secrets module
5. [ ] Remove `dotenv.config()` from main.ts
6. [ ] Remove custom `loadOpenAISecrets()` from ai.service.ts
7. [ ] Build and test locally with `secrets/` directory
8. [ ] Deploy to staging Cloud Run with:
   - Secret file mounts configured
   - Old env vars STILL present (dual-mode)
9. [ ] Verify staging:
   - All API endpoints functional
   - Auth working
   - AI features working
   - Redis caching working
   - Push notifications working
10. [ ] Remove env vars from staging Cloud Run
11. [ ] Verify staging works with ONLY file-based secrets
12. [ ] Run full E2E test suite against staging
```

### 4.2 Phase 2: Production Deployment

```
Timeline: AFTER staging is verified

1. [ ] Create all secrets in Secret Manager (prod project)
2. [ ] Take a database backup
3. [ ] Deploy code changes to production Cloud Run
4. [ ] Add secret file mounts to production (env vars still present)
5. [ ] Monitor for 1 hour:
   - Error rates
   - Latency
   - Auth success rate
   - AI request success rate
6. [ ] If healthy: Remove env vars from production
7. [ ] Monitor for 24 hours
8. [ ] Mark migration complete
```

### 4.3 Backout Plan

**If issues occur during staging:**
- Revert code changes (git)
- Redeploy previous image
- Env vars still work (no data loss)

**If issues occur during production:**

```bash
# IMMEDIATE: Re-add env vars (takes ~30 seconds)
gcloud run services update styliq-backend \
  --region=us-central1 \
  --set-env-vars="DATABASE_URL=postgresql://...,PINECONE_API_KEY=pcsk_..."

# THEN: Investigate logs
gcloud run services logs read styliq-backend --region=us-central1

# IF CODE ISSUE: Rollback to previous revision
gcloud run services update-traffic styliq-backend \
  --to-revisions=<PREVIOUS_REVISION>=100 \
  --region=us-central1
```

### 4.4 Verification Steps

**Runtime Health Checks:**

```typescript
// Add to health endpoint (temporary, for verification)
@Get('health')
async health() {
  const checks = {
    database: false,
    redis: false,
    secretsLoaded: false,
    auth0Configured: false,
    aiConfigured: false,
  };

  try {
    // Test database
    await pool.query('SELECT 1');
    checks.database = true;
  } catch {}

  try {
    // Test Redis
    await redis.ping();
    checks.redis = true;
  } catch {}

  try {
    // Verify secrets exist (don't log values!)
    checks.secretsLoaded =
      hasSecret('DATABASE_URL') &&
      hasSecret('PINECONE_API_KEY') &&
      hasSecret('AUTH0_ISSUER');
  } catch {}

  try {
    checks.auth0Configured = !!getAuth0Issuer() && !!getAuth0Audience();
  } catch {}

  try {
    checks.aiConfigured = !!getOpenAIApiKey() && !!getPineconeApiKey();
  } catch {}

  const allHealthy = Object.values(checks).every(v => v);

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    // NEVER log secret values, only existence
  };
}
```

**Log-based Verification:**

```bash
# After deployment, verify no env var access errors
gcloud run services logs read styliq-backend \
  --region=us-central1 \
  --filter="Secret" \
  --limit=100

# Check for any process.env references in logs (should be none)
gcloud run services logs read styliq-backend \
  --region=us-central1 \
  --filter="process.env" \
  --limit=100
```

**Confirm no env vars remain:**

```bash
# This should return empty or only platform vars (PORT, K_SERVICE, etc.)
gcloud run services describe styliq-backend \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

---

## 5. SECURITY & COMPLIANCE NOTES

### 5.1 Least Privilege IAM

- Cloud Run service account gets `secretmanager.secretAccessor` ONLY
- NO `secretmanager.admin` or `secretmanager.secretVersionManager`
- Bind permissions to individual secrets, not project-wide
- Use custom role for minimal permissions

### 5.2 Rotation Strategy

**Automated Rotation (Recommended):**

```bash
# Enable automatic rotation on Secret Manager
gcloud secrets update STYLIQ_DB_DATABASE_URL \
  --replication-policy="automatic" \
  --next-rotation-time="2025-03-31T00:00:00Z" \
  --rotation-period="90d"
```

**Manual Rotation Process:**

1. Create new secret version: `gcloud secrets versions add STYLIQ_X --data-file=-`
2. Update Cloud Run to use `:latest` (already configured)
3. Cloud Run picks up new version on next cold start
4. Force rotation: `gcloud run services update styliq-backend --no-traffic`
5. Disable old version: `gcloud secrets versions disable STYLIQ_X --version=1`

### 5.3 No Secrets in Logs

**Code Requirements:**

- NEVER log secret values
- NEVER include secrets in error messages
- Use `hasSecret()` for existence checks in logs
- Redact connection strings in stack traces

**Validation:**

```typescript
// BAD - Never do this
console.log('Connecting with:', getSecret('DATABASE_URL'));

// GOOD - Log existence only
console.log('Database secret loaded:', hasSecret('DATABASE_URL'));
```

### 5.4 No Secrets in Docker Images

**Dockerfile Best Practices:**

```dockerfile
# NEVER copy secrets into image
# WRONG: COPY .env /app/.env
# WRONG: COPY secrets/ /app/secrets/
# WRONG: ARG DATABASE_URL

# Secrets come from Cloud Run mounts at runtime only
```

**Build Verification:**

```bash
# Scan image for secrets before pushing
docker run --rm -v $(pwd):/src trufflesecurity/trufflehog:latest filesystem /src

# Verify no secrets in image layers
docker history styliq-backend:latest --no-trunc | grep -i secret
```

### 5.5 Audit Trail

Secret Manager provides automatic audit logging:

- All secret access is logged to Cloud Audit Logs
- IAM changes logged
- Version changes logged

Enable Data Access logs:

```bash
gcloud projects get-iam-policy stylhelpr-prod \
  --format=yaml > policy.yaml

# Add to policy.yaml:
# auditConfigs:
# - auditLogConfigs:
#   - logType: DATA_READ
#   - logType: DATA_WRITE
#   service: secretmanager.googleapis.com

gcloud projects set-iam-policy stylhelpr-prod policy.yaml
```

---

## 6. IMPLEMENTATION CHECKLIST

### Phase 0: Preparation
- [ ] 1. Review and approve this plan
- [ ] 2. Backup current `.env` file securely (password manager, NOT git)
- [ ] 3. Document all current secret values in secure location
- [ ] 4. Verify git history doesn't contain secrets (if it does, rotate ALL keys)

### Phase 1: Infrastructure Setup
- [ ] 5. Create all secrets in GCP Secret Manager (staging)
- [ ] 6. Create all secrets in GCP Secret Manager (production)
- [ ] 7. Configure IAM bindings for Cloud Run service account
- [ ] 8. Create local `secrets/` directory structure
- [ ] 9. Add `secrets/` to `.gitignore` (verify committed)

### Phase 2: Code Changes
- [ ] 10. Create `src/config/secrets.ts` module
- [ ] 11. Update `src/utils/redisClient.ts` - lazy initialization
- [ ] 12. Update `src/pinecone/pineconeUtils.ts` - lazy initialization
- [ ] 13. Update `src/db/pool.ts` - use secrets module
- [ ] 14. Update `src/auth/jwt.strategy.ts` - use secrets module
- [ ] 15. Update `src/vertex/vertex.service.ts` - use secrets module
- [ ] 16. Update `src/notifications/notifications.service.ts` - use secrets module
- [ ] 17. Update `src/ai/ai.service.ts` - remove custom loader, use secrets
- [ ] 18. Update `src/product-services/*.ts` - use secrets module
- [ ] 19. Update `src/shopping/shopping.controller.ts` - use secrets module
- [ ] 20. Update `src/services/discover.service.ts` - use secrets module
- [ ] 21. Update `src/connected-accounts/oauth.service.ts` - use secrets module
- [ ] 22. Update `src/upload/upload.service.ts` - use secrets module
- [ ] 23. Update `src/profile-upload/profile-upload.service.ts` - use secrets module
- [ ] 24. Update `src/ai/ai.controller.ts` - use secrets module
- [ ] 25. Update `src/wardrobe/wardrobe.service.ts` - use secrets module
- [ ] 26. Remove `dotenv.config()` from `main.ts`
- [ ] 27. Update health endpoint with secrets verification

### Phase 3: Local Testing
- [ ] 28. Populate local `secrets/` directory with dev values
- [ ] 29. Run `npm run build` - no TypeScript errors
- [ ] 30. Run `npm run start:dev` - server starts
- [ ] 31. Test auth flow
- [ ] 32. Test AI features
- [ ] 33. Test product search
- [ ] 34. Test push notifications
- [ ] 35. Run `npm run test` - all tests pass

### Phase 4: Staging Deployment
- [ ] 36. Deploy to staging with secret mounts + env vars (dual mode)
- [ ] 37. Verify staging health endpoint
- [ ] 38. Run E2E tests against staging
- [ ] 39. Remove env vars from staging
- [ ] 40. Verify staging still works
- [ ] 41. Monitor staging for 24 hours

### Phase 5: Production Deployment
- [ ] 42. Schedule maintenance window
- [ ] 43. Take database backup
- [ ] 44. Deploy to production with secret mounts + env vars
- [ ] 45. Verify production health endpoint
- [ ] 46. Monitor for 1 hour (error rates, latency)
- [ ] 47. Remove env vars from production
- [ ] 48. Monitor for 24 hours
- [ ] 49. Verify audit logs are capturing access

### Phase 6: Cleanup
- [ ] 50. Delete local `.env` file (after secrets/ verified working)
- [ ] 51. Delete service account JSON files from repo directory
- [ ] 52. Update CI/CD pipeline if applicable
- [ ] 53. Update team documentation
- [ ] 54. Schedule first secret rotation

---

## ACCEPTANCE CRITERIA

The migration is complete when ALL of the following are true:

1. **Zero `process.env` for secrets:**
   - `grep -r "process.env" src/` returns ONLY Category C items (PORT, NODE_ENV, debug flags)
   - No `dotenv` imports remain in active code

2. **File-based secrets only:**
   - All secrets read via `fs.readFileSync` from `/secrets/` mount
   - Local dev uses `./secrets/` directory

3. **Cloud Run configuration:**
   - All secrets mounted as files at `/secrets/<NAME>`
   - Zero secret-related env vars in Cloud Run config
   - Only platform vars (PORT, K_SERVICE) and config vars remain

4. **Health verification:**
   - `/api/health` returns `healthy` with all secret checks passing
   - Zero 500 errors related to missing secrets in logs

5. **Security:**
   - IAM follows least privilege (secretAccessor only)
   - No secrets in logs (verified by log search)
   - No secrets in Docker image (verified by trufflehog scan)
   - Audit logging enabled for Secret Manager

6. **Operations:**
   - Rotation process documented and tested
   - Backout procedure documented and verified working
   - Team trained on new secret management process

---

**END OF PLAN**
