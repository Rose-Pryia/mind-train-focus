import { useState, useEffect } from "react";
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

const FocusSession = () => {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [checkInTimeout, setCheckInTimeout] = useState(30);
  const [nextCheckInTime, setNextCheckInTime] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("currentSession");
    if (stored) {
      const data = JSON.parse(stored);
      setSessionData(data);
      setTimeRemaining(data.duration * 60); // Convert to seconds
      setIsActive(true);
      scheduleNextCheckIn();
    } else {
      navigate("/timetable");
    }
  }, [navigate]);

  const scheduleNextCheckIn = () => {
    // Random interval between 10-20 minutes (600-1200 seconds)
    const randomInterval = Math.floor(Math.random() * 600) + 600;
    setNextCheckInTime(Date.now() + randomInterval * 1000);
  };

  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        return prev - 1;
      });

      // Check if it's time for a check-in
      if (Date.now() >= nextCheckInTime && !showCheckIn) {
        setShowCheckIn(true);
        setCheckInTimeout(30);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, nextCheckInTime, showCheckIn]);

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
    const newCheckIn: CheckIn = {
      timestamp: Date.now(),
      focused,
    };
    setCheckIns([...checkIns, newCheckIn]);
    setShowCheckIn(false);
    scheduleNextCheckIn();
    
    if (focused) {
      toast.success("Great! Stay focused!");
    } else {
      toast("Take a moment to refocus", { icon: "🎯" });
    }
  };

  const endSession = () => {
    if (!sessionData) return;

    const sessionRecord = {
      id: Date.now().toString(),
      subject: sessionData.subject,
      duration: sessionData.duration,
      startTime: sessionData.startTime,
      endTime: Date.now(),
      checkIns,
      focusAccuracy: checkIns.length > 0 
        ? (checkIns.filter(c => c.focused).length / checkIns.length) * 100 
        : 100,
    };

    const history = JSON.parse(localStorage.getItem("sessionHistory") || "[]");
    history.push(sessionRecord);
    localStorage.setItem("sessionHistory", JSON.stringify(history));
    localStorage.removeItem("currentSession");

    toast.success("Session completed! 🎉");
    navigate("/analytics");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = sessionData 
    ? ((sessionData.duration * 60 - timeRemaining) / (sessionData.duration * 60)) * 100 
    : 0;

  if (!sessionData) return null;

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
              <div className="text-6xl font-bold">{formatTime(timeRemaining)}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {checkIns.length} check-ins
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {!isPaused ? (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsPaused(true)}
            >
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => setIsPaused(false)}
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
          Focus Accuracy: {checkIns.length > 0 
            ? `${Math.round((checkIns.filter(c => c.focused).length / checkIns.length) * 100)}%` 
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
    </div>
  );
};

export default FocusSession;
