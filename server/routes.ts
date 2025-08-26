import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMovieSchema, insertWatchlistItemSchema, insertCurrentlyWatchingSchema, insertWatchedItemSchema, insertRewatchSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Search movies via TMDB API
  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "TMDB API key not configured" });
      }

      // Search for both movies and TV shows
      const [movieResponse, tvResponse] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`),
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}`)
      ]);

      const [movieData, tvData] = await Promise.all([
        movieResponse.json(),
        tvResponse.json()
      ]);

      // Format results
      const results = [
        ...(movieData.results || []).map((movie: any) => ({
          tmdbId: movie.id,
          title: movie.title,
          overview: movie.overview,
          releaseDate: movie.release_date,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          voteAverage: movie.vote_average,
          type: 'movie',
          genres: [] // Will be populated when needed
        })),
        ...(tvData.results || []).map((show: any) => ({
          tmdbId: show.id,
          title: show.name,
          overview: show.overview,
          releaseDate: show.first_air_date,
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          voteAverage: show.vote_average,
          type: 'tv',
          genres: [] // Will be populated when needed
        }))
      ].slice(0, 10); // Limit to 10 results

      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: "Failed to search movies" });
    }
  });

  // Get or create movie
  app.post("/api/movies", async (req, res) => {
    try {
      const movieData = insertMovieSchema.parse(req.body);
      
      // Check if movie already exists
      let movie = await storage.getMovieByTmdbId(movieData.tmdbId);
      if (!movie) {
        movie = await storage.createMovie(movieData);
      }
      
      res.json(movie);
    } catch (error) {
      res.status(400).json({ error: "Invalid movie data" });
    }
  });

  // Watchlist endpoints
  app.get("/api/watchlist/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const watchlist = await storage.getWatchlist(userId);
      res.json(watchlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to get watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const data = insertWatchlistItemSchema.parse(req.body);
      const item = await storage.addToWatchlist(data);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid watchlist data" });
    }
  });

  app.delete("/api/watchlist/:userId/:movieId", async (req, res) => {
    try {
      const { userId, movieId } = req.params;
      await storage.removeFromWatchlist(userId, movieId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // Currently watching endpoints
  app.get("/api/currently-watching/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const currentlyWatching = await storage.getCurrentlyWatching(userId);
      res.json(currentlyWatching);
    } catch (error) {
      res.status(500).json({ error: "Failed to get currently watching" });
    }
  });

  app.post("/api/currently-watching", async (req, res) => {
    try {
      const data = insertCurrentlyWatchingSchema.parse(req.body);
      const item = await storage.addToCurrentlyWatching(data);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid currently watching data" });
    }
  });

  app.patch("/api/currently-watching/:id/progress", async (req, res) => {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      await storage.updateProgress(id, progress);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update progress" });
    }
  });

  app.delete("/api/currently-watching/:userId/:movieId", async (req, res) => {
    try {
      const { userId, movieId } = req.params;
      await storage.removeFromCurrentlyWatching(userId, movieId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from currently watching" });
    }
  });

  // Watched items endpoints
  app.get("/api/watched/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { filterType, sortBy } = req.query;
      const watchedItems = await storage.getWatchedItems(
        userId, 
        filterType as string, 
        sortBy as string
      );
      res.json(watchedItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to get watched items" });
    }
  });

  app.post("/api/watched", async (req, res) => {
    try {
      const data = insertWatchedItemSchema.parse(req.body);
      const item = await storage.addToWatched(data);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid watched item data" });
    }
  });

  app.patch("/api/watched/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, notes } = req.body;
      await storage.updateWatchedItem(id, rating, notes);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update watched item" });
    }
  });

  app.delete("/api/watched/:userId/:movieId", async (req, res) => {
    try {
      const { userId, movieId } = req.params;
      await storage.removeFromWatched(userId, movieId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from watched" });
    }
  });

  // Rewatch endpoints
  app.post("/api/rewatches", async (req, res) => {
    try {
      const data = insertRewatchSchema.parse(req.body);
      const rewatch = await storage.addRewatch(data);
      res.json(rewatch);
    } catch (error) {
      res.status(400).json({ error: "Invalid rewatch data" });
    }
  });

  // Stats endpoint
  app.get("/api/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getViewingStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get viewing stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
