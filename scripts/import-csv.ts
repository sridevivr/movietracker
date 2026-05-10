/**
 * Imports your downloaded Replit/Neon CSV data into a new PostgreSQL database.
 *
 * Usage:
 *   DATABASE_URL=your_url npx tsx scripts/import-csv.ts ./path/to/csv/folder
 *
 * The folder should contain CSV files named after the tables:
 *   users.csv, movies.csv, watchlist_items.csv,
 *   currently_watching.csv, watched_items.csv, rewatches.csv
 *
 * Files that don't exist are silently skipped.
 */

import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const csvDir = process.argv[2];
if (!csvDir) {
  console.error('Error: Please provide the path to your CSV folder.');
  console.error('Usage: DATABASE_URL=your_url npx tsx scripts/import-csv.ts ./csv-folder');
  process.exit(1);
}

if (!fs.existsSync(csvDir)) {
  console.error(`Error: Folder not found: ${csvDir}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Minimal CSV parser (handles quoted fields and escaped quotes)
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
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
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
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ---------------------------------------------------------------------------
// Type coercions
// ---------------------------------------------------------------------------

function nullish(val: string): string | null {
  return val === '' || val === 'NULL' || val === '\\N' ? null : val;
}

function toNum(val: string): number | null {
  const n = nullish(val);
  if (n === null) return null;
  const parsed = parseFloat(n);
  return isNaN(parsed) ? null : parsed;
}

function toInt(val: string): number | null {
  const n = nullish(val);
  if (n === null) return null;
  const parsed = parseInt(n, 10);
  return isNaN(parsed) ? null : parsed;
}

function toDate(val: string): Date | null {
  const n = nullish(val);
  if (!n) return null;
  const d = new Date(n);
  return isNaN(d.getTime()) ? null : d;
}

// Parses PostgreSQL array literals like {Action,Comedy} or {"Sci-Fi","Drama"}
function toPgArray(val: string): string[] | null {
  const n = nullish(val);
  if (!n) return null;
  if (!n.startsWith('{')) return null;
  const inner = n.slice(1, -1);
  if (!inner) return [];
  // Split on commas not inside quotes
  const items: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of inner) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { items.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  items.push(cur.trim());
  return items.map(s => s.replace(/^"|"$/g, ''));
}

// ---------------------------------------------------------------------------
// Read a CSV file (returns empty array if file doesn't exist)
// ---------------------------------------------------------------------------

function readCsv(filename: string): Record<string, string>[] {
  const filepath = path.join(csvDir, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  Skipping ${filename} (file not found)`);
    return [];
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  const rows = parseCsv(content);
  console.log(`  Read ${rows.length} rows from ${filename}`);
  return rows;
}

