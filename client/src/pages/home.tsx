import { Film } from "lucide-react";
import { useState, useEffect } from "react";
import MovieSearch from "@/components/movie-search";
import ViewingStats from "@/components/viewing-stats";
import ViewingCharts from "@/components/viewing-charts";
import WatchlistSection from "@/components/watchlist-section";
import CurrentlyWatchingSection from "@/components/currently-watching-section";
import WatchedListSection from "@/components/watched-list-section";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  username?: string;
  displayName?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiRequest("GET", "/api/auth/user")
      .then(r => r.json())
      .then(setUser)
      .catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Film className="text-primary text-6xl mx-auto animate-pulse" />
          <h1 className="text-3xl font-bold text-gray-900">Movie Tracker</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Film className="text-primary text-xl sm:text-2xl" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My Movie Tracker</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <MovieSearch userId={user.id} />
        <ViewingStats userId={user.id} />
        <ViewingCharts userId={user.id} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <WatchlistSection userId={user.id} />
          <CurrentlyWatchingSection userId={user.id} />
        </div>
        <WatchedListSection userId={user.id} />
      </main>
    </div>
  );
}
