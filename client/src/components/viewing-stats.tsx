import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

interface ViewingStatsProps {
  userId: string;
}

export default function ViewingStats({ userId }: ViewingStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats", userId],
    queryFn: async () => {
      const res = await fetch(`/api/stats/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    }
  });

  if (isLoading || !stats) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">My Viewing Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="text-center p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">My Viewing Stats</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-watched">
              {stats.totalWatched}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Watched</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-watch-time">
              {stats.totalWatchTime}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Watch Time</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-average-rating">
              {stats.averageRating.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Average Rating</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-top-genre">
              {stats.topGenre}
            </div>
            <div className="text-sm text-gray-600 mt-1">Top Genre</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-rewatch-time">
              {stats.totalRewatchTime}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Rewatch Time</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
