import { Card } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Clock, Target, Flame } from "lucide-react";
import { useEffect, useState } from "react";

const Analytics = () => {
  const [stats, setStats] = useState({
    totalHours: 0,
    focusAccuracy: 0,
    currentStreak: 0,
    longestStreak: 0,
  });

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("sessionHistory") || "[]");
    
    if (history.length > 0) {
      const totalMinutes = history.reduce((acc: number, session: any) => acc + session.duration, 0);
      const avgAccuracy = history.reduce((acc: number, session: any) => acc + session.focusAccuracy, 0) / history.length;
      
      setStats({
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        focusAccuracy: Math.round(avgAccuracy),
        currentStreak: 5, // Simplified for demo
        longestStreak: 12, // Simplified for demo
      });
    }
  }, []);

  const weeklyData = [
    { day: "Mon", hours: 4.5 },
    { day: "Tue", hours: 3.2 },
    { day: "Wed", hours: 5.1 },
    { day: "Thu", hours: 4.0 },
    { day: "Fri", hours: 3.8 },
    { day: "Sat", hours: 2.5 },
    { day: "Sun", hours: 3.0 },
  ];

  const accuracyTrend = [
    { day: 1, accuracy: 75 },
    { day: 5, accuracy: 82 },
    { day: 10, accuracy: 88 },
    { day: 15, accuracy: 85 },
    { day: 20, accuracy: 92 },
    { day: 25, accuracy: 95 },
    { day: 30, accuracy: 93 },
  ];

  const subjectData = [
    { name: "Mathematics", value: 30, color: "#2563eb" },
    { name: "Physics", value: 25, color: "#8b5cf6" },
    { name: "Chemistry", value: 20, color: "#06b6d4" },
    { name: "Biology", value: 15, color: "#10b981" },
    { name: "Other", value: 10, color: "#f59e0b" },
  ];

  const StatCard = ({ icon: Icon, label, value, suffix = "" }: any) => (
    <Card className="p-6 bg-gradient-card backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold">
            {value}
            <span className="text-lg text-muted-foreground ml-1">{suffix}</span>
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Track your focus journey</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Clock} label="Total Hours This Week" value={stats.totalHours} suffix="hrs" />
        <StatCard icon={Target} label="Focus Accuracy" value={stats.focusAccuracy} suffix="%" />
        <StatCard icon={Flame} label="Current Streak" value={stats.currentStreak} suffix="days" />
        <StatCard icon={TrendingUp} label="Longest Streak" value={stats.longestStreak} suffix="days" />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Hours */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Study Hours This Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Accuracy Trend */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Focus Accuracy Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" label={{ value: "Days", position: "insideBottom", offset: -5 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--secondary))", r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Subject Distribution */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Time Distribution by Subject</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={subjectData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {subjectData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Attention Span Score */}
      <Card className="p-6 mt-6 bg-gradient-hero text-white">
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-2">Attention Span Score</h3>
          <div className="text-6xl font-bold mb-2">{stats.focusAccuracy}</div>
          <p className="text-lg opacity-90">Level: {stats.focusAccuracy >= 90 ? "Master" : stats.focusAccuracy >= 80 ? "Advanced" : "Intermediate"}</p>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
