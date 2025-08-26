import { type User, type InsertUser, type Movie, type InsertMovie, type WatchlistItem, type InsertWatchlistItem, type CurrentlyWatching, type InsertCurrentlyWatching, type WatchedItem, type InsertWatchedItem, type Rewatch, type InsertRewatch } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { users, movies, watchlistItems, currentlyWatching, watchedItems, rewatches } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Movies
  getMovie(id: string): Promise<Movie | undefined>;
  getMovieByTmdbId(tmdbId: string): Promise<Movie | undefined>;
  createMovie(movie: InsertMovie): Promise<Movie>;

  // Watchlist
  getWatchlist(userId: string): Promise<(WatchlistItem & { movie: Movie })[]>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, movieId: string): Promise<void>;
  isInWatchlist(userId: string, movieId: string): Promise<boolean>;

  // Currently Watching
  getCurrentlyWatching(userId: string): Promise<(CurrentlyWatching & { movie: Movie })[]>;
  addToCurrentlyWatching(item: InsertCurrentlyWatching): Promise<CurrentlyWatching>;
  updateProgress(id: string, progress: string): Promise<void>;
  removeFromCurrentlyWatching(userId: string, movieId: string): Promise<void>;

  // Watched Items
  getWatchedItems(userId: string, filterType?: string, sortBy?: string): Promise<(WatchedItem & { movie: Movie })[]>;
  addToWatched(item: InsertWatchedItem): Promise<WatchedItem>;
  updateWatchedItem(id: string, rating?: number, notes?: string, finishedAt?: string): Promise<void>;
  removeFromWatched(userId: string, movieId: string): Promise<void>;

  // Rewatches
  getRewatches(userId: string): Promise<(Rewatch & { movie: Movie })[]>;
  getRewatchesForMovie(userId: string, movieId: string): Promise<Rewatch[]>;
  addRewatch(rewatch: InsertRewatch): Promise<Rewatch>;

  // Stats
  getViewingStats(userId: string): Promise<{
    totalWatched: number;
    totalWatchTime: string;
    averageRating: number;
    topGenre: string;
    totalRewatchTime: string;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private movies: Map<string, Movie>;
  private watchlistItems: Map<string, WatchlistItem>;
  private currentlyWatching: Map<string, CurrentlyWatching>;
  private watchedItems: Map<string, WatchedItem>;
  private rewatches: Map<string, Rewatch>;

  constructor() {
    this.users = new Map();
    this.movies = new Map();
    this.watchlistItems = new Map();
    this.currentlyWatching = new Map();
    this.watchedItems = new Map();
    this.rewatches = new Map();

    // Create a default user for demo purposes
    const defaultUser: User = {
      id: "Z8JCPQ1U5ZPApP9wrLrczbBz0lc2",
      username: "demo_user",
      password: "password",
      email: null,
      googleId: null,
      displayName: null,
      profileImageUrl: null,
      authProvider: "local",
      createdAt: new Date()
    };
    this.users.set(defaultUser.id, defaultUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      username: insertUser.username || null,
      password: insertUser.password || null,
      email: insertUser.email || null,
      googleId: insertUser.googleId || null,
      displayName: insertUser.displayName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      authProvider: insertUser.authProvider || "local",
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getMovie(id: string): Promise<Movie | undefined> {
    return this.movies.get(id);
  }

  async getMovieByTmdbId(tmdbId: string): Promise<Movie | undefined> {
    return Array.from(this.movies.values()).find(movie => movie.tmdbId === tmdbId);
  }

  async createMovie(movie: InsertMovie): Promise<Movie> {
    const id = randomUUID();
    const newMovie: Movie = { 
      ...movie, 
      id,
      overview: movie.overview || null,
      releaseDate: movie.releaseDate || null,
      posterPath: movie.posterPath || null,
      backdropPath: movie.backdropPath || null,
      voteAverage: movie.voteAverage || null,
      runtime: movie.runtime || null,
      episodeRuntime: movie.episodeRuntime || null,
      totalSeasons: movie.totalSeasons || null,
      totalEpisodes: movie.totalEpisodes || null,
      genres: movie.genres || null
    };
    this.movies.set(id, newMovie);
    return newMovie;
  }

  async getWatchlist(userId: string): Promise<(WatchlistItem & { movie: Movie })[]> {
    const userWatchlist = Array.from(this.watchlistItems.values())
      .filter(item => item.userId === userId);
    
    return userWatchlist.map(item => {
      const movie = this.movies.get(item.movieId);
      return { ...item, movie: movie! };
    }).filter(item => item.movie);
  }

  async addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem> {
    const id = randomUUID();
    const newItem: WatchlistItem = { ...item, id, addedAt: new Date() };
    this.watchlistItems.set(id, newItem);
    return newItem;
  }

  async removeFromWatchlist(userId: string, movieId: string): Promise<void> {
    const itemToRemove = Array.from(this.watchlistItems.entries())
      .find(([_, item]) => item.userId === userId && item.movieId === movieId);
    
    if (itemToRemove) {
      this.watchlistItems.delete(itemToRemove[0]);
    }
  }

  async isInWatchlist(userId: string, movieId: string): Promise<boolean> {
    return Array.from(this.watchlistItems.values())
      .some(item => item.userId === userId && item.movieId === movieId);
  }

  async getCurrentlyWatching(userId: string): Promise<(CurrentlyWatching & { movie: Movie })[]> {
    const userCurrentlyWatching = Array.from(this.currentlyWatching.values())
      .filter(item => item.userId === userId);
    
    return userCurrentlyWatching.map(item => {
      const movie = this.movies.get(item.movieId);
      return { ...item, movie: movie! };
    }).filter(item => item.movie);
  }

  async addToCurrentlyWatching(item: InsertCurrentlyWatching): Promise<CurrentlyWatching> {
    const id = randomUUID();
    const now = new Date();
    const newItem: CurrentlyWatching = { 
      ...item, 
      id, 
      startedAt: now, 
      addedAt: now,
      progress: item.progress || null
    };
    this.currentlyWatching.set(id, newItem);
    return newItem;
  }

  async updateProgress(id: string, progress: string): Promise<void> {
    const item = this.currentlyWatching.get(id);
    if (item) {
      this.currentlyWatching.set(id, { ...item, progress });
    }
  }

  async removeFromCurrentlyWatching(userId: string, movieId: string): Promise<void> {
    const itemToRemove = Array.from(this.currentlyWatching.entries())
      .find(([_, item]) => item.userId === userId && item.movieId === movieId);
    
    if (itemToRemove) {
      this.currentlyWatching.delete(itemToRemove[0]);
    }
  }

  async getWatchedItems(userId: string, filterType?: string, sortBy?: string): Promise<(WatchedItem & { movie: Movie })[]> {
    let userWatchedItems = Array.from(this.watchedItems.values())
      .filter(item => item.userId === userId);

    const itemsWithMovies = userWatchedItems.map(item => {
      const movie = this.movies.get(item.movieId);
      return { ...item, movie: movie! };
    }).filter(item => item.movie);

    // Filter by type
    if (filterType && filterType !== "all") {
      const typeFilter = filterType === "movies" ? "movie" : "tv";
      return itemsWithMovies.filter(item => item.movie.type === typeFilter);
    }

    // Sort
    if (sortBy) {
      itemsWithMovies.sort((a, b) => {
        switch (sortBy) {
          case "title":
            return a.movie.title.localeCompare(b.movie.title);
          case "year":
            return (b.movie.releaseDate || "").localeCompare(a.movie.releaseDate || "");
          case "rating":
            return (b.rating || 0) - (a.rating || 0);
          case "dateFinished":
            return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime();
          default:
            return 0;
        }
      });
    }

    return itemsWithMovies;
  }

  async addToWatched(item: InsertWatchedItem): Promise<WatchedItem> {
    const id = randomUUID();
    const now = new Date();
    const newItem: WatchedItem = { 
      ...item, 
      id, 
      finishedAt: now, 
      watchedAt: now,
      startedAt: item.startedAt || null,
      rating: item.rating || null,
      notes: item.notes || null
    };
    this.watchedItems.set(id, newItem);
    return newItem;
  }

  async updateWatchedItem(id: string, rating?: number, notes?: string, finishedAt?: string): Promise<void> {
    const item = this.watchedItems.get(id);
    if (item) {
      this.watchedItems.set(id, { 
        ...item, 
        ...(rating !== undefined && { rating }),
        ...(notes !== undefined && { notes }),
        ...(finishedAt !== undefined && { finishedAt: new Date(finishedAt), watchedAt: new Date(finishedAt) })
      });
    }
  }

  async removeFromWatched(userId: string, movieId: string): Promise<void> {
    const itemToRemove = Array.from(this.watchedItems.entries())
      .find(([_, item]) => item.userId === userId && item.movieId === movieId);
    
    if (itemToRemove) {
      this.watchedItems.delete(itemToRemove[0]);
    }
  }

  async getRewatches(userId: string): Promise<(Rewatch & { movie: Movie })[]> {
    const userRewatches = Array.from(this.rewatches.values())
      .filter(rewatch => rewatch.userId === userId);
    
    return userRewatches.map(rewatch => {
      const movie = this.movies.get(rewatch.movieId);
      return { ...rewatch, movie: movie! };
    }).filter(rewatch => rewatch.movie);
  }

  async getRewatchesForMovie(userId: string, movieId: string): Promise<Rewatch[]> {
    return Array.from(this.rewatches.values())
      .filter(rewatch => rewatch.userId === userId && rewatch.movieId === movieId)
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
  }

  async addRewatch(rewatch: InsertRewatch): Promise<Rewatch> {
    const id = randomUUID();
    const newRewatch: Rewatch = { 
      ...rewatch, 
      id,
      watchedAt: rewatch.watchedAt instanceof Date ? rewatch.watchedAt : new Date(rewatch.watchedAt)
    };
    this.rewatches.set(id, newRewatch);
    return newRewatch;
  }

  async getChartData(userId: string): Promise<{
    monthlyData: { month: string; count: number }[];
    genreData: { genre: string; count: number }[];
    ratingData: { month: string; averageRating: number }[];
  }> {
    const watchedItems = await this.getWatchedItems(userId);
    
    // Group by month for movies watched over time
    const monthlyMap = new Map<string, number>();
    const ratingMonthlyMap = new Map<string, { total: number; count: number }>();
    const genreMap = new Map<string, number>();

    watchedItems.forEach(item => {
      const date = new Date(item.finishedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Count movies per month
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
      
      // Collect ratings per month
      if (item.rating) {
        const existing = ratingMonthlyMap.get(monthKey) || { total: 0, count: 0 };
        existing.total += item.rating;
        existing.count += 1;
        ratingMonthlyMap.set(monthKey, existing);
      }
      
      // Count genres
      if (item.movie.genres) {
        item.movie.genres.forEach(genre => {
          genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
        });
      }
    });

    // Convert to chart data arrays
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const ratingData = Array.from(ratingMonthlyMap.entries())
      .map(([month, data]) => ({ 
        month, 
        averageRating: Math.round((data.total / data.count) * 100) / 100 
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const genreData = Array.from(genreMap.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7); // Top 7 genres

    return {
      monthlyData,
      genreData,
      ratingData
    };
  }

  async getViewingStats(userId: string): Promise<{
    totalWatched: number;
    totalWatchTime: string;
    averageRating: number;
    topGenre: string;
    totalRewatchTime: string;
  }> {
    const watchedItems = await this.getWatchedItems(userId);
    const rewatches = await this.getRewatches(userId);

    const totalWatched = watchedItems.length;
    
    let totalMinutes = 0;
    let totalRating = 0;
    let ratedCount = 0;
    const genreCounts: Record<string, number> = {};

    watchedItems.forEach(item => {
      if (item.movie.runtime) {
        totalMinutes += item.movie.runtime;
      }
      if (item.rating) {
        totalRating += item.rating;
        ratedCount++;
      }
      if (item.movie.genres) {
        item.movie.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const totalRewatchMinutes = rewatches.reduce((total, rewatch) => {
      return total + (rewatch.movie.runtime || 0);
    }, 0);

    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    const topGenre = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

    return {
      totalWatched,
      totalWatchTime: formatTime(totalMinutes + totalRewatchMinutes),
      averageRating: ratedCount > 0 ? Math.round((totalRating / ratedCount) * 100) / 100 : 0,
      topGenre,
      totalRewatchTime: formatTime(totalRewatchMinutes)
    };
  }
}

class PostgresStorage implements IStorage {
  private db;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  async getMovie(id: string): Promise<Movie | undefined> {
    const result = await this.db.select().from(movies).where(eq(movies.id, id)).limit(1);
    return result[0];
  }

  async getMovieByTmdbId(tmdbId: string): Promise<Movie | undefined> {
    const result = await this.db.select().from(movies).where(eq(movies.tmdbId, tmdbId)).limit(1);
    return result[0];
  }

  async createMovie(movie: InsertMovie): Promise<Movie> {
    const movieData = {
      ...movie,
      overview: movie.overview || null,
      releaseDate: movie.releaseDate || null,
      posterPath: movie.posterPath || null,
      backdropPath: movie.backdropPath || null,
      voteAverage: movie.voteAverage || null,
      runtime: movie.runtime || null,
      episodeRuntime: movie.episodeRuntime || null,
      totalSeasons: movie.totalSeasons || null,
      totalEpisodes: movie.totalEpisodes || null,
      genres: movie.genres || null
    };
    const result = await this.db.insert(movies).values([movieData]).returning();
    return result[0];
  }

  async getWatchlist(userId: string): Promise<(WatchlistItem & { movie: Movie })[]> {
    const result = await this.db
      .select()
      .from(watchlistItems)
      .innerJoin(movies, eq(watchlistItems.movieId, movies.id))
      .where(eq(watchlistItems.userId, userId))
      .orderBy(desc(watchlistItems.addedAt));

    return result.map(row => ({
      ...row.watchlist_items,
      movie: row.movies
    }));
  }

  async addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem> {
    const result = await this.db.insert(watchlistItems).values(item).returning();
    return result[0];
  }

  async removeFromWatchlist(userId: string, movieId: string): Promise<void> {
    await this.db.delete(watchlistItems).where(
      and(eq(watchlistItems.userId, userId), eq(watchlistItems.movieId, movieId))
    );
  }

  async isInWatchlist(userId: string, movieId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(watchlistItems)
      .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.movieId, movieId)))
      .limit(1);
    return result.length > 0;
  }

  async getCurrentlyWatching(userId: string): Promise<(CurrentlyWatching & { movie: Movie })[]> {
    const result = await this.db
      .select()
      .from(currentlyWatching)
      .innerJoin(movies, eq(currentlyWatching.movieId, movies.id))
      .where(eq(currentlyWatching.userId, userId))
      .orderBy(desc(currentlyWatching.addedAt));

    return result.map(row => ({
      ...row.currently_watching,
      movie: row.movies
    }));
  }

  async addToCurrentlyWatching(item: InsertCurrentlyWatching): Promise<CurrentlyWatching> {
    const result = await this.db.insert(currentlyWatching).values(item).returning();
    return result[0];
  }

  async updateProgress(id: string, progress: string): Promise<void> {
    await this.db.update(currentlyWatching).set({ progress }).where(eq(currentlyWatching.id, id));
  }

  async removeFromCurrentlyWatching(userId: string, movieId: string): Promise<void> {
    await this.db.delete(currentlyWatching).where(
      and(eq(currentlyWatching.userId, userId), eq(currentlyWatching.movieId, movieId))
    );
  }

  async getWatchedItems(userId: string, filterType?: string, sortBy?: string): Promise<(WatchedItem & { movie: Movie })[]> {
    let query = this.db
      .select()
      .from(watchedItems)
      .innerJoin(movies, eq(watchedItems.movieId, movies.id))
      .where(eq(watchedItems.userId, userId));

    const result = await query.orderBy(desc(watchedItems.finishedAt));

    let items = result.map(row => ({
      ...row.watched_items,
      movie: row.movies
    }));

    // Filter by type
    if (filterType && filterType !== "all") {
      const typeFilter = filterType === "movies" ? "movie" : "tv";
      items = items.filter(item => item.movie.type === typeFilter);
    }

    // Sort
    if (sortBy) {
      items.sort((a, b) => {
        switch (sortBy) {
          case "title":
            return a.movie.title.localeCompare(b.movie.title);
          case "year":
            return (b.movie.releaseDate || "").localeCompare(a.movie.releaseDate || "");
          case "rating":
            return (b.rating || 0) - (a.rating || 0);
          case "dateFinished":
            return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime();
          default:
            return 0;
        }
      });
    }

    return items;
  }

  async addToWatched(item: InsertWatchedItem): Promise<WatchedItem> {
    const result = await this.db.insert(watchedItems).values(item).returning();
    return result[0];
  }

  async updateWatchedItem(id: string, rating?: number, notes?: string, finishedAt?: string): Promise<void> {
    const updateData: any = {};
    if (rating !== undefined) updateData.rating = rating;
    if (notes !== undefined) updateData.notes = notes;
    if (finishedAt !== undefined) {
      updateData.finishedAt = new Date(finishedAt);
      updateData.watchedAt = new Date(finishedAt);
    }

    await this.db.update(watchedItems).set(updateData).where(eq(watchedItems.id, id));
  }

  async removeFromWatched(userId: string, movieId: string): Promise<void> {
    await this.db.delete(watchedItems).where(
      and(eq(watchedItems.userId, userId), eq(watchedItems.movieId, movieId))
    );
  }

  async getRewatches(userId: string): Promise<(Rewatch & { movie: Movie })[]> {
    const result = await this.db
      .select()
      .from(rewatches)
      .innerJoin(movies, eq(rewatches.movieId, movies.id))
      .where(eq(rewatches.userId, userId))
      .orderBy(desc(rewatches.watchedAt));

    return result.map(row => ({
      ...row.rewatches,
      movie: row.movies
    }));
  }

  async getRewatchesForMovie(userId: string, movieId: string): Promise<Rewatch[]> {
    const result = await this.db
      .select()
      .from(rewatches)
      .where(and(eq(rewatches.userId, userId), eq(rewatches.movieId, movieId)))
      .orderBy(desc(rewatches.watchedAt));

    return result;
  }

  async addRewatch(rewatch: InsertRewatch): Promise<Rewatch> {
    const result = await this.db.insert(rewatches).values(rewatch).returning();
    return result[0];
  }

  async getChartData(userId: string): Promise<{
    monthlyData: { month: string; count: number }[];
    genreData: { genre: string; count: number }[];
    ratingData: { month: string; averageRating: number }[];
  }> {
    const watchedItems = await this.getWatchedItems(userId);
    
    // Group by month for movies watched over time
    const monthlyMap = new Map<string, number>();
    const ratingMonthlyMap = new Map<string, { total: number; count: number }>();
    const genreMap = new Map<string, number>();

    watchedItems.forEach(item => {
      const date = new Date(item.finishedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Count movies per month
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
      
      // Collect ratings per month
      if (item.rating) {
        const existing = ratingMonthlyMap.get(monthKey) || { total: 0, count: 0 };
        existing.total += item.rating;
        existing.count += 1;
        ratingMonthlyMap.set(monthKey, existing);
      }
      
      // Count genres
      if (item.movie.genres) {
        item.movie.genres.forEach(genre => {
          genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
        });
      }
    });

    // Convert to chart data arrays
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const ratingData = Array.from(ratingMonthlyMap.entries())
      .map(([month, data]) => ({ 
        month, 
        averageRating: Math.round((data.total / data.count) * 100) / 100 
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const genreData = Array.from(genreMap.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7); // Top 7 genres

    return {
      monthlyData,
      genreData,
      ratingData
    };
  }

  async getViewingStats(userId: string): Promise<{
    totalWatched: number;
    totalWatchTime: string;
    averageRating: number;
    topGenre: string;
    totalRewatchTime: string;
  }> {
    const watchedItemsData = await this.getWatchedItems(userId);
    const rewatchesData = await this.getRewatches(userId);

    const totalWatched = watchedItemsData.length;
    
    let totalMinutes = 0;
    let totalRating = 0;
    let ratedCount = 0;
    const genreCounts: Record<string, number> = {};

    watchedItemsData.forEach(item => {
      if (item.movie.runtime) {
        totalMinutes += item.movie.runtime;
      }
      if (item.rating) {
        totalRating += item.rating;
        ratedCount++;
      }
      if (item.movie.genres) {
        item.movie.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const totalRewatchMinutes = rewatchesData.reduce((total, rewatch) => {
      return total + (rewatch.movie.runtime || 0);
    }, 0);

    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    const topGenre = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

    return {
      totalWatched,
      totalWatchTime: formatTime(totalMinutes + totalRewatchMinutes),
      averageRating: ratedCount > 0 ? Math.round((totalRating / ratedCount) * 100) / 100 : 0,
      topGenre,
      totalRewatchTime: formatTime(totalRewatchMinutes)
    };
  }
}

export const storage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();
