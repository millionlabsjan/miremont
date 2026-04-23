import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { clsx } from "clsx";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  agencyName: string | null;
  createdAt: string;
  listings: number;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      const res = await fetch(`/api/users?${params}`, { credentials: "include" });
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: string;
    }) => {
      await apiRequest(`/api/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">User Management</h1>
          <p className="text-brand-warm mt-1">
            Manage accounts, user status, and platform access.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-brand-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-input">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* All Users section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-bold">All Users</h2>
        <button className="flex items-center gap-2 bg-brand-dark text-brand-offwhite rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-dark/90">
          <UserPlus size={16} />
          Invite user
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-warm"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="w-full h-10 pl-9 pr-4 bg-white border border-brand-border rounded-lg text-sm placeholder:text-brand-warm focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 bg-white border border-brand-border rounded-lg text-sm text-brand-warm"
        >
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 bg-white border border-brand-border rounded-lg text-sm text-brand-warm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(search || roleFilter || statusFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("");
              setStatusFilter("");
              setPage(1);
            }}
            className="text-sm text-brand-warm hover:text-brand-dark"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-brand-dark text-brand-offwhite rounded-lg px-4 py-2">
          <span className="text-sm">{selected.size} users selected</span>
          <button
            onClick={() => {
              selected.forEach((id) =>
                statusMutation.mutate({ userId: id, status: "active" })
              );
              setSelected(new Set());
            }}
            className="bg-white/20 rounded px-3 py-1 text-sm hover:bg-white/30"
          >
            Activate selected
          </button>
          <button
            onClick={() => {
              selected.forEach((id) =>
                statusMutation.mutate({ userId: id, status: "inactive" })
              );
              setSelected(new Set());
            }}
            className="bg-white/20 rounded px-3 py-1 text-sm hover:bg-white/30"
          >
            Deactivate selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-border bg-brand-offwhite">
              <th className="w-10 p-3">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="text-left p-3 text-[11px] font-semibold text-brand-warm uppercase">
                User
              </th>
              <th className="text-left p-3 text-[11px] font-semibold text-brand-warm uppercase">
                Role
              </th>
              <th className="text-left p-3 text-[11px] font-semibold text-brand-warm uppercase">
                Status
              </th>
              <th className="text-left p-3 text-[11px] font-semibold text-brand-warm uppercase">
                Registered
              </th>
              <th className="text-left p-3 text-[11px] font-semibold text-brand-warm uppercase">
                Listings
              </th>
              <th className="text-right p-3 text-[11px] font-semibold text-brand-warm uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-brand-warm">
                  Loading...
                </td>
              </tr>
            ) : data?.users?.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-brand-warm">
                  No users found
                </td>
              </tr>
            ) : (
              data?.users?.map((u: UserRow) => (
                <tr
                  key={u.id}
                  className="border-b border-brand-border/50 hover:bg-brand-offwhite/50"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-input flex items-center justify-center text-xs font-semibold">
                        {initials(u.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-brand-warm">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-medium uppercase border border-brand-border rounded px-2 py-1">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={clsx(
                        "text-xs font-medium flex items-center gap-1",
                        u.status === "active"
                          ? "text-green-600"
                          : "text-brand-warm"
                      )}
                    >
                      <span
                        className={clsx(
                          "w-1.5 h-1.5 rounded-full",
                          u.status === "active"
                            ? "bg-green-600"
                            : "bg-brand-warm"
                        )}
                      />
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-brand-warm">
                    {new Date(u.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3 text-sm text-center font-medium">
                    {u.role === "agent" ? u.listings : "\u2014"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() =>
                          statusMutation.mutate({
                            userId: u.id,
                            status:
                              u.status === "active" ? "inactive" : "active",
                          })
                        }
                        className={clsx(
                          "text-xs border rounded px-3 py-1 font-medium",
                          u.status === "active"
                            ? "border-brand-border text-brand-warm hover:bg-brand-input"
                            : "border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-brand-offwhite"
                        )}
                      >
                        {u.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() =>
                          statusMutation.mutate({
                            userId: u.id,
                            status: "deleted",
                          })
                        }
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-brand-border">
            <p className="text-sm text-brand-warm">
              Showing {(page - 1) * 20 + 1}-
              {Math.min(page * 20, data.total)} of {data.total} users
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-brand-border rounded hover:bg-brand-input disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={clsx(
                    "px-3 py-1 text-sm rounded",
                    page === i + 1
                      ? "bg-brand-dark text-brand-offwhite"
                      : "border border-brand-border hover:bg-brand-input"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1 text-sm border border-brand-border rounded hover:bg-brand-input disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
