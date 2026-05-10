/**
 * Standalone CSV importer — requires only @neondatabase/serverless + ws.
 *
 * Setup (run once in any empty folder):
 *   npm init -y
 *   npm install @neondatabase/serverless ws
 *
 * Then run:
 *   DATABASE_URL="your-neon-url" npx tsx import-csv.ts ./path/to/csv/folder
 */

import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const csvDir = process.argv[2];
if (!csvDir || !fs.existsSync(csvDir)) {
  console.error(`Error: CSV folder not found: ${csvDir}`);
  console.error('Usage: DATABASE_URL="..." npx tsx import-csv.ts ./csv-folder');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields and escaped quotes)
// ---------------------------------------------------------------------------

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];
  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current);
  return fields;
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

function n(val: string): null | string {
  return (val === '' || val === 'NULL' || val === '\\N') ? null : val;
}

function toNum(val: string): number | null {
  const v = n(val); if (!v) return null;
  const p = parseFloat(v); return isNaN(p) ? null : p;
}

function toInt(val: string): number | null {
  const v = n(val); if (!v) return null;
  const p = parseInt(v, 10); return isNaN(p) ? null : p;
}

function toDate(val: string): string | null {
  const v = n(val); if (!v) return null;
  const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString();
}

// Parses PostgreSQL array literals: {Action,Comedy} or {"Sci-Fi"}
function toPgArray(val: string): string | null {
  const v = n(val); if (!v || !v.startsWith('{')) return null;
  return v; // pass through raw PostgreSQL array literal
}

