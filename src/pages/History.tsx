import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

// --- Imports for Backend Integration ---
import { useUser } from '@/contexts/UserContext';
import { sessionAPI, FocusSession as FocusSessionType } from '@/services/api';
// ----------------------------------------
import { ProtectedRoute } from '@/components/ProtectedRoute';
// The interface is updated to match the structure returned by your FocusSession API
interface SessionRecord {
    session_id: number;
    subject: string;
    planned_duration: number; 
    actual_duration: number; // Stored in minutes
    start_time: string; // DATETIME string
    end_time: string; // DATETIME string
    focus_accuracy: number; // DECIMAL(5,2)
    total_checkins: number;
    successful_checkins: number;
    session_status: string;
}

const History = () => {
    // --- Context and State Hooks ---
    const { user } = useUser();
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Data Fetching Logic (Your provided useEffect) ---
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        
        async function loadHistory() {
            try {
                // Fetch all sessions from the API
                const data = await sessionAPI.getAll(user.user_id);
                // The backend API already orders sessions by DESC start_time, so we use the data directly
                setSessions(data as SessionRecord[]); 
            } catch (error) {
                console.error('Failed to load history:', error);
            } finally {
                setLoading(false);
            }
        }
        
        loadHistory();
    }, [user]); // Dependency on user ensures it runs on login

    // --- Helper Function updated to handle DATETIME string ---
    const formatDate = (dateString: string) => {
        // Use Date object constructor with the string
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };
    
    // --- Loading and Authentication Checks ---
    
    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading session history...</div>;
    }
    
    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8 mt-16 max-w-4xl text-center">
                <p className="text-xl text-muted-foreground">Please sign in to view your history.</p>
            </div>
        );
    }
    // -----------------------------------------

    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8 mt-16">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Session History</h1>
                <p className="text-muted-foreground">Review your past focus sessions</p>
            </div>

            {sessions.length === 0 ? (
                <Card className="p-12 text-center">
                    <p className="text-xl text-muted-foreground">No sessions yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Start your first focus session to see it here!</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {sessions.map((session) => {
                        // Variables derived from backend fields
                        const failedCheckins = session.total_checkins - session.successful_checkins;
                        
                        return (
                            <Card key={session.session_id} className="p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-semibold">{session.subject}</h3>
                                            <Badge variant={session.focus_accuracy >= 80 ? "default" : "secondary"}>
                                                {Math.round(session.focus_accuracy)}% Focus
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {/* Uses new start_time field */}
                                            {formatDate(session.start_time)}
                                        </p>
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">Duration:</span>
                                                {/* Uses new actual_duration field */}
                                                <span className="font-medium">{session.actual_duration} min</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Uses new total_checkins field */}
                                                <span className="text-muted-foreground">Check-ins:</span>
                                                <span className="font-medium">{session.total_checkins}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                {/* Uses new successful_checkins field */}
                                                <span className="font-medium">
                                                    {session.successful_checkins}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-red-500" />
                                                {/* Calculated from backend fields */}
                                                <span className="font-medium">
                                                    {failedCheckins}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
        </ProtectedRoute>
    );
};

export default History;