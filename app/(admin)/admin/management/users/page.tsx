"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppUser, UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

const roles: UserRole[] = ["student", "staff", "venue_admin", "system_admin"];

export default function UserManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setError(null);
    const { data, error: userError } = await supabase
      .from("app_user")
      .select("*, person(first_name,last_name,email)")
      .order("user_id");

    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    setUsers((data as AppUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (userId: number, body: Partial<AppUser>) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.json();
      toast({ title: "User update failed", description: errorBody.error, tone: "error" });
      return;
    }

    await fetchUsers();
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchUsers()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">User Management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage roles and active status.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchUsers()}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Student ID</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Notifications</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <Td>{user.user_id}</Td>
                  <Td>
                    {user.person?.first_name} {user.person?.last_name}
                  </Td>
                  <Td>{user.person?.email}</Td>
                  <Td>{user.itu_student_id ?? "-"}</Td>
                  <Td>
                    <Select
                      value={user.user_type}
                      onChange={(event) => void updateUser(user.user_id, { user_type: event.target.value as UserRole })}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <Badge tone={user.is_active ? "success" : "danger"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={user.notif_enabled ? "info" : "default"}>{user.notif_enabled ? "Enabled" : "Disabled"}</Badge>
                  </Td>
                  <Td>
                    <Button size="sm" variant="danger" disabled={!user.is_active} onClick={() => void updateUser(user.user_id, { is_active: false })}>
                      Deactivate
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
