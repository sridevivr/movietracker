import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, PieChart as PieChartIcon } from "lucide-react";

interface ViewingChartsProps {
  userId: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347'];

export default function ViewingCharts({ userId }: ViewingChartsProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["/api/charts", userId],
    queryFn: async () => {
      const res = await fetch(`/api/charts/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch chart data');
      return res.json();
    }
  });

  if (isLoading || !chartData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Viewing Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="text-primary text-2xl" />
        <h2 className="text-2xl font-bold text-gray-900">Viewing Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movies Watched Per Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Movies Watched Over Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12}
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${year.slice(-2)}`;
                  }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => {
                    const [year, month] = value.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  }}
                  formatter={(value: any) => [value, "Movies Watched"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Genre Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5" />
              <span>Favorite Genres</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.genreData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={(entry) => `${entry.genre} (${entry.count})`}
                  labelLine={false}
                >
                  {chartData.genreData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating Trends - Full Width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Rating Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.ratingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${year.slice(-2)}`;
                  }}
                />
                <YAxis 
                  fontSize={12}
                  domain={[0, 5]}
                  tickFormatter={(value) => `${value}★`}
                />
                <Tooltip 
                  labelFormatter={(value) => {
                    const [year, month] = value.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  }}
                  formatter={(value: any) => [`${value}★`, "Average Rating"]}
                />
                <Area
                  type="monotone"
                  dataKey="averageRating"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}