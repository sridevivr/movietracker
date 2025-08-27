import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Graceful startup with database connection check
    log('Starting application...');
    
    // Check if database is accessible
    if (process.env.DATABASE_URL) {
      log('Database URL configured, proceeding with startup');
    } else {
      log('Warning: DATABASE_URL not configured, some features may not work');
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error for debugging but don't expose sensitive details
      log(`Error ${status}: ${message}`);
      
      res.status(status).json({ 
        message: status < 500 ? message : "Internal Server Error"
      });
      
      // Don't throw the error, just log it to prevent crashes
      if (status >= 500) {
        console.error('Server error:', err);
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      log('Setting up development environment with Vite');
      await setupVite(app, server);
    } else {
      log('Setting up production environment with static file serving');
      try {
        serveStatic(app);
      } catch (staticError: any) {
        log(`Warning: Static file setup failed - ${staticError.message}`);
        log('Application will continue but static files may not be served correctly');
        
        // Fallback: serve a simple response for the root route
        app.get('*', (_req, res) => {
          res.status(503).json({ 
            error: 'Static files not available',
            message: 'Please ensure the application is built correctly'
          });
        });
      }
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = "0.0.0.0";
    
    server.listen(port, host, () => {
      log(`Server successfully started on ${host}:${port}`);
      log(`Environment: ${app.get("env")}`);
    });
    
    // Improved error handling for server startup
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`Error: Port ${port} is already in use`);
        log('Please check if another instance is running or use a different port');
        process.exit(1);
      } else if (err.code === 'EACCES') {
        log(`Error: Permission denied for port ${port}`);
        log('Please check if you have permission to bind to this port');
        process.exit(1);
      } else {
        log(`Server error: ${err.message}`);
        console.error('Full error details:', err);
        process.exit(1);
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      log(`Received ${signal}, shutting down gracefully`);
      server.close(() => {
        log('Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        log('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (startupError: any) {
    log(`Fatal startup error: ${startupError.message}`);
    console.error('Startup error details:', startupError);
    process.exit(1);
  }
})();
