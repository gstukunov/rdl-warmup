# Telegram Mini App - Developer Guide

> **Quick Start**: This is a React-based Telegram Mini App for the RDL Warmup Bot. Users can open it directly from the Telegram bot to manage games with a modern mobile UI.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Frontend](#frontend)
5. [Backend API](#backend-api)
6. [Authentication](#authentication)
7. [Development](#development)
8. [Deployment](#deployment)
9. [Telegram SDK](#telegram-sdk)
10. [Styling](#styling)

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
│  - React Router for navigation                               │
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

## Project Structure

```
webapp/                              # React frontend
├── src/
│   ├── api/                         # API clients
│   │   ├── client.ts                # Axios client with auth header
│   │   ├── games.ts                 # Games API methods
│   │   └── user.ts                  # User API methods
│   │
│   ├── components/                  # Reusable UI components
│   │   ├── Layout.tsx               # Page layout with header/footer
│   │   ├── Card.tsx                 # Card container component
│   │   ├── Button.tsx               # Button with Telegram styling
│   │   └── GameStatus.tsx           # Game status badge
│   │
│   ├── hooks/                       # Custom React hooks
│   │   └── useTelegram.ts           # Telegram SDK integration
│   │
│   ├── pages/                       # Page components
│   │   ├── GamesList.tsx            # Games list page (home)
│   │   ├── GameDetails.tsx          # Game details page
│   │   └── Profile.tsx              # User profile page
│   │
│   ├── types/                       # TypeScript types
│   │   └── index.ts                 # All type definitions
│   │
│   ├── App.tsx                      # Main app with routing
│   ├── main.tsx                     # Entry point
│   └── vite-env.d.ts                # Vite type declarations
│
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript config
└── package.json                     # Dependencies

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

## Frontend

### Components

#### Layout
Main page layout that adapts to Telegram's viewport:
```typescript
<Layout header={header} footer={footer}>
  {children}
</Layout>
```

#### Card
Container component with Telegram theme colors:
```typescript
<Card onClick={handleClick} padding>
  Content
</Card>
```

#### Button
Styled button with haptic feedback:
```typescript
<Button 
  onClick={handleClick}
  variant="primary" | "secondary" | "danger"
  fullWidth
  loading
>
  Text
</Button>
```

#### GameStatusBadge
Status indicator with appropriate colors:
```typescript
<GameStatusBadge status={GameStatus.REGISTRATION} />
// Shows: 📝 Registration
```

### Pages

| Page | Route | Description |
|------|-------|-------------|
| GamesList | `/` | Shows open games and user's active game |
| GameDetails | `/games/:id` | Game details, join/leave, participants |
| Profile | `/profile` | User stats and judge ratings |
| LoginPage | `/admin` | Admin login with password |
| GameResultsPage | `/admin/results` | Submit game results with scores |

### State Management

The app uses React hooks for state management:
- `useState` for local component state
- `useEffect` for side effects (data fetching)
- Custom `useTelegram` hook for Telegram SDK

---

## Backend API

### Endpoints

All endpoints are prefixed with `/webapp` and require authentication.

#### Get Config
```
GET /webapp/config
```
Returns bot configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "botUsername": "rdl_warmup_bot",
    "apiBaseUrl": "https://example.com/webapp",
    "environment": "production"
  }
}
```

#### List Open Games
```
GET /webapp/games
```
Returns all games in registration/allocating status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Game Name",
      "description": "Description",
      "status": "registration",
      "maxParticipants": 20,
      "participantCount": 5,
      "isUserRegistered": false,
      "createdAt": "2026-04-01T..."
    }
  ]
}
```

#### Get Game Details
```
GET /webapp/games/:id
```
Returns detailed game information with participants.

#### Get My Game
```
GET /webapp/games/my
```
Returns user's currently active game (or null).

#### Join Game
```
POST /webapp/games/:id/join
Body: { "role": "player" | "judge" | "wing" }
```
Join a game with selected role.

#### Leave Game
```
POST /webapp/games/:id/leave
```
Leave a game (only during registration).

#### Get Profile
```
GET /webapp/profile
```
Returns user profile with stats.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "telegramId": 123456789,
      "username": "user",
      "firstName": "Name",
      "lastName": null,
      "isActive": true,
      "createdAt": "2026-01-01T..."
    },
    "gamesPlayed": 10,
    "averageSpeakerScore": 75.5
  }
}
```

#### Get Judge Stats
```
GET /webapp/profile/judge-stats
```
Returns judge rating statistics.

### Stats Endpoint (Public)

#### Get Public Stats
```
GET /stats
```
Returns public speaker and judge statistics. No authentication required.

**Response:**
```json
{
  "success": true,
  "data": {
    "speakers": [
      {
        "telegramId": 123456789,
        "username": "user",
        "firstName": "John",
        "gamesPlayed": 10,
        "averageScore": 75.5
      }
    ],
    "judges": [
      {
        "telegramId": 987654321,
        "username": "judge",
        "firstName": "Jane",
        "gamesJudged": 5,
        "averageScore": 4.2
      }
    ]
  }
}
```

### Admin Endpoints

These endpoints require admin password authentication via `Authorization: Bearer <token>` header.

#### Admin Login
```
POST /admin/login
Body: { "password": "admin_password" }
```
Returns a token for subsequent admin requests.

#### Get Users
```
GET /admin/users
Authorization: Bearer <token>
```
Returns list of all users for speaker/judge selection.

#### Get Completed Games
```
GET /admin/games/completed
Authorization: Bearer <token>
```
Returns games that are in progress or completed (ready for results submission).

#### Get Game Details (Admin)
```
GET /admin/games/:id/details
Authorization: Bearer <token>
```
Returns detailed game info for admin purposes.

#### Submit Game Results
```
POST /admin/games/results
Authorization: Bearer <token>
Body: {
  "gameId": "uuid",
  "motion": "This house would...",
  "openingGovernment": {
    "telegramId": 123456789,
    "isIronman": false,
    "score": 75
  },
  "openingOpposition": {
    "telegramId": 987654321,
    "isIronman": false,
    "score": 72
  },
  "closingGovernment": {
    "telegramId": 111222333,
    "isIronman": false,
    "score": 70
  },
  "closingOpposition": {
    "telegramId": 444555666,
    "isIronman": false,
    "score": 68
  },
  "judgeTelegramId": 777888999
}
```
Submits speaker scores for all positions and marks game as completed.

---

## Authentication

The Mini App uses Telegram's built-in authentication mechanism:

### Flow

1. **User opens app** from Telegram bot
2. **Telegram SDK** provides `initData` containing:
   - User info (id, first_name, last_name, username)
   - Auth date
   - Hash (HMAC-SHA256 signature)

3. **Frontend** sends `X-Telegram-Init-Data` header with each request

4. **Backend** validates the hash:
   ```typescript
   // WebAppAuthGuard
   const isValid = validateInitData(initData, botToken);
   ```

5. **User identity** is extracted from initData and attached to request

### Security

- Hash validation ensures data comes from Telegram
- No separate login/password required
- HTTPS required in production
- initData is unique per session

### Dev Mode

In development, mock initData is used:
```typescript
// webapp/src/api/client.ts
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

Frontend uses these variables from `.env`:
```bash
# In development, API client uses this base URL
VITE_API_URL=/webapp
```

---

## Deployment

### Production Build

1. Build the webapp:
   ```bash
   npm run webapp:build
   ```

2. Build the server:
   ```bash
   npm run build:server
   ```

3. Static files are automatically served from `public/webapp/`

### Docker

The webapp is included in the production build:
```dockerfile
# Build webapp
RUN npm run webapp:build

# Build server
RUN npm run build:server

# Static files are in public/webapp/
```

### Environment Configuration

Ensure these are set in production:
```bash
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBAPP_URL=https://your-domain.com/webapp
NODE_ENV=production
ADMIN_PASSWORD=your_secure_admin_password
```

### BotFather Configuration

1. Open [@BotFather](https://t.me/botfather)
2. Send `/mybots`
3. Select your bot
4. Go to **Bot Settings** → **Menu Button** → **Configure menu button**
5. Set button text: "Open App"
6. Set URL: `https://your-domain.com/webapp`

---

## Telegram SDK

### useTelegram Hook

Custom hook that provides Telegram SDK functionality:

```typescript
const {
  isReady,           // SDK initialized
  user,              // Telegram user info
  theme,             // Theme colors
  viewportHeight,    // Viewport height
  showBackButton,    // Show native back button
  hideBackButton,    // Hide back button
  showMainButton,    // Show main button
  hideMainButton,    // Hide main button
  impactOccurred,    // Haptic feedback
  notificationOccurred, // Notification feedback
  closeApp,          // Close Mini App
  expandApp,         // Expand to full height
} = useTelegram();
```

### Theme Integration

The app automatically adapts to Telegram's theme:

```typescript
// Theme colors from Telegram
const theme = {
  bgColor: '#ffffff',           // Background
  textColor: '#000000',         // Text
  hintColor: '#999999',         // Secondary text
  linkColor: '#2481cc',         // Links
  buttonColor: '#2481cc',       // Button background
  buttonTextColor: '#ffffff',   // Button text
  secondaryBgColor: '#f5f5f5',  // Card background
};

// Applied as CSS variables
--tg-theme-bg-color
--tg-theme-text-color
...
```

### Haptic Feedback

```typescript
// Light impact (buttons)
impactOccurred('light');

// Medium impact (important actions)
impactOccurred('medium');

// Notifications
notificationOccurred('success');
notificationOccurred('error');
notificationOccurred('warning');
```

### Native Buttons

```typescript
// Show back button
showBackButton(() => navigate(-1));

// Show main button
showMainButton('Join Game', handleJoin, { color: '#27ae60' });

// Hide buttons on cleanup
useEffect(() => {
  return () => {
    hideBackButton();
    hideMainButton();
  };
}, []);
```

---

## Styling

### CSS Variables

Telegram theme colors are available as CSS variables:

```css
body {
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
}

.card {
  background-color: var(--tg-theme-secondary-bg-color);
}

.button {
  background-color: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
}
```

### Mobile-First

The app is designed for mobile first:

```css
/* Prevent text selection */
* {
  -webkit-user-select: none;
  user-select: none;
}

/* Allow text selection in inputs */
input, textarea {
  -webkit-user-select: text;
  user-select: text;
}

/* Prevent pull-to-refresh */
body {
  overscroll-behavior: none;
}
```

### Responsive Design

```typescript
// Layout adapts to viewport
const { viewportHeight } = useTelegram();

<div style={{ minHeight: viewportHeight }}>
  {/* Content */}
</div>
```

---

## Common Tasks

### Adding a New Page

1. Create page component in `webapp/src/pages/`
2. Add route in `webapp/src/App.tsx`
3. Add link/navigation to the page

### Adding an API Endpoint

1. Add method to `webapp/src/api/client.ts` or create new file
2. Add endpoint to `src/webapp/webapp.controller.ts`
3. Implement logic in `src/webapp/webapp.service.ts`
4. Update DTOs in `src/webapp/dtos/webapp.dto.ts`

### Using Telegram Theme

```typescript
const { theme } = useTelegram();

const style = {
  backgroundColor: theme.secondaryBgColor,
  color: theme.textColor,
};
```

### Handling Back Button

```typescript
const navigate = useNavigate();
const { showBackButton, hideBackButton } = useTelegram();

useEffect(() => {
  showBackButton(() => navigate(-1));
  return () => hideBackButton();
}, []);
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

### API calls failing

1. Check CORS configuration in `main.ts`
2. Verify API base URL is correct
3. Check `X-Telegram-Init-Data` header

---

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `npm run webapp:install` |
| Dev server | `npm run webapp:dev` |
| Build webapp | `npm run webapp:build` |
| Build all | `npm run build` |
| Build server | `npm run build:server` |

---

*Last updated: April 2026*
*Mini App Version: 1.0.0*
