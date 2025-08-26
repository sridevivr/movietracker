import { Film, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import MovieSearch from "@/components/movie-search";
import ViewingStats from "@/components/viewing-stats";
import WatchlistSection from "@/components/watchlist-section";
import CurrentlyWatchingSection from "@/components/currently-watching-section";
import WatchedListSection from "@/components/watched-list-section";
import RewatchTimeline from "@/components/rewatch-timeline";
import AuthModal from "@/components/auth-modal";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("movieTracker_user");
    console.log("Loading saved user:", savedUser);
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log("Parsed user data:", userData);
        setUser(userData);
        setShowAuthModal(false);
      } catch (error) {
        console.error("Error parsing saved user:", error);
        // Clear invalid data
        localStorage.removeItem("movieTracker_user");
        setShowAuthModal(true);
      }
    } else {
      console.log("No saved user found");
      setShowAuthModal(true);
    }
  }, []);

  const handleAuthSuccess = (userData: { id: string; username: string }) => {
    console.log("Auth success with user data:", userData);
    setUser(userData);
    localStorage.setItem("movieTracker_user", JSON.stringify(userData));
    setShowAuthModal(false);
    console.log("User state updated and modal closed");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("movieTracker_user");
    setShowAuthModal(true);
  };

  // Show loading or auth modal if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Film className="text-primary text-6xl mx-auto" />
          <h1 className="text-3xl font-bold text-gray-900">Movie Tracker</h1>
          <p className="text-gray-600">Sign in to start tracking your movies and TV shows</p>
          <Button onClick={() => setShowAuthModal(true)} data-testid="button-show-auth">
            <User className="w-4 h-4 mr-2" />
            Get Started
          </Button>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

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
              <span className="text-sm text-gray-600 flex items-center">
                <User className="w-4 h-4 mr-1" />
                Welcome, <span className="font-medium ml-1">{user.username}</span>
              </span>
              <button 
                className="text-gray-600 hover:text-gray-900"
                onClick={handleLogout}
                data-testid="button-sign-out"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Section */}
        <MovieSearch userId={user.id} />

        {/* Viewing Stats */}
        <ViewingStats userId={user.id} />

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Watchlist */}
          <WatchlistSection userId={user.id} />

          {/* Currently Watching */}
          <CurrentlyWatchingSection userId={user.id} />
        </div>

        {/* Rewatch Timeline */}
        <RewatchTimeline userId={user.id} />

        {/* Watched List */}
        <WatchedListSection userId={user.id} />
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
