# Webapp - Base Architecture

> **Location**: `webapp/` folder  
> **Framework**: React 18 + TypeScript + Vite  
> **Architecture**: Feature-Sliced Design (FSD)  
> **UI**: shadcn/ui + Tailwind CSS  

---

## Architecture Overview

The webapp follows **Feature-Sliced Design (FSD)** - a scalable frontend architecture that organizes code by business domains rather than technical types.

```
┌─────────────────────────────────────────────────────────────┐
│  PAGES (Routes)                                              │
│  - StatsPage, AdminLoginPage, AdminResultsPage              │
│  - Full page components, routing entry points               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  WIDGETS (Complex Compositions)                              │
│  - Layout, GameCard                                         │
│  - Combine entities and features into reusable blocks       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  FEATURES (User Interactions)                                │
│  - join-game, leave-game, admin-auth                        │
│  - Business logic + UI for specific features                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  ENTITIES (Business Domain)                                  │
│  - game, user, stats, admin                                 │
│  - Types, API methods, UI components per domain             │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  SHARED (Infrastructure)                                     │
│  - ui (shadcn components)                                   │
│  - api (Axios client)                                       │
│  - telegram (SDK integration)                               │
│  - theme (dark/light mode)                                  │
│  - lib (utilities)                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
webapp/src/
├── app/                          # Application initialization
│   ├── App.tsx                  # Root component with routing
│   ├── index.tsx                # Entry point
│   ├── providers/               # React Query provider
│   │   └── QueryProvider.tsx
│   └── styles/                  # Global styles
│       ├── globals.css         # Tailwind + theme vars
│       └── App.css             # App-specific styles
│
├── pages/                        # Page components (routes)
│   ├── stats/
│   │   └── ui/
│   │       └── StatsPage.tsx
│   ├── admin-login/
│   │   └── ui/
│   │       └── AdminLoginPage.tsx
│   └── admin-results/
│       └── ui/
│           └── AdminResultsPage.tsx
│
├── widgets/                      # Complex UI compositions
│   ├── layout/
│   │   └── ui/
│   │       └── Layout.tsx
│   └── game-card/
│       └── ui/
│           └── GameCard.tsx
│
├── features/                     # User interactions
│   ├── join-game/
│   ├── leave-game/
│   └── admin-auth/
│
├── entities/                     # Business entities
│   ├── game/                    # Game entity
│   │   ├── model/              # Types, constants
│   │   ├── api/                # API methods, queries
│   │   └── ui/                 # Entity UI components
│   ├── user/                    # User entity
│   ├── stats/                   # Statistics entity
│   └── admin/                   # Admin operations
│
└── shared/                       # Shared infrastructure
    ├── api/                      # Base API client
    ├── ui/                       # UI kit (shadcn)
    ├── telegram/                 # Telegram SDK
    ├── theme/                    # Theme system
    └── lib/                      # Utilities (cn, etc.)
```

---

## Layer Import Rules

| Layer | Can Import From |
|-------|-----------------|
| `shared` | - (foundation) |
| `entities` | `shared`, other `entities` |
| `features` | `shared`, `entities`, other `features` |
| `widgets` | `shared`, `entities`, `features` |
| `pages` | All lower layers |
| `app` | All layers |

**Example**:
```typescript
// ✅ Correct - entity imports from shared
import { Button } from '@/shared/ui';

// ✅ Correct - feature imports from entity
import { gameApi } from '@/entities/game';

// ❌ Wrong - shared importing from entity
import { gameApi } from '@/entities/game'; // In shared/ui!

// ❌ Wrong - circular dependency
// entities/game importing from entities/user
```

---

## Path Aliases

All imports use `@/` pointing to `src/`:

```typescript
// Shared
import { Button, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useTelegram } from '@/shared/telegram';

// Entities
import { gameApi, type Game } from '@/entities/game';
import { userApi } from '@/entities/user';

// Features
import { useJoinGame } from '@/features/join-game';

// Widgets
import { Layout } from '@/widgets/layout';

// Pages
import { StatsPage } from '@/pages/stats';
```

---

## State Management

### React Query (TanStack Query)

Used for server state (API data):

```typescript
// entities/game/api/queries.ts
export const useOpenGames = () => {
  return useQuery({
    queryKey: gameKeys.lists(),
    queryFn: () => gameApi.getOpenGames(),
  });
};

// Usage in component
const { data: games, isLoading } = useOpenGames();
```

