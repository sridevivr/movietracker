import { Bookmark, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getImageUrl, formatReleaseDate } from "@/lib/tmdb";

interface WatchlistSectionProps {
  userId: string;
}

export default function WatchlistSection({ userId }: WatchlistSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: watchlist = [], isLoading } = useQuery({
    queryKey: ["/api/watchlist", userId],
    queryFn: async () => {
      const res = await fetch(`/api/watchlist/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch watchlist');
      return res.json();
    }
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (movieId: string) => {
      await apiRequest("DELETE", `/api/watchlist/${userId}/${movieId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist", userId] });
      toast({ title: "Removed from watchlist" });
    },
    onError: () => {
      toast({ title: "Failed to remove from watchlist", variant: "destructive" });
    }
  });

  const markAsWatchedMutation = useMutation({
    mutationFn: async (movieId: string) => {
      await apiRequest("POST", "/api/watched", {
        userId,
        movieId,
        rating: null,
        notes: null
      });
      await apiRequest("DELETE", `/api/watchlist/${userId}/${movieId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Marked as watched!" });
    },
    onError: () => {
      toast({ title: "Failed to mark as watched", variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Bookmark className="w-5 h-5 mr-2 text-secondary" />
          Want to Watch:
        </h2>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-15 bg-gray-200 rounded"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {watchlist.length > 0 ? (
              watchlist.map((item: any) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  data-testid={`watchlist-item-${item.movie.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={getImageUrl(item.movie.posterPath, 'w92')}
                      alt={`${item.movie.title} poster`}
                      className="w-10 h-15 object-cover rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900" data-testid={`text-watchlist-title-${item.movie.id}`}>
                        {item.movie.title}
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600" data-testid={`text-watchlist-year-${item.movie.id}`}>
                          {formatReleaseDate(item.movie.releaseDate)}
                        </p>
                        {item.movie.runtime && (
                          <p className="text-xs text-gray-500" data-testid={`text-watchlist-runtime-${item.movie.id}`}>
                            {item.movie.type === 'tv' 
                              ? `${Math.floor(item.movie.runtime / 60)}h ${item.movie.runtime % 60}m total` 
                              : `${item.movie.runtime}m`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-2 text-success hover:bg-green-50"
                      onClick={() => markAsWatchedMutation.mutate(item.movie.id)}
                      disabled={markAsWatchedMutation.isPending}
                      data-testid={`button-mark-watched-${item.movie.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-2 text-gray-400 hover:bg-gray-50"
                      onClick={() => removeFromWatchlistMutation.mutate(item.movie.id)}
                      disabled={removeFromWatchlistMutation.isPending}
                      data-testid={`button-remove-watchlist-${item.movie.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bookmark className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No items in your watchlist.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
