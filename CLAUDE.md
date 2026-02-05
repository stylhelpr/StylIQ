# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

StylIQ is a fashion AI assistant app built with React Native for iOS, featuring body measurement capabilities using ARKit, emotion detection using CoreML, and an AI-powered style recommendation system. The app includes a NestJS backend deployed on Google Cloud Run.

## Repository Structure

This is a monorepo with two main applications:

- **`apps/frontend/`** - React Native iOS application (React 19, React Native 0.82)
- **`apps/backend-nest/`** - NestJS backend API with Fastify adapter
- **`ios/`** - iOS native modules and Xcode project
- **`store/`** - Zustand global state stores (located at root level)

## Development Commands

### Frontend (React Native)

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Clean iOS build artifacts and pods
npm run ios-clean

# Lint TypeScript/JavaScript files
npm run lint

# Run tests
npm test
```

### Backend (NestJS)

```bash
# Start backend in development mode with watch
cd apps/backend-nest && npm run start:dev

# Build backend for production
cd apps/backend-nest && npm run build

# Start backend in production mode
cd apps/backend-nest && npm run start:prod

# Run backend tests
cd apps/backend-nest && npm run test

# Run backend e2e tests
cd apps/backend-nest && npm run test:e2e

# Lint and auto-fix
cd apps/backend-nest && npm run lint

