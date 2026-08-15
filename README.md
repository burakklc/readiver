# Readiver

Readiver helps language learners turn real-world text into reading material at a
selected language and CEFR level. The product promise is **Read anything at your
level.** This repository currently contains the production-oriented foundation,
not the completed MVP.

## Repository

```text
apps/
  web/                 Next.js App Router shell
  ios/                 Native SwiftUI Xcode project
supabase/
  functions/           Future server-side product operations
  migrations/          Committed PostgreSQL migrations
docs/
  PRODUCT.md            Scope and product principles
  BRAND_BOOK.md         Visual direction
  ARCHITECTURE.md       System boundaries and decisions
  API.md                Shared client/backend contracts
AGENTS.md               Permanent coding-agent rules
.env.example            Configuration names with empty placeholders
```

## Technology

- Web: Next.js, React, TypeScript, App Router, ESLint
- iOS: Swift 6, SwiftUI, async/await, iOS 17+
- Backend: Supabase Auth, PostgreSQL, Row Level Security, Edge Functions
- Source control: Git

Clients never call an AI provider directly. Provider access will be implemented
inside the backend in a later slice.

## Prerequisites

- Node.js 22 and npm 10
- Xcode 26 or another Xcode version capable of building an iOS 17 SwiftUI app
- Supabase CLI and Docker for a complete local backend workflow
- A Supabase project for hosted integration

## Web setup

```sh
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`. Other verified commands are:

```sh
npm run build
npm run typecheck
npm run lint
```

There is no web test suite yet because the foundation has no product behavior.
Add focused tests with the first vertical slice rather than adding an empty test
framework now.

## Environment setup

Copy the root `.env.example` to the environment mechanism appropriate to the
runtime. For local Next.js development, place safe web values in
`apps/web/.env.local`. Do not populate or commit the example itself.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public client
configuration. The anon key is designed to work with authenticated sessions and
RLS. `SUPABASE_SERVICE_ROLE_KEY` and `AI_PROVIDER_API_KEY` are privileged,
server-only secrets and must never use a `NEXT_PUBLIC_` prefix or appear in an
iOS bundle.

The foundation shell does not read these variables yet because it has no live
backend integration.

## Supabase setup

Install the Supabase CLI using an official supported method, then from the
repository root:

```sh
supabase start
supabase db reset
```

`supabase db reset` recreates the local database and applies committed files in
`supabase/migrations`. To create a future migration:

```sh
supabase migration new descriptive_name
```

Edit the generated SQL, reset the local database, and review the diff before
committing. Link and push to a hosted project only after selecting the intended
project and reviewing migrations; those remote steps are deliberately not
performed by this foundation.

## iOS setup

Open `apps/ios/Readiver.xcodeproj` in Xcode, select the `Readiver` scheme and an
iOS simulator, then Run. The project uses a placeholder bundle identifier
(`com.example.readiver`) and automatic signing with no development team.

Command-line simulator build without signing:

```sh
xcodebuild \
  -project apps/ios/Readiver.xcodeproj \
  -scheme Readiver \
  -sdk iphonesimulator \
  -configuration Debug \
  -derivedDataPath /tmp/ReadiverDerived \
  build CODE_SIGNING_ALLOWED=NO
```

Before distribution, choose the real Apple developer team, replace the bundle
identifier, and supply production app icons. Public Supabase configuration must
later be added through Xcode build configuration; privileged keys must never be
added to the app.

## Project rules

Future coding work starts with `AGENTS.md`, then the relevant documents in
`docs/`. Product behavior, visual decisions, architecture, and shared API
contracts each have an explicit source of truth there.

## Manual configuration still required

- Create or select Supabase development and production projects.
- Install the Supabase CLI and run the migration against a local development DB.
- Populate local public Supabase configuration after client integration exists.
- Configure Edge Function server secrets only when backend integration begins.
- Select the Apple development team and final bundle identifier.
- Create production iOS app icon artwork.
- Choose deployment/hosting and CI; neither is assumed in this foundation.

No AI provider is connected and no live credentials are required at this stage.

## Foundation validation

The initial foundation was validated on 15 August 2026 with Node 22.20, npm
10.9, Swift 6.2, and Xcode 26.1:

- web dependency installation and audit completed with no reported
  vulnerabilities;
- web TypeScript checking, ESLint, and the optimized production build passed;
- the unsigned iOS simulator build passed;
- Git whitespace checks and a repository secret-pattern scan passed; and
- generated web build, dependency, and TypeScript cache files are ignored.

The SQL migration was reviewed statically, but was not executed locally because
the Supabase CLI and PostgreSQL client were unavailable and the installed Docker
client could not reach a running engine. Run `supabase db reset` after completing
the manual Supabase setup above. No iOS unit-test target exists yet because there
is no product behavior to test.
