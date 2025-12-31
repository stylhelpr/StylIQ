<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Local Secrets Configuration

**The backend will not start without secrets.** This is intentional for security.

Secrets are loaded from filesystem mounts, not environment variables:
- **Production (Cloud Run):** `/secrets/<SECRET_NAME>`
- **Local development:** `./secrets/<SECRET_NAME>`

### Quick Setup (Recommended)

Run the interactive setup script to populate all secrets:

```bash
bash scripts/setup-local-secrets-interactive.sh
```

This prompts for each secret value, validates JSON secrets with `jq`, and writes them to the `secrets/` directory. Input is masked for security.

**Requires:** `jq` (`brew install jq`)

### Alternative: Manual Setup

To scaffold empty placeholder files first:

```bash
bash scripts/setup-local-secrets.sh
```

Then manually populate each file in `secrets/`.

### Required Secrets

| File | Description |
|------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH0_ISSUER` | Auth0 domain URL (e.g., `https://tenant.auth0.com/`) |
| `AUTH0_AUDIENCE` | Auth0 API audience |
| `OPENAI_API_KEY` | OpenAI API key |
| `PINECONE_API_KEY` | Pinecone vector DB API key |
| `PINECONE_INDEX` | Pinecone index name |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `GCP_SERVICE_ACCOUNT_JSON` | Full GCP service account JSON content |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full Firebase service account JSON content |

### File Format

Each secret file contains **only the raw value** (no quotes, no trailing newline):

```bash
# Example: Create DATABASE_URL secret
echo -n "postgresql://user:pass@host:5432/db" > secrets/DATABASE_URL
```

For JSON secrets, paste the full JSON content directly into the file.

### Security Notes

- **Filesystem-only:** Secrets are NEVER stored in environment variables. This is enforced.
- The `secrets/` directory is gitignored. **Never commit secrets.**
- Startup fails fast if any required secret is missing or invalid.
- Use `scripts/check-env-secrets.sh` to verify no secrets leak via `process.env`.
- The interactive setup script is for **local development only**.

## Allowlisted Non-Secret Environment Variables

The following environment variables are explicitly **allowed** to be read from `process.env` because they are **non-secret configuration flags**. They do not contain credentials, API keys, tokens, passwords, or any sensitive data.

**Secrets must NEVER be read from `process.env`.** All secrets are loaded exclusively from filesystem mounts via `getSecret()` / `getSecretJson()`.

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | — |
| `PORT` | HTTP server port | `3001` (local), `8080` (Cloud Run) |
| `FASTIFY_LOG_LEVEL` | Fastify logger verbosity | `error` |
| `SCHEDULE_NOTIFIER_INTERVAL_MS` | Background job interval in milliseconds | `30000` |
| `USE_VERTEX` | Enable Vertex AI instead of OpenAI (`true`/`false`) | `false` |
| `DISABLE_FEEDBACK` | Disable feedback collection (`1`/`0`) | `0` |
| `STYLE_DEBUG` | Enable style scoring debug logs | `false` |
| `WEATHER_DEBUG` | Enable weather debug logs | `false` |
| `GCP_REGION` | GCP region for Vertex AI | `us-central1` |
| `DEFAULT_GENDER` | Default gender for style recommendations | `neutral` |
| `SECRETS_PATH` | Override secrets directory path (testing only) | — |

### Why These Are Safe

1. **No credentials** — None of these contain API keys, passwords, tokens, or connection strings.
2. **Public knowledge** — Values like `NODE_ENV=production` or `PORT=8080` are not sensitive.
3. **Feature flags** — Boolean toggles that control behavior, not access.
4. **Operational config** — Tuning parameters that don't grant system access.

### CI Enforcement

A GitHub Actions workflow (`secret-scan.yml`) runs on every push and pull request to detect accidentally committed secrets using gitleaks. The build fails if secrets are detected.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
