import { Film, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import MovieSearch from "@/components/movie-search";
import ViewingStats from "@/components/viewing-stats";
import ViewingCharts from "@/components/viewing-charts";
import WatchlistSection from "@/components/watchlist-section";
import CurrentlyWatchingSection from "@/components/currently-watching-section";
import WatchedListSection from "@/components/watched-list-section";
import AuthModal from "@/components/auth-modal";
import { TrendingContent } from "@/components/trending-content";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  profileImageUrl?: string;
  authProvider: string;
}

export default function Home() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/user");
      const userData = await response.json();
      setUser(userData);
      setShowAuthModal(false);
    } catch (error) {
      // User is not authenticated
      setUser(null);
      setShowAuthModal(true);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setShowAuthModal(false);
    // After auth success, refresh to get latest user state
    setTimeout(() => checkAuthStatus(), 100);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      setShowAuthModal(true);
      toast({ title: "Logged out successfully" });
    } catch (error) {
      toast({ 
        title: "Error logging out", 
        description: "Please try again",
        variant: "destructive" 
      });
    }
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
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

  // Show auth modal if no user
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
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-5 h-5 rounded-full object-cover mr-1"
                  />
                ) : (
                  <User className="w-4 h-4 mr-1" />
                )}
                Welcome, <span className="font-medium ml-1">{user.displayName || user.username || user.email || 'User'}</span>
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

        {/* Viewing Charts */}
        <ViewingCharts userId={user.id} />

        {/* Trending & Popular Content */}
        <TrendingContent userId={user.id} />

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Watchlist */}
          <WatchlistSection userId={user.id} />

          {/* Currently Watching */}
          <CurrentlyWatchingSection userId={user.id} />
        </div>


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
