# Movie Tracker Application

## Overview

This is a full-stack movie tracking application that allows users to search for movies and TV shows, manage watchlists, track viewing progress, and maintain a personal watched history. The application integrates with The Movie Database (TMDB) API to fetch movie and TV show data, providing users with comprehensive media information including posters, ratings, and metadata.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, utilizing modern development practices:

- **React with TypeScript**: Type-safe component development using functional components and hooks
- **Vite**: Fast development server and build tool with hot module replacement
- **Wouter**: Lightweight client-side routing library for navigation
- **TanStack Query**: Server state management for API calls with caching, background updates, and optimistic updates
- **Radix UI + Tailwind CSS**: Component library with shadcn/ui design system for consistent, accessible UI components
- **Custom CSS Variables**: Theme system supporting light/dark modes with CSS custom properties

The frontend follows a component-based architecture with clear separation between UI components, business logic, and API interactions. Components are organized by feature (search, watchlist, currently watching, etc.) with shared UI components in a dedicated directory.

### Backend Architecture
The server-side uses Node.js with Express in a RESTful API design:

- **Express.js**: Web framework handling HTTP requests, middleware, and routing
- **TypeScript**: Type safety across the entire backend codebase
- **Modular Storage Interface**: Abstracted data layer allowing for different storage implementations (currently in-memory, designed for easy database integration)
- **RESTful API Design**: Standard HTTP methods and status codes for predictable API behavior
- **Request Logging**: Comprehensive logging middleware for API monitoring and debugging

The backend architecture emphasizes modularity and maintainability, with clear separation between route handlers, business logic, and data access layers.

### Data Storage Solutions
The application uses a flexible storage architecture:

- **Drizzle ORM**: Type-safe database interactions with PostgreSQL
- **PostgreSQL**: Primary database for production data persistence
- **Schema-First Design**: Database schema defined in TypeScript with automatic type generation
- **Migration Support**: Database versioning and schema evolution through Drizzle migrations
- **Memory Storage Fallback**: In-memory storage implementation for development and testing

The storage layer is abstracted through interfaces, making it easy to switch between different storage backends or add caching layers.

### Authentication and Authorization
Currently implements a demo/development authentication system:

- **Demo User System**: Hardcoded user ID for development and demonstration purposes
- **Session-Ready Architecture**: Built with session-based authentication patterns for future implementation
- **Route Protection**: Infrastructure in place for protecting API endpoints (currently bypassed for demo)

### Database Schema Design
The application uses a relational database design optimized for movie tracking:

- **Users Table**: User account information and preferences
- **Movies Table**: Comprehensive movie/TV show metadata from TMDB
- **Watchlist Items**: Many-to-many relationship between users and movies for wish lists
- **Currently Watching**: Track viewing progress for ongoing content
- **Watched Items**: Completed content with ratings and notes
- **Rewatches**: Additional viewings of previously watched content

The schema supports both movies and TV shows through a unified content type system, with extensible fields for different media types.

### API Design Patterns
The REST API follows consistent patterns:

- **Resource-Based URLs**: Clear, predictable endpoint naming conventions
- **HTTP Status Codes**: Proper use of 200, 201, 400, 404, 500 for different scenarios
- **JSON Request/Response**: Standardized data format across all endpoints
- **Error Handling**: Consistent error response format with meaningful messages
- **Validation**: Input validation using Zod schemas for type safety

## External Dependencies

### Third-Party APIs
- **The Movie Database (TMDB) API**: Primary data source for movie and TV show information including metadata, images, and search functionality
- **TMDB Image CDN**: Serves movie posters and backdrop images with multiple size options

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production deployments
- **PostgreSQL**: Relational database system for data persistence

### Development and Build Tools
- **Vite**: Frontend build tool and development server
- **ESBuild**: JavaScript bundler for server-side code compilation
- **TypeScript Compiler**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing and autoprefixing

### Component and UI Libraries
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Component variant management
- **clsx/tailwind-merge**: Conditional CSS class utilities

### Validation and Type Safety
- **Zod**: Runtime type validation and schema definition
- **Drizzle Zod**: Integration between Drizzle ORM and Zod for type-safe database operations

### State Management and Data Fetching
- **TanStack React Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form state management and validation
- **Hookform Resolvers**: Integration between React Hook Form and validation libraries