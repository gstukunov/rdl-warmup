# Telegram Mini App - Developer Guide

> **Quick Start**: This is a React-based Telegram Mini App for the RDL Warmup Bot. Users can open it directly from the Telegram bot to manage games with a modern mobile UI.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure (FSD)](#project-structure-fsd)
4. [Layer Descriptions](#layer-descriptions)
5. [Import Rules](#import-rules)
6. [Frontend](#frontend)
7. [Backend API](#backend-api)
8. [Authentication](#authentication)
9. [Development](#development)
10. [Deployment](#deployment)
11. [Telegram SDK](#telegram-sdk)
12. [Styling](#styling)
13. [Common Tasks](#common-tasks)

---

## Overview

The Telegram Mini App provides a native mobile experience for managing BP debate games:

- **Games List**: Browse open games and see your active game
- **Game Details**: View game info, participants, join/leave games
- **User Profile**: View your stats and judge ratings
- **Telegram Native UI**: Uses Telegram's theme colors, back button, main button

### Features

- ✅ Mobile-first responsive design
- ✅ Telegram theme integration (light/dark mode)
- ✅ Haptic feedback on interactions
- ✅ Native back button and main button support
- ✅ Secure authentication via Telegram initData
- ✅ Real-time game status updates

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Telegram Client                                             │
│  - User opens Mini App from bot                              │
│  - Telegram provides initData with user info                 │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  React SPA (webapp/)                                         │
│  - React 18 + TypeScript                                     │
│  - Feature-Sliced Design (FSD) Architecture                  │
│  - Telegram SDK (@telegram-apps/sdk)                         │
│  - Axios for API calls                                       │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP + X-Telegram-Init-Data header
┌──────────────▼──────────────────────────────────────────────┐
│  NestJS Backend (src/webapp/)                                │
│  - WebAppController (REST endpoints)                         │
│  - WebAppAuthGuard (validates Telegram initData)             │
│  - WebAppService (business logic)                            │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  PostgreSQL Database                                         │
│  - Uses existing entities (Game, User, etc.)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure (FSD)

This project follows **[Feature-Sliced Design](https://feature-sliced.design/)** - an architectural methodology for scalable frontend applications.

```
webapp/                              # React frontend
├── src/
│   ├── app/                        # Application initialization layer
│   │   ├── App.tsx                # Root component with routing
│   │   ├── index.tsx              # Entry point
│   │   └── styles/                # Global styles
│   │
│   ├── pages/                      # Page components (routes)
│   │   ├── stats/                 # Public statistics page
│   │   │   └── ui/
│   │   │       └── StatsPage.tsx
│   │   ├── admin-login/           # Admin authentication
│   │   │   └── ui/
│   │   │       └── AdminLoginPage.tsx
│   │   └── admin-results/         # Game results submission
│   │       └── ui/
│   │           └── AdminResultsPage.tsx
│   │
│   ├── widgets/                    # Complex UI compositions
│   │   ├── layout/                # Page layout with Telegram theme
│   │   │   └── ui/
│   │   │       └── Layout.tsx
│   │   └── game-card/             # Game card component
│   │       └── ui/
│   │           └── GameCard.tsx
│   │
│   ├── features/                   # User interactions & features
│   │   ├── join-game/             # Join game functionality
│   │   │   ├── api/
│   │   │   ├── model/
│   │   │   └── ui/
│   │   ├── leave-game/            # Leave game functionality
│   │   └── admin-auth/            # Admin authentication logic
│   │
│   ├── entities/                   # Business entities
│   │   ├── game/                  # Game entity
│   │   │   ├── model/             # Types, interfaces
│   │   │   ├── api/               # API methods
│   │   │   └── ui/                # Entity UI (GameStatusBadge)
│   │   ├── user/                  # User entity
│   │   │   ├── model/
│   │   │   ├── api/
│   │   │   └── ui/                # UserAvatar
│   │   ├── stats/                 # Statistics entity
│   │   └── admin/                 # Admin operations entity
│   │
│   └── shared/                     # Shared infrastructure
│       ├── api/                   # Base API client
│       ├── ui/                    # UI kit (Button, Card, SearchableSelect)
│       ├── telegram/              # Telegram SDK integration
│       ├── config/                # Configuration
│       └── lib/                   # Utility functions
│
├── index.html                      # HTML template
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies

src/webapp/                          # Backend API (NestJS)
├── webapp.controller.ts             # REST endpoints
├── webapp.service.ts                # Business logic
├── webapp.module.ts                 # Module definition
├── guards/
│   └── webapp-auth.guard.ts         # Telegram auth validation
└── dtos/
    └── webapp.dto.ts                # API DTOs

public/webapp/                       # Build output (auto-generated)
├── index.html
└── assets/                          # JS/CSS bundles
```

---

## Layer Descriptions

### 1. App Layer (`app/`)
Application initialization, providers, and global styles.
- **Can import from**: All layers
- **Contents**: `App.tsx`, entry point, global CSS

### 2. Pages Layer (`pages/`)
Full page components that represent routes.
- **Can import from**: `widgets`, `features`, `entities`, `shared`
- **Example**: `StatsPage`, `AdminLoginPage`, `AdminResultsPage`

### 3. Widgets Layer (`widgets/`)
Complex UI compositions that combine entities and features.
- **Can import from**: `entities`, `features`, `shared`
- **Example**: `Layout`, `GameCard`

### 4. Features Layer (`features/`)
User interactions and business features.
- **Can import from**: `entities`, `shared`, other `features`
- **Example**: `join-game`, `leave-game`, `admin-auth`

### 5. Entities Layer (`entities/`)
Business entities with their types, APIs, and UI components.
- **Can import from**: `shared`, other `entities`
- **Example**: `game`, `user`, `stats`, `admin`
- **Structure per entity**: `model/` (types), `api/` (API methods), `ui/` (components)

### 6. Shared Layer (`shared/`)
Reusable infrastructure with no business logic.
- **Can be imported from anywhere**
- **Contents**: UI kit, API base, Telegram SDK, utilities

---

## Import Rules

| Layer | Can Import From |
|-------|-----------------|
| `shared` | - (foundation layer) |
| `entities` | `shared`, other `entities` |
| `features` | `shared`, `entities`, other `features` |
| `widgets` | `shared`, `entities`, `features` |
| `pages` | All lower layers |
| `app` | All layers |

### Path Aliases

All imports use the `@/` alias pointing to `src/`:

```typescript
// Shared
import { Button, Card } from '@/shared/ui';
import { useTelegram } from '@/shared/telegram';

// Entities
import { gameApi, GameStatusBadge, type Game } from '@/entities/game';
import { userApi } from '@/entities/user';

// Features
import { RoleSelector } from '@/features/join-game';
import { adminAuthApi } from '@/features/admin-auth';

// Widgets
import { Layout, GameCard } from '@/widgets';

// Pages
import { StatsPage, AdminLoginPage } from '@/pages';
```

---

## Frontend

### Shared UI Components

#### Button
```typescript
import { Button } from '@/shared/ui';

<Button 
  onClick={handleClick}
  variant="primary" | "secondary" | "danger"
  fullWidth
  loading
>
  Text
</Button>
```

#### Card
```typescript
import { Card } from '@/shared/ui';

<Card onClick={handleClick} padding>
  Content
</Card>
```

#### SearchableSelect
```typescript
import { SearchableSelect } from '@/shared/ui';

<SearchableSelect
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  options={[{ value: 1, label: 'Option 1' }]}
  placeholder="Select..."
/>
```

### Entity UI Components

#### GameStatusBadge
```typescript
import { GameStatusBadge, GameStatus } from '@/entities/game';

<GameStatusBadge status={GameStatus.REGISTRATION} />
// Shows: 📝 Registration
```

#### UserAvatar
```typescript
import { UserAvatar } from '@/entities/user';

<UserAvatar name="John" size={64} />
```

### Widgets

#### Layout
```typescript
import { Layout } from '@/widgets/layout';

<Layout header={header} footer={footer}>
  {children}
</Layout>
```

#### GameCard
```typescript
import { GameCard } from '@/widgets/game-card';
import type { Game } from '@/entities/game';

<GameCard game={game} onClick={handleClick} />
```

### Features

#### RoleSelector (Join Game)
```typescript
import { RoleSelector } from '@/features/join-game';

<RoleSelector
  onSelect={(role) => setSelectedRole(role)}
  onJoin={handleJoin}
  isLoading={isLoading}
/>
```

### Pages

| Page | Component | Description |
|------|-----------|-------------|
| Stats | `StatsPage` | Public speaker/judge statistics |
| Admin Login | `AdminLoginPage` | Admin password authentication |
| Admin Results | `AdminResultsPage` | Submit game results with scores |

---

## Backend API

### Endpoints

All endpoints are prefixed with `/webapp` and require authentication.

#### Get Config
```
GET /webapp/config
```

#### List Open Games
```
GET /webapp/games
```

#### Get Game Details
```
GET /webapp/games/:id
```

#### Get My Game
```
GET /webapp/games/my
```

#### Join Game
```
POST /webapp/games/:id/join
Body: { "role": "player" | "judge" | "wing" }
```

#### Leave Game
```
POST /webapp/games/:id/leave
```

#### Get Profile
```
GET /webapp/profile
```

#### Get Judge Stats
```
GET /webapp/profile/judge-stats
```

### Stats Endpoint (Public)

```
GET /stats
```
Returns public speaker and judge statistics. No authentication required.

### Admin Endpoints

Require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Login with password |
| GET | `/admin/users` | Get all users |
| GET | `/admin/games/completed` | Get games for results |
| GET | `/admin/games/:id/details` | Get game details |
| POST | `/admin/games/results` | Submit results |
| POST | `/admin/games/completed` | Create completed game |

---

## Authentication

The Mini App uses Telegram's built-in authentication:

1. User opens app from Telegram bot
2. Telegram SDK provides `initData` with user info
3. Frontend sends `X-Telegram-Init-Data` header
4. Backend validates the hash using bot token

### Dev Mode

In development, mock initData is used:
```typescript
// From shared/api/base.ts
const mockUser = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
};
```

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install webapp dependencies
cd webapp && npm install

# Or from root
npm run webapp:install
```

### Development Server

```bash
# Start Vite dev server (with hot reload)
npm run webapp:dev

# Server runs on http://localhost:5173
# API proxy configured to localhost:3001
```

### Build

```bash
# Build for production
npm run webapp:build

# Output goes to public/webapp/
```

### Full Build

```bash
# Build webapp + server
npm run build

# Build server only
npm run build:server
```

### Environment Variables

```bash
VITE_API_URL=/webapp    # API base URL
```

---

## Deployment

### Production Build

```bash
# 1. Build webapp
npm run webapp:build

# 2. Build server
npm run build:server

# 3. Static files served from public/webapp/
```

### Environment Configuration

```bash
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBAPP_URL=https://your-domain.com/webapp
NODE_ENV=production
ADMIN_PASSWORD=your_secure_admin_password
```

---

## Telegram SDK

### useTelegram Hook

```typescript
import { useTelegram } from '@/shared/telegram';

const {
  isReady,              // SDK initialized
  user,                 // Telegram user info
  theme,                // Theme colors
  viewportHeight,       // Viewport height
  showBackButton,       // Show native back button
  hideBackButton,       // Hide back button
  showMainButton,       // Show main button
  hideMainButton,       // Hide main button
  impactOccurred,       // Haptic feedback
  notificationOccurred, // Notification feedback
  closeApp,             // Close Mini App
  expandApp,            // Expand to full height
} = useTelegram();
```

### Theme Integration

```typescript
const theme = {
  bgColor: '#ffffff',
  textColor: '#000000',
  hintColor: '#999999',
  linkColor: '#2481cc',
  buttonColor: '#2481cc',
  buttonTextColor: '#ffffff',
  secondaryBgColor: '#f5f5f5',
};
```

### Haptic Feedback

```typescript
impactOccurred('light');     // Light impact (buttons)
impactOccurred('medium');    // Medium impact
notificationOccurred('success');
notificationOccurred('error');
```

---

## Styling

### CSS Variables

```css
body {
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
}

.card {
  background-color: var(--tg-theme-secondary-bg-color);
}
```

### Mobile-First

```css
/* Prevent text selection */
* {
  -webkit-user-select: none;
  user-select: none;
}

input, textarea {
  -webkit-user-select: text;
  user-select: text;
}
```

---

## Common Tasks

### Adding a New Page

1. Create folder in `src/pages/{page-name}/ui/`
2. Add page component `PageName.tsx`
3. Add `index.ts` to export component
4. Export from `src/pages/index.ts`
5. Import in `src/app/App.tsx`

```typescript
// src/pages/my-page/ui/MyPage.tsx
export const MyPage: React.FC = () => {
  return <Layout><h1>My Page</h1></Layout>;
};

// src/pages/my-page/ui/index.ts
export { MyPage } from './MyPage';

// src/pages/my-page/index.ts
export { MyPage } from './ui';

// src/pages/index.ts
export { MyPage } from './my-page';
```

### Adding a New Entity

1. Create folder in `src/entities/{entity-name}/`
2. Add subfolders: `model/`, `api/`, `ui/` (optional)
3. Define types in `model/types.ts`
4. Create API methods in `api/{entity}Api.ts`
5. Add UI components in `ui/` (if needed)
6. Export from `src/entities/index.ts`

```typescript
// src/entities/product/model/types.ts
export interface Product {
  id: string;
  name: string;
  price: number;
}

// src/entities/product/api/productApi.ts
import { apiClient } from '@/shared/api';
import type { Product } from '../model';

export const productApi = {
  getProducts: () => apiClient.get<Product[]>('/products'),
};

// src/entities/product/index.ts
export * from './model';
export * from './api';
```

### Adding a New Feature

1. Create folder in `src/features/{feature-name}/`
2. Add subfolders: `api/`, `model/`, `ui/`
3. Implement feature logic
4. Export from `src/features/index.ts`

### Adding a Shared UI Component

1. Create folder in `src/shared/ui/{ComponentName}/`
2. Add component file `ComponentName.tsx`
3. Add `index.ts` to export
4. Export from `src/shared/ui/index.ts`

```typescript
// src/shared/ui/Badge/Badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children }) => {
  return <span className="badge">{children}</span>;
};

// src/shared/ui/Badge/index.ts
export { Badge } from './Badge';

// src/shared/ui/index.ts
export { Badge } from './Badge';
```

### Adding an API Endpoint

1. Add method to appropriate entity's `api/` folder
2. Or add to `src/shared/api/` if shared

```typescript
// src/entities/game/api/gameApi.ts
export const gameApi = {
  // Existing methods...
  
  // New endpoint
  updateGame: (id: string, data: UpdateGameDto) =>
    apiClient.patch<Game>(`/games/${id}`, data),
};
```

### Using Telegram Theme

```typescript
import { useTelegram } from '@/shared/telegram';

const MyComponent: React.FC = () => {
  const { theme } = useTelegram();
  
  return (
    <div style={{ backgroundColor: theme.secondaryBgColor }}>
      <span style={{ color: theme.textColor }}>Content</span>
    </div>
  );
};
```

---

## Troubleshooting

### WebApp not loading

1. Check `TELEGRAM_WEBAPP_URL` is set correctly
2. Verify `public/webapp/` exists after build
3. Check browser console for errors

### Authentication failing

1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. Check `X-Telegram-Init-Data` header is sent
3. In dev mode, ensure mock data is used

### Theme not applying

1. Check Telegram SDK is initialized
2. Verify CSS variables are defined
3. Test in different Telegram themes (light/dark)

### Import errors after refactoring

1. Ensure path aliases are correct (`@/`)
2. Check that barrel exports (`index.ts`) exist
3. Verify file names match import statements

### TypeScript errors

```bash
# Check types without emitting
npx tsc --noEmit
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `npm run webapp:install` |
| Dev server | `npm run webapp:dev` |
| Build webapp | `npm run webapp:build` |
| Type check | `npx tsc --noEmit` |
| Build all | `npm run build` |
| Build server | `npm run build:server` |

---

## Resources

- [Feature-Sliced Design Documentation](https://feature-sliced.design/)
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [React Documentation](https://react.dev/)

---

*Last updated: April 2026*  
*Mini App Version: 1.0.0*  
*Architecture: Feature-Sliced Design (FSD)*
