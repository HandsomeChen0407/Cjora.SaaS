import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  Building2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { usersApi, type UserDto, type UserRoleDto } from "@/api/users";
import { departmentsApi, type DepartmentDto } from "@/api/departments";
import { rolesApi, type RoleDto } from "@/api/roles";

interface FormData {
  loginName: string;
  displayName: string;
  email: string;
  phone: string;
  departmentId: number | null;
  roleIds: number[];
  isActive: boolean;
  password: string;
}

const defaultForm: FormData = {
  loginName: "", displayName: "", email: "", phone: "",
  departmentId: null, roleIds: [], isActive: true, password: "",
};

const PAGE_SIZE = 20;

const SysUserPage = () => {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [roleDropOpen, setRoleDropOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [userRolesMap, setUserRolesMap] = useState<Record<number, UserRoleDto[]>>({});

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await usersApi.getPaged(p, PAGE_SIZE);
      if (res.success && res.data) {
        setUsers(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch (e: any) {
      toast.error("加载用户列表失败: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRefs = useCallback(async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        departmentsApi.getPaged(1, 200),
        rolesApi.getPaged(1, 200),
      ]);
      if (deptRes.success && deptRes.data) setDepartments(deptRes.data.items);
      if (roleRes.success && roleRes.data) setAllRoles(roleRes.data.items);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchUsers(page); }, [page, fetchUsers]);
  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  useEffect(() => {
    if (users.length === 0) return;
    const loadRoles = async () => {
      const map: Record<number, UserRoleDto[]> = {};
      await Promise.all(
        users.map(async (u) => {
          try {
            const res = await usersApi.getRoles(u.id);
            if (res.success && res.data) map[u.id] = res.data;
          } catch { /* silent */ }
        })
      );
      setUserRolesMap(map);
    };
    loadRoles();
  }, [users]);

  const getDeptName = (deptId?: number) =>
    deptId ? departments.find((d) => d.id === deptId)?.name ?? "—" : "—";

  const openAdd = () => {
    setEditId(null);
    setForm(defaultForm);
    setRoleDropOpen(false);
    setShowModal(true);
  };

  const openEdit = (u: UserDto) => {
    setEditId(u.id);
    const roles = userRolesMap[u.id] ?? [];
    setForm({
      loginName: u.loginName,
      displayName: u.displayName,
      email: u.email ?? "",
      phone: u.phone ?? "",
      departmentId: u.departmentId ?? null,
      roleIds: roles.map((r) => r.roleId),
      isActive: u.isActive,
      password: "",
    });
    setRoleDropOpen(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.loginName.trim()) { toast.error("用户名不能为空"); return; }
    if (!form.displayName.trim()) { toast.error("姓名不能为空"); return; }

    setSaving(true);
    try {
      if (editId) {
        const res = await usersApi.update(editId, {
          loginName: form.loginName,
          displayName: form.displayName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          departmentId: form.departmentId ?? undefined,
          isActive: form.isActive,
        });
        if (!res.success) { toast.error(res.error ?? "更新失败"); return; }

        const currentRoles = userRolesMap[editId] ?? [];
        const currentRoleIds = currentRoles.map((r) => r.roleId);
        const toAdd = form.roleIds.filter((id) => !currentRoleIds.includes(id));
        const toRemove = currentRoles.filter((r) => !form.roleIds.includes(r.roleId));
        await Promise.all([
          ...toAdd.map((rid) => usersApi.assignRole(editId, rid)),
          ...toRemove.map((r) => usersApi.removeRole(editId, r.roleId)),
        ]);

        toast.success("用户更新成功");
      } else {
        const res = await usersApi.create({
          loginName: form.loginName,
          displayName: form.displayName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          departmentId: form.departmentId ?? undefined,
          isActive: form.isActive,
          password: form.password || undefined,
        });
        if (!res.success) { toast.error(res.error ?? "创建失败"); return; }

        if (res.data) {
          await Promise.all(
            form.roleIds.map((rid) => usersApi.assignRole(res.data!.id, rid))
          );
        }
        toast.success("用户创建成功");
      }
      setShowModal(false);
      fetchUsers(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await usersApi.del(id);
      toast.success("用户已删除");
      setDeleteConfirmId(null);
      fetchUsers(page);
    } catch (e: any) {
      toast.error("删除失败: " + e.message);
    }
  };

  const toggleRole = (rid: number) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(rid)
        ? prev.roleIds.filter((r) => r !== rid)
        : [...prev.roleIds, rid],
    }));
  };

  const filteredUsers = search
    ? users.filter((u) =>
        u.displayName.includes(search) ||
        u.loginName.includes(search) ||
        (u.email ?? "").includes(search)
      )
    : users;

  return (
    <div data-cmp="SysUserPage" className="flex flex-col h-full overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center gap-3 flex-wrap border-b border-border bg-card">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="bms-input pl-9 w-full"
            placeholder="搜索用户名、姓名、邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="bms-btn-primary flex items-center gap-1.5" onClick={openAdd}>
          <Plus size={14} />
          新增用户
        </button>
      </div>

      {/* 统计栏 */}
      <div className="flex-shrink-0 px-6 py-2 flex items-center gap-4 text-xs text-muted-foreground border-b border-border bg-muted/30">
        <span>共 <strong className="text-foreground">{totalCount}</strong> 条记录</span>
        <span>第 {page} / {totalPages} 页</span>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bms-table-header text-muted-foreground text-xs">
                <th className="text-left px-5 py-3 font-medium w-12">#</th>
                <th className="text-left px-4 py-3 font-medium">用户信息</th>
                <th className="text-left px-4 py-3 font-medium">所属部门</th>
                <th className="text-left px-4 py-3 font-medium">角色</th>
                <th className="text-left px-4 py-3 font-medium">联系方式</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium">创建时间</th>
                <th className="text-left px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => {
                const roles = userRolesMap[u.id] ?? [];
                return (
                  <tr key={u.id} className="table-row-hover border-b border-border/50 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{u.displayName}</div>
                          <div className="text-xs text-muted-foreground">{u.loginName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-muted-foreground" />
                        <span className="text-foreground">{getDeptName(u.departmentId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roles.length > 0 ? roles.map((r) => (
                          <span key={r.roleId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                            <Shield size={10} />
                            {r.roleName}
                          </span>
                        )) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div>{u.email ?? "—"}</div>
                        <div className="text-muted-foreground">{u.phone ?? "—"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? "status-online" : "status-offline"}`}>
                        {u.isActive ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.createdAtUtc?.split("T")[0]}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(u.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                    暂无用户数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 px-6 py-3 flex items-center justify-between border-t border-border bg-card">
          <span className="text-xs text-muted-foreground">共 {totalCount} 条</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) { pageNum = i + 1; }
              else if (page <= 4) { pageNum = i + 1; }
              else if (page >= totalPages - 3) { pageNum = totalPages - 6 + i; }
              else { pageNum = page - 3 + i; }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded text-xs transition-colors ${page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl p-6 w-80 shadow-custom">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <div className="font-semibold text-foreground">确认删除</div>
                <div className="text-xs text-muted-foreground mt-0.5">此操作不可撤销</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              确定要删除用户「<strong className="text-foreground">{users.find((u) => u.id === deleteConfirmId)?.displayName}</strong>」吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button className="bms-btn-secondary text-xs px-3 py-1.5" onClick={() => setDeleteConfirmId(null)}>取消</button>
              <button
                className="px-3 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-card rounded-xl w-[520px] max-h-[90vh] flex flex-col shadow-custom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="font-semibold text-foreground">{editId ? "编辑用户" : "新增用户"}</div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">用户名 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入登录账号"
                    value={form.loginName}
                    onChange={(e) => setForm((p) => ({ ...p, loginName: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">真实姓名 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入真实姓名"
                    value={form.displayName}
                    onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">邮箱</label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入邮箱"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">手机号</label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入手机号"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">所属部门</label>
                  <select
                    className="bms-input w-full"
                    value={form.departmentId ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value ? Number(e.target.value) : null }))}
                  >
                    <option value="">请选择部门</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={form.isActive ? "active" : "disabled"}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "active" }))}
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">角色分配</label>
                <div
                  className="bms-input cursor-pointer flex items-center justify-between"
                  onClick={() => setRoleDropOpen((v) => !v)}
                >
                  <span className={`text-sm ${form.roleIds.length === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                    {form.roleIds.length === 0
                      ? "请选择角色（可多选）"
                      : allRoles.filter((r) => form.roleIds.includes(r.id)).map((r) => r.name).join("、")}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                </div>
                {roleDropOpen && (
                  <div className="mt-1 border border-border rounded-md bg-card shadow-custom max-h-48 overflow-y-auto">
                    {allRoles.map((r) => {
                      const checked = form.roleIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          onClick={() => toggleRole(r.id)}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted transition-colors text-sm"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}>
                            {checked && <Check size={10} className="text-primary-foreground" />}
                          </div>
                          <Shield size={12} className="text-muted-foreground" />
                          <span className="text-foreground">{r.name}</span>
                          <span className="text-xs text-muted-foreground font-mono ml-auto">{r.code}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {!editId && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">初始密码</label>
                  <input
                    type="password"
                    className="bms-input w-full"
                    placeholder="不填则使用系统默认密码"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button className="bms-btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="bms-btn-primary flex items-center gap-1.5" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editId ? "保存更改" : "创建用户"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysUserPage;
