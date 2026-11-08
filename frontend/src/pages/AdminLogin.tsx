import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, logout, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hasAdminAccess = (role: string | null) =>
    role === "superadmin" || role === "admin" || role === "viewer_admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || "Login failed");
        return;
      }

      const role = localStorage.getItem("user_role");
      if (!hasAdminAccess(role)) {
        logout();
        setError("This account does not have admin access.");
        return;
      }

      navigate("/admin/panel");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Shield className="h-6 w-6 text-primary" />
            Admin Login
          </CardTitle>
          <CardDescription>
            Sign in with an admin account to open the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Checking..." : "Enter Admin Panel"}
            </Button>
          </form>

          {user && !hasAdminAccess(user.role) && (
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => {
                logout();
                setError("");
              }}
            >
              Logout current user
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
