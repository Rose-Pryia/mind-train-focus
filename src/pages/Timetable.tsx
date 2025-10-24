import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// --- API and Context Imports ---
import { useUser } from '@/contexts/UserContext'; 
// Import interfaces and API functions from the combined API file
import { timetableAPI, sessionAPI, TimetableSlot as TimetableSlotType } from '@/services/api'; 
// -----------------------------

// Refined interface to match backend structure
interface TimetableSlot extends TimetableSlotType {
  slot_id: number;
  user_id: number;
  day_of_week: string;
  start_hour: number;
  subject: string;
  duration: number; // Stored in hours (Decimal(3,1))
  color: string;
}

const Timetable = () => {
  const navigate = useNavigate();
  // Hooks MUST be declared inside the component function
  const { user, loading: userLoading } = useUser();
  
  // State variables for fetching, loading, and mutations
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [startSessionPending, setStartSessionPending] = useState(false);
  
  // Local UI states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Renamed to match backend field names
  const [selectedSlot, setSelectedSlot] = useState<{ day_of_week: string; start_hour: number } | null>(null);
  const [formData, setFormData] = useState({ subject: "", duration: 1, color: "#2563eb" });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // --- API Functions and Side Effects ---

  const reloadTimetable = async (userId: number) => {
    try {
        const updatedData = await timetableAPI.getAll(userId);
        setTimetable(updatedData as TimetableSlot[]);
    } catch (error) {
        console.error('Failed to reload timetable:', error);
        toast.error("Failed to reload timetable data.");
    }
  }

  // Effect to load timetable data on user login/change
  useEffect(() => {
    // Wait until user context is not loading and we have a user
    if (userLoading) return;
    
    if (!user) {
        setLoading(false);
        return;
    }
    
    // Initial fetch of the timetable
    async function loadTimetable() {
      setLoading(true);
      await reloadTimetable(user.user_id);
      setLoading(false);
    }
    
    loadTimetable();
  }, [user, userLoading]);

  // Function to handle adding a new slot via API
  const addSlot = async (newSlotData: Omit<TimetableSlot, 'slot_id'>) => {
    if (!user) return;
    
    try {
      await timetableAPI.add(newSlotData);
      toast.success("Session added successfully!");
      // After successful addition, reload the list
      reloadTimetable(user.user_id); 
      setIsDialogOpen(false);
      setFormData({ subject: "", duration: 1, color: "#2563eb" });
    } catch (error) {
      console.error('Failed to add slot:', error);
      toast.error("Failed to add slot.");
    }
  };

  const handleSlotClick = (day_of_week: string, start_hour: number) => {
    if (!user) {
        toast.warning("Please sign in to plan your timetable.");
        return;
    }
    setSelectedSlot({ day_of_week, start_hour });
    setIsDialogOpen(true);
  };

  const handleAddSession = () => {
    if (!selectedSlot || !formData.subject || !user) return;

    // Data structure must match backend API expected payload
    const newSlotData = {
      user_id: user.user_id,
      day_of_week: selectedSlot.day_of_week,
      start_hour: selectedSlot.start_hour,
      subject: formData.subject,
      duration: formData.duration,
      color: formData.color,
    };
    
    // Call the async function to add the slot
    addSlot(newSlotData);
  };

  // Check if a slot exists for the given day and hour
  const getSlotForCell = (day: string, hour: number) => {
    // Match against new field names
    return timetable.find(slot => slot.day_of_week === day && slot.start_hour === hour);
  };

  const startFocusSession = async (slot: TimetableSlot) => {
    if (!user || startSessionPending) return;
    
    setStartSessionPending(true);
    
    try {
      // 1. Create the session record in the database
      const plannedDurationMinutes = slot.duration * 60; // Convert hours to minutes
      const result = await sessionAPI.create(user.user_id, slot.subject, plannedDurationMinutes);
      
      // 2. Navigate to the Focus Session page using the returned sessionId
      toast.info(`Starting session for ${slot.subject}...`);
      navigate(`/focus?sessionId=${result.sessionId}`);
    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error("Failed to start session. Please try again.");
    } finally {
      setStartSessionPending(false);
    }
  };

  // --- Rendering Logic ---
  
  if (userLoading || loading) {
    return <div className="flex items-center justify-center h-screen">Loading timetable...</div>;
  }
  
  if (!user) {
    return (
        <div className="container mx-auto px-4 py-8 mt-16 text-center">
            <h1 className="text-4xl font-bold mb-4">Timetable Builder</h1>
            <Card className="p-10">
                <p className="text-xl text-muted-foreground">Please sign in to view and plan your timetable.</p>
                <Button onClick={() => navigate("/")} className="mt-4">Go to Home/Sign In</Button>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Timetable Builder</h1>
        <p className="text-muted-foreground">Plan your study sessions for the week</p>
      </div>

      <Card className="p-4 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-2">
            {/* Header */}
            <div className="font-semibold text-center p-2">Time</div>
            {days.map(day => (
              <div key={day} className="font-semibold text-center p-2">{day.slice(0, 3)}</div>
            ))}

            {/* Time slots */}
            {hours.map(hour => (
              <>
                <div key={`time-${hour}`} className="text-sm text-muted-foreground text-center p-2 flex items-center justify-center">
                  {hour}:00
                </div>
                {days.map(day => {
                  // Pass the correct fields to the handler
                  const slot = getSlotForCell(day, hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="relative border border-border rounded-lg p-2 min-h-[60px] cursor-pointer hover:bg-muted/50 transition-colors"
                      // Uses new field names for selectedSlot state
                      onClick={() => !slot && handleSlotClick(day, hour)} 
                    >
                      {slot ? (
                        <div
                          className="h-full rounded p-2 text-white text-xs font-medium flex flex-col justify-between"
                          style={{ backgroundColor: slot.color }}
                        >
                          <span>{slot.subject}</span>
                          <span className="opacity-80">{slot.duration} hrs</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-1 h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              startFocusSession(slot);
                            }}
                            disabled={startSessionPending}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            {startSessionPending ? 'Starting...' : 'Start'}
                          </Button>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Study Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="subject">Subject/Task</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Mathematics"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="4"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <Button onClick={handleAddSession} className="w-full">
              Add Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Timetable;