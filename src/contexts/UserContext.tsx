import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { userAPI, User, UserSettings, FocusSession as FocusSessionType, Checkin as CheckinType, sessionAPI } from '@/services/api';

interface SessionData extends FocusSessionType {
  session_id: number;
  subject: string;
  planned_duration: number; // In minutes
  start_time: string; // DATETIME string
  session_status: 'in_progress' | 'completed' | 'abandoned';
  total_checkins: number;
  successful_checkins: number;
}

interface Checkin extends CheckinType {
  checkin_time: string;
  was_focused: boolean;
  response_time?: number;
}

interface ActiveSessionState {
  sessionData: SessionData | null;
  checkins: Checkin[];
  timeElapsed: number;
  showCheckIn: boolean;
  checkInTimeout: number;
  isPaused: boolean;
  plannedDurationSeconds: number;
  totalPausedTime: number; // This will replace totalPausedTimeRef
  pausedAt: number; // This will replace pausedTimeRef
  nextPromptTime: Date | null;
}

interface UserContextType {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, name: string, password: string) => Promise<User>;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  
  activeSession: ActiveSessionState | null;
  startFocusSession: (initialSessionData: SessionData) => Promise<void>;
  updateCheckInResponse: (wasFocused: boolean, responseTime: number) => Promise<void>;
  togglePauseSession: () => void;
  endFocusSession: (status: 'completed' | 'abandoned') => Promise<void>;
  setShowCheckInState: (show: boolean) => void;
  playNotificationSound: () => void;
  stopNotificationSound: () => void;
  setNextPromptTime: React.Dispatch<React.SetStateAction<Date | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(null);
  const [nextPromptTime, setNextPromptTime] = useState<Date | null>(null);

  // Refs for intervals and audio within the context
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audioRef once
  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.wav");
  }, []);

  const playNotificationSound = () => {
    if (settings?.sound_alerts && audioRef.current) {
      audioRef.current.currentTime = 0; // Rewind to start
      audioRef.current.play().catch(error => console.error("Error playing sound:", error));
    }
  };

  const stopNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // --- Helper to load settings ---
  const loadSettings = async (userId: number) => {
    try {
      const settingsData = await userAPI.getSettings(userId);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Do NOT set loading=false here, let the main caller (initializeUser or login) handle it
    }
  };
  
  // --- Login function for manual sign-in ---
  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const userData = await userAPI.login(email, password);
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      await loadSettings(userData.user_id);
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      // Ensure loading is turned off after the login attempt finishes
      setLoading(false); 
    }
  };
  
  // --- Register function for new users ---
  const register = async (email: string, name: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const userData = await userAPI.register(email, name, password);
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      await loadSettings(userData.user_id);
      return userData;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // --- Session Management Functions ---
  const startFocusSession = async (initialSessionData: SessionData) => {
    if (!user || !settings) return;

    const plannedDurationSeconds = initialSessionData.planned_duration * 60;

    // Calculate initial nextPromptTime
    let calculatedNextPromptTime: Date | null = null;
    if (settings.preferred_prompt_time) {
      const [hours, minutes] = settings.preferred_prompt_time.split(':').map(Number);
      const sessionStartTime = new Date(initialSessionData.start_time);
      let promptCandidate = new Date(sessionStartTime);
      promptCandidate.setHours(hours, minutes, 0, 0);

      // If the preferred time has already passed today relative to session start, schedule for tomorrow
      if (promptCandidate.getTime() < sessionStartTime.getTime()) {
        promptCandidate.setDate(promptCandidate.getDate() + 1);
      }
      calculatedNextPromptTime = promptCandidate;
    } else {
      // If no preferred time, schedule first prompt based on check-in interval from now
      calculatedNextPromptTime = new Date(Date.now() + (settings.check_in_interval ?? 1) * 60 * 1000);
    }

    setActiveSession({
      sessionData: initialSessionData,
      checkins: [],
      timeElapsed: 0,
      showCheckIn: false,
      checkInTimeout: 30,
      isPaused: false,
      plannedDurationSeconds: plannedDurationSeconds,
      totalPausedTime: 0,
      pausedAt: 0,
      nextPromptTime: calculatedNextPromptTime,
    });
    localStorage.setItem('activeSession', JSON.stringify(initialSessionData));
  };

  const updateCheckInResponse = async (wasFocused: boolean, responseTime: number) => {
    if (!user || !activeSession?.sessionData) return;

    try {
      await sessionAPI.addCheckin(activeSession.sessionData.session_id, wasFocused, responseTime);
      setActiveSession(prev => {
        if (!prev) return prev;
        const newCheckins = [...prev.checkins, {
          checkin_time: new Date().toISOString(),
          was_focused: wasFocused,
          response_time: responseTime
        } as Checkin];
        
        // After a check-in, schedule the next prompt for the same time tomorrow
        let newNextPromptTime = prev.nextPromptTime;
        if (newNextPromptTime) {
          const nextDay = new Date(newNextPromptTime);
          nextDay.setDate(nextDay.getDate() + 1);
          newNextPromptTime = nextDay;
        }

        return { ...prev, checkins: newCheckins, showCheckIn: false, checkInTimeout: 30, nextPromptTime: newNextPromptTime };
      });
      stopNotificationSound();
    } catch (error) {
      console.error("Check-in log error:", error);
      // toast.error("Failed to log check-in."); // Consider adding toast in FocusSession
    }
  };

  const togglePauseSession = () => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const now = Date.now();
      if (prev.isPaused) {
        // Resume
        const newTotalPausedTime = prev.totalPausedTime + (now - prev.pausedAt);
        return { ...prev, isPaused: false, totalPausedTime: newTotalPausedTime, pausedAt: 0 };
      } else {
        // Pause
        return { ...prev, isPaused: true, pausedAt: now };
      }
    });
  };

  const endFocusSession = async (status: 'completed' | 'abandoned') => {
    if (!user || !activeSession?.sessionData) return;

    const { sessionData, timeElapsed, checkins, plannedDurationSeconds } = activeSession;

    const finalElapsedSeconds = Math.max(0, plannedDurationSeconds - plannedDurationSeconds + timeElapsed);
    const actualDuration = Math.floor(finalElapsedSeconds / 60);

    const totalCheckins = checkins.length;
    const successfulCheckins = checkins.filter(c => c.was_focused).length;
    const focusAccuracy = totalCheckins > 0 ? (successfulCheckins / totalCheckins) * 100 : 100;

    try {
      await sessionAPI.update(sessionData.session_id, {
        actualDuration,
        focusAccuracy,
        totalCheckins,
        successfulCheckins,
        sessionStatus: status
      });
      setActiveSession(null);
      localStorage.removeItem('activeSession');
      stopNotificationSound();
      // toast.success("Session completed! 🎉"); // Consider adding toast in FocusSession
    } catch (error) {
      console.error('Failed to end session:', error);
      // toast.error("Failed to finalize session."); // Consider adding toast in FocusSession
    }
  };

  const setShowCheckInState = (show: boolean) => {
    setActiveSession(prev => prev ? { ...prev, showCheckIn: show } : prev);
    if (!show) {
      stopNotificationSound();
    }
  };

  // --- Main Timer Loop Effect ---
  useEffect(() => {
    if (!activeSession || activeSession.isPaused || !user || loading) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const sessionStartTime = new Date(activeSession.sessionData!.start_time).getTime();
    const intervalDuration = settings?.check_in_interval ?? 1; // Use user setting, default to 1s

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setActiveSession(prev => {
        if (!prev) {
          clearInterval(intervalRef.current!); // Ensure interval is cleared if session becomes null
          return null;
        }

        const now = Date.now();
        const currentElapsed = Math.floor((now - sessionStartTime - prev.totalPausedTime) / 1000);

        const remaining = prev.plannedDurationSeconds - currentElapsed;
        if (remaining <= 0) {
          endFocusSession('completed');
          clearInterval(intervalRef.current!); // Stop timer on session end
          return null;
        }

        let newNextPromptTime = prev.nextPromptTime; // Keep current if not triggering a new one
        let shouldShowCheckIn = false;

        // Check if it's time for the preferred prompt or interval-based prompt
        if (settings?.preferred_prompt_time && prev.nextPromptTime && now >= prev.nextPromptTime.getTime() && !prev.showCheckIn) {
          playNotificationSound();
          // Schedule the next prompt for the same time tomorrow
          const nextDay = new Date(prev.nextPromptTime);
          nextDay.setDate(nextDay.getDate() + 1);
          newNextPromptTime = nextDay;
          shouldShowCheckIn = true;
        } else if (!settings?.preferred_prompt_time && currentElapsed > 0 && currentElapsed % (intervalDuration * 60) === 0 && !prev.showCheckIn) {
          playNotificationSound();
          // For interval-based, schedule the next prompt based on the interval from now
          newNextPromptTime = new Date(Date.now() + intervalDuration * 60 * 1000);
          shouldShowCheckIn = true;
        }

        if (shouldShowCheckIn) {
          setNextPromptTime(newNextPromptTime); // Update global state for next prompt time
          return { ...prev, timeElapsed: currentElapsed, showCheckIn: true, checkInTimeout: 30, nextPromptTime: newNextPromptTime };
        }

        return { ...prev, timeElapsed: currentElapsed };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession, user, loading, settings?.check_in_interval, settings?.preferred_prompt_time, nextPromptTime]);

  // --- Check-in Timeout Loop Effect ---
  useEffect(() => {
    if (!activeSession?.showCheckIn) {
      if (checkinIntervalRef.current) clearInterval(checkinIntervalRef.current);
      return;
    }

    if (checkinIntervalRef.current) clearInterval(checkinIntervalRef.current);

    checkinIntervalRef.current = setInterval(() => {
      setActiveSession(prev => {
        if (!prev) {
          clearInterval(checkinIntervalRef.current!); // Clear if session becomes null
          return null;
        }

        const newCheckInTimeout = prev.checkInTimeout - 1;
        if (newCheckInTimeout <= 0) {
          updateCheckInResponse(false, 30); // Auto-fail check-in
          return { ...prev, showCheckIn: false, checkInTimeout: 30 };
        }
        return { ...prev, checkInTimeout: newCheckInTimeout };
      });
    }, 1000);

    return () => {
      if (checkinIntervalRef.current) clearInterval(checkinIntervalRef.current);
    };
  }, [activeSession?.showCheckIn]);

  // --- Initial Load Effect (Corrected Logic) ---
  useEffect(() => {
    async function initializeUserAndSession() {
      setLoading(true);

      const savedUser = localStorage.getItem('currentUser');
      const savedSession = localStorage.getItem('activeSession');

      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          await loadSettings(userData.user_id);

          if (savedSession) {
            const sessionData = JSON.parse(savedSession);
            // Reconstruct active session state, ensuring timers are not running
            setActiveSession(prev => {
              const rehydratedSession = {
                ...sessionData,
                isPaused: true, // Start paused to prevent immediate timer issues
                pausedAt: Date.now(), // Set pausedAt to now for correct resume calculation
                showCheckIn: false, // Hide check-in dialog on load
                checkInTimeout: 30,
                nextPromptTime: sessionData.nextPromptTime ? new Date(sessionData.nextPromptTime) : null,
              };
              setNextPromptTime(rehydratedSession.nextPromptTime);
              return rehydratedSession;
            });
          }
        } catch (error) {
          console.error('Initial load failed, removing saved user/session:', error);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('activeSession');
          setUser(null);
          setSettings(null);
          setActiveSession(null);
        }
      }
      setLoading(false);
    }

    initializeUserAndSession();
  }, []);

  // Effect to save active session to localStorage whenever it changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('activeSession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('activeSession');
    }
  }, [activeSession]);

  const updateProfile = async (name: string, email: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Assuming userAPI.updateProfile returns the newly updated user object
      const updatedUser = await userAPI.updateProfile(user.user_id, name, email);
      
      // Update the user state globally
      setUser(updatedUser);
      // Update local storage so profile persists on refresh
      localStorage.setItem('currentUser', JSON.stringify(updatedUser)); 
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await userAPI.updateSettings(user.user_id, newSettings);
      setSettings((prev) => (prev ? { ...prev, ...newSettings } : null));
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setSettings(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      settings, 
      loading, 
      isAuthenticated: !!user,
      login, 
      register,
      logout, 
      updateProfile,
      updateSettings,
      
      activeSession,
      startFocusSession,
      updateCheckInResponse,
      togglePauseSession,
      endFocusSession,
      setShowCheckInState,
      playNotificationSound,
      stopNotificationSound,
      setNextPromptTime,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}