import { Film, LogOut } from "lucide-react";
import MovieSearch from "@/components/movie-search";
import ViewingStats from "@/components/viewing-stats";
import WatchlistSection from "@/components/watchlist-section";
import CurrentlyWatchingSection from "@/components/currently-watching-section";
import WatchedListSection from "@/components/watched-list-section";
import RewatchTimeline from "@/components/rewatch-timeline";

const DEMO_USER_ID = "Z8JCPQ1U5ZPApP9wrLrczbBz0lc2";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Film className="text-primary text-2xl" />
              <h1 className="text-2xl font-bold text-gray-900">My Movie Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                User ID: <span className="font-mono">{DEMO_USER_ID}</span>
              </span>
              <button 
                className="text-gray-600 hover:text-gray-900"
                data-testid="button-sign-out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Section */}
        <MovieSearch userId={DEMO_USER_ID} />

        {/* Viewing Stats */}
        <ViewingStats userId={DEMO_USER_ID} />

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Watchlist */}
          <WatchlistSection userId={DEMO_USER_ID} />

          {/* Currently Watching */}
          <CurrentlyWatchingSection userId={DEMO_USER_ID} />
        </div>

        {/* Rewatch Timeline */}
        <RewatchTimeline userId={DEMO_USER_ID} />

        {/* Watched List */}
        <WatchedListSection userId={DEMO_USER_ID} />
      </main>
    </div>
  );
}
