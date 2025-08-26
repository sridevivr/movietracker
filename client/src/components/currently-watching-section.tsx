import { PlayCircle, Plus, Check } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getImageUrl, formatReleaseDate } from "@/lib/tmdb";
import ProgressUpdateModal from "./progress-update-modal";

interface CurrentlyWatchingSectionProps {
  userId: string;
}

export default function CurrentlyWatchingSection({ userId }: CurrentlyWatchingSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progressModal, setProgressModal] = useState<{ isOpen: boolean; item?: any }>({
    isOpen: false,
    item: undefined
  });

  const { data: currentlyWatching = [], isLoading } = useQuery({
    queryKey: ["/api/currently-watching", userId],
    queryFn: async () => {
      const res = await fetch(`/api/currently-watching/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch currently watching');
      return res.json();
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: string }) => {
      await apiRequest("PATCH", `/api/currently-watching/${id}/progress`, { progress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching", userId] });
      toast({ title: "Progress updated!" });
      setProgressModal({ isOpen: false, item: undefined });
    },
    onError: () => {
      toast({ title: "Failed to update progress", variant: "destructive" });
    }
  });

  const markAsFinishedMutation = useMutation({
    mutationFn: async (movieId: string) => {
      await apiRequest("POST", "/api/watched", {
        userId,
        movieId,
        rating: null,
        notes: null
      });
      await apiRequest("DELETE", `/api/currently-watching/${userId}/${movieId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Marked as finished!" });
    },
    onError: () => {
      toast({ title: "Failed to mark as finished", variant: "destructive" });
    }
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <PlayCircle className="w-5 h-5 mr-2 text-primary" />
          Currently Watching:
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
            {currentlyWatching.length > 0 ? (
              currentlyWatching.map((item: any) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  data-testid={`currently-watching-item-${item.movie.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={getImageUrl(item.movie.posterPath, 'w92')}
                      alt={`${item.movie.title} poster`}
                      className="w-10 h-15 object-cover rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900" data-testid={`text-currently-watching-title-${item.movie.id}`}>
                        {item.movie.title}
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600" data-testid={`text-currently-watching-progress-${item.movie.id}`}>
                          {item.progress || formatReleaseDate(item.movie.releaseDate)}
                        </p>
                        {item.movie.runtime && (
                          <p className="text-xs text-gray-500" data-testid={`text-currently-watching-runtime-${item.movie.id}`}>
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
                      className="p-2 text-primary hover:bg-blue-50"
                      onClick={() => setProgressModal({ isOpen: true, item })}
                      data-testid={`button-update-progress-${item.movie.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-2 text-success hover:bg-green-50"
                      onClick={() => markAsFinishedMutation.mutate(item.movie.id)}
                      disabled={markAsFinishedMutation.isPending}
                      data-testid={`button-mark-finished-${item.movie.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PlayCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No items are currently being watched.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {progressModal.item && (
        <ProgressUpdateModal
          isOpen={progressModal.isOpen}
          onClose={() => setProgressModal({ isOpen: false, item: undefined })}
          onSave={(progress) => updateProgressMutation.mutate({ 
            id: progressModal.item.id, 
            progress 
          })}
          currentProgress={progressModal.item.progress}
          movie={{
            title: progressModal.item.movie.title,
            type: progressModal.item.movie.type,
            totalSeasons: progressModal.item.movie.totalSeasons,
            totalEpisodes: progressModal.item.movie.totalEpisodes,
          }}
          isLoading={updateProgressMutation.isPending}
        />
      )}
    </Card>
  );
}
