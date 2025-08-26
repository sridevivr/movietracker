import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMovieSchema, insertWatchlistItemSchema, insertCurrentlyWatchingSchema, insertWatchedItemSchema, insertRewatchSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Search movies via OMDB API
  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const apiKey = "7f42561e"; // OMDB API key

      // Search using OMDB API
      const searchResponse = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}`);
      const searchData = await searchResponse.json();

      if (searchData.Response === "False") {
        return res.json([]);
      }

      // Get detailed info for each result to include runtime
      const detailedResults = await Promise.all(
        (searchData.Search || []).slice(0, 10).map(async (item: any) => {
          try {
            const detailResponse = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&i=${item.imdbID}&plot=short`);
            const detailData = await detailResponse.json();
            
            // Parse runtime differently for movies vs TV shows
            let runtime = null;
            if (item.Type === 'series') {
              // For TV shows, get episode runtime and total episodes
              let episodeRuntime = null;
              if (detailData.Runtime && detailData.Runtime !== "N/A") {
                const runtimeMatch = detailData.Runtime.match(/(\d+)/);
                episodeRuntime = runtimeMatch ? parseInt(runtimeMatch[1]) : null;
              }
              
              // Try to get total episodes from seasons
              let totalEpisodes = null;
              if (detailData.totalSeasons && detailData.totalSeasons !== "N/A") {
                const seasons = parseInt(detailData.totalSeasons);
                // Estimate episodes (typical season has 10-24 episodes, use 20 as average)
                totalEpisodes = seasons * 20;
              }
              
              // Calculate total runtime for TV show
              if (episodeRuntime && totalEpisodes) {
                runtime = episodeRuntime * totalEpisodes;
              } else if (episodeRuntime) {
                // If we don't know total episodes, estimate based on common patterns
                runtime = episodeRuntime * 50; // Conservative estimate for unknown episode count
              }
            } else {
              // For movies, parse runtime normally (e.g., "148 min" -> 148)
              if (detailData.Runtime && detailData.Runtime !== "N/A") {
                const runtimeMatch = detailData.Runtime.match(/(\d+)/);
                runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : null;
              }
            }
            
            // Prepare additional TV show data
            let episodeRuntime = null;
            let totalSeasons = null;
            let totalEpisodes = null;
            
            if (item.Type === 'series') {
              if (detailData.Runtime && detailData.Runtime !== "N/A") {
                const runtimeMatch = detailData.Runtime.match(/(\d+)/);
                episodeRuntime = runtimeMatch ? parseInt(runtimeMatch[1]) : null;
              }
              
              if (detailData.totalSeasons && detailData.totalSeasons !== "N/A") {
                totalSeasons = parseInt(detailData.totalSeasons);
                totalEpisodes = totalSeasons * 20; // Estimate 20 episodes per season
              }
            }
            
            return {
              tmdbId: item.imdbID,
              title: item.Title,
              overview: detailData.Plot && detailData.Plot !== "N/A" ? detailData.Plot : "No description available",
              releaseDate: item.Year,
              posterPath: item.Poster !== "N/A" ? item.Poster : null,
              backdropPath: null,
              voteAverage: detailData.imdbRating && detailData.imdbRating !== "N/A" ? parseFloat(detailData.imdbRating) : 0,
              runtime: runtime,
              episodeRuntime: episodeRuntime,
              totalSeasons: totalSeasons,
              totalEpisodes: totalEpisodes,
              type: item.Type === 'series' ? 'tv' : 'movie',
              genres: detailData.Genre && detailData.Genre !== "N/A" ? detailData.Genre.split(', ') : []
            };
          } catch (error) {
            // Fallback to basic info if detailed fetch fails
            return {
              tmdbId: item.imdbID,
              title: item.Title,
              overview: "No description available",
              releaseDate: item.Year,
              posterPath: item.Poster !== "N/A" ? item.Poster : null,
              backdropPath: null,
              voteAverage: 0,
              runtime: null,
              episodeRuntime: null,
              totalSeasons: null,
              totalEpisodes: null,
              type: item.Type === 'series' ? 'tv' : 'movie',
              genres: []
            };
          }
        })
      );

      res.json(detailedResults);
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
      const { rating, notes, finishedAt } = req.body;
      await storage.updateWatchedItem(id, rating, notes, finishedAt);
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
      const rewatch = await storage.addRewatch({
        ...data,
        watchedAt: new Date(data.watchedAt)
      });
      res.json(rewatch);
    } catch (error) {
      console.error("Rewatch validation error:", error);
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
