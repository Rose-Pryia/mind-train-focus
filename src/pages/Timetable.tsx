import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TimetableSlot {
  id: string;
  day: string;
  hour: number;
  subject: string;
  duration: number;
  color: string;
}

const Timetable = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; hour: number } | null>(null);
  const [formData, setFormData] = useState({ subject: "", duration: 1, color: "#2563eb" });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours (24-hour format)

  const handleSlotClick = (day: string, hour: number) => {
    setSelectedSlot({ day, hour });
    setIsDialogOpen(true);
  };

  const handleAddSession = () => {
    if (!selectedSlot || !formData.subject) return;

    const newSlot: TimetableSlot = {
      id: Date.now().toString(),
      day: selectedSlot.day,
      hour: selectedSlot.hour,
      subject: formData.subject,
      duration: formData.duration,
      color: formData.color,
    };

    setSlots([...slots, newSlot]);
    setIsDialogOpen(false);
    setFormData({ subject: "", duration: 1, color: "#2563eb" });
  };

  const getSlotForCell = (day: string, hour: number) => {
    return slots.find(slot => slot.day === day && slot.hour === hour);
  };

  const startFocusSession = (slot: TimetableSlot) => {
    localStorage.setItem("currentSession", JSON.stringify({
      subject: slot.subject,
      duration: slot.duration * 60, // Convert to minutes
      startTime: Date.now(),
    }));
    navigate("/focus");
  };

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
                  const slot = getSlotForCell(day, hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="relative border border-border rounded-lg p-2 min-h-[60px] cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => !slot && handleSlotClick(day, hour)}
                    >
                      {slot ? (
                        <div
                          className="h-full rounded p-2 text-white text-xs font-medium flex flex-col justify-between"
                          style={{ backgroundColor: slot.color }}
                        >
                          <span>{slot.subject}</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-1 h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              startFocusSession(slot);
                            }}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
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
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
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
