import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Play, Pause, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CheckIn {
  timestamp: number;
  focused: boolean;
}

interface SessionState {
  subject: string;
  totalDuration: number;
  startTime: number;
  pausedAt: number | null;
  totalPausedTime: number;
  checkIns: CheckIn[];
  nextCheckInTime: number;
}

const FocusSession = () => {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInTimeout, setCheckInTimeout] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or resume session
  useEffect(() => {
    console.log("FocusSession mounted");
    const storedState = localStorage.getItem("activeSessionState");
    console.log("Active session state:", storedState);
    
    if (storedState) {
      // Resume existing session
      console.log("Resuming existing session");
      const state: SessionState = JSON.parse(storedState);
      setSessionState(state);
      
      // Calculate elapsed time
      const now = Date.now();
      const elapsed = state.pausedAt 
        ? (state.pausedAt - state.startTime - state.totalPausedTime) / 1000
        : (now - state.startTime - state.totalPausedTime) / 1000;
      
      const remaining = Math.max(0, state.totalDuration * 60 - elapsed);
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        endSession();
      }
    } else {
      // Start new session from timetable
      const stored = localStorage.getItem("currentSession");
      console.log("Current session data:", stored);
      if (stored) {
        console.log("Creating new session from timetable data");
        const data = JSON.parse(stored);
        console.log("Parsed session data:", data);
        const now = Date.now();
        const newState: SessionState = {
          subject: data.subject,
          totalDuration: data.duration,
          startTime: now,
          pausedAt: null,
          totalPausedTime: 0,
          checkIns: [],
          nextCheckInTime: now + (Math.floor(Math.random() * 600) + 600) * 1000,
        };
        
        console.log("New session state:", newState);
        setSessionState(newState);
        setTimeRemaining(data.duration * 60);
        localStorage.setItem("activeSessionState", JSON.stringify(newState));
        localStorage.removeItem("currentSession");
      } else {
        console.log("No session data found, redirecting to timetable");
        navigate("/timetable");
      }
    }
  }, [navigate]);

  // Main timer loop
  useEffect(() => {
    if (!sessionState || sessionState.pausedAt) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - sessionState.startTime - sessionState.totalPausedTime) / 1000;
      const remaining = Math.max(0, sessionState.totalDuration * 60 - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        endSession();
        return;
      }

      // Check if it's time for a check-in
      if (now >= sessionState.nextCheckInTime && !showCheckIn) {
        setShowCheckIn(true);
        setCheckInTimeout(30);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionState, showCheckIn]);

  useEffect(() => {
    if (!showCheckIn) return;

    const timeout = setInterval(() => {
      setCheckInTimeout((prev) => {
        if (prev <= 1) {
          handleCheckInResponse(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timeout);
  }, [showCheckIn]);

  const handleCheckInResponse = (focused: boolean) => {
    if (!sessionState) return;

    const newCheckIn: CheckIn = {
      timestamp: Date.now(),
      focused,
    };
    
    const now = Date.now();
    const randomInterval = Math.floor(Math.random() * 600) + 600;
    const updatedState: SessionState = {
      ...sessionState,
      checkIns: [...sessionState.checkIns, newCheckIn],
      nextCheckInTime: now + randomInterval * 1000,
    };
    
    setSessionState(updatedState);
    localStorage.setItem("activeSessionState", JSON.stringify(updatedState));
    setShowCheckIn(false);
    
    if (focused) {
      toast.success("Great! Stay focused!");
    } else {
      toast("Take a moment to refocus", { icon: "🎯" });
    }
  };

  const togglePause = () => {
    if (!sessionState) return;

    const now = Date.now();
    
    if (sessionState.pausedAt) {
      // Resume
      const pauseDuration = now - sessionState.pausedAt;
      const updatedState: SessionState = {
        ...sessionState,
        pausedAt: null,
        totalPausedTime: sessionState.totalPausedTime + pauseDuration,
      };
      setSessionState(updatedState);
      localStorage.setItem("activeSessionState", JSON.stringify(updatedState));
    } else {
      // Pause
      const updatedState: SessionState = {
        ...sessionState,
        pausedAt: now,
      };
      setSessionState(updatedState);
      localStorage.setItem("activeSessionState", JSON.stringify(updatedState));
    }
  };

  const endSession = () => {
    if (!sessionState) return;

    const sessionRecord = {
      id: Date.now().toString(),
      subject: sessionState.subject,
      duration: sessionState.totalDuration,
      startTime: sessionState.startTime,
      endTime: Date.now(),
      checkIns: sessionState.checkIns,
      focusAccuracy: sessionState.checkIns.length > 0 
        ? (sessionState.checkIns.filter(c => c.focused).length / sessionState.checkIns.length) * 100 
        : 100,
    };

    const history = JSON.parse(localStorage.getItem("sessionHistory") || "[]");
    history.push(sessionRecord);
    localStorage.setItem("sessionHistory", JSON.stringify(history));
    localStorage.removeItem("activeSessionState");

    toast.success("Session completed! 🎉");
    navigate("/analytics");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = sessionState 
    ? ((sessionState.totalDuration * 60 - timeRemaining) / (sessionState.totalDuration * 60)) * 100 
    : 0;

  if (!sessionState) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl p-8 text-center space-y-8 bg-card/95 backdrop-blur">
        <div>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            Focus Session
          </h2>
          <h1 className="text-4xl font-bold">{sessionState.subject}</h1>
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
              <div className="text-6xl font-bold">{formatTime(timeRemaining)}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {sessionState.checkIns.length} check-ins
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {!sessionState.pausedAt ? (
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
            onClick={endSession}
          >
            <Square className="w-5 h-5 mr-2" />
            End Session
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Focus Accuracy: {sessionState.checkIns.length > 0 
            ? `${Math.round((sessionState.checkIns.filter(c => c.focused).length / sessionState.checkIns.length) * 100)}%` 
            : "100%"}
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
              Still working on <span className="font-semibold text-foreground">{sessionState?.subject}</span>?
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
