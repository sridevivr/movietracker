import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const movies = pgTable("movies", {
  id: varchar("id").primaryKey(),
  tmdbId: text("tmdb_id").notNull().unique(), // Changed to text for IMDB IDs
  title: text("title").notNull(),
  overview: text("overview"),
  releaseDate: text("release_date"),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  voteAverage: real("vote_average"),
  runtime: integer("runtime"),
  genres: text("genres").array(),
  type: text("type").notNull(), // 'movie' or 'tv'
});

export const watchlistItems = pgTable("watchlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.id),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const currentlyWatching = pgTable("currently_watching", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.id),
  progress: text("progress"), // For TV shows: "S1 E5"
  startedAt: timestamp("started_at").notNull().defaultNow(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const watchedItems = pgTable("watched_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.id),
  rating: real("rating"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at").notNull().defaultNow(),
  watchedAt: timestamp("watched_at").notNull().defaultNow(), // Keep for backward compatibility
  notes: text("notes"),
});

export const rewatches = pgTable("rewatches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.id),
  watchedAt: timestamp("watched_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertMovieSchema = createInsertSchema(movies).omit({
  id: true,
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({
  id: true,
  addedAt: true,
});

export const insertCurrentlyWatchingSchema = createInsertSchema(currentlyWatching).omit({
  id: true,
  addedAt: true,
  startedAt: true,
});

export const insertWatchedItemSchema = createInsertSchema(watchedItems).omit({
  id: true,
  watchedAt: true,
  finishedAt: true,
});

export const insertRewatchSchema = createInsertSchema(rewatches).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Movie = typeof movies.$inferSelect;
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
export type CurrentlyWatching = typeof currentlyWatching.$inferSelect;
export type InsertCurrentlyWatching = z.infer<typeof insertCurrentlyWatchingSchema>;
export type WatchedItem = typeof watchedItems.$inferSelect;
export type InsertWatchedItem = z.infer<typeof insertWatchedItemSchema>;
export type Rewatch = typeof rewatches.$inferSelect;
export type InsertRewatch = z.infer<typeof insertRewatchSchema>;
