import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { useAdminGetUsers, useAdminFreezeUser } from "@/lib/api-client";
import { api } from "@/lib/api";
import { formatCurrency, getStatusColor, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Search, User, ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type UserPerms = { canWithdraw: boolean; canTransfer: boolean; wireBypassCodes: boolean };
type UserEdit = { email: string; firstName: string; lastName: string; phone: string; profileImageUrl: string; password: string };

const PermToggle = ({ label, description, value, onChange, disabled }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <div className="flex items-center justify-between py-3 border-b border-zinc-700/50 last:border-0">
    <div>
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn("relative w-11 h-6 rounded-full transition-colors focus:outline-none", value ? "bg-emerald-500" : "bg-zinc-600", disabled && "opacity-50 cursor-not-allowed")}
    >
      <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", value ? "translate-x-5" : "translate-x-0")} />
    </button>
  </div>
);

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [savingPerms, setSavingPerms] = useState<number | null>(null);
  const [localPerms, setLocalPerms] = useState<Record<number, UserPerms>>({});
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "", profileImageUrl: "" });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<UserEdit | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const pageSize = 10;
  const { toast } = useToast();

  const { data, isLoading, refetch } = useAdminGetUsers({ search: debouncedSearch || undefined, limit: pageSize, offset: page * pageSize });
  const freezeMutation = useAdminFreezeUser();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => { setDebouncedSearch(e.target.value); setPage(0); }, 400);
  };

  const handleFreeze = async (userId: number, currentStatus: string) => {
    const freeze = currentStatus !== "frozen";
    try {
      await freezeMutation.mutateAsync({ userId, data: { freeze } });
      toast({ title: freeze ? "Account Frozen" : "Account Unfrozen" });
      refetch();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update account status." });
    }
  };

  const getPerms = (user: any): UserPerms => localPerms[user.id] ?? { canWithdraw: user.canWithdraw, canTransfer: user.canTransfer, wireBypassCodes: user.wireBypassCodes };

  const handleNewUserChange = (field: keyof typeof newUser, value: string) =>
    setNewUser((prev) => ({ ...prev, [field]: value }));

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Delete this user account? This action cannot be undone.")) return;

    setDeletingUserId(userId);
    try {
      await api.deleteUser(userId);
      toast({ title: "User Deleted", description: "The user account was removed successfully." });
      refetch();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error?.message || "Unable to delete user." });
    } finally {
      setDeletingUserId(null);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all required fields." });
      return;
    }

    setCreatingUser(true);
    try {
      await api.createAdminUser(newUser);
      toast({ title: "User Created", description: "The new user account was created successfully." });
      setNewUser({ email: "", password: "", firstName: "", lastName: "", phone: "", profileImageUrl: "" });
      setIsCreateModalOpen(false);
      refetch();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Create Failed", description: error?.message || "Unable to create user." });
    } finally {
      setCreatingUser(false);
    }
  };

  const openEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditingUser({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      profileImageUrl: user.profileImageUrl || "",
      password: "",
    });
  };

  const updateEditingUser = (field: keyof UserEdit, value: string) =>
    setEditingUser((prev) => prev ? { ...prev, [field]: value } : prev);

  const saveUser = async () => {
    if (!editingUserId || !editingUser) return;
    if (!editingUser.email || !editingUser.firstName || !editingUser.lastName) {
      toast({ variant: "destructive", title: "Missing fields", description: "Email, first name, and last name are required." });
      return;
    }
    if (editingUser.password && editingUser.password.length < 6) {
      toast({ variant: "destructive", title: "Invalid password", description: "Password must be at least 6 characters." });
      return;
    }

    setSavingUser(true);
    try {
      const payload = {
        email: editingUser.email,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        phone: editingUser.phone || null,
        profileImageUrl: editingUser.profileImageUrl || null,
        ...(editingUser.password ? { password: editingUser.password } : {}),
      };
      await api.updateAdminUser(editingUserId, payload);
      toast({ title: "User Updated", description: "The user details have been saved." });
      setEditingUserId(null);
      setEditingUser(null);
      refetch();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error?.message || "Unable to update user." });
    } finally {
      setSavingUser(false);
    }
  };

  const setPerm = (userId: number, user: any, key: keyof UserPerms, value: boolean) =>
    setLocalPerms((prev) => ({ ...prev, [userId]: { ...getPerms(user), [key]: value } }));

  const savePerms = async (userId: number) => {
    const perms = localPerms[userId];
    if (!perms) return;
    setSavingPerms(userId);
    try {
      await api.updateUserPermissions(userId, perms);
      toast({ title: "Permissions Updated", description: "User permissions have been saved." });
      refetch();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setSavingPerms(null);
    }
  };

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-white mb-1">User Management</h1>
            <p className="text-zinc-400 text-sm">{total - 1} total users</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-end">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input placeholder="Search users..." value={search} onChange={handleSearch} className="pl-9 bg-zinc-900 border-zinc-700" />
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>Create User</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Fill in the details to create a new user account.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  <Input
                    placeholder="First name"
                    value={newUser.firstName}
                    onChange={(e) => handleNewUserChange("firstName", e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                  />
                  <Input
                    placeholder="Last name"
                    value={newUser.lastName}
                    onChange={(e) => handleNewUserChange("lastName", e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => handleNewUserChange("email", e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => handleNewUserChange("password", e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                  />
                  <Input
                    placeholder="Profile image URL (optional)"
                    type="url"
                    value={newUser.profileImageUrl}
                    onChange={(e) => handleNewUserChange("profileImageUrl", e.target.value)}
                    className="bg-zinc-900 border-zinc-700 lg:col-span-2"
                  />
                  <div className="lg:col-span-2">
                    <Input
                      placeholder="Phone (optional)"
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => handleNewUserChange("phone", e.target.value)}
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createUser} disabled={creatingUser}>
                    {creatingUser ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={editingUserId !== null} onOpenChange={(open) => { if (!open) { setEditingUserId(null); setEditingUser(null); } }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>Update the user's profile or set a new password.</DialogDescription>
                </DialogHeader>
                {editingUser && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <Input placeholder="First name" value={editingUser.firstName} onChange={(e) => updateEditingUser("firstName", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                    <Input placeholder="Last name" value={editingUser.lastName} onChange={(e) => updateEditingUser("lastName", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                    <Input placeholder="Email" type="email" value={editingUser.email} onChange={(e) => updateEditingUser("email", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                    <Input placeholder="New password (optional)" type="password" value={editingUser.password} onChange={(e) => updateEditingUser("password", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                    <Input placeholder="Profile image URL (optional)" type="url" value={editingUser.profileImageUrl} onChange={(e) => updateEditingUser("profileImageUrl", e.target.value)} className="bg-zinc-900 border-zinc-700 lg:col-span-2" />
                    <Input placeholder="Phone (optional)" type="tel" value={editingUser.phone} onChange={(e) => updateEditingUser("phone", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                  </div>
                )}
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => { setEditingUserId(null); setEditingUser(null); }}>Cancel</Button>
                  <Button onClick={saveUser} disabled={savingUser}>{savingUser ? "Saving..." : "Save Changes"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500"><User className="w-12 h-12 mb-3 opacity-30" /><p>No users found</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">ID</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">User</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Balance</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">PIN</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Joined</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.filter((u: any) => u.role !== "admin")
                    ?.map((user: any) => {
                      const perms = getPerms(user);
                      const isDirty = !!localPerms[user.id];
                      return (
                        <React.Fragment key={user.id}>
                          <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/20 cursor-pointer" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                            <td className="px-6 py-4 text-xs text-zinc-100 font-mono">#{user.id}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                                  {user.profileImageUrl ? (
                                    <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
                                  ) : (
                                    <AvatarFallback className="flex items-center justify-center text-sm font-bold text-emerald-400">
                                      {user.firstName[0]}{user.lastName[0]}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                                  <p className="text-xs text-zinc-500">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(user.status))}>{user.status}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-white">{formatCurrency(user.totalBalance)}</td>
                            <td className="px-6 py-4">
                              <span className={cn("text-xs font-medium", user.hasTransferPin ? "text-emerald-400" : "text-zinc-500")}>{user.hasTransferPin ? "Set" : "Not set"}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-400">{format(new Date(user.createdAt), "MMM d, yyyy")}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditUser(user)}
                                  className="gap-1.5 text-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.status === "frozen" ? "default" : "outline"}
                                  onClick={() => handleFreeze(user.id, user.status)}
                                  className={cn("gap-1.5 text-xs", user.status === "frozen" ? "bg-emerald-600 hover:bg-emerald-700" : "border-red-800 text-red-400 hover:bg-red-950")}
                                >
                                  {user.status === "frozen" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                  {user.status === "frozen" ? "Unfreeze" : "Freeze"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void handleDeleteUser(user.id)}
                                  disabled={deletingUserId === user.id}
                                  className="text-red-400 hover:bg-red-400/10 hover:text-red-300"
                                >
                                  {deletingUserId === user.id ? "Deleting..." : <Trash2 className="w-4 h-4" />}
                                </Button>
                                {expandedUser === user.id ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                              </div>
                            </td>
                          </tr>

                          {expandedUser === user.id && (
                            <tr>
                              <td colSpan={6} className="bg-zinc-800/20 px-6 pb-5 pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Accounts</p>
                                    <div className="space-y-2">
                                      {user.accounts.map((acc: any) => (
                                        <div key={acc.id} className="flex items-center justify-between bg-zinc-900/60 rounded-lg px-4 py-3">
                                          <div><p className="text-sm font-mono text-zinc-300">{acc.accountNumber}</p><p className="text-xs text-zinc-500 capitalize">{acc.accountType}</p></div>
                                          <div className="text-right"><p className="font-medium text-white">{formatCurrency(acc.balance)}</p><span className={cn("text-xs", getStatusColor(acc.status))}>{acc.status}</span></div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Permissions</p>
                                    <div className="bg-zinc-900/60 rounded-lg px-4 py-2">
                                      <PermToggle label="Allow Withdrawals" description="User can withdraw funds to external bank" value={perms.canWithdraw} onChange={(v) => setPerm(user.id, user, "canWithdraw", v)} />
                                      <PermToggle label="Allow Transfers" description="User can send local, international and wire transfers" value={perms.canTransfer} onChange={(v) => setPerm(user.id, user, "canTransfer", v)} />
                                      <PermToggle label="Wire Transfer — PIN Only" description="Skip IMF/COT codes for wire transfers (use only transfer PIN)" value={perms.wireBypassCodes} onChange={(v) => setPerm(user.id, user, "wireBypassCodes", v)} />
                                    </div>
                                    {isDirty && (
                                      <Button size="sm" className="mt-3 w-full" onClick={() => savePerms(user.id)} disabled={savingPerms === user.id}>
                                        {savingPerms === user.id ? "Saving..." : "Save Permissions"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
