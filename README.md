# Movie Tracker

Track movies and TV shows you've watched, are watching, or want to watch.

---

## Restoring the project (migrating from Replit)

Follow these steps in order. Each one is short.

---

### Step 1 — Get a free database (Neon)

Neon is the same database provider Replit used, but you can have your own free account.

1. Go to **[neon.tech](https://neon.tech)** and sign up (free, no credit card)
2. Create a new project — name it anything (e.g. `movietracker`)
3. On the project dashboard, click **"Connect"** and copy the **Connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Keep this safe, you'll need it in the next steps.

---

### Step 2 — Get a TMDB API key

1. Go to **[themoviedb.org](https://www.themoviedb.org/signup)** and create a free account
2. Go to **Settings → API** and request an API key (choose "Developer")
3. Copy the **API Key (v3 auth)**

---

### Step 3 — Set up the database tables

Run this once to create all the tables in your new Neon database:

```bash
# Install dependencies first
npm install

# Create your env file
cp .env.example .env
# Now edit .env and fill in DATABASE_URL and TMDB_API_KEY

# Push the schema to your database
DATABASE_URL="your-neon-url" npm run db:push
```

---

### Step 4 — Restore your data from CSV files

You should have CSV files downloaded from Replit. Put them all in one folder, then run:

```bash
DATABASE_URL="your-neon-url" npx tsx scripts/import-csv.ts ./path/to/your/csv/folder
```

Expected CSV filenames (any that are missing are skipped):
- `users.csv`
- `movies.csv`
- `watchlist_items.csv`
- `currently_watching.csv`
- `watched_items.csv`
- `rewatches.csv`

---

### Step 5 — Run locally (optional)

```bash
# Make sure .env is filled in
npm run dev
# Open http://localhost:5000
```

---

### Step 6 — Deploy to Render (free hosting)

1. Go to **[render.com](https://render.com)** and sign up with your GitHub account
2. Click **"New" → "Blueprint"** and connect your GitHub repo (`sridevivr/movietracker`)
3. Render will detect `render.yaml` automatically — click **Apply**
4. On the service page, go to **Environment** and fill in:
   - `DATABASE_URL` → your Neon connection string from Step 1
   - `TMDB_API_KEY` → your key from Step 2
5. Click **Deploy** — your app will be live at a `*.onrender.com` URL in ~3 minutes

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random secret for sessions (Render auto-generates this) |
| `TMDB_API_KEY` | Yes | From themoviedb.org |
| `GOOGLE_CLIENT_ID` | No | Only if you want Google login |
| `GOOGLE_CLIENT_SECRET` | No | Only if you want Google login |
| `GOOGLE_CALLBACK_URL` | No | Set to `https://your-app.onrender.com/api/auth/google/callback` |
| `PORT` | No | Defaults to 5000 |

---

## Development

```bash
npm run dev      # Start dev server (frontend + backend)
npm run build    # Build for production
npm start        # Start production server
npm run db:push  # Push schema changes to database
```
