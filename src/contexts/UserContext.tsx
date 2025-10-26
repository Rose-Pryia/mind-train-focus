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
  const login = async (email: string, name: string): Promise<User> => {
    setLoading(true);
    try {
      const userData = await userAPI.login(email, name);
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
  
  // --- Initial Load Effect (Corrected Logic) ---
  useEffect(() => {
    async function initializeUser() {
      // Start with the assumption that loading is true
      setLoading(true);
      
      const savedUser = localStorage.getItem('currentUser');
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          // AWAIT loadSettings to ensure the API call completes
          await loadSettings(userData.user_id); 
        } catch (error) {
          console.error('Initial load failed, removing saved user:', error);
          localStorage.removeItem('currentUser');
          setUser(null);
          setSettings(null);
        }
      } 
      
      // Crucially, turn off loading ONLY once the check is complete (whether successful or not)
      setLoading(false); 
    }
    
    initializeUser();
  }, []);

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