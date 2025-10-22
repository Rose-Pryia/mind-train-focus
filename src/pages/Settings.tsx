import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Settings = () => {
  const [settings, setSettings] = useState({
    name: "Focus Warrior",
    email: "user@example.com",
    checkInInterval: 15,
    randomizeInterval: true,
    soundAlerts: true,
    dailyGoal: 6,
    weeklyGoal: 30,
    minAccuracy: 80,
    darkMode: false,
    backgroundAnimations: true,
  });

  const handleSave = () => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
    toast.success("Settings saved successfully!");
  };

  return (
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
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Check-in Settings */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Check-in Settings</h2>
          <div className="space-y-6">
            <div>
              <Label>Check-in Interval: {settings.checkInInterval} minutes</Label>
              <Slider
                value={[settings.checkInInterval]}
                onValueChange={([value]) => setSettings({ ...settings, checkInInterval: value })}
                min={5}
                max={25}
                step={1}
                className="mt-2"
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
                checked={settings.randomizeInterval}
                onCheckedChange={(checked) => setSettings({ ...settings, randomizeInterval: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Sound Alerts</Label>
                <p className="text-sm text-muted-foreground">Play sound on check-ins</p>
              </div>
              <Switch
                checked={settings.soundAlerts}
                onCheckedChange={(checked) => setSettings({ ...settings, soundAlerts: checked })}
              />
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
                value={settings.dailyGoal}
                onChange={(e) => setSettings({ ...settings, dailyGoal: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="weeklyGoal">Weekly Study Target (hours)</Label>
              <Input
                id="weeklyGoal"
                type="number"
                min="1"
                max="84"
                value={settings.weeklyGoal}
                onChange={(e) => setSettings({ ...settings, weeklyGoal: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="minAccuracy">Minimum Focus Accuracy Goal (%)</Label>
              <Input
                id="minAccuracy"
                type="number"
                min="50"
                max="100"
                value={settings.minAccuracy}
                onChange={(e) => setSettings({ ...settings, minAccuracy: parseInt(e.target.value) })}
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
                checked={settings.darkMode}
                onCheckedChange={(checked) => setSettings({ ...settings, darkMode: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Background Animations</Label>
                <p className="text-sm text-muted-foreground">Animated gradients</p>
              </div>
              <Switch
                checked={settings.backgroundAnimations}
                onCheckedChange={(checked) => setSettings({ ...settings, backgroundAnimations: checked })}
              />
            </div>
          </div>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