# Format with Prettier
cd apps/backend-nest && npm run format
```

### Running Both Concurrently

```bash
# Start backend, frontend metro, and iOS app together
npm run dev
```

## Architecture

### Frontend Architecture

**State Management:**

- Zustand stores located in `/store/` directory (root level)
- Example: `measurementStore.ts` manages body measurement state
- Theme state managed via `ThemeContext` in `apps/frontend/src/context/`

**Navigation:**

- Custom stack-based navigation system in `apps/frontend/src/navigation/RootNavigator.tsx`
- No external navigation library - uses state-driven screen rendering
- Screen types defined as union type in RootNavigator

**Theming:**

- Multiple theme skins defined in `apps/frontend/src/styles/skins.ts`
- Theme tokens in `apps/frontend/src/styles/tokens/tokens.ts`
- `ThemeProvider` wraps the app and provides `useAppTheme()` hook
- Theme persisted to AsyncStorage

**Native Modules:**

- Located in `apps/frontend/src/native/`
- Bridge TypeScript interfaces to iOS Swift modules:
  - `ARKitModule.ts` - ARKit body tracking
  - `measurementModule.ts` - Body measurement via Vision framework
  - `dynamicIsland.ts` - iOS Dynamic Island integration
  - `visionAlignment.ts` - Vision framework pose alignment

### iOS Native Modules

**ARKit Body Tracking** (`ios/StylIQ/ARKit/`):

- `ARKitModule.swift` - Main module exposing ARKit to React Native
- `ARBodyTrackingViewController.swift` - ARKit session management
- `ARKitViewManager.swift` - Native view component for AR preview
- Provides 3D skeleton joint positions for body measurements

**Measurement Module** (`ios/StylIQ/MeasurementModule/`):

- `MeasurementModule.swift` - Vision framework integration
- `VisionBodyPose.swift` - 2D pose detection using Vision
- `MeasurementMath.swift` - Calibration and measurement calculations
- `VisionAlignment.swift` - Pose alignment guidance

**Emotion Detection** (`ios/Mentalist/`):

- Swift package for facial emotion analysis using CoreML
- `Mentalist.swift` - Main emotion detection API
- `MentalistCore.swift` - Core ML model integration
- `MLCore.swift` - Modified ML Core for emotion processing
- Uses `FacialExpressionModel.mlpackage` CoreML model
- Bridged to React Native via `ios/EmotionModule.swift`

**Dynamic Island** (`ios/StylIQ/`):

- `StylIQDynamicIslandModule.swift` - Live Activities for Dynamic Island
- `StylIQLiveActivity/` - Widget extension for lock screen/island UI

### Backend Architecture

**Framework:** NestJS with Fastify adapter (performance optimized)

**Core Modules** (in `apps/backend-nest/src/`):

- `auth/` - Auth0 JWT authentication via passport-jwt
- `users/` - User profile management
- `wardrobe/` - User clothing item storage and management
- `outfit/` - AI outfit generation and suggestions
- `style-profile/` - User style preferences and profiles
- `style-profiles/` - New style profiles system
- `ai/` - Google Vertex AI integration (Gemini models)
- `upload/` - File upload handling via Google Cloud Storage
- `gcs/` - Google Cloud Storage service
- `notifications/` - Firebase Cloud Messaging for push notifications
- `scheduled-outfit/` - Scheduled outfit notifications with background job
- `feed-sources/` - RSS feed aggregation for fashion news
- `feeds/` - Fashion content feed management
- `product-services/` - Product search and shopping integration
- `saved-looks/` - User saved outfit/look storage
- `recreated-look/` - AI look recreation from photos
- `look-memory/` - Look history and memory system
- `calendar/` - Outfit calendar planning
- `share/` - Share functionality
- `contact/` - Contact/support functionality
- `feedback/` - User feedback collection

**Database:** PostgreSQL accessed via `DatabaseService` (apps/backend-nest/src/db/database.service.ts)

**External Services:**

- Google Vertex AI for generative AI (outfit suggestions, style analysis)
- Pinecone for vector similarity search
- Firebase Admin SDK for push notifications
- Google Cloud Storage for image/file storage
- Upstash Redis for caching
- Puppeteer for web scraping

**API Structure:**

- All endpoints prefixed with `/api`
- Health check at `/api/health` and root `/`
- Runs on port 3001 locally, respects PORT env var for Cloud Run
- Background job: `ScheduledOutfitNotifier` runs on interval to send scheduled outfit notifications

## Key Conventions

### Frontend

**Imports:**

- Use absolute imports from `src/` for frontend code
- Native modules imported from `apps/frontend/src/native/`
- Hooks imported from `apps/frontend/src/hooks/`
- Root-level stores imported from `store/` directory

**Styling:**

- Prefer `useGlobalStyles()` hook for common styles
- Component-specific styles use `StyleSheet.create()` within component
- Access theme via `useAppTheme()` hook
- Use design tokens from `tokens.ts` for consistency

**Native Bridges:**

- TypeScript interfaces in `apps/frontend/src/native/`
- Swift implementation in `ios/StylIQ/` with corresponding bridge files
- Bridge files end with `Bridge.m` for Objective-C bridging headers
- Spec files (`.mm` or `.m`) for TurboModules/Fabric components

**Measurement Flow:**

- User captured from front and side angles
- Joint data stored in `measurementStore` (Zustand)
- Calibration multipliers applied in store computeResults()
- Results normalized and converted to real-world measurements
- 3D mesh vertices can be generated from joint data

### Backend

**Module Structure:**

- Each feature has its own module directory
- Modules export `*Module` class imported in `app.module.ts`
- Controllers handle HTTP endpoints, Services contain business logic
- Database queries centralized in `DatabaseService`

**Authentication:**

- JWT-based auth via Auth0
- Protected routes use `@UseGuards(AuthGuard('jwt'))`
- User ID extracted from JWT token

**File Uploads:**

- Handled via Fastify multipart
- Files uploaded to Google Cloud Storage via `GCSModule`
- 25MB file size limit configured in main.ts

**AI Integration:**

- Vertex AI accessed via `@google-cloud/vertexai`
- Gemini models used for generative responses
- Pinecone for semantic search and recommendations

## iOS Build Configuration

**React Native Version:** 0.82.1 with New Architecture enabled

- Fabric (new renderer) enabled
- TurboModules enabled
- Hermes engine enabled

**Podfile Notes:**

- Platform: iOS 16.0+
- Uses `use_frameworks! :linkage => :static`
- Special handling for `react-native-permissions` to work with use_frameworks
- Firebase integration via Pods
- ARKit and Vision frameworks required

**Key Pods:**

- `LiquidGlass` for glass morphism effects
- Firebase messaging for push notifications
- React Native Reanimated for animations
- React Native Skia for advanced graphics

**Build Scripts:**

- `ios/add-firebase-plist.sh` - Adds Firebase config to build
- Various BoringSSL fix scripts for SSL compilation issues
- `patch-package` applied post-install for React Native patches

## State Management Patterns

**Zustand Stores:**

- Global app state managed by Zustand stores in `/store/`
- Example pattern from `measurementStore.ts`:
  ```typescript
  export const useMeasurementStore = create<State>((set, get) => ({
    // state
    frontJoints: null,
    // actions
    captureFront: joints => set({frontJoints: joints}),
  }));
  ```

**React Context:**

- Used for theme, auth, and UUID context
- Providers wrap app in `App.tsx`
- Custom hooks provide typed access (e.g., `useAppTheme()`)

## Testing

**Frontend:**

- Jest with React Native preset
- Test files: `*.spec.ts` or `*.test.ts`
- Run with `npm test`

**Backend:**

- Jest with ts-jest
- Unit tests: `*.spec.ts` in `src/`
- E2E tests: `test/jest-e2e.json` config
- Run with `npm run test` (unit) or `npm run test:e2e`

## Environment Configuration

**Frontend:**

- Uses `react-native-dotenv` for .env file support
- Environment variables typed in module declarations

**Backend:**

- `@nestjs/config` with global ConfigModule
- `.env` file loaded in `apps/backend-nest/.env`
- Environment variables accessed via ConfigService

## Common Development Workflows

### Adding a New Screen

1. Create screen component in `apps/frontend/src/screens/`
2. Add screen type to union in `RootNavigator.tsx`
3. Import and add to screen rendering logic in `RootNavigator`
4. Update `BottomNavigation` if it should appear in nav

### Adding a New Native Module

1. Create Swift implementation in `ios/StylIQ/[ModuleName]/`
2. Create Objective-C bridge header `[ModuleName]Bridge.m`
3. Add TypeScript interface in `apps/frontend/src/native/`
4. Import in Xcode project
5. Use via `NativeModules.[ModuleName]` in React Native code

### Adding a New Backend Endpoint

1. Create or update controller in appropriate module
2. Add route handler method with decorators (`@Get()`, `@Post()`, etc.)
3. Implement business logic in corresponding service
4. Add authentication guard if needed: `@UseGuards(AuthGuard('jwt'))`
5. Update module imports if creating new module

## Important Notes

- The app uses Auth0 for authentication with biometric fallback
- Push notifications via Firebase Cloud Messaging
- ARKit features require iOS 16.0+
- Body measurement uses ARKit 3D skeleton + Vision 2D pose fusion
- Backend deployed to Google Cloud Run (containerized)
- Background notification job runs on interval in backend
- Redis used for caching (Upstash Redis)
- Vector embeddings stored in Pinecone for AI recommendations

## Behavioral Rules

- If any requirement, constraint, or behavior is unclear, Claude MUST stop and ask instead of guessing.
- If a mistake recurs and required correction before, add a short rule here to prevent it in the future.
- For security-sensitive work (auth/permissions, payments, deletes, background jobs/cron, storage access), Claude MUST do an adversarial verification pass before declaring done:
  - List 5–10 plausible failure modes / attack paths
  - For each: explain whether it’s mitigated, and where (file/route) or what’s missing
  - Confirm what was tested (commands/flows) or state explicitly what could not be tested

## Plan Mode Requirement

Before making changes, Claude MUST enter Plan Mode if the task matches any trigger below.

A task requires Plan Mode if it involves ANY of the following:
- Touching 3 or more files
- Adding or modifying backend API endpoints
- Adding or modifying database logic
- Adding or modifying native (iOS/Swift) code
- Refactoring logic beyond a single function or component
- Introducing a new feature or workflow that spans frontend and backend
- Any security-sensitive work (auth/permissions, payments, deletes, background jobs/cron, storage access)

Plan Mode rules:
- Do NOT write code
- Do NOT edit files
- Do NOT run commands

Plan output MUST include:
1. Objective summary
2. Step-by-step plan
3. Files to be changed
4. Risks or edge cases
5. Open questions (if any)

Execution may begin ONLY after you reply with **“APPROVED”**.


