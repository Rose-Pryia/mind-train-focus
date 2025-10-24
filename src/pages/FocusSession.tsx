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

const playNotificationSound = () => {
  const audio = new Audio("/sounds/notification.wav");
  audio.play().catch(error => console.error("Error playing sound:", error));
};

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
  const { user, loading: userLoading, settings } = useUser();
  
  // Get sessionId from URL query parameter set by Timetable.tsx
  const urlParams = new URLSearchParams(location.search);
  const currentSessionId = parseInt(urlParams.get('sessionId') || '0'); 
  
  // --- Session State from API ---
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // --- Client-Side Timer State ---
  const [timeElapsed, setTimeElapsed] = useState(0); 
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInTimeout, setCheckInTimeout] = useState(30);
  const [noSession, setNoSession] = useState(false);

  // --- Refs and Constants ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const plannedDurationSeconds = (sessionData?.planned_duration ?? 0) * 60;
  
  // NOTE: Pause/Resume logic is disabled as backend doesn't support it (FocusSession.tsx was not modified in the base code).
  const [isPaused, setIsPaused] = useState(false);
  const pausedTimeRef = useRef(0);
  const totalPausedTimeRef = useRef(0);

  const stopNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  // --- Initial Data Fetching ---
  useEffect(() => {
    if (userLoading || currentSessionId === 0) return;

    if (!user) {
        setNoSession(true);
        setDataLoading(false);
        return;
    }
    
    async function loadSession() {
      try {
        // Fetch session data and check-ins in parallel
        const [session, checkinList] = await Promise.all([
          // NOTE: The backend code snippet provided in the previous step does not have an endpoint to GET a single session by ID. 
          // We are mocking this by assuming sessionAPI.getAll returns a list, and we find the one we need. 
          // A proper backend should have GET /api/sessions/:id
          sessionAPI.getAll(user.user_id).then(sessions => sessions.find(s => s.session_id === currentSessionId) || null),
          sessionAPI.getCheckins(currentSessionId)
        ]);

        if (session) {
          setSessionData(session as SessionData);
          setCheckins(checkinList);
          // Calculate initial elapsed time
          const now = new Date().getTime();
          const sessionStartTime = new Date(session.start_time).getTime();
          const initialElapsed = Math.floor((now - sessionStartTime) / 1000);
          setTimeElapsed(initialElapsed);
        } else {
          setNoSession(true);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        setNoSession(true);
      } finally {
        setDataLoading(false);
      }
    }
    
    loadSession();
    
    // Clear `currentSession` from local storage after reading the sessionId from the URL, 
    // as it's no longer the source of truth.
    localStorage.removeItem("currentSession");

  }, [user, userLoading, currentSessionId]); 

  // --- Main Timer Loop ---
  useEffect(() => {
    if (!sessionData || isPaused || dataLoading) return;

    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    const sessionStartTime = new Date(sessionData.start_time).getTime();
    const intervalDuration = settings?.check_in_interval ?? 15; // Use user setting, default to 15s

    // Start the main clock interval
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      
      // Calculate elapsed time, accounting for paused time
      const currentElapsed = Math.floor((now - sessionStartTime - totalPausedTimeRef.current) / 1000);
      setTimeElapsed(currentElapsed);

      const remaining = plannedDurationSeconds - currentElapsed;
      if (remaining <= 0) {
        // Automatically end session if time runs out
        endSession('completed');
        return;
      }
      
      // Check if it's time for a check-in
      // Simplified nextCheckInTime logic using elapsed time
      if (currentElapsed > 0 && currentElapsed % intervalDuration === 0 && !showCheckIn) {
        setShowCheckIn(true);
        setCheckInTimeout(30);
        playNotificationSound();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionData, isPaused, dataLoading, plannedDurationSeconds, settings?.check_in_interval, showCheckIn]);

  // --- Check-in Timeout Loop ---
  useEffect(() => {
    if (!showCheckIn) {
        if (checkinIntervalRef.current) clearInterval(checkinIntervalRef.current);
        return;
    }

    checkinIntervalRef.current = setInterval(() => {
      setCheckInTimeout((prev) => {
        if (prev <= 1) {
          handleCheckInResponse(false); // Auto-fail check-in
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
        if (checkinIntervalRef.current) clearInterval(checkinIntervalRef.current);
    }
  }, [showCheckIn]);


  // --- Event Handlers (Integrated with BE) ---

  const handleCheckInResponse = async (wasFocused: boolean) => {
    if (!sessionData) return;

    const responseTime = 30 - checkInTimeout; 
    
    try {
        // Log the check-in to the database
        await sessionAPI.addCheckin(sessionData.session_id, wasFocused, responseTime);
        
        // Corrected line: removed the incorrect type assertion on the array
        setCheckins(prev => [...prev, { 
            checkin_time: new Date().toISOString(), 
            was_focused: wasFocused, 
            response_time: responseTime 
        } as Checkin]);
        
        if (wasFocused) {
          toast.success("Great! Stay focused!");
        } else {
          toast("Take a moment to refocus", { icon: "🎯" });
        }
    } catch (error) {
        console.error("Check-in log error:", error);
        toast.error("Failed to log check-in.");
    }

    setShowCheckIn(false);
    stopNotificationSound(); 
  };
  
  // NOTE: Pause/Resume logic kept simple/mocked as BE API does not explicitly handle state changes.
  // This currently only affects the client-side timer.
  const togglePause = () => {
    const now = Date.now();
    
    if (isPaused) {
        // Resume: Calculate duration of the pause and add to total paused time
        totalPausedTimeRef.current += (now - pausedTimeRef.current);
        setIsPaused(false);
    }
    
    else {
        // Pause: Store the moment of pause
        pausedTimeRef.current = now;
        setIsPaused(true);
    }
  };

  const endSession = async (status: 'completed' | 'abandoned') => {
    if (!sessionData) return;

    // Calculate final metrics before sending to API
    const finalElapsedSeconds = Math.max(0, plannedDurationSeconds - plannedDurationSeconds + timeElapsed); // Should equal timeElapsed
    const actualDuration = Math.floor(finalElapsedSeconds / 60); // In minutes
    
    const totalCheckins = checkins.length;
    const successfulCheckins = checkins.filter(c => c.was_focused).length;
    const focusAccuracy = totalCheckins > 0 ? (successfulCheckins / totalCheckins) * 100 : 100;
    
    // 1. Update session in the database
    try {
        await sessionAPI.update(sessionData.session_id, {
            actualDuration,
            focusAccuracy,
            totalCheckins,
            successfulCheckins,
            sessionStatus: status
        });

        // 2. Clear state and redirect
        stopNotificationSound(); 
        toast.success("Session completed! 🎉");
        navigate("/analytics", { replace: true });
    } catch (error) {
        console.error('Failed to end session:', error);
        toast.error("Failed to finalize session.");
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

  // Remaining time calculation for UI based on planned duration
  const timeRemaining = plannedDurationSeconds - timeElapsed;
  const progress = plannedDurationSeconds > 0 
    ? (timeElapsed / plannedDurationSeconds) * 100 
    : 0;

  const displayAccuracy = checkins.length > 0 
    ? `${Math.round((checkins.filter(c => c.was_focused).length / checkins.length) * 100)}%` 
    : "100%";


  // --- Initial Loading/No Session Views ---

  if (dataLoading || userLoading) return <div className="flex items-center justify-center h-screen">Loading Session...</div>;
  
  if (noSession || !sessionData) {
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

  // --- Main Session View ---

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl p-8 text-center space-y-8 bg-card/95 backdrop-blur">
        <div>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            Focus Session
          </h2>
          <h1 className="text-4xl font-bold">{sessionData.subject}</h1>
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
              {/* Display elapsed time, as time remaining is difficult to calculate reliably with paused state */}
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
              onClick={togglePause}
            >
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={togglePause}
            >
              <Play className="w-5 h-5 mr-2" />
              Resume
            </Button>
          )}
          <Button
            size="lg"
            variant="destructive"
            onClick={() => endSession('abandoned')} // End session now sets status as abandoned
          >
            <Square className="w-5 h-5 mr-2" />
            End Session
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Focus Accuracy: {displayAccuracy}
        </div>
      </Card>

      <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              Are you still focused?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <p className="text-center text-muted-foreground">
              Still working on <span className="font-semibold text-foreground">{sessionData.subject}</span>?
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
    </div>
  );
};

export default FocusSession;