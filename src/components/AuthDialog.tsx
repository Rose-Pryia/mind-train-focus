// src/components/AuthDialog.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// ADD:
import { useUser } from '@/contexts/UserContext'; 

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // CRITICAL FIX: Change signature to a simple callback
  onAuthSuccess: () => void; 
}

const AuthDialog = ({ isOpen, onOpenChange, onAuthSuccess }: AuthDialogProps) => {
  const { login, register } = useUser(); // Use context login and register function
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // ADD: Name state for registration
  const [name, setName] = useState(""); 

  const handleSubmit = async (e: React.FormEvent) => { // Must be async
    e.preventDefault();
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, name, password);
      }
      onAuthSuccess(); // Signal success back to Navigation to close the modal
    } catch (error) {
      console.error("Authentication failed:", error);
      alert("Sign in failed. Please check your credentials."); 
      onOpenChange(false); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isLogin ? "Sign In" : "Sign Up"}</DialogTitle>
          <DialogDescription>
            {isLogin
              ? "Enter your credentials to access your account." : "Create an account to get started."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {/* Include name input only for registration */}
          {!isLogin && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Focus Warrior"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            {isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>
        <Button
          variant="link"
          onClick={() => setIsLogin(!isLogin)}
          className="text-center"
        >
          {isLogin
            ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;