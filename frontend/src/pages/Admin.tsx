import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi, type AdminStats, type AdminUser, type UserFeedbackItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Mail, MessageSquareText, Pencil, Plus, Search, Shield, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    adminsOnline: 0,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<Array<{ id: number; message: string; time: string; severity: string }>>([]);
  const [feedbacks, setFeedbacks] = useState<UserFeedbackItem[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [feedbackSearchInput, setFeedbackSearchInput] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedbackUserId, setNewFeedbackUserId] = useState("");
  const [newFeedbackMessage, setNewFeedbackMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserFeedbackItem | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyItem, setReplyItem] = useState<UserFeedbackItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "viewer_admin">("user");

  const adminUserId = user?.id;
  const currentUserRole = user?.role;
  const isSuperAdmin = currentUserRole === "superadmin";
  const isViewerAdmin = currentUserRole === "viewer_admin";

  const loadAdminData = async (query = "", pageValue = 1) => {
    if (!adminUserId) return;
    setIsLoading(true);
    try {
      const [statsRes, usersRes, eventsRes] = await Promise.all([
        adminApi.getStats(adminUserId),
        adminApi.getUsers(adminUserId, query, pageValue, 20),
        adminApi.getEvents(adminUserId),
      ]);
      setStats(statsRes);
      setUsers(usersRes.items);
      setTotalPages(usersRes.totalPages || 1);
      setPage(usersRes.page || 1);
      setEvents(eventsRes);
    } catch (error: any) {
      toast({
        title: "Admin panel error",
        description: error.message || "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAdminData(searchValue, 1);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  useEffect(() => {
    const t = setTimeout(() => setFeedbackSearch(feedbackSearchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [feedbackSearchInput]);

  useEffect(() => {
    setFeedbackPage(1);
  }, [feedbackSearch]);

  useEffect(() => {
    if (!adminUserId) return;
    let cancelled = false;
    setFeedbackLoading(true);
    adminApi
      .getFeedbacks(adminUserId, feedbackPage, 10, feedbackSearch)
      .then((res) => {
        if (!cancelled) {
          setFeedbacks(res.items);
          setFeedbackTotalPages(res.totalPages || 1);
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          toast({
            title: "Feedback load failed",
            description: error.message || "Could not load feedback",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setFeedbackLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable enough; avoids refetch loops
  }, [adminUserId, feedbackPage, feedbackSearch]);

  const handleToggleBlock = async (target: AdminUser) => {
    if (!adminUserId) return;
    setIsActionLoading(`block-${target.id}`);
    try {
      await adminApi.setUserBlocked(target.id, adminUserId, !target.isBlocked);
      await loadAdminData(searchValue, page);
      toast({
        title: "Updated",
        description: `${target.username} is now ${target.isBlocked ? "active" : "blocked"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error.message || "Could not update user status",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRenameUser = async (target: AdminUser) => {
    if (!adminUserId) return;
    const newUsername = window.prompt("Enter new username:", target.username);
    if (!newUsername || newUsername.trim() === target.username) return;

    setIsActionLoading(`rename-${target.id}`);
    try {
      await adminApi.updateUsername(target.id, adminUserId, newUsername.trim());
      await loadAdminData(searchValue, page);
      toast({
        title: "Username updated",
        description: `${target.username} renamed to ${newUsername.trim()}.`,
      });
    } catch (error: any) {
      toast({
        title: "Rename failed",
        description: error.message || "Could not update username",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleResetPassword = async (target: AdminUser) => {
    if (!adminUserId) return;
    const newPassword = window.prompt("Enter new password (min 6 chars):");
    if (!newPassword) return;

    setIsActionLoading(`password-${target.id}`);
    try {
      await adminApi.updatePassword(target.id, adminUserId, newPassword);
      toast({
        title: "Password updated",
        description: `Password for ${target.username} changed successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error.message || "Could not update password",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCreateUser = async () => {
    if (!adminUserId) return;
    if (isViewerAdmin) {
      toast({
        title: "Permission denied",
        description: "Viewer admin cannot create users.",
        variant: "destructive",
      });
      return;
    }
    if (!isSuperAdmin && (newRole === "admin" || newRole === "viewer_admin")) {
      toast({
        title: "Permission denied",
        description: "Only superadmin can create admin accounts.",
        variant: "destructive",
      });
      return;
    }
    if (!newEmail.trim() || !newUsername.trim() || !newPassword.trim()) {
      toast({
        title: "Required fields",
        description: "Email, username and password are required.",
        variant: "destructive",
      });
      return;
    }

    setIsActionLoading("create-user");
    try {
      await adminApi.createUser(adminUserId, {
        email: newEmail.trim(),
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      });
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      await loadAdminData(searchValue, 1);
      toast({
        title: "User created",
        description: `User ${newUsername.trim()} was added successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error.message || "Could not create user",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDeleteUser = async (target: AdminUser) => {
    if (!adminUserId) return;
    const confirmed = window.confirm(`Delete user ${target.username}? This action cannot be undone.`);
    if (!confirmed) return;

    setIsActionLoading(`delete-${target.id}`);
    try {
      await adminApi.deleteUser(target.id, adminUserId);
      await loadAdminData(searchValue, page);
      toast({
        title: "User deleted",
        description: `${target.username} was deleted successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete user",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCreateFeedbackAdmin = async () => {
    if (!adminUserId) return;
    if (!newFeedbackUserId.trim() || !newFeedbackMessage.trim()) {
      toast({
        title: "Required",
        description: "User ID and message are required.",
        variant: "destructive",
      });
      return;
    }
    setIsActionLoading("create-feedback");
    try {
      await adminApi.createFeedback(adminUserId, newFeedbackUserId.trim(), newFeedbackMessage.trim());
      setNewFeedbackUserId("");
      setNewFeedbackMessage("");
      const res = await adminApi.getFeedbacks(adminUserId, feedbackPage, 10, feedbackSearch);
      setFeedbacks(res.items);
      setFeedbackTotalPages(res.totalPages || 1);
      toast({ title: "Feedback created", description: "Entry added for the selected user." });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error.message || "Could not create feedback",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!adminUserId) return;
    if (!window.confirm("Delete this feedback? This cannot be undone.")) return;
    setIsActionLoading(`fb-del-${id}`);
    try {
      await adminApi.deleteFeedback(adminUserId, id);
      const res = await adminApi.getFeedbacks(adminUserId, feedbackPage, 10, feedbackSearch);
      setFeedbacks(res.items);
      setFeedbackTotalPages(res.totalPages || 1);
      toast({ title: "Feedback deleted" });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete feedback",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleSaveEditFeedback = async () => {
    if (!adminUserId || !editItem) return;
    const msg = editMessage.trim();
    if (!msg) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    setIsActionLoading(`fb-edit-${editItem.id}`);
    try {
      await adminApi.updateFeedback(adminUserId, editItem.id, msg);
      setEditOpen(false);
      setEditItem(null);
      const res = await adminApi.getFeedbacks(adminUserId, feedbackPage, 10, feedbackSearch);
      setFeedbacks(res.items);
      setFeedbackTotalPages(res.totalPages || 1);
      toast({ title: "Feedback updated" });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Could not update feedback",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleSendFeedbackReply = async () => {
    if (!adminUserId || !replyItem) return;
    const msg = replyText.trim();
    if (!msg) {
      toast({ title: "Reply is empty", variant: "destructive" });
      return;
    }
    setIsActionLoading(`fb-reply-${replyItem.id}`);
    try {
      const result = await adminApi.sendFeedbackReply(adminUserId, replyItem.id, msg);
      setReplyOpen(false);
      setReplyItem(null);
      setReplyText("");
      toast({
        title: "Email sent",
        description: `Reply sent to ${result.sentTo}`,
      });
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error.message || "Could not send email (check SMTP in .env)",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Manage users and moderation actions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total users</CardDescription>
              <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active today</CardDescription>
              <CardTitle className="text-2xl text-green-500">{stats.activeUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Flagged accounts</CardDescription>
              <CardTitle className="text-2xl text-yellow-500">{stats.blockedUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Admins online</CardDescription>
              <CardTitle className="text-2xl">{stats.adminsOnline}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>Search and moderate platform users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-5">
              <Input
                placeholder="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <Input
                placeholder="Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "user" | "admin" | "viewer_admin")}
              >
                <option value="user">user</option>
                {isSuperAdmin && <option value="viewer_admin">viewer_admin</option>}
                {isSuperAdmin && <option value="admin">admin</option>}
              </select>
              <Button
                disabled={isActionLoading !== null || isViewerAdmin}
                onClick={handleCreateUser}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isActionLoading === "create-user" ? "Adding..." : "Add user"}
              </Button>
            </div>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 pr-20"
                placeholder="Search by name or email..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                live
              </span>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : users.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell className="font-mono text-xs">{userItem.id}</TableCell>
                      <TableCell className="font-medium">{userItem.username}</TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>
                        <Badge variant={userItem.isBlocked ? "destructive" : "default"}>
                          {userItem.isBlocked ? "blocked" : "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading !== null || isViewerAdmin}
                            onClick={() => handleRenameUser(userItem)}
                          >
                            Rename
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading !== null || isViewerAdmin}
                            onClick={() => handleResetPassword(userItem)}
                          >
                            Password
                          </Button>
                          <Button
                            size="sm"
                            variant={userItem.isBlocked ? "secondary" : "destructive"}
                            disabled={
                              isActionLoading !== null ||
                              isViewerAdmin ||
                              userItem.id === adminUserId ||
                              (userItem.role !== "user" && !isSuperAdmin) ||
                              userItem.role === "superadmin"
                            }
                            onClick={() => handleToggleBlock(userItem)}
                          >
                            {isActionLoading === `block-${userItem.id}`
                              ? "..."
                              : userItem.isBlocked
                                ? "Unblock"
                                : "Block"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={
                              isActionLoading !== null ||
                              isViewerAdmin ||
                              userItem.id === adminUserId ||
                              (userItem.role !== "user" && !isSuperAdmin) ||
                              userItem.role === "superadmin"
                            }
                            onClick={() => handleDeleteUser(userItem)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            {isActionLoading === `delete-${userItem.id}` ? "..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading || page <= 1}
                onClick={() => loadAdminData(searchValue, page - 1)}
              >
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading || page >= totalPages}
                onClick={() => loadAdminData(searchValue, page + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              User feedback
            </CardTitle>
            <CardDescription>
              List, search, create (by user ID), edit and delete. Users can also submit from Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Create</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fb-user-id">User ID (UUID)</Label>
                  <Input
                    id="fb-user-id"
                    placeholder="User UUID"
                    value={newFeedbackUserId}
                    onChange={(e) => setNewFeedbackUserId(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fb-new-msg">Message</Label>
                  <Textarea
                    id="fb-new-msg"
                    rows={2}
                    placeholder="Feedback text…"
                    value={newFeedbackMessage}
                    onChange={(e) => setNewFeedbackMessage(e.target.value)}
                    className="resize-y min-h-[60px]"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={isActionLoading !== null || isViewerAdmin}
                onClick={handleCreateFeedbackAdmin}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isActionLoading === "create-feedback" ? "Saving…" : "Add feedback"}
              </Button>
            </div>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search message, username, email…"
                value={feedbackSearchInput}
                onChange={(e) => setFeedbackSearchInput(e.target.value)}
              />
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Date</TableHead>
                    <TableHead className="min-w-[100px]">User</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[220px]">Message</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Loading feedback…
                      </TableCell>
                    </TableRow>
                  ) : feedbacks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No feedback on this page.
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedbacks.map((fb) => (
                      <TableRow key={fb.id}>
                        <TableCell className="align-top whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="align-top font-medium">{fb.username}</TableCell>
                        <TableCell className="align-top break-all text-xs">{fb.email}</TableCell>
                        <TableCell className="align-top max-w-[320px] whitespace-pre-wrap break-words">
                          {fb.message}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              title="Send reply by email (SMTP)"
                              disabled={isActionLoading !== null || isViewerAdmin}
                              onClick={() => {
                                setReplyItem(fb);
                                setReplyText("");
                                setReplyOpen(true);
                              }}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActionLoading !== null || isViewerAdmin}
                              onClick={() => {
                                setEditItem(fb);
                                setEditMessage(fb.message);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isActionLoading !== null || isViewerAdmin}
                              onClick={() => handleDeleteFeedback(fb.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={feedbackLoading || feedbackPage <= 1}
                onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {feedbackPage} / {feedbackTotalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={feedbackLoading || feedbackPage >= feedbackTotalPages}
                onClick={() => setFeedbackPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="fb-edit">Message</Label>
              <Textarea
                id="fb-edit"
                rows={6}
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="resize-y"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isActionLoading !== null}
                onClick={handleSaveEditFeedback}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Reply by email
              </DialogTitle>
            </DialogHeader>
            {replyItem && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  To: <span className="font-medium text-foreground">{replyItem.email}</span> (
                  {replyItem.username})
                </p>
                <div className="rounded-md border bg-muted/40 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-1">Their message</p>
                  <p className="whitespace-pre-wrap break-words">{replyItem.message}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fb-reply">Your reply (sent via SMTP)</Label>
                  <Textarea
                    id="fb-reply"
                    rows={6}
                    placeholder="Type the answer the user will receive by email…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="resize-y"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setReplyOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isActionLoading !== null || !replyText.trim()}
                onClick={handleSendFeedbackReply}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isActionLoading?.startsWith("fb-reply") ? "Sending…" : "Send email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Events
            </CardTitle>
            <CardDescription>Latest authentication and admin actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{event.message}</span>
                <Badge variant="secondary">{event.time}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