### Local State

Use React `useState` for component-local state:

```typescript
const [isOpen, setIsOpen] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
```

---

## UI Components (shadcn/ui)

All UI components are in `shared/ui/` with folder-per-component structure:

```
shared/ui/
├── badge/              # Status badges
├── button/             # Button with variants
├── card/               # Card container
├── dialog/             # Modal dialog
├── input/              # Text input
├── label/              # Form label
├── select/             # Dropdown select
├── separator/          # Divider line
├── skeleton/           # Loading placeholder
├── tabs/               # Tab navigation
├── theme-toggle/       # Dark/light switch
├── toast/              # Notifications
└── SearchableSelect/   # Custom searchable dropdown
```

### Usage

```typescript
import { Button, Card, Input, Label } from '@/shared/ui';

// Button
<Button variant="default" size="sm" loading={isPending}>
  Submit
</Button>

// Card
<Card>
  <CardContent>Content</CardContent>
</Card>

// Form
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter name" />
</div>
```

---

## Theme System

### Dark/Light Mode

- Toggle: `ThemeToggle` component
- Hook: `useTheme()`
- Storage: localStorage
- System: Detects `prefers-color-scheme`

```typescript
import { useTheme } from '@/shared/theme';
import { ThemeToggle } from '@/shared/ui';

// Toggle button
<ThemeToggle />

// Access theme
const { isDark, toggleTheme } = useTheme();
```

### Telegram Theme

CSS variables sync with Telegram colors:
```css
--tg-theme-bg-color
--tg-theme-text-color
--tg-theme-secondary-bg-color
--tg-theme-button-color
```

Tailwind classes:
```html
<div class="bg-telegram-bg text-telegram-text">
  <button class="bg-telegram-button text-telegram-button-text">
```

---

## API Communication

### API Client

Axios-based client in `shared/api/`:

```typescript
import { apiClient } from '@/shared/api';

// GET
const { data } = await apiClient.get('/games');

// POST
await apiClient.post('/games', { name: 'Game 1' });
```

### Telegram Auth

All WebApp API calls include `X-Telegram-Init-Data` header automatically.

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
  impactOccurred,       // Haptic feedback
  notificationOccurred, // Notification feedback
} = useTelegram();
```

### Haptic Feedback

```typescript
// Button click
impactOccurred('light');

// Success action
notificationOccurred('success');

// Error
notificationOccurred('error');
```

---

## Styling

### Tailwind CSS

Utility-first CSS with custom theme:

```typescript
// Telegram theme colors
<div className="bg-telegram-bg text-telegram-text">
  <span className="text-telegram-hint">Hint</span>
</div>

// Spacing
<div className="p-4 space-y-4">
  <h1 className="text-xl font-bold">Title</h1>
</div>
```

### CSS Variables

```css
:root {
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  /* ... */
}

.dark {
  --tg-theme-bg-color: #000000;
  --tg-theme-text-color: #ffffff;
  /* ... */
}
```

---

## Build & Deploy

### Development

```bash
# Start dev server (hot reload)
npm run webapp:dev

# Runs on http://localhost:5173
```

### Production

```bash
# Build webapp
npm run webapp:build

# Output: public/webapp/
```

---

## Best Practices

1. **Follow FSD layers** - Respect import rules
2. **Use path aliases** - `@/` for all imports
3. **Component folders** - One folder per component with `index.ts`
4. **React Query** - Use for all server state
5. **Local state** - Use `useState` for UI state
6. **Theme** - Use Tailwind classes, not inline styles
7. **Types** - Define types in `model/types.ts`

---

## Troubleshooting

### Build fails

```bash
# Clear cache and rebuild
rm -rf webapp/node_modules/.cache
npm run webapp:build
```

### TypeScript errors

```bash
# Check isolatedModules issues
cd webapp && npx tsc --noEmit

# Common fix: use 'import type' for interfaces
import type { Game } from '@/entities/game';
```

### ResizeObserver loop error

This benign error from Radix UI is suppressed in production. If you see it in development, it's harmless.

---

## See Also

- `ADDING_ENTITIES.md` - How to add new entities
- `../OVERVIEW.md` - System-wide overview
- `../api/BASE.md` - Backend architecture
