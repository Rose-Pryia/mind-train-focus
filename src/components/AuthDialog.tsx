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

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (status: boolean) => void;
}

const AuthDialog = ({ isOpen, onOpenChange, onAuthSuccess }: AuthDialogProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      console.log("Login with:", { email, password });
      // Simulate successful login
      localStorage.setItem("isLoggedIn", "true");
      onAuthSuccess(true);
    } else {
      console.log("Register with:", { email, password });
      // Simulate successful registration
      localStorage.setItem("isLoggedIn", "true");
      onAuthSuccess(true);
    }
    onOpenChange(false); // Close dialog after submission
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
