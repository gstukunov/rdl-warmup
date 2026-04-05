# WebApp - Feature-Sliced Design Architecture

This webapp follows the [Feature-Sliced Design (FSD)](https://feature-sliced.design/) architectural methodology.

## Architecture Overview

```
src/
├── app/                    # Application initialization layer
├── pages/                  # Page components
├── widgets/                # Complex UI compositions
├── features/               # User interactions and features
├── entities/               # Business entities
└── shared/                 # Shared infrastructure
```

## Layer Descriptions

### 1. App Layer (`app/`)
Application initialization, providers, and global styles.
- `App.tsx` - Root application component
- `index.tsx` - Entry point
- `styles/` - Global CSS styles

### 2. Pages Layer (`pages/`)
Full page components that represent routes.
- `stats/` - Public statistics page
- `admin-login/` - Admin authentication page
- `admin-results/` - Game results submission page

### 3. Widgets Layer (`widgets/`)
Complex UI compositions that combine entities and features.
- `layout/` - Page layout wrapper with Telegram theme support
- `game-card/` - Game card component for lists

### 4. Features Layer (`features/`)
User interactions and business features.
- `join-game/` - Join game functionality
- `leave-game/` - Leave game functionality
- `admin-auth/` - Admin authentication logic

### 5. Entities Layer (`entities/`)
Business entities with their types, APIs, and UI components.
- `game/` - Game entity (types, API, GameStatusBadge)
- `user/` - User entity (types, API, UserAvatar)
- `stats/` - Statistics entity
- `admin/` - Admin entity

### 6. Shared Layer (`shared/`)
Reusable infrastructure with no business logic.
- `api/` - Base API client
- `ui/` - Shared UI components (Button, Card, SearchableSelect)
- `telegram/` - Telegram SDK integration (useTelegram hook)
- `config/` - Configuration
- `lib/` - Utility functions

## Import Rules

- **Shared** can be imported from anywhere
- **Entities** can import from shared and other entities
- **Features** can import from shared, entities, and other features
- **Widgets** can import from shared, entities, features
- **Pages** can import from all lower layers
- **App** can import from all layers

## Path Aliases

All imports use the `@/` alias pointing to `src/`:

```typescript
import { Button } from '@/shared/ui';
import { gameApi } from '@/entities/game';
import { Layout } from '@/widgets/layout';
```

## Adding New Features

1. **New Entity**: Add to `entities/{entity}/` with `model/`, `api/`, `ui/`
2. **New Feature**: Add to `features/{feature}/` with user interaction logic
3. **New Page**: Add to `pages/{page}/ui/` and export from `pages/index.ts`
4. **New Shared Component**: Add to `shared/ui/{Component}/`

## Building

```bash
npm run build      # Production build
npm run dev        # Development server
npm run lint       # Run ESLint
```
