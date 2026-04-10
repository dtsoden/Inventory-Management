'use client';

import { useEffect, useState, useCallback } from 'react';
import { ROLE_DEFINITIONS, PERMISSIONS, PERMISSION_LABELS, DEFAULT_ROLE_KEYS } from '@/lib/roles';
import type { RoleDefinition } from '@/lib/roles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Plus,
  MoreHorizontal,
  Shield,
  UserX,
  UserCheck,
  Pencil,
  Lock,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  WAREHOUSE_STAFF: 'Warehouse Staff',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  ADMIN: 'default',
  MANAGER: 'secondary',
  WAREHOUSE_STAFF: 'outline',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function RolesManager() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('ADMIN');
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [rolesLoading, setRolesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
      } else {
        toast.error(data.error || 'Failed to load roles');
      }
    } catch {
      toast.error('Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // When roles load or selection changes, populate the edit fields
  const selectedRole = roles.find((r) => r.value === selectedRoleKey);

  useEffect(() => {
    if (selectedRole) {
      setEditLabel(selectedRole.label);
      setEditDescription(selectedRole.description);
      setEditPermissions({ ...selectedRole.permissions });
      setDirty(false);
    }
  }, [selectedRoleKey, roles]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = selectedRoleKey === 'ADMIN';
  const isDefaultRole = DEFAULT_ROLE_KEYS.includes(selectedRoleKey);

  function handlePermissionToggle(perm: string) {
    if (isAdmin) return;
    setEditPermissions((prev) => ({ ...prev, [perm]: !prev[perm] }));
    setDirty(true);
  }

  function handleLabelChange(val: string) {
    setEditLabel(val);
    setDirty(true);
  }

  function handleDescriptionChange(val: string) {
    setEditDescription(val);
    setDirty(true);
  }

  async function handleSave() {
    if (!selectedRole || isAdmin) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: selectedRoleKey,
          label: editLabel,
          description: editDescription,
          permissions: editPermissions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
        setDirty(false);
        toast.success('Role saved successfully');
      } else {
        toast.error(data.error || 'Failed to save role');
      }
    } catch {
      toast.error('Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }
    setAddingRole(true);
    try {
      const res = await fetch('/api/settings/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newRoleName.trim(),
          description: newRoleDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
        const newKey = newRoleName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
        setSelectedRoleKey(newKey);
        setAddRoleDialogOpen(false);
        setNewRoleName('');
        setNewRoleDescription('');
        toast.success('Role created');
      } else {
        toast.error(data.error || 'Failed to create role');
      }
    } catch {
      toast.error('Failed to create role');
    } finally {
      setAddingRole(false);
    }
  }

  async function handleDeleteRole() {
    if (isDefaultRole) return;
    try {
      const res = await fetch(`/api/settings/roles?value=${encodeURIComponent(selectedRoleKey)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
        setSelectedRoleKey('ADMIN');
        toast.success('Role deleted');
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch {
      toast.error('Failed to delete role');
    }
  }

  if (rolesLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Select a role to view and edit its permissions. ADMIN always has full access.
      </p>

      {/* Role selector pills */}
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((role) => {
          const isActive = role.value === selectedRoleKey;
          const isSA = role.value === 'ADMIN';
          return (
            <button
              key={role.value}
              onClick={() => setSelectedRoleKey(role.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? '!bg-brand-green !text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {isSA && <Lock className="h-3.5 w-3.5" />}
              {role.label}
            </button>
          );
        })}
        {roles.length < 10 && (
          <button
            onClick={() => setAddRoleDialogOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Role
          </button>
        )}
      </div>

      {/* Selected role info */}
      {selectedRole && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="role-name" className="text-xs text-muted-foreground">
                  Role Name
                </Label>
                {isAdmin ? (
                  <p className="mt-1 font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    {selectedRole.label}
                  </p>
                ) : (
                  <Input
                    id="role-name"
                    className="mt-1"
                    value={editLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                  />
                )}
              </div>
              <div>
                <Label htmlFor="role-desc" className="text-xs text-muted-foreground">
                  Description
                </Label>
                {isAdmin ? (
                  <p className="mt-1 text-sm text-muted-foreground">{selectedRole.description}</p>
                ) : (
                  <Textarea
                    id="role-desc"
                    className="mt-1 min-h-[40px]"
                    value={editDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                  />
                )}
              </div>
            </div>
            {!isDefaultRole && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDeleteRole}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Permissions list */}
      {selectedRole && (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Permissions</h3>
          </div>
          <div className="divide-y">
            {PERMISSIONS.map((perm) => (
              <div
                key={perm}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm">{PERMISSION_LABELS[perm]}</span>
                <Switch
                  checked={isAdmin ? true : !!editPermissions[perm]}
                  disabled={isAdmin}
                  onCheckedChange={() => handlePermissionToggle(perm)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      {selectedRole && !isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2 bg-brand-green hover:bg-brand-green/90 text-white">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Role'}
          </Button>
        </div>
      )}

      {/* Add Role Dialog */}
      <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Create a custom role. All permissions start turned off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-role-name">Role Name</Label>
              <Input
                id="new-role-name"
                className="mt-1.5"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Auditor"
              />
            </div>
            <div>
              <Label htmlFor="new-role-desc">Description</Label>
              <Textarea
                id="new-role-desc"
                className="mt-1.5 min-h-[40px]"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="What this role is for"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddRole} disabled={addingRole}>
              {addingRole ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editRole, setEditRole] = useState('WAREHOUSE_STAFF');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WAREHOUSE_STAFF',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAddUser() {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User created successfully');
        setAddDialogOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'WAREHOUSE_STAFF' });
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditRole() {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/settings/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User role updated');
        setEditDialogOpen(false);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch {
      toast.error('Failed to update role');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(user: UserRecord) {
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          user.isActive ? 'User deactivated' : 'User reactivated'
        );
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-base rounded-xl p-6">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" />
          Users & Roles
        </h2>

        <Tabs defaultValue="users">
          <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 mb-6">
            <TabsTrigger value="users" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" className="min-w-[120px] gap-2 rounded-t-lg rounded-b-none border border-b-0 px-6 py-2.5 text-sm font-medium data-active:!bg-brand-green data-active:!text-white">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Manage team members and their access levels.
            </p>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account for your organization.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="add-name">Full Name</Label>
                  <Input
                    id="add-name"
                    className="mt-1.5"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="add-email">Email</Label>
                  <Input
                    id="add-email"
                    type="email"
                    className="mt-1.5"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="add-password">Password</Label>
                  <Input
                    id="add-password"
                    type="password"
                    className="mt-1.5"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(val) =>
                      setFormData((f) => ({ ...f, role: val ?? 'WAREHOUSE_STAFF' }))
                    }
                  >
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_DEFINITIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={handleAddUser}
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Users table */}
        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No users found. Add your first team member.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">User</th>
                  <th className="pb-3 font-medium text-muted-foreground">Role</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Last Login</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant={roleBadgeVariant[user.role] || 'outline'}>
                        <Shield className="mr-1 h-3 w-3" />
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingUser(user);
                              setEditRole(user.role);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => handleToggleActive(user)}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Role</Label>
            <Select value={editRole} onValueChange={(v) => setEditRole(v ?? 'WAREHOUSE_STAFF')}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="WAREHOUSE_STAFF">Warehouse Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleEditRole} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </TabsContent>

          <TabsContent value="roles">
            <RolesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
