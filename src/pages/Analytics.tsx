import { Card } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Clock, Target, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedRoute } from '@/components/ProtectedRoute';

// --- NOTE: These imports rely on your external files (UserContext, services/api) ---
import { useUser } from '@/contexts/UserContext'; 
import { analyticsAPI, sessionAPI } from '@/services/api';
// ----------------------------------------------------------------------------------

const Analytics = () => {
  // --- STATE DECLARATIONS (Moved inside the function) ---
  // MOCK: Replace this placeholder if you fully implement useUser
  const { user } = useUser(); 
  
  const [weeklyStats, setWeeklyStats] = useState({ total_hours: 0, total_sessions: 0, avg_accuracy: 0 });
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [focusTrend, setFocusTrend] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- API Data Fetching Logic (Your provided useEffect) ---
  useEffect(() => {
    // Check for a valid user object to begin fetching
    if (!user || !user.user_id) {
        setLoading(false);
        return;
    }
    
    async function loadAnalytics() {
      try {
        const [stats, subjects, trend, sessions] = await Promise.all([
          analyticsAPI.getWeeklyStats(user.user_id),
          analyticsAPI.getSubjectPerformance(user.user_id),
          analyticsAPI.getFocusTrend(user.user_id),
          sessionAPI.getAll(user.user_id)
        ]);
        
        // Update all state variables with fetched data
        setWeeklyStats(stats);
        setSubjectPerformance(subjects);
        setFocusTrend(trend);
        setRecentSessions(sessions.slice(0, 10));
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadAnalytics();
  }, [user]);

  // --- Loading Check (Your provided logic) ---
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading analytics...</div>;
  }
  
  // --- Derived Stats (for StatCards) ---
  const stats = {
    // The previous local storage logic is replaced by deriving from weeklyStats
    totalHours: Math.round((weeklyStats.total_hours ?? 0) * 10) / 10,
    focusAccuracy: Math.round(weeklyStats.avg_accuracy ?? 0),
    currentStreak: 5, // Placeholder - needs actual BE logic
    longestStreak: 12, // Placeholder - needs actual BE logic
  };

  // --- Data Transformation for Charts ---
  
  // 1. Weekly Data (Mock data kept as backend does not provide day granularity)
  const weeklyData = [
    { day: "Mon", hours: 4.5 },
    { day: "Tue", hours: 3.2 },
    { day: "Wed", hours: 5.1 },
    { day: "Thu", hours: 4.0 },
    { day: "Fri", hours: 3.8 },
    { day: "Sat", hours: 2.5 },
    { day: "Sun", hours: 3.0 },
  ];

  // 2. Accuracy Trend (Mapped from focusTrend state)
  const accuracyTrend = focusTrend.map((d, index) => ({
    day: index + 1,
    accuracy: Math.round(d.avg_accuracy),
  }));

  // 3. Subject Data (Mapped from subjectPerformance state)
  const pieColors = ["#2563eb", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];
  const subjectData = subjectPerformance.map((entry, index) => ({
    name: entry.subject,
    value: entry.total_hours, // Assuming BE returns total_hours in hours
    color: pieColors[index % pieColors.length],
  }));

  // --- JSX Structure (Uses derived 'stats', 'weeklyData', 'accuracyTrend', 'subjectData') ---

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
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
};

export default Analytics;