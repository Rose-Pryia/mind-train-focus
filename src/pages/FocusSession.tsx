import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Play, Pause, Square, Timer, Calendar } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom"; // Need useLocation to read sessionId
import { toast } from "sonner";

// --- Imports for Backend Integration ---
import { useUser } from '@/contexts/UserContext'; 
// Import interfaces and API functions from the services/api file
import { sessionAPI, FocusSession as FocusSessionType, Checkin as CheckinType } from '@/services/api'; 
// ----------------------------------------

// --- Interfaces adapted to backend structure ---
interface SessionData extends FocusSessionType {
    // This interface now uses backend field names and includes the session ID
    session_id: number;
    subject: string;
    planned_duration: number; // In minutes
    start_time: string; // DATETIME string
    session_status: 'in_progress' | 'completed' | 'abandoned';
    total_checkins: number;
    successful_checkins: number;
    // Note: pausedAt/totalPausedTime are NOT included as BE doesn't support them explicitly
}

interface Checkin extends CheckinType {
    checkin_time: string;
    was_focused: boolean;
    response_time?: number;
}
// ----------------------------------------------

const FocusSession = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    loading: userLoading,
    settings,
    activeSession,
    startFocusSession,
    updateCheckInResponse,
    togglePauseSession,
    endFocusSession,
    setShowCheckInState,
    playNotificationSound,
    stopNotificationSound,
  } = useUser();

  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);

  
  // Get sessionId from URL query parameter set by Timetable.tsx
  const urlParams = new URLSearchParams(location.search);
  const currentSessionId = parseInt(urlParams.get('sessionId') || '0'); 
  
  // --- Client-Side Timer State (now derived from context) ---
  // No longer managing local state for session data or timers

  // --- Initial Data Fetching ---
  useEffect(() => {
    if (userLoading || currentSessionId === 0 || activeSession) return;

    if (!user) {
        // If no user, user context will handle auth redirect or prompt
        return;
    }
    
    async function loadSession() {
      try {
        const session = await sessionAPI.getAll(user.user_id).then(sessions => sessions.find(s => s.session_id === currentSessionId) || null);

        if (session) {
          startFocusSession(session as SessionData);
        } else {
          // No session found, redirect to timetable or show error
          // The noSession state is now handled by the absence of activeSession
          navigate("/timetable", { replace: true });
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        navigate("/timetable", { replace: true });
      }
    }
    
    loadSession();
    
    localStorage.removeItem("currentSession");

  }, [user, userLoading, currentSessionId, activeSession, startFocusSession, navigate]); 

  
  // --- Event Handlers (Integrated with BE via context) ---
  const handleCheckInResponse = async (wasFocused: boolean) => {
    if (!activeSession) return;
    const responseTime = 30 - activeSession.checkInTimeout; // Assuming timeout starts at 30
    await updateCheckInResponse(wasFocused, responseTime);
    if (wasFocused) {
      toast.success("Great! Stay focused!");
    } else {
      toast("Take a moment to refocus", { icon: "🎯" });
    }
    
  };
  
  // --- Display Helpers ---
  
  const formatTime = (seconds: number) => {
    const totalMins = Math.floor(seconds / 60);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (userLoading) return <div className="flex items-center justify-center h-screen">Loading user data...</div>;
  
  if (!activeSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6 bg-card/95 backdrop-blur">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Timer className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">No Active Session</h2>
            <p className="text-muted-foreground">
              Start a focus session from your timetable to begin tracking your study time.
            </p>
          </div>
          <Button onClick={() => navigate("/timetable")} size="lg" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Go to Timetable
          </Button>
        </Card>
      </div>
    );
  }

  // Derive necessary data from activeSession
  const { sessionData, timeElapsed, checkins, showCheckIn, checkInTimeout, isPaused, plannedDurationSeconds } = activeSession;

  const timeRemaining = plannedDurationSeconds - timeElapsed;
  const progress = plannedDurationSeconds > 0 
    ? (timeElapsed / plannedDurationSeconds) * 100 
    : 0;

  const displayAccuracy = checkins.length > 0 
    ? `${Math.round((checkins.filter(c => c.was_focused).length / checkins.length) * 100)}%` 
    : "100%";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl p-8 text-center space-y-8 bg-card/95 backdrop-blur">
        <div>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            Focus Session
          </h2>
          <h1 className="text-4xl font-bold">{sessionData?.subject}</h1>
        </div>

        <div className="relative w-64 h-64 mx-auto">
          <svg className="transform -rotate-90 w-64 h-64">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-muted"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div>
              <div className="text-6xl font-bold">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {checkins.length} check-ins
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {!isPaused ? (
            <Button
              size="lg"
              variant="outline"
              onClick={togglePauseSession}
            >
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={togglePauseSession}
            >
              <Play className="w-5 h-5 mr-2" />
              Resume
            </Button>
          )}
          <Button
            size="lg"
            variant="destructive"
            onClick={() => setShowEndSessionDialog(true)}
          >
            <Square className="w-5 h-5 mr-2" />
            End Session
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Focus Accuracy: {displayAccuracy}
        </div>

      </Card>

      <Dialog
        open={showCheckIn}
        onOpenChange={(open) => {
          setShowCheckInState(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              Are you still focused?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <p className="text-center text-muted-foreground">
              Still working on <span className="font-semibold text-foreground">{sessionData?.subject}</span>?
            </p>
            <div className="text-center text-sm text-muted-foreground">
              Responding in {checkInTimeout}s...
            </div>
            <div className="flex gap-4">
              <Button
                className="flex-1 h-20 text-lg"
                onClick={() => handleCheckInResponse(true)}
              >
                <CheckCircle2 className="w-6 h-6 mr-2" />
                Yes, Still Focused
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-20 text-lg"
                onClick={() => handleCheckInResponse(false)}
              >
                <XCircle className="w-6 h-6 mr-2" />
                Lost Focus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Session Confirmation Dialog */}
      <Dialog
        open={showEndSessionDialog}
        onOpenChange={setShowEndSessionDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">End Focus Session?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <p className="text-muted-foreground">
              Are you sure you want to end this focus session? Your progress will be saved as abandoned.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => setShowEndSessionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  endFocusSession('abandoned');
                  setShowEndSessionDialog(false);
                  navigate("/timetable");
                }}
              >
                <Square className="w-5 h-5 mr-2" />
                End Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FocusSession;