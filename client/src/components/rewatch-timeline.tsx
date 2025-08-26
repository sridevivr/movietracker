import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RewatchTimelineProps {
  userId: string;
}

interface TimelineEvent {
  date: Date;
  title: string;
  type: 'initial' | 'rewatch';
  movieId: string;
  posterPath?: string;
}

export default function RewatchTimeline({ userId }: RewatchTimelineProps) {
  const { data: watchedItems = [], isLoading } = useQuery({
    queryKey: ["/api/watched", userId],
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">Recent Viewing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  // Create timeline events from watched items and their rewatches
  const timelineEvents: TimelineEvent[] = [];
  
  watchedItems.forEach((item: any) => {
    // Add initial watch
    timelineEvents.push({
      date: new Date(item.finishedAt || item.watchedAt),
      title: item.movie.title,
      type: 'initial',
      movieId: item.movieId,
      posterPath: item.movie.posterPath
    });
    
    // Add rewatches
    item.rewatches?.forEach((rewatch: any) => {
      timelineEvents.push({
        date: new Date(rewatch.watchedAt),
        title: item.movie.title,
        type: 'rewatch',
        movieId: item.movieId,
        posterPath: item.movie.posterPath
      });
    });
  });
  
  // Sort events by date (most recent first)
  timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Get last 30 days of activity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentEvents = timelineEvents.filter(event => event.date >= thirtyDaysAgo);
  
  if (recentEvents.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">Recent Viewing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No viewing activity in the last 30 days</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-gray-800">Recent Viewing Timeline (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-purple-400"></div>
          
          {/* Timeline events */}
          <div className="space-y-6">
            {recentEvents.map((event, index) => (
              <div 
                key={`${event.movieId}-${event.date.toISOString()}-${event.type}`} 
                className="relative flex items-start space-x-4 animate-fade-in"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
              >
                {/* Timeline dot */}
                <div className={`relative z-10 w-4 h-4 rounded-full border-2 ${
                  event.type === 'initial' 
                    ? 'bg-green-400 border-green-500' 
                    : 'bg-blue-400 border-blue-500'
                } animate-pulse`}>
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className={`p-4 rounded-lg shadow-sm border-l-4 ${
                    event.type === 'initial' 
                      ? 'bg-green-50 border-green-400' 
                      : 'bg-blue-50 border-blue-400'
                  } hover:shadow-md transition-shadow duration-200`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {event.posterPath && (
                          <img 
                            src={event.posterPath} 
                            alt={event.title}
                            className="w-10 h-10 object-cover rounded-md shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-800">{event.title}</h3>
                          <p className={`text-sm ${
                            event.type === 'initial' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {event.type === 'initial' ? 'First Watch' : 'Rewatch'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {event.date.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {timelineEvents.length > recentEvents.length && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Showing last 30 days ({recentEvents.length} of {timelineEvents.length} total events)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}