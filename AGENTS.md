# AGENTS.md — TaskVibe

## Project overview

Kanban board app (TCC project) with multi-user boards: the owner can invite other registered users by e-mail with `visualizar` (read-only) or `editar` permission. Two independent packages, no monorepo tooling — each runs separately.

| Package | Stack | Entry point | Port |
|---------|-------|-------------|------|
| `api/`  | Express 5 · Mongoose 9 · JWT · bcrypt · ESM | `src/server.js` | 3001 |
| `ui/`   | React 19 · Vite 8 · JSX | `src/main.jsx` | 5173 |

## Running locally

```bash
# API (from repo root)
cd api && npm run dev    # nodemon, port 3001

# UI (from repo root)
cd ui && npm run dev     # vite dev server, port 5173
```

Both must run simultaneously for the app to work. The UI connects to `http://localhost:3001` via `ui/src/services/api.js`.

## Commands

| Command | Where | What it does |
|---------|-------|--------------|
| `npm run dev` | `api/` | Starts API with nodemon |
| `npm run dev` | `ui/` | Starts Vite dev server |
| `npm run lint` | `ui/` | ESLint (react-hooks + react-refresh) |
| `npm run build` | `ui/` | Production build |

**No tests, no typecheck, no formatter configured in either package.**

## Environment

API requires `api/.env` with `MONGODB_URI` (MongoDB Atlas) **and** `JWT_SECRET` (used to sign/verify login tokens). The file exists and is **not gitignored** — be careful not to commit real secrets.

## Architecture

### API — MVC pattern

```
api/src/
  server.js          — Express app, mounts routes, connects DB
  database/          — connection.js (Mongoose + dotenv)
  middleware/        — auth.js (JWT Bearer -> req.usuarioId)
  models/            — Mongoose schemas
  controllers/       — Request handlers
  routes/            — Express Router definitions
  utils/             — permissaoQuadro.js (board access/permission helpers)
```

**Route prefixes:** `/card`, `/usuario`, `/quadro`, `/coluna`

**Auth:** every route except `POST /usuario/login` and `POST /usuario` requires `Authorization: Bearer <token>`. Login/register return `{ ...usuario, token }`; passwords hashed with bcrypt. The UI stores `user` + `token` in localStorage; the axios instance attaches the header and redirects to `/login` on `401`.

**Data model (MongoDB):**
- `Usuario` → has many `Quadro`
- `Quadro` → has many `Coluna`, has many `Card`; has `membros[]` (`id_usuario`, `email`, `nome`, `permissao: ["visualizar","editar"]`)
- `Coluna` → belongs to `Quadro`
- `Card` → belongs to `Quadro`

**Permissions (`utils/permissaoQuadro.js`):** `permissaoQuadro(quadroId, usuarioId)` returns `"dono" | "editar" | "visualizar" | null`. Reads require any non-null permission; writes (POST/PUT/DELETE of card/coluna) require `dono` or `editar`; member management (`POST/PUT/DELETE /quadro/:id/membros...`) and quadro update/delete require `dono`. `GET /quadro` only lists boards where the user is owner or member.

### UI — Pages + Components

```
ui/src/
  App.jsx            — BrowserRouter, all routes
  pages/             — Route-level components
  components/        — Shared UI components (Navbar, modals, AuthDecor, ShareBoardModal, etc.)
  services/api.js    — Axios instance (baseURL: localhost:3001, auth interceptors)
```

**Routes:** `/` → Register, `/login`, `/home`, `/dashboard`, `/quadro/:id`, `/settings`, `/reports`

**Read-only boards:** `Boardview.jsx` computes the role from `quadro.membros` and hides all create/edit/delete controls (cards, columns, colors, upload) when the user is `visualizar`; a separate `semAcesso` screen shows when the board is not accessible. `Dashboard.jsx` marks member boards with a "Compartilhado" badge and hides the delete button for non-owners.

## Conventions

- **Language:** Portuguese for DB fields, route paths, variable names, and comments
- **ESM everywhere** — both packages use `"type": "module"`
- **No TypeScript** in app code (api has `@types/*` devDeps but no TS files)
- **CSS strategy:** plain `.css` files + some `.module.css` (Boardview)
- **Icons:** lucide-react
- **Styling:** no CSS framework — all custom CSS

## Gotchas

- `server.js` sets DNS to Google (8.8.8.8) and forces IPv4 — intentional for MongoDB Atlas connectivity on some networks
- API `package.json` has `main: "index.js"` but entry is `src/server.js` — ignore the `main` field
- `@rolldown/binding-win32-x64-msvc` is in `ui/` optionalDependencies — Windows-specific Vite binary
- Vite config is minimal (no proxy, no aliases) — API calls go directly to localhost:3001
- No `.env.example` — new devs must create `api/.env` manually with a valid `MONGODB_URI` + `JWT_SECRET`
- Old accounts created before bcrypt are auto-migrated on next successful login (`usuarioController.js` compares plain text once, then re-hashes)
- Logging in with an expired/invalid token → `401` → the axios interceptor clears localStorage and hard-redirects to `/login`
- Default columns are only auto-created on first open when the user can edit (`Boardview.jsx` passes `podeCriar` to `fetchColunas`)