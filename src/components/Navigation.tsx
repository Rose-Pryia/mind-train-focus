// src/components/Navigation.tsx

import { NavLink } from "react-router-dom";
import { Home, Calendar, Timer, BarChart3, History, Settings, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AuthDialog from "./AuthDialog";
import { useState } from "react";
// ADD this import
import { useUser } from '@/contexts/UserContext'; 

const Navigation = () => {
  // --- USE CONTEXT FOR AUTH STATE ---
  // isAuthenticated is true if user is logged in, false otherwise.
  const { isAuthenticated, logout } = useUser();
  // ------------------------------------

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/timetable", icon: Calendar, label: "Timetable" },
    { to: "/focus", icon: Timer, label: "Focus" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/history", icon: History, label: "History" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  // REMOVE: const [isLoggedIn, setIsLoggedIn] = useState(false);
  // REMOVE: useEffect(() => { ... });

  const handleSignOut = () => {
    logout(); // Use context logout
  };
  
  // AuthDialog success handler is now just used to close the dialog
  const handleAuthSuccess = () => {
      setIsAuthDialogOpen(false);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Ticus
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
            {/* Conditional rendering based on context's isAuthenticated */}
            {isAuthenticated ? (
              <Button variant="ghost" onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setIsAuthDialogOpen(true)} className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* AuthDialog uses context for login action and signals closure via onAuthSuccess */}
      <AuthDialog isOpen={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} onAuthSuccess={handleAuthSuccess} />
    </nav>
  );
};

export default Navigation;