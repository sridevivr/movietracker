import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Plus, Play, Eye, TrendingUp, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface TrendingContentProps {
  userId: string;
}

interface ContentItem {
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string;
  rating: number;
  voteCount: number;
  mediaType: string;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
}

interface TrendingData {
  trendingMovies: ContentItem[];
  trendingTV: ContentItem[];
  popularMovies: ContentItem[];
  popularTV: ContentItem[];
}

export function TrendingContent({ userId }: TrendingContentProps) {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("trending-movies");

  const { data: trendingData, isLoading } = useQuery({
    queryKey: ["/api/trending"],
    queryFn: async (): Promise<TrendingData> => {
      const res = await fetch("/api/trending");
      if (!res.ok) throw new Error("Failed to fetch trending content");
      return res.json();
    }
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async (content: ContentItem) => {
      const movieRes = await apiRequest("POST", "/api/movies", content);
      const movieData = await movieRes.json();
      
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

  const addToCurrentlyWatchingMutation = useMutation({
    mutationFn: async (content: ContentItem) => {
      const movieRes = await apiRequest("POST", "/api/movies", content);
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
    onError: () => {
      toast({ title: "Failed to add to currently watching", variant: "destructive" });
    }
  });

  const markAsWatchedMutation = useMutation({
    mutationFn: async (content: ContentItem) => {
      const movieRes = await apiRequest("POST", "/api/movies", content);
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
    onError: () => {
      toast({ title: "Failed to mark as watched", variant: "destructive" });
    }
  });

  const renderContentGrid = (items: ContentItem[], icon: React.ReactNode) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <Card key={item.tmdbId} className="group hover:shadow-lg transition-shadow">
          <CardContent className="p-3">
            <div className="relative mb-3">
              <img
                src={item.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
                alt={item.title}
                className="w-full h-48 object-cover rounded"
                data-testid={`poster-${item.mediaType}-${item.tmdbId}`}
              />
              <div className="absolute top-2 left-2 flex items-center gap-1">
                {icon}
                <Badge variant="secondary" className="text-xs">
                  {item.mediaType === 'movie' ? 'Movie' : 'TV'}
                </Badge>
              </div>
              {item.rating > 0 && (
                <div className="absolute top-2 right-2 bg-black/70 text-white rounded px-1 text-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {item.rating.toFixed(1)}
                </div>
              )}
            </div>
            
            <h3 className="font-semibold text-sm mb-1 line-clamp-2" data-testid={`title-${item.mediaType}-${item.tmdbId}`}>
              {item.title}
            </h3>
            
            {item.year && (
              <p className="text-xs text-muted-foreground mb-2">{item.year}</p>
            )}

            {item.mediaType === 'tv' && (item.totalSeasons || item.totalEpisodes) && (
              <div className="text-xs text-muted-foreground mb-2">
                {item.totalSeasons && `${item.totalSeasons} seasons`}
                {item.totalSeasons && item.totalEpisodes && " • "}
                {item.totalEpisodes && `${item.totalEpisodes} episodes`}
              </div>
            )}
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm" 
                variant="outline"
                onClick={() => addToWatchlistMutation.mutate(item)}
                disabled={addToWatchlistMutation.isPending}
                className="h-7 px-2"
                data-testid={`button-add-watchlist-${item.tmdbId}`}
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                size="sm" 
                variant="outline"
                onClick={() => addToCurrentlyWatchingMutation.mutate(item)}
                disabled={addToCurrentlyWatchingMutation.isPending}
                className="h-7 px-2"
                data-testid={`button-add-watching-${item.tmdbId}`}
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                size="sm" 
                variant="outline"
                onClick={() => markAsWatchedMutation.mutate(item)}
                disabled={markAsWatchedMutation.isPending}
                className="h-7 px-2"
                data-testid={`button-mark-watched-${item.tmdbId}`}
              >
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Trending & Popular</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded h-48 mb-2"></div>
              <div className="bg-muted rounded h-4 mb-1"></div>
              <div className="bg-muted rounded h-3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!trendingData) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="trending-content">
      <h2 className="text-xl font-semibold">Trending & Popular</h2>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trending-movies" data-testid="tab-trending-movies">
            Trending Movies
          </TabsTrigger>
          <TabsTrigger value="trending-tv" data-testid="tab-trending-tv">
            Trending TV
          </TabsTrigger>
          <TabsTrigger value="popular-movies" data-testid="tab-popular-movies">
            Popular Movies
          </TabsTrigger>
          <TabsTrigger value="popular-tv" data-testid="tab-popular-tv">
            Popular TV
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trending-movies">
          {renderContentGrid(trendingData.trendingMovies, <TrendingUp className="w-3 h-3 text-red-500" />)}
        </TabsContent>
        
        <TabsContent value="trending-tv">
          {renderContentGrid(trendingData.trendingTV, <TrendingUp className="w-3 h-3 text-red-500" />)}
        </TabsContent>
        
        <TabsContent value="popular-movies">
          {renderContentGrid(trendingData.popularMovies, <Crown className="w-3 h-3 text-yellow-500" />)}
        </TabsContent>
        
        <TabsContent value="popular-tv">
          {renderContentGrid(trendingData.popularTV, <Crown className="w-3 h-3 text-yellow-500" />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}