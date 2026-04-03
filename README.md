# HL Service Manager

Client service management portal for GoHighLevel service providers. Submit requests, track progress, and collaborate — all in one place.

Built with [Hono](https://hono.dev/) on [Cloudflare Workers](https://workers.cloudflare.com/), using D1 (SQLite) for data and KV for sessions.

## Features

- **Client portal** — clients log in with their email, see their dashboard, submit tickets, and track progress
- **Admin panel** — manage organizations, view all tickets, update statuses, and reply
- **Domain-based auth** — email domain maps clients to their organization automatically
- **Ticket management** — create, comment, filter by status, update priority
- **Cloudflare Workers** — deploys to the edge, fast everywhere

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (included as dependency)

### Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:8787/setup` once to create the database tables and seed demo data.

- **Client login:** any `@demoagency.com` email (e.g. `test@demoagency.com`)
- **Admin login:** username `admin`, password `admin`

### Deploy to Cloudflare

1. Create the D1 database and KV namespace:

```bash
npx wrangler d1 create hl-servicemanager-db
npx wrangler kv namespace create SESSIONS
```

2. Update `wrangler.toml` with the real `database_id` and KV `id` from the output above.

3. Deploy:

```bash
npm run deploy
```

4. Visit `https://your-worker.your-subdomain.workers.dev/setup` once to initialize the database.

## Project Structure

```
src/
  index.tsx             # App entry point, route mounting, setup endpoint
  types.ts              # TypeScript types and interfaces
  middleware/auth.ts     # Client and admin auth middleware
  routes/
    public.tsx          # Landing page, login/logout handlers
    client.tsx          # Client dashboard and ticket routes
    admin.tsx           # Admin dashboard, org and ticket management
  views/
    layout.tsx          # Base HTML layout with Pico CSS
    components.tsx      # Shared UI components (badges, tables, cards)
  db/queries.ts         # All D1 database queries
  lib/
    session.ts          # KV session management
    password.ts         # PBKDF2 password hashing via Web Crypto API
schema.sql              # Database schema reference
seed.sql                # Sample data reference
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Framework | Hono v4 (JSX server rendering) |
| Database | Cloudflare D1 (SQLite) |
| Sessions | Cloudflare KV |
| CSS | Pico CSS |
| Auth | PBKDF2 (Web Crypto API) |
