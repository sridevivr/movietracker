import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FcGoogle } from "react-icons/fc";

interface User {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  profileImageUrl?: string;
  authProvider: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [signupData, setSignupData] = useState({ username: "", password: "", confirmPassword: "" });

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", loginData);
      const data = await response.json();
      const userData = data.user;
      toast({ title: "Welcome back!" });
      onAuthSuccess(userData);
      onClose();
    } catch (error) {
      toast({ title: "Login failed", description: "Please check your credentials", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupData.username || !signupData.password || !signupData.confirmPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (signupData.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        username: signupData.username,
        password: signupData.password
      });
      const data = await response.json();
      const userData = data.user;
      toast({ title: "Account created successfully!" });
      onAuthSuccess(userData);
      onClose();
    } catch (error) {
      toast({ title: "Signup failed", description: "Username might already be taken", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  const handleClose = () => {
    setLoginData({ username: "", password: "" });
    setSignupData({ username: "", password: "", confirmPassword: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Movie Tracker</DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one to start tracking your movies and TV shows.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                data-testid="input-login-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                data-testid="input-login-password"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-username">Username</Label>
              <Input
                id="signup-username"
                type="text"
                placeholder="Choose a username"
                value={signupData.username}
                onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                data-testid="input-signup-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Choose a password (6+ characters)"
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                data-testid="input-signup-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={signupData.confirmPassword}
                onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                data-testid="input-confirm-password"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          data-testid="button-google-signin"
        >
          <FcGoogle className="w-4 h-4 mr-2" />
          Continue with Google
        </Button>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            data-testid="button-cancel-auth"
          >
            Cancel
          </Button>
          <Button 
            onClick={activeTab === "login" ? handleLogin : handleSignup}
            disabled={isLoading}
            data-testid={`button-${activeTab}`}
          >
            {isLoading ? "Please wait..." : activeTab === "login" ? "Login" : "Sign Up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}