const API_BASE_URL = 'http://65.0.70.9:3000/api';

// Types
export interface User {
  user_id: number;
  email: string;
  name: string;
  created_at?: string;
}

export interface UserSettings {
  setting_id?: number;
  user_id: number;
  check_in_interval: number;
  randomize_interval: boolean;
  sound_alerts: boolean;
  daily_goal: number;
  weekly_goal: number;
  min_accuracy: number;
  dark_mode: boolean;
  background_animations: boolean;
}

export interface TimetableSlot {
  slot_id?: number;
  user_id: number;
  day_of_week: string;
  start_hour: number;
  subject: string;
  duration: number;
  color: string;
}

export interface FocusSession {
  session_id?: number;
  user_id: number;
  subject: string;
  planned_duration: number;
  actual_duration?: number;
  start_time: string;
  end_time?: string;
  focus_accuracy?: number;
  total_checkins: number;
  successful_checkins: number;
  session_status: 'in_progress' | 'completed' | 'abandoned';
}

export interface Checkin {
  checkin_id?: number;
  session_id: number;
  checkin_time: string;
  was_focused: boolean;
  response_time?: number;
}

export interface WeeklyStats {
  total_hours: number;
  total_sessions: number;
  avg_accuracy: number;
}

export interface SubjectPerformance {
  subject: string;
  total_sessions: number;
  total_hours: number;
  avg_accuracy: number;
}

export interface FocusTrend {
  session_date: string;
  avg_accuracy: number;
  session_count: number;
}

// Helper function for API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// User API
export const userAPI = {
  login: async (email: string, name: string): Promise<User> => {
    return await apiCall<User>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  },
  
  // ADD THIS NEW FUNCTION
  updateProfile: async (userId: number, name: string, email: string): Promise<User> => {
    return await apiCall<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    });
  },
  
  getSettings: async (userId: number): Promise<UserSettings> => {
    return await apiCall<UserSettings>(`/settings/${userId}`);
  },
  
  updateSettings: async (userId: number, settings: Partial<UserSettings>): Promise<{ message: string }> => {
    return await apiCall<{ message: string }>(`/settings/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        checkInInterval: settings.check_in_interval,
        randomizeInterval: settings.randomize_interval,
        soundAlerts: settings.sound_alerts,
        dailyGoal: settings.daily_goal,
        weeklyGoal: settings.weekly_goal,
        minAccuracy: settings.min_accuracy,
        darkMode: settings.dark_mode,
        backgroundAnimations: settings.background_animations,
      }),
    });
  },
};

// Timetable API
export const timetableAPI = {
  getAll: async (userId: number): Promise<TimetableSlot[]> => {
    return await apiCall<TimetableSlot[]>(`/timetable/${userId}`);
  },
  
  add: async (slot: Omit<TimetableSlot, 'slot_id'>): Promise<{ slotId: number; message: string }> => {
    return await apiCall<{ slotId: number; message: string }>('/timetable', {
      method: 'POST',
      body: JSON.stringify({
        userId: slot.user_id,
        dayOfWeek: slot.day_of_week,
        startHour: slot.start_hour,
        subject: slot.subject,
        duration: slot.duration,
        color: slot.color,
      }),
    });
  },
  
  delete: async (slotId: number): Promise<{ message: string }> => {
    return await apiCall<{ message: string }>(`/timetable/${slotId}`, {
      method: 'DELETE',
    });
  },
};

// Focus Session API
export const sessionAPI = {
  getAll: async (userId: number): Promise<FocusSession[]> => {
    return await apiCall<FocusSession[]>(`/sessions/${userId}`);
  },
  
  create: async (userId: number, subject: string, plannedDuration: number): Promise<{ sessionId: number; message: string }> => {
    const startTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return await apiCall<{ sessionId: number; message: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId, subject, plannedDuration, startTime }),
    });
  },
  
  update: async (sessionId: number, sessionData: {
    actualDuration: number;
    focusAccuracy: number;
    totalCheckins: number;
    successfulCheckins: number;
    sessionStatus: 'completed' | 'abandoned';
  }): Promise<{ message: string }> => {
    const endTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return await apiCall<{ message: string }>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        endTime,
        actualDuration: sessionData.actualDuration,
        focusAccuracy: sessionData.focusAccuracy,
        totalCheckins: sessionData.totalCheckins,
        successfulCheckins: sessionData.successfulCheckins,
        sessionStatus: sessionData.sessionStatus,
      }),
    });
  },
  
  addCheckin: async (sessionId: number, wasFocused: boolean, responseTime?: number): Promise<{ checkinId: number; message: string }> => {
    const checkinTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return await apiCall<{ checkinId: number; message: string }>('/checkins', {
      method: 'POST',
      body: JSON.stringify({ sessionId, checkinTime, wasFocused, responseTime }),
    });
  },
  
  getCheckins: async (sessionId: number): Promise<Checkin[]> => {
    return await apiCall<Checkin[]>(`/checkins/${sessionId}`);
  },
};

// Analytics API
export const analyticsAPI = {
  getWeeklyStats: async (userId: number): Promise<WeeklyStats> => {
    return await apiCall<WeeklyStats>(`/analytics/weekly/${userId}`);
  },
  
  getSubjectPerformance: async (userId: number): Promise<SubjectPerformance[]> => {
    return await apiCall<SubjectPerformance[]>(`/analytics/subjects/${userId}`);
  },
  
  getFocusTrend: async (userId: number): Promise<FocusTrend[]> => {
    return await apiCall<FocusTrend[]>(`/analytics/trend/${userId}`);
  },
};

// Export all
export default {
  user: userAPI,
  timetable: timetableAPI,
  session: sessionAPI,
  analytics: analyticsAPI,
};