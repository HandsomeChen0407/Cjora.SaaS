import { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronDown,
  User,
  Shield,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface Dept {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  username: string;
  realName: string;
  email: string;
  phone: string;
  deptId: string;
  deptName: string;
  roleIds: string[];
  roleNames: string[];
  status: "active" | "disabled";
  createdAt: string;
}

const MOCK_DEPTS: Dept[] = [
  { id: "1", name: "总公司" },
  { id: "2", name: "技术部" },
  { id: "3", name: "销售部" },
  { id: "4", name: "运营部" },
  { id: "5", name: "财务部" },
];

const MOCK_ROLES: Role[] = [
  { id: "r1", name: "超级管理员" },
  { id: "r2", name: "系统管理员" },
  { id: "r3", name: "销售经理" },
  { id: "r4", name: "技术工程师" },
  { id: "r5", name: "财务专员" },
  { id: "r6", name: "只读用户" },
];

const MOCK_USERS: UserItem[] = [
  {
    id: "u1", username: "admin", realName: "系统管理员", email: "admin@bms.com",
    phone: "13800000001", deptId: "1", deptName: "总公司",
    roleIds: ["r1"], roleNames: ["超级管理员"], status: "active", createdAt: "2024-01-01",
  },
  {
    id: "u2", username: "zhangwei", realName: "张伟", email: "zhangwei@bms.com",
    phone: "13800000002", deptId: "3", deptName: "销售部",
    roleIds: ["r3"], roleNames: ["销售经理"], status: "active", createdAt: "2024-02-10",
  },
  {
    id: "u3", username: "lihua", realName: "李华", email: "lihua@bms.com",
    phone: "13800000003", deptId: "2", deptName: "技术部",
    roleIds: ["r4"], roleNames: ["技术工程师"], status: "active", createdAt: "2024-03-05",
  },
  {
    id: "u4", username: "wangfang", realName: "王芳", email: "wangfang@bms.com",
    phone: "13800000004", deptId: "5", deptName: "财务部",
    roleIds: ["r5"], roleNames: ["财务专员"], status: "disabled", createdAt: "2024-03-20",
  },
  {
    id: "u5", username: "chenming", realName: "陈明", email: "chenming@bms.com",
    phone: "13800000005", deptId: "4", deptName: "运营部",
    roleIds: ["r2", "r6"], roleNames: ["系统管理员", "只读用户"], status: "active", createdAt: "2024-04-01",
  },
];

interface FormData {
  username: string;
  realName: string;
  email: string;
  phone: string;
  deptId: string;
  roleIds: string[];
  status: "active" | "disabled";
  password: string;
}

const defaultForm: FormData = {
  username: "", realName: "", email: "", phone: "",
  deptId: "", roleIds: [], status: "active", password: "",
};

const SysUserPage = () => {
  const [users, setUsers] = useState<UserItem[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [roleDropOpen, setRoleDropOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.realName.includes(search) || u.username.includes(search) || u.email.includes(search);
    const matchDept = !filterDept || u.deptId === filterDept;
    const matchStatus = !filterStatus || u.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const openAdd = () => {
    setEditId(null);
    setForm(defaultForm);
    setRoleDropOpen(false);
    setShowModal(true);
  };

  const openEdit = (u: UserItem) => {
    setEditId(u.id);
    setForm({
      username: u.username,
      realName: u.realName,
      email: u.email,
      phone: u.phone,
      deptId: u.deptId,
      roleIds: [...u.roleIds],
      status: u.status,
      password: "",
    });
    setRoleDropOpen(false);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.username.trim()) { toast.error("用户名不能为空"); return; }
    if (!form.realName.trim()) { toast.error("姓名不能为空"); return; }
    if (!form.deptId) { toast.error("请选择所属部门"); return; }
    if (form.roleIds.length === 0) { toast.error("请至少选择一个角色"); return; }

    const deptName = MOCK_DEPTS.find((d) => d.id === form.deptId)?.name || "";
    const roleNames = MOCK_ROLES.filter((r) => form.roleIds.includes(r.id)).map((r) => r.name);

    if (editId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editId
            ? { ...u, ...form, deptName, roleNames }
            : u
        )
      );
      toast.success("用户更新成功");
    } else {
      const newUser: UserItem = {
        id: `u${Date.now()}`,
        ...form,
        deptName,
        roleNames,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      toast.success("用户创建成功");
    }
    setShowModal(false);
    console.log("[SYS] 用户保存:", form);
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeleteConfirmId(null);
    toast.success("用户已删除");
    console.log("[SYS] 删除用户:", id);
  };

  const toggleRole = (rid: string) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(rid)
        ? prev.roleIds.filter((r) => r !== rid)
        : [...prev.roleIds, rid],
    }));
  };

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
        <select
          className="bms-input w-36"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">全部部门</option>
          {MOCK_DEPTS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          className="bms-input w-28"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
        <button className="bms-btn-primary flex items-center gap-1.5" onClick={openAdd}>
          <Plus size={14} />
          新增用户
        </button>
      </div>

      {/* 统计栏 */}
      <div className="flex-shrink-0 px-6 py-2 flex items-center gap-4 text-xs text-muted-foreground border-b border-border bg-muted/30">
        <span>共 <strong className="text-foreground">{filtered.length}</strong> 条记录</span>
        <span>启用 <strong className="text-foreground">{filtered.filter((u) => u.status === "active").length}</strong> / 禁用 <strong className="text-foreground">{filtered.filter((u) => u.status === "disabled").length}</strong></span>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-auto">
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
            {filtered.map((u, idx) => (
              <tr key={u.id} className="table-row-hover border-b border-border/50 transition-colors">
                <td className="px-5 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{u.realName}</div>
                      <div className="text-xs text-muted-foreground">{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-muted-foreground" />
                    <span className="text-foreground">{u.deptName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roleNames.map((rn) => (
                      <span key={rn} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                        <Shield size={10} />
                        {rn}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs">
                    <div>{u.email}</div>
                    <div className="text-muted-foreground">{u.phone}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.status === "active" ? "status-online" : "status-offline"}`}>
                    {u.status === "active" ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.createdAt}</td>
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
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                  暂无用户数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              确定要删除用户「<strong className="text-foreground">{users.find((u) => u.id === deleteConfirmId)?.realName}</strong>」吗？
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
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">真实姓名 <span className="text-destructive">*</span></label>
                  <input
                    className="bms-input w-full"
                    placeholder="请输入真实姓名"
                    value={form.realName}
                    onChange={(e) => setForm((p) => ({ ...p, realName: e.target.value }))}
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
                  <label className="block text-xs font-medium text-foreground mb-1.5">所属部门 <span className="text-destructive">*</span></label>
                  <select
                    className="bms-input w-full"
                    value={form.deptId}
                    onChange={(e) => setForm((p) => ({ ...p, deptId: e.target.value }))}
                  >
                    <option value="">请选择部门</option>
                    {MOCK_DEPTS.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground mb-1.5">状态</label>
                  <select
                    className="bms-input w-full"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as "active" | "disabled" }))}
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">角色分配 <span className="text-destructive">*</span></label>
                <div
                  className="bms-input cursor-pointer flex items-center justify-between"
                  onClick={() => setRoleDropOpen((v) => !v)}
                >
                  <span className={`text-sm ${form.roleIds.length === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                    {form.roleIds.length === 0
                      ? "请选择角色（可多选）"
                      : MOCK_ROLES.filter((r) => form.roleIds.includes(r.id)).map((r) => r.name).join("、")}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                </div>
                {roleDropOpen && (
                  <div className="mt-1 border border-border rounded-md bg-card shadow-custom">
                    {MOCK_ROLES.map((r) => {
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
              <button className="bms-btn-primary" onClick={handleSave}>
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