// ---------------------------------------------------------------------------
// Main import
// ---------------------------------------------------------------------------

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  console.log('\n=== Movie Tracker CSV Import ===\n');

  // 1. Users
  const userRows = readCsv('users.csv');
  if (userRows.length > 0) {
    console.log('Importing users...');
    for (const r of userRows) {
      await db.insert(schema.users).values({
        id: r.id,
        username: nullish(r.username),
        password: nullish(r.password),
        email: nullish(r.email),
        googleId: nullish(r.google_id ?? r.googleId ?? ''),
        displayName: nullish(r.display_name ?? r.displayName ?? ''),
        profileImageUrl: nullish(r.profile_image_url ?? r.profileImageUrl ?? ''),
        authProvider: r.auth_provider ?? r.authProvider ?? 'local',
        createdAt: toDate(r.created_at ?? r.createdAt ?? '') ?? undefined,
      }).onConflictDoNothing();
    }
    console.log(`  ✓ Imported ${userRows.length} users`);
  }

  // 2. Movies
  const movieRows = readCsv('movies.csv');
  if (movieRows.length > 0) {
    console.log('Importing movies...');
    for (const r of movieRows) {
      await db.insert(schema.movies).values({
        id: r.id,
        tmdbId: r.tmdb_id ?? r.tmdbId,
        title: r.title,
        overview: nullish(r.overview),
        releaseDate: nullish(r.release_date ?? r.releaseDate ?? ''),
        posterPath: nullish(r.poster_path ?? r.posterPath ?? ''),
        backdropPath: nullish(r.backdrop_path ?? r.backdropPath ?? ''),
        voteAverage: toNum(r.vote_average ?? r.voteAverage ?? ''),
        runtime: toInt(r.runtime ?? ''),
        episodeRuntime: toInt(r.episode_runtime ?? r.episodeRuntime ?? ''),
        totalSeasons: toInt(r.total_seasons ?? r.totalSeasons ?? ''),
        totalEpisodes: toInt(r.total_episodes ?? r.totalEpisodes ?? ''),
        genres: toPgArray(r.genres ?? ''),
        type: r.type,
      }).onConflictDoNothing();
    }
    console.log(`  ✓ Imported ${movieRows.length} movies`);
  }

  // 3. Watchlist items
  const watchlistRows = readCsv('watchlist_items.csv');
  if (watchlistRows.length > 0) {
    console.log('Importing watchlist items...');
    for (const r of watchlistRows) {
      await db.insert(schema.watchlistItems).values({
        id: r.id,
        userId: r.user_id ?? r.userId,
        movieId: r.movie_id ?? r.movieId,
        addedAt: toDate(r.added_at ?? r.addedAt ?? '') ?? new Date(),
      }).onConflictDoNothing();
    }
    console.log(`  ✓ Imported ${watchlistRows.length} watchlist items`);
  }

  // 4. Currently watching
  const cwRows = readCsv('currently_watching.csv');
  if (cwRows.length > 0) {
    console.log('Importing currently watching...');
    for (const r of cwRows) {
      await db.insert(schema.currentlyWatching).values({
        id: r.id,
        userId: r.user_id ?? r.userId,
        movieId: r.movie_id ?? r.movieId,
        progress: nullish(r.progress ?? ''),
        startedAt: toDate(r.started_at ?? r.startedAt ?? '') ?? new Date(),
        addedAt: toDate(r.added_at ?? r.addedAt ?? '') ?? new Date(),
      }).onConflictDoNothing();
    }
    console.log(`  ✓ Imported ${cwRows.length} currently watching items`);
  }

  // 5. Watched items
  const watchedRows = readCsv('watched_items.csv');
  if (watchedRows.length > 0) {
    console.log('Importing watched items...');
    for (const r of watchedRows) {
      await db.insert(schema.watchedItems).values({
        id: r.id,
        userId: r.user_id ?? r.userId,
        movieId: r.movie_id ?? r.movieId,
        rating: toNum(r.rating ?? ''),
        startedAt: toDate(r.started_at ?? r.startedAt ?? ''),
        finishedAt: toDate(r.finished_at ?? r.finishedAt ?? '') ?? new Date(),
        watchedAt: toDate(r.watched_at ?? r.watchedAt ?? '') ?? new Date(),
        notes: nullish(r.notes ?? ''),
      }).onConflictDoNothing();
    }
    console.log(`  ✓ Imported ${watchedRows.length} watched items`);
  }

  // 6. Rewatches
  const rewatchRows = readCsv('rewatches.csv');
  if (rewatchRows.length > 0) {
    console.log('Importing rewatches...');
    for (const r of rewatchRows) {
      await db.insert(schema.rewatches).values({
        id: r.id,
        userId: r.user_id ?? r.userId,
        movieId: r.movie_id ?? r.movieId,
        watchedAt: toDate(r.watched_at ?? r.watchedAt ?? '') ?? new Date(),
      }).onConflictDoNothing();
    }
    console.log(`  ✓ Imported ${rewatchRows.length} rewatches`);
  }

  await pool.end();
  console.log('\n✅ Import complete!\n');
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
