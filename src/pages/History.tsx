import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface SessionRecord {
  id: string;
  subject: string;
  duration: number;
  startTime: number;
  endTime: number;
  focusAccuracy: number;
  checkIns: any[];
}

const History = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("sessionHistory") || "[]");
    setSessions(history.reverse());
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Session History</h1>
        <p className="text-muted-foreground">Review your past focus sessions</p>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-xl text-muted-foreground">No sessions yet</p>
          <p className="text-sm text-muted-foreground mt-2">Start your first focus session to see it here!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{session.subject}</h3>
                    <Badge variant={session.focusAccuracy >= 80 ? "default" : "secondary"}>
                      {Math.round(session.focusAccuracy)}% Focus
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatDate(session.startTime)}
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{session.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Check-ins:</span>
                      <span className="font-medium">{session.checkIns.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="font-medium">
                        {session.checkIns.filter(c => c.focused).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="font-medium">
                        {session.checkIns.filter(c => !c.focused).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
