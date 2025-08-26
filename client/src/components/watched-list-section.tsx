import { useState } from "react";
import { CheckSquare, RotateCcw, Edit, Trash2, Film, Plus, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getImageUrl, formatReleaseDate } from "@/lib/tmdb";
import RatingStars from "./rating-stars";
import RewatchModal from "./rewatch-modal";
import EditWatchedModal from "./edit-watched-modal";

interface WatchedListSectionProps {
  userId: string;
}

export default function WatchedListSection({ userId }: WatchedListSectionProps) {
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [showRewatchModal, setShowRewatchModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [selectedWatchedItem, setSelectedWatchedItem] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: watchedList = [], isLoading } = useQuery({
    queryKey: ["/api/watched", userId, filterType, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("filterType", filterType);
      if (sortBy) params.append("sortBy", sortBy);
      
      const res = await fetch(`/api/watched/${userId}?${params}`);
      if (!res.ok) throw new Error('Failed to fetch watched list');
      return res.json();
    }
  });

  const updateRatingMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string, rating: number }) => {
      await apiRequest("PATCH", `/api/watched/${id}`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Rating updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update rating", variant: "destructive" });
    }
  });

  const moveToListMutation = useMutation({
    mutationFn: async ({ movieId, targetList }: { movieId: string, targetList: string }) => {
      // Remove from watched first
      await apiRequest("DELETE", `/api/watched/${userId}/${movieId}`);
      
      // Add to target list
      if (targetList === 'watchlist') {
        await apiRequest("POST", "/api/watchlist", { userId, movieId });
      } else if (targetList === 'currently-watching') {
        await apiRequest("POST", "/api/currently-watching", { userId, movieId, progress: null });
      }
    },
    onSuccess: (_, { targetList }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      if (targetList === 'watchlist') {
        queryClient.invalidateQueries({ queryKey: ["/api/watchlist", userId] });
        toast({ title: "Moved to watchlist!" });
      } else if (targetList === 'currently-watching') {
        queryClient.invalidateQueries({ queryKey: ["/api/currently-watching", userId] });
        toast({ title: "Moved to currently watching!" });
      }
    },
    onError: () => {
      toast({ title: "Failed to move item", variant: "destructive" });
    }
  });

  const removeFromWatchedMutation = useMutation({
    mutationFn: async (movieId: string) => {
      await apiRequest("DELETE", `/api/watched/${userId}/${movieId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Removed from watched list" });
    },
    onError: () => {
      toast({ title: "Failed to remove from watched list", variant: "destructive" });
    }
  });

  const handleLogRewatch = (movieId: string) => {
    setSelectedMovieId(movieId);
    setShowRewatchModal(true);
  };

  const handleMoveToList = (movieId: string, targetList: string) => {
    moveToListMutation.mutate({ movieId, targetList });
  };

  const handleEditItem = (item: any) => {
    setSelectedWatchedItem(item);
    setShowEditModal(true);
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-success" />
              My Watched List:
            </h2>
            
            <div className="flex space-x-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32" data-testid="select-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="movies">Movies</SelectItem>
                  <SelectItem value="tv">TV Shows</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40" data-testid="select-sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="dateFinished">Date Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">
                <div className="w-8 h-8 bg-primary/20 rounded-full mx-auto mb-3"></div>
                <p className="text-gray-600">Loading your watched list...</p>
                <p className="text-sm text-gray-500 mt-1">Please wait while we connect to the database.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {watchedList.length > 0 ? (
                watchedList.map((item: any) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`watched-item-${item.movie.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <img 
                        src={getImageUrl(item.movie.posterPath, 'w92')}
                        alt={`${item.movie.title} poster`}
                        className="w-12 h-18 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900" data-testid={`text-watched-title-${item.movie.id}`}>
                          {item.movie.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span data-testid={`text-watched-year-${item.movie.id}`}>
                            {formatReleaseDate(item.movie.releaseDate)}
                          </span>
                          <span 
                            className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                            data-testid={`text-watched-type-${item.movie.id}`}
                          >
                            {item.movie.type === 'movie' ? 'Movie' : 'TV Show'}
                          </span>
                          {item.movie.runtime && (
                            <span className="text-xs text-gray-500">
                              {item.movie.type === 'tv' 
                                ? `${Math.floor(item.movie.runtime / 60)}h ${item.movie.runtime % 60}m total` 
                                : `${item.movie.runtime}m`
                              }
                            </span>
                          )}
                          <span data-testid={`text-watched-date-${item.movie.id}`}>
                            Finished: {new Date(item.finishedAt || item.watchedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {item.rewatches && item.rewatches.length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <div className="text-sm font-medium text-blue-800">Rewatches:</div>
                            <div className="text-xs text-blue-600 space-y-1">
                              {item.rewatches.map((rewatch: any, index: number) => (
                                <div key={rewatch.id || index}>
                                  {new Date(rewatch.watchedAt).toLocaleDateString()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-gray-600 mr-2">Your Rating:</span>
                          <div data-testid={`rating-${item.movie.id}`}>
                            <RatingStars 
                              rating={item.rating}
                              readonly={true}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-blue-700"
                        onClick={() => handleLogRewatch(item.movie.id)}
                        data-testid={`button-log-rewatch-${item.movie.id}`}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Log Rewatch
                      </Button>
                      
                      <Select onValueChange={(value) => handleMoveToList(item.movie.id, value)}>
                        <SelectTrigger className="w-32" data-testid={`select-move-${item.movie.id}`}>
                          <SelectValue placeholder="Move to..." />
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
                        </SelectContent>
                      </Select>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditItem(item)}
                        data-testid={`button-edit-${item.movie.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => removeFromWatchedMutation.mutate(item.movie.id)}
                        disabled={removeFromWatchedMutation.isPending}
                        data-testid={`button-remove-watched-${item.movie.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg mb-2">No movies or shows watched yet!</p>
                  <p className="text-sm">Start by searching for something to watch above.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RewatchModal
        isOpen={showRewatchModal}
        onClose={() => {
          setShowRewatchModal(false);
          setSelectedMovieId(null);
        }}
        userId={userId}
        movieId={selectedMovieId}
      />

      <EditWatchedModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedWatchedItem(null);
        }}
        userId={userId}
        watchedItem={selectedWatchedItem}
      />
    </>
  );
}
