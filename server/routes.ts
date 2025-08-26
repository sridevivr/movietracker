import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import { storage } from "./storage";
import { insertMovieSchema, insertWatchlistItemSchema, insertCurrentlyWatchingSchema, insertWatchedItemSchema, insertRewatchSchema, insertUserSchema } from "@shared/schema";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Session setup
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production' 
        ? "https://movie-tracker-sridevivr.replit.app/api/auth/google/callback"
        : "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await storage.getUserByGoogleId(profile.id);
        
        if (user) {
          return done(null, user);
        }
        
        // Check if user exists with this email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // User exists but without Google ID - this shouldn't happen in normal flow
            return done(new Error('User exists with different auth method'), false);
          }
        }
        
        // Create new user
        user = await storage.createUser({
          googleId: profile.id,
          email: email || null,
          displayName: profile.displayName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
          authProvider: "google"
        });
        
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }));
  }

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword });
      
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Google OAuth routes
  app.get("/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=auth_failed" }),
    (req, res) => {
      // Successful authentication, redirect to home page
      res.redirect("/");
    }
  );

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        authProvider: user.authProvider
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });
  
  // Search movies via TMDB API
  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "TMDB API key not configured" });
      }

      // Search using TMDB API
      const searchResponse = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`);
      const searchData = await searchResponse.json();

      if (!searchData.results || searchData.results.length === 0) {
        return res.json([]);
      }

      // Get detailed info for each result
      const detailedResults = await Promise.all(
        searchData.results.slice(0, 10).map(async (item: any) => {
          try {
            let detailData = null;
            let runtime = null;
            let episodeRuntime = null;
            let totalSeasons = null;
            let totalEpisodes = null;
            let genres: string[] = [];

            // Get detailed information based on media type
            if (item.media_type === 'movie') {
              const detailResponse = await fetch(`https://api.themoviedb.org/3/movie/${item.id}?api_key=${apiKey}`);
              detailData = await detailResponse.json();
              runtime = detailData.runtime || null;
              genres = detailData.genres ? detailData.genres.map((g: any) => g.name) : [];
            } else if (item.media_type === 'tv') {
              const detailResponse = await fetch(`https://api.themoviedb.org/3/tv/${item.id}?api_key=${apiKey}`);
              detailData = await detailResponse.json();
              
              // For TV shows, calculate total runtime
              episodeRuntime = detailData.episode_run_time && detailData.episode_run_time.length > 0 
                ? detailData.episode_run_time[0] : null;
              totalSeasons = detailData.number_of_seasons || null;
              totalEpisodes = detailData.number_of_episodes || null;
              
              // Calculate runtime with fallback logic
              if (episodeRuntime && totalEpisodes) {
                runtime = episodeRuntime * totalEpisodes;
              } else if (totalEpisodes && !episodeRuntime) {
                // Fallback: estimate based on show genre/type
                // Use common TV episode lengths as fallback
                const estimatedEpisodeRuntime = totalEpisodes > 200 ? 22 : // Likely sitcom
                                              totalEpisodes > 100 ? 43 :   // Likely drama
                                              totalEpisodes > 50 ? 30 :    // Medium series
                                              45;                          // Default drama length
                runtime = estimatedEpisodeRuntime * totalEpisodes;
                episodeRuntime = estimatedEpisodeRuntime; // Store the estimate
                console.log(`Estimated runtime for ${item.name || item.title}: ${estimatedEpisodeRuntime}min x ${totalEpisodes} episodes`);
              }
              
              genres = detailData.genres ? detailData.genres.map((g: any) => g.name) : [];
            }

            const posterPath = item.poster_path 
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
              : null;

            const backdropPath = item.backdrop_path 
              ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` 
              : null;

            // Get the appropriate title and release date
            const title = item.media_type === 'tv' ? item.name : item.title;
            const releaseDate = item.media_type === 'tv' ? item.first_air_date : item.release_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear().toString() : null;

            return {
              tmdbId: item.id.toString(),
              title: title,
              overview: item.overview || "No description available",
              releaseDate: year,
              posterPath: posterPath,
              backdropPath: backdropPath,
              voteAverage: item.vote_average || 0,
              runtime: runtime,
              episodeRuntime: episodeRuntime,
              totalSeasons: totalSeasons,
              totalEpisodes: totalEpisodes,
              type: item.media_type === 'tv' ? 'tv' : 'movie',
              genres: genres
            };
          } catch (error) {
            console.error('Error fetching details for item:', item.id, error);
            // Fallback to basic info if detailed fetch fails
            const posterPath = item.poster_path 
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
              : null;

            const title = item.media_type === 'tv' ? item.name : item.title;
            const releaseDate = item.media_type === 'tv' ? item.first_air_date : item.release_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear().toString() : null;

            return {
              tmdbId: item.id.toString(),
              title: title,
              overview: item.overview || "No description available",
              releaseDate: year,
              posterPath: posterPath,
              backdropPath: null,
              voteAverage: item.vote_average || 0,
              runtime: null,
              episodeRuntime: null,
              totalSeasons: null,
              totalEpisodes: null,
              type: item.media_type === 'tv' ? 'tv' : 'movie',
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
      console.error("Failed to create/get movie:", error);
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
      
      // For each watched item, also get its rewatches
      const itemsWithRewatches = await Promise.all(
        watchedItems.map(async (item) => {
          const rewatches = await storage.getRewatchesForMovie(userId, item.movieId);
          return { ...item, rewatches };
        })
      );
      
      res.json(itemsWithRewatches);
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

  // Charts data endpoint
  app.get("/api/charts/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const chartData = await storage.getChartData(userId);
      res.json(chartData);
    } catch (error) {
      console.error("Failed to get chart data:", error);
      res.status(500).json({ error: "Failed to get chart data" });
    }
  });

  // Rewatch endpoints
  app.post("/api/rewatches", async (req, res) => {
    try {
      const data = insertRewatchSchema.parse(req.body);
      const rewatch = await storage.addRewatch(data);
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
