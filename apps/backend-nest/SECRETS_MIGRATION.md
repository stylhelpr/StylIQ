# Secrets Migration to Google Secret Manager

This document outlines the steps to migrate secrets from environment variables to Google Secret Manager for production compliance.

## Current Secrets in Use

The following secrets are currently loaded from environment variables and should be migrated to Secret Manager:

### Database
- `DATABASE_URL` - PostgreSQL connection string

### Authentication (Auth0)
- `AUTH0_ISSUER` - Auth0 domain/issuer URL
- `AUTH0_AUDIENCE` - Auth0 API audience

### Firebase
- `NOTIFICATIONS_FIREBASE2` / `NOTIFICATIONS_FIREBASE` - Firebase service account JSON
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_MESSAGING_SENDER_ID` - FCM sender ID

### Third-Party APIs
- `OPENAI_API_KEY` - OpenAI API key
- `SERPAPI_KEY` - SerpAPI key for search
- `RAPIDAPI_KEY` - RapidAPI key
- `TOMORROW_API_KEY` - Tomorrow.io weather API key

### Google Cloud
- `GOOGLE_APPLICATION_CREDENTIALS` - GCP service account (auto-provided on Cloud Run)
- `GCS_PROFILE_BUCKET` - GCS bucket name (not a secret, but configurable)

### Redis
- Redis connection is handled via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Pinecone
- Pinecone API key (check pinecone module for exact env var name)

---

## Migration Steps

### Step 1: Create Secrets in Google Secret Manager

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Create each secret
gcloud secrets create DATABASE_URL --replication-policy="automatic"
gcloud secrets create AUTH0_ISSUER --replication-policy="automatic"
gcloud secrets create AUTH0_AUDIENCE --replication-policy="automatic"
gcloud secrets create OPENAI_API_KEY --replication-policy="automatic"
gcloud secrets create SERPAPI_KEY --replication-policy="automatic"
gcloud secrets create RAPIDAPI_KEY --replication-policy="automatic"
gcloud secrets create TOMORROW_API_KEY --replication-policy="automatic"
gcloud secrets create FIREBASE_SERVICE_ACCOUNT --replication-policy="automatic"
gcloud secrets create UPSTASH_REDIS_REST_URL --replication-policy="automatic"
gcloud secrets create UPSTASH_REDIS_REST_TOKEN --replication-policy="automatic"
```

### Step 2: Add Secret Versions

```bash
# Add the actual secret values
echo -n "your-database-url" | gcloud secrets versions add DATABASE_URL --data-file=-
echo -n "https://your-tenant.auth0.com/" | gcloud secrets versions add AUTH0_ISSUER --data-file=-
echo -n "your-api-audience" | gcloud secrets versions add AUTH0_AUDIENCE --data-file=-
echo -n "sk-..." | gcloud secrets versions add OPENAI_API_KEY --data-file=-
# ... repeat for other secrets
```

### Step 3: Grant Cloud Run Service Account Access

```bash
# Get your Cloud Run service account (usually PROJECT_NUMBER-compute@developer.gserviceaccount.com)
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access to each secret
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets...
```

### Step 4: Update Cloud Run Deployment

Update your Cloud Run service to mount secrets as environment variables:

```bash
gcloud run services update backend \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
  --set-secrets="AUTH0_ISSUER=AUTH0_ISSUER:latest" \
  --set-secrets="AUTH0_AUDIENCE=AUTH0_AUDIENCE:latest" \
  --set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest" \
  --set-secrets="SERPAPI_KEY=SERPAPI_KEY:latest" \
  --set-secrets="RAPIDAPI_KEY=RAPIDAPI_KEY:latest" \
  --set-secrets="TOMORROW_API_KEY=TOMORROW_API_KEY:latest" \
  --set-secrets="NOTIFICATIONS_FIREBASE2=FIREBASE_SERVICE_ACCOUNT:latest" \
  --set-secrets="UPSTASH_REDIS_REST_URL=UPSTASH_REDIS_REST_URL:latest" \
  --set-secrets="UPSTASH_REDIS_REST_TOKEN=UPSTASH_REDIS_REST_TOKEN:latest" \
  --region=us-central1
```

Or in your `cloudbuild.yaml` / deployment configuration:

```yaml
# Cloud Run service YAML
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: backend
spec:
  template:
    spec:
      containers:
        - image: gcr.io/PROJECT_ID/backend:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: DATABASE_URL
                  key: latest
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: OPENAI_API_KEY
                  key: latest
            # ... other secrets
```

---

## Key Rotation Procedure

When a key needs to be rotated (e.g., compromised or scheduled rotation):

### 1. Create New Secret Version
```bash
echo -n "new-api-key-value" | gcloud secrets versions add OPENAI_API_KEY --data-file=-
```

### 2. Deploy Updated Service
```bash
# Cloud Run automatically picks up "latest" version on next deploy
gcloud run services update backend --region=us-central1
```

### 3. Disable Old Version (after confirming new version works)
```bash
gcloud secrets versions disable OLD_VERSION_NUMBER --secret=OPENAI_API_KEY
```

### 4. Destroy Old Version (optional, after grace period)
```bash
gcloud secrets versions destroy OLD_VERSION_NUMBER --secret=OPENAI_API_KEY
```

---

## Local Development

For local development, continue using `.env` files. The application code (`src/db/pool.ts`) automatically:
- Uses `rejectUnauthorized: false` for TLS when `NODE_ENV !== 'production'`
- Uses `rejectUnauthorized: true` for TLS in production

Create a local `.env` file (never commit this):
```bash
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/styliq
AUTH0_ISSUER=https://dev-xxx.auth0.com/
AUTH0_AUDIENCE=https://api.stylhelpr.com
OPENAI_API_KEY=sk-...
# ... other secrets
```

---

## Verification Checklist

After migration, verify:

- [ ] All secrets are in Secret Manager
- [ ] Cloud Run service account has `secretmanager.secretAccessor` role
- [ ] Cloud Run deployment mounts all required secrets
- [ ] Application starts successfully in production
- [ ] Database connections work (TLS validation enabled)
- [ ] Third-party API calls succeed (OpenAI, SerpAPI, etc.)
- [ ] Firebase notifications work
- [ ] No secrets are logged or exposed in error messages
