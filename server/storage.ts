import { type User, type InsertUser, type Movie, type InsertMovie, type WatchlistItem, type InsertWatchlistItem, type CurrentlyWatching, type InsertCurrentlyWatching, type WatchedItem, type InsertWatchedItem, type Rewatch, type InsertRewatch } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Movies
  getMovie(id: string): Promise<Movie | undefined>;
  getMovieByTmdbId(tmdbId: number): Promise<Movie | undefined>;
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
  updateWatchedItem(id: string, rating?: number, notes?: string): Promise<void>;
  removeFromWatched(userId: string, movieId: string): Promise<void>;

  // Rewatches
  getRewatches(userId: string): Promise<(Rewatch & { movie: Movie })[]>;
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
      password: "password"
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMovie(id: string): Promise<Movie | undefined> {
    return this.movies.get(id);
  }

  async getMovieByTmdbId(tmdbId: number): Promise<Movie | undefined> {
    return Array.from(this.movies.values()).find(movie => movie.tmdbId === tmdbId);
  }

  async createMovie(movie: InsertMovie): Promise<Movie> {
    const id = randomUUID();
    const newMovie: Movie = { ...movie, id };
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
    const newItem: CurrentlyWatching = { ...item, id, addedAt: new Date() };
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
    const newItem: WatchedItem = { ...item, id, watchedAt: new Date() };
    this.watchedItems.set(id, newItem);
    return newItem;
  }

  async updateWatchedItem(id: string, rating?: number, notes?: string): Promise<void> {
    const item = this.watchedItems.get(id);
    if (item) {
      this.watchedItems.set(id, { 
        ...item, 
        ...(rating !== undefined && { rating }),
        ...(notes !== undefined && { notes })
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

  async addRewatch(rewatch: InsertRewatch): Promise<Rewatch> {
    const id = randomUUID();
    const newRewatch: Rewatch = { ...rewatch, id };
    this.rewatches.set(id, newRewatch);
    return newRewatch;
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
      totalWatchTime: formatTime(totalMinutes),
      averageRating: ratedCount > 0 ? Math.round((totalRating / ratedCount) * 100) / 100 : 0,
      topGenre,
      totalRewatchTime: formatTime(totalRewatchMinutes)
    };
  }
}

export const storage = new MemStorage();