function readCsv(filename: string): Record<string, string>[] {
  const fp = path.join(csvDir, filename);
  if (!fs.existsSync(fp)) { console.log(`  Skipping ${filename} (not found)`); return []; }
  const rows = parseCsv(fs.readFileSync(fp, 'utf-8'));
  console.log(`  Read ${rows.length} rows from ${filename}`);
  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('\n=== Movie Tracker CSV Import ===\n');

  // Create tables if they don't exist
  console.log('Creating tables if needed...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id varchar PRIMARY KEY,
      username text UNIQUE,
      password text,
      email text,
      google_id text UNIQUE,
      display_name text,
      profile_image_url text,
      auth_provider text NOT NULL DEFAULT 'local',
      created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS movies (
      id varchar PRIMARY KEY,
      tmdb_id text NOT NULL UNIQUE,
      title text NOT NULL,
      overview text,
      release_date text,
      poster_path text,
      backdrop_path text,
      vote_average real,
      runtime integer,
      episode_runtime integer,
      total_seasons integer,
      total_episodes integer,
      genres text[],
      type text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS watchlist_items (
      id varchar PRIMARY KEY,
      user_id varchar NOT NULL REFERENCES users(id),
      movie_id varchar NOT NULL REFERENCES movies(id),
      added_at timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS currently_watching (
      id varchar PRIMARY KEY,
      user_id varchar NOT NULL REFERENCES users(id),
      movie_id varchar NOT NULL REFERENCES movies(id),
      progress text,
      started_at timestamp NOT NULL DEFAULT now(),
      added_at timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS watched_items (
      id varchar PRIMARY KEY,
      user_id varchar NOT NULL REFERENCES users(id),
      movie_id varchar NOT NULL REFERENCES movies(id),
      rating real,
      started_at timestamp,
      finished_at timestamp NOT NULL DEFAULT now(),
      watched_at timestamp NOT NULL DEFAULT now(),
      notes text
    );
    CREATE TABLE IF NOT EXISTS rewatches (
      id varchar PRIMARY KEY,
      user_id varchar NOT NULL REFERENCES users(id),
      movie_id varchar NOT NULL REFERENCES movies(id),
      watched_at timestamp NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session (
      sid varchar NOT NULL PRIMARY KEY,
      sess json NOT NULL,
      expire timestamp(6) NOT NULL
    );
  `);
  console.log('  ✓ Tables ready\n');

  // 1. Users
  const userRows = readCsv('users.csv');
  if (userRows.length > 0) {
    console.log('Importing users...');
    for (const r of userRows) {
      await pool.query(
        `INSERT INTO users (id, username, password, email, google_id, display_name, profile_image_url, auth_provider, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT DO NOTHING`,
        [
          r.id,
          n(r.username ?? ''),
          n(r.password ?? ''),
          n(r.email ?? ''),
          n(r.google_id ?? r.googleId ?? ''),
          n(r.display_name ?? r.displayName ?? ''),
          n(r.profile_image_url ?? r.profileImageUrl ?? ''),
          r.auth_provider ?? r.authProvider ?? 'local',
          toDate(r.created_at ?? r.createdAt ?? '') ?? new Date().toISOString(),
        ]
      );
    }
    console.log(`  ✓ Imported ${userRows.length} users\n`);
  }

  // 2. Movies
  const movieRows = readCsv('movies.csv');
  if (movieRows.length > 0) {
    console.log('Importing movies...');
    for (const r of movieRows) {
      await pool.query(
        `INSERT INTO movies (id, tmdb_id, title, overview, release_date, poster_path, backdrop_path, vote_average, runtime, episode_runtime, total_seasons, total_episodes, genres, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::text[],$14)
         ON CONFLICT DO NOTHING`,
        [
          r.id,
          r.tmdb_id ?? r.tmdbId,
          r.title,
          n(r.overview ?? ''),
          n(r.release_date ?? r.releaseDate ?? ''),
          n(r.poster_path ?? r.posterPath ?? ''),
          n(r.backdrop_path ?? r.backdropPath ?? ''),
          toNum(r.vote_average ?? r.voteAverage ?? ''),
          toInt(r.runtime ?? ''),
          toInt(r.episode_runtime ?? r.episodeRuntime ?? ''),
          toInt(r.total_seasons ?? r.totalSeasons ?? ''),
          toInt(r.total_episodes ?? r.totalEpisodes ?? ''),
          toPgArray(r.genres ?? ''),
          r.type,
        ]
      );
    }
    console.log(`  ✓ Imported ${movieRows.length} movies\n`);
  }

  // 3. Watchlist items
  const watchlistRows = readCsv('watchlist_items.csv');
  if (watchlistRows.length > 0) {
    console.log('Importing watchlist items...');
    for (const r of watchlistRows) {
      await pool.query(
        `INSERT INTO watchlist_items (id, user_id, movie_id, added_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [r.id, r.user_id ?? r.userId, r.movie_id ?? r.movieId, toDate(r.added_at ?? r.addedAt ?? '') ?? new Date().toISOString()]
      );
    }
    console.log(`  ✓ Imported ${watchlistRows.length} watchlist items\n`);
  }

  // 4. Currently watching
  const cwRows = readCsv('currently_watching.csv');
  if (cwRows.length > 0) {
    console.log('Importing currently watching...');
    for (const r of cwRows) {
      await pool.query(
        `INSERT INTO currently_watching (id, user_id, movie_id, progress, started_at, added_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [
          r.id, r.user_id ?? r.userId, r.movie_id ?? r.movieId,
          n(r.progress ?? ''),
          toDate(r.started_at ?? r.startedAt ?? '') ?? new Date().toISOString(),
          toDate(r.added_at ?? r.addedAt ?? '') ?? new Date().toISOString(),
        ]
      );
    }
    console.log(`  ✓ Imported ${cwRows.length} currently watching items\n`);
  }

  // 5. Watched items
  const watchedRows = readCsv('watched_items.csv');
  if (watchedRows.length > 0) {
    console.log('Importing watched items...');
    for (const r of watchedRows) {
      await pool.query(
        `INSERT INTO watched_items (id, user_id, movie_id, rating, started_at, finished_at, watched_at, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
        [
          r.id, r.user_id ?? r.userId, r.movie_id ?? r.movieId,
          toNum(r.rating ?? ''),
          toDate(r.started_at ?? r.startedAt ?? ''),
          toDate(r.finished_at ?? r.finishedAt ?? '') ?? new Date().toISOString(),
          toDate(r.watched_at ?? r.watchedAt ?? '') ?? new Date().toISOString(),
          n(r.notes ?? ''),
        ]
      );
    }
    console.log(`  ✓ Imported ${watchedRows.length} watched items\n`);
  }

  // 6. Rewatches
  const rewatchRows = readCsv('rewatches.csv');
  if (rewatchRows.length > 0) {
    console.log('Importing rewatches...');
    for (const r of rewatchRows) {
      await pool.query(
        `INSERT INTO rewatches (id, user_id, movie_id, watched_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [r.id, r.user_id ?? r.userId, r.movie_id ?? r.movieId, toDate(r.watched_at ?? r.watchedAt ?? '') ?? new Date().toISOString()]
      );
    }
    console.log(`  ✓ Imported ${rewatchRows.length} rewatches\n`);
  }

  await pool.end();
  console.log('✅ Import complete!\n');
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
