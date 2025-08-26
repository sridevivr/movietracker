import { useState } from "react";
import { Search, Plus, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/search", searchQuery],
    enabled: !!searchQuery && hasSearched,
    queryFn: async () => {
      const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
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
    onError: () => {
      toast({ title: "Failed to add to watchlist", variant: "destructive" });
    }
  });

  const markAsWatchedMutation = useMutation({
    mutationFn: async (movie: TMDBSearchResult) => {
      // First create/get the movie
      const movieRes = await apiRequest("POST", "/api/movies", movie);
      const movieData = await movieRes.json();
      
      // Then add to watched
      await apiRequest("POST", "/api/watched", {
        userId,
        movieId: movieData.id,
        rating: null,
        notes: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Marked as watched!" });
    },
    onError: () => {
      toast({ title: "Failed to mark as watched", variant: "destructive" });
    }
  });

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
    <Card className="mb-8">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Movies</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="title-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search by Title:
            </label>
            <div className="flex space-x-3">
              <Input
                id="title-search"
                type="text"
                placeholder="Enter movie or TV show title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                data-testid="input-search-title"
              />
              <Button 
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="bg-primary hover:bg-blue-700"
                data-testid="button-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Search Results:</h3>
          
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-600 mt-2">Searching...</p>
            </div>
          )}

          {hasSearched && !isLoading && (
            <div className="space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((movie) => (
                  <div 
                    key={`${movie.type}-${movie.tmdbId}`}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`card-search-result-${movie.tmdbId}`}
                  >
                    <img 
                      src={getImageUrl(movie.posterPath, 'w92')}
                      alt={`${movie.title} poster`}
                      className="w-16 h-24 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900" data-testid={`text-title-${movie.tmdbId}`}>
                        {movie.title}
                      </h4>
                      <p className="text-sm text-gray-600" data-testid={`text-year-${movie.tmdbId}`}>
                        {formatReleaseDate(movie.releaseDate)} • {movie.type === 'movie' ? 'Movie' : 'TV Show'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2" data-testid={`text-overview-${movie.tmdbId}`}>
                        {movie.overview || 'No description available.'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToWatchlistMutation.mutate(movie)}
                        disabled={addToWatchlistMutation.isPending}
                        data-testid={`button-add-watchlist-${movie.tmdbId}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Watchlist
                      </Button>
                      <Button
                        size="sm"
                        className="bg-success hover:bg-green-600"
                        onClick={() => markAsWatchedMutation.mutate(movie)}
                        disabled={markAsWatchedMutation.isPending}
                        data-testid={`button-mark-watched-${movie.tmdbId}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Watched
                      </Button>
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
