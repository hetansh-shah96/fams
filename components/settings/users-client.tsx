"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";

const ROLES = ["SUPER_ADMIN", "BRANCH_MANAGER", "DEPT_HEAD", "EMPLOYEE"];
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  BRANCH_MANAGER: "bg-blue-100 text-blue-700",
  DEPT_HEAD: "bg-purple-100 text-purple-700",
  EMPLOYEE: "bg-green-100 text-green-700",
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  locationId: string | null;
  departmentId: string | null;
  location: { name: string } | null;
  department: { name: string } | null;
}

interface Props {
  users: User[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  isSuperAdmin: boolean;
}

export function UsersClient({ users: initialUsers, locations, departments, isSuperAdmin }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", locationId: "", departmentId: "" });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "EMPLOYEE", locationId: "", departmentId: "" });
    setOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, locationId: user.locationId ?? "", departmentId: user.departmentId ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const payload = editing ? { ...form, id: editing.id } : form;
      const res = await fetch("/api/settings/users", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editing ? "User updated" : "User created");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{users.length} users</p>
        </div>
        {isSuperAdmin && (
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />Add User
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              {isSuperAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[user.role] ?? ""}`}>
                    {user.role.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{user.location?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{user.department?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? "default" : "secondary"} className={user.isActive ? "bg-green-100 text-green-700 border-green-200" : ""}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? "New Password (leave blank to keep)" : "Password *"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v: string | null) => v && setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectDisplay value={form.role}>{form.role?.replace(/_/g, " ")}</SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={form.locationId} onValueChange={(v: string | null) => v && setForm((p) => ({ ...p, locationId: v }))}>
                <SelectTrigger>
                  <SelectDisplay value={form.locationId} placeholder="Select location">
                    {locations.find(l => l.id === form.locationId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v: string | null) => v && setForm((p) => ({ ...p, departmentId: v }))}>
                <SelectTrigger>
                  <SelectDisplay value={form.departmentId} placeholder="Select department">
                    {departments.find(d => d.id === form.departmentId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
