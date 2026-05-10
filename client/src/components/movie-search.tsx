import { useState } from "react";
import { Search, Plus, Check, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getImageUrl, formatReleaseDate, type TMDBSearchResult } from "@/lib/tmdb";

interface MovieSearchProps {
  userId: string;
}

export default function MovieSearch({ userId }: MovieSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResults = [], isLoading, error: searchError } = useQuery({
    queryKey: ["/api/search", searchQuery],
    enabled: !!searchQuery && hasSearched,
    queryFn: async () => {
      const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Search failed');
      }
      return res.json() as Promise<TMDBSearchResult[]>;
    }
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async (movie: TMDBSearchResult) => {
      // First create/get the movie
      const movieRes = await apiRequest("POST", "/api/movies", movie);
      const movieData = await movieRes.json();
      
      // Then add to watchlist
      await apiRequest("POST", "/api/watchlist", {
        userId,
        movieId: movieData.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist", userId] });
      toast({ title: "Added to watchlist!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to add to watchlist", description: e.message, variant: "destructive" });
    }
  });

  const addToCurrentlyWatchingMutation = useMutation({
    mutationFn: async (movie: TMDBSearchResult) => {
      const movieRes = await apiRequest("POST", "/api/movies", movie);
      const movieData = await movieRes.json();
      await apiRequest("POST", "/api/currently-watching", {
        userId,
        movieId: movieData.id,
        progress: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching", userId] });
      toast({ title: "Added to currently watching!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to add to currently watching", description: e.message, variant: "destructive" });
    }
  });

  const markAsWatchedMutation = useMutation({
    mutationFn: async (movie: TMDBSearchResult) => {
      const movieRes = await apiRequest("POST", "/api/movies", movie);
      const movieData = await movieRes.json();
      await apiRequest("POST", "/api/watched", {
        userId,
        movieId: movieData.id,
        rating: null,
        notes: null,
        startedAt: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Marked as watched!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to mark as watched", description: e.message, variant: "destructive" });
    }
  });

  const handleStatusChange = async (movie: TMDBSearchResult, status: string) => {
    switch (status) {
      case 'watchlist':
        addToWatchlistMutation.mutate(movie);
        break;
      case 'currently-watching':
        addToCurrentlyWatchingMutation.mutate(movie);
        break;
      case 'watched':
        markAsWatchedMutation.mutate(movie);
        break;
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setHasSearched(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Search Movies</h2>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="title-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search by Title:
            </label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Input
                id="title-search"
                type="text"
                placeholder="Enter movie or TV show title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-12 sm:h-10 text-base sm:text-sm"
                data-testid="input-search-title"
              />
              <Button 
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="bg-primary hover:bg-blue-700 h-12 sm:h-10 px-6 text-base sm:text-sm touch-manipulation"
                data-testid="button-search"
              >
                <Search className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="mt-4 sm:mt-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Search Results:</h3>
          
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-600 mt-2">Searching...</p>
            </div>
          )}

          {searchError && (
            <div className="text-red-600 p-3 bg-red-50 rounded text-sm">
              Search error: {(searchError as Error).message}
            </div>
          )}

          {hasSearched && !isLoading && !searchError && (
            <div className="space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((movie) => (
                  <div 
                    key={`${movie.type}-${movie.tmdbId}`}
                    className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`card-search-result-${movie.tmdbId}`}
                  >
                    <img 
                      src={getImageUrl(movie.posterPath, 'w92')}
                      alt={`${movie.title} poster`}
                      className="w-12 h-18 sm:w-16 sm:h-24 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2" data-testid={`text-title-${movie.tmdbId}`}>
                        {movie.title}
                      </h4>
                      <div className="space-y-1 mt-1">
                        <p className="text-xs sm:text-sm text-gray-600" data-testid={`text-year-${movie.tmdbId}`}>
                          {formatReleaseDate(movie.releaseDate)} • {movie.type === 'movie' ? 'Movie' : 'TV Show'}
                        </p>
                        {movie.runtime && (
                          <p className="text-xs text-gray-500" data-testid={`text-runtime-${movie.tmdbId}`}>
                            {movie.type === 'tv' 
                              ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m total` 
                              : `${movie.runtime}m`
                            }
                          </p>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 hidden sm:block" data-testid={`text-overview-${movie.tmdbId}`}>
                        {movie.overview || 'No description available.'}
                      </p>
                      <div className="mt-2 sm:hidden">
                        <Select onValueChange={(value) => handleStatusChange(movie, value)}>
                          <SelectTrigger className="w-full h-9 text-xs touch-manipulation" data-testid={`select-status-${movie.tmdbId}`}>
                            <SelectValue placeholder="Add to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="watchlist">
                              <div className="flex items-center">
                                <Plus className="w-4 h-4 mr-2" />
                                Want to Watch
                              </div>
                            </SelectItem>
                            <SelectItem value="currently-watching">
                              <div className="flex items-center">
                                <Play className="w-4 h-4 mr-2" />
                                Currently Watching
                              </div>
                            </SelectItem>
                            <SelectItem value="watched">
                              <div className="flex items-center">
                                <Check className="w-4 h-4 mr-2" />
                                Watched
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="hidden sm:flex space-x-2 flex-shrink-0">
                      <Select onValueChange={(value) => handleStatusChange(movie, value)}>
                        <SelectTrigger className="w-40" data-testid={`select-status-${movie.tmdbId}`}>
                          <SelectValue placeholder="Add to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="watchlist">
                            <div className="flex items-center">
                              <Plus className="w-4 h-4 mr-2" />
                              Want to Watch
                            </div>
                          </SelectItem>
                          <SelectItem value="currently-watching">
                            <div className="flex items-center">
                              <Play className="w-4 h-4 mr-2" />
                              Currently Watching
                            </div>
                          </SelectItem>
                          <SelectItem value="watched">
                            <div className="flex items-center">
                              <Check className="w-4 h-4 mr-2" />
                              Watched
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No results found. Please try a different search.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
