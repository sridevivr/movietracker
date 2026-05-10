import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, TrendingUp, PieChart as PieChartIcon } from "lucide-react";

interface ViewingChartsProps {
  userId: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347'];

export default function ViewingCharts({ userId }: ViewingChartsProps) {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ["/api/charts", userId],
    queryFn: async () => {
      const res = await fetch(`/api/charts/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch chart data');
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Viewing Analytics</h2>
        <div className="text-red-600 p-4 bg-red-50 rounded">
          Error loading charts: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (isLoading || !chartData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Viewing Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasGenres = chartData.genreData && chartData.genreData.length > 0;
  const hasRatings = chartData.movieRatings && chartData.movieRatings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="text-primary text-2xl" />
        <h2 className="text-2xl font-bold text-gray-900">Viewing Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5" />
              <span>Favorite Genres</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasGenres ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.genreData}
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    dataKey="count"
                  >
                    {chartData.genreData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any, props: any) => [value, props.payload.genre]} />
                  <Legend
                    formatter={(_: any, entry: any) => entry.payload.genre}
                    iconType="circle"
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No genre data yet — add some watched movies with genres.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-movie Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Your Ratings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasRatings ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.movieRatings} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="title"
                    fontSize={11}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    fontSize={12}
                    domain={[0, 5]}
                    tickFormatter={(v) => `${v}★`}
                  />
                  <Tooltip formatter={(value: any) => [`${value}★`, "Rating"]} />
                  <Bar dataKey="rating" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No ratings yet — rate your watched movies.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
