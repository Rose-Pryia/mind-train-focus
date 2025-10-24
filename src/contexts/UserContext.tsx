import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userAPI, User, UserSettings } from '@/services/api';

interface UserContextType {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, name: string) => Promise<User>;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        loadSettings(userData.user_id);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        setLoading(false);
      }
    } else {
      // Don't auto-login - let user sign in manually
      setLoading(false);
    }
  }, []);

  const login = async (email: string, name: string): Promise<User> => {
    try {
      setLoading(true);
      const userData = await userAPI.login(email, name);
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      await loadSettings(userData.user_id);
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (userId: number) => {
    try {
      const settingsData = await userAPI.getSettings(userId);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateProfile = async (name: string, email: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const updatedUser = await userAPI.updateProfile(user.user_id, name, email);
      setUser(updatedUser);
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
      logout, 
      updateProfile,
      updateSettings 
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