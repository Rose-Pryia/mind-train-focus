import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProtectedRoute } from '@/components/ProtectedRoute';

// --- Imports for Backend Integration ---
import { useUser } from '@/contexts/UserContext';
import { UserSettings } from '@/services/api';
// ----------------------------------------

// Map the old UI state names to the new API/Context state names for clarity
type LocalSettingsState = {
    name: string;
    email: string;
    checkInInterval: number;
    randomizeInterval: boolean;
    soundAlerts: boolean;
    dailyGoal: number;
    weeklyGoal: number;
    minAccuracy: number;
    darkMode: boolean;
    backgroundAnimations: boolean;
    preferredPromptTime: string;
}

const Settings = () => {
  // --- Context State ---
  const { user, settings, updateSettings, updateProfile, loading: userLoading } = useUser();
  const [localSettings, setLocalSettings] = useState<LocalSettingsState | null>(null);
  const [savePending, setSavePending] = useState(false);

  // --- Effect to Load Settings from Context ---
  useEffect(() => {
    if (settings && user) {
      setLocalSettings({
        name: user.name,
        email: user.email,
        checkInInterval: settings.check_in_interval,
        randomizeInterval: settings.randomize_interval,
        soundAlerts: settings.sound_alerts,
        dailyGoal: settings.daily_goal,
        weeklyGoal: settings.weekly_goal,
        minAccuracy: Math.round(settings.min_accuracy),
        darkMode: settings.dark_mode,
        backgroundAnimations: settings.background_animations,
        preferredPromptTime: settings.preferred_prompt_time || "09:00", // Default to 09:00
      });
    } else if (!user && !userLoading) {
        setLocalSettings({
            name: "Guest", email: "N/A", checkInInterval: 15, randomizeInterval: false, soundAlerts: true,
            dailyGoal: 4, weeklyGoal: 25, minAccuracy: 80, darkMode: false, backgroundAnimations: true,
            preferredPromptTime: "09:00",
        });
    }
  }, [user, settings, userLoading]);

  // --- Handlers for Local State Changes ---
  const handleChange = (key: keyof LocalSettingsState, value: any) => {
    setLocalSettings(prev => prev ? { ...prev, [key]: value } : null);
  };
  
  // --- Save Handler (Integrated with BE) ---
  const handleSave = async () => {
    if (!localSettings || !user) {
        toast.error("Please sign in to save settings.");
        return;
    }
    
    setSavePending(true);
    
    try {
        // 1. Update Profile (name/email) if changed
        if (localSettings.name !== user.name || localSettings.email !== user.email) {
            await updateProfile(localSettings.name, localSettings.email);
        }
        
        // 2. Update Settings
        const settingsToUpdate: Partial<UserSettings> = {
            check_in_interval: localSettings.checkInInterval,
            randomize_interval: localSettings.randomizeInterval,
            sound_alerts: localSettings.soundAlerts,
            daily_goal: localSettings.dailyGoal,
            weekly_goal: localSettings.weeklyGoal,
            min_accuracy: localSettings.minAccuracy,
            dark_mode: localSettings.darkMode,
            background_animations: localSettings.backgroundAnimations,
            preferred_prompt_time: localSettings.preferredPromptTime,
        };
        
        await updateSettings(settingsToUpdate);
        
        toast.success("Settings saved successfully! 🎉");
    } catch (error) {
        console.error('Failed to save settings:', error);
        toast.error("Failed to save settings. Please try again.");
    } finally {
        setSavePending(false);
    }
  };

  // --- Loading/Unauthenticated View ---
  if (userLoading || !localSettings) {
    return <div className="flex items-center justify-center h-screen">Loading user settings...</div>;
  }
  
  const s = localSettings;

  return (
    <ProtectedRoute>
    <div className="container mx-auto px-4 py-8 mt-16 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Customize your focus experience</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={s.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={!user}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={s.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!user}
              />
            </div>
          </div>
        </Card>

        {/* Check-in Settings */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Check-in Settings</h2>
          <div className="space-y-6">
            <div>
              <Label>Check-in Interval: {s.checkInInterval} minutes</Label>
              <Slider
                value={[s.checkInInterval]}
                onValueChange={([value]) => handleChange('checkInInterval', value)}
                min={1}
                max={25}
                step={1}
                className="mt-2"
                disabled={!user}
              />
              <p className="text-sm text-muted-foreground mt-1">
                How often should we check in on your focus?
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Randomize Interval</Label>
                <p className="text-sm text-muted-foreground">Add ±2 minutes variation</p>
              </div>
              <Switch
                checked={s.randomizeInterval}
                onCheckedChange={(checked) => handleChange('randomizeInterval', checked)}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Sound Alerts</Label>
                <p className="text-sm text-muted-foreground">Play sound on check-ins</p>
              </div>
              <Switch
                checked={s.soundAlerts}
                onCheckedChange={(checked) => handleChange('soundAlerts', checked)}
                disabled={!user}
              />
            </div>
            {/* New: Preferred Prompt Time */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="preferredPromptTime">Preferred Prompt Time</Label>
                <Input
                  id="preferredPromptTime"
                  type="time"
                  value={s.preferredPromptTime}
                  onChange={(e) => handleChange('preferredPromptTime', e.target.value)}
                  disabled={!user}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Set a specific time of day for your daily prompt.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Goals */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Goals</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dailyGoal">Daily Study Target (hours)</Label>
              <Input
                id="dailyGoal"
                type="number"
                min="1"
                max="12"
                value={s.dailyGoal}
                onChange={(e) => handleChange('dailyGoal', parseInt(e.target.value))}
                disabled={!user}
              />
            </div>
            <div>
              <Label htmlFor="weeklyGoal">Weekly Study Target (hours)</Label>
              <Input
                id="weeklyGoal"
                type="number"
                min="1"
                max="84"
                value={s.weeklyGoal}
                onChange={(e) => handleChange('weeklyGoal', parseInt(e.target.value))}
                disabled={!user}
              />
            </div>
            <div>
              <Label htmlFor="minAccuracy">Minimum Focus Accuracy Goal (%)</Label>
              <Input
                id="minAccuracy"
                type="number"
                min="50"
                max="100"
                value={s.minAccuracy}
                onChange={(e) => handleChange('minAccuracy', parseInt(e.target.value))}
                disabled={!user}
              />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
              <Switch
                checked={s.darkMode}
                onCheckedChange={(checked) => handleChange('darkMode', checked)}
                disabled={!user}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Background Animations</Label>
                <p className="text-sm text-muted-foreground">Animated gradients</p>
              </div>
              <Switch
                checked={s.backgroundAnimations}
                onCheckedChange={(checked) => handleChange('backgroundAnimations', checked)}
                disabled={!user}
              />
            </div>
          </div>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full" disabled={!user || savePending}>
          {savePending ? 'Saving...' : 'Save Settings'}
        </Button>
        {!user && <p className="text-sm text-center text-destructive">Please sign in to save your settings.</p>}
      </div>
    </div>
    </ProtectedRoute>
  );
};

export default Settings;