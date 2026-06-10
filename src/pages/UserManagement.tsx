import { useState } from 'react';
import {
  Users, Plus, Pencil, Trash2, Shield, User as UserIcon, UserCog,
  X, Check, ChevronLeft, Eye, EyeOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import HackerText from '@/components/HackerText';
import { useAuth } from '@/contexts/AuthContext';
import type { User as UserType, UserRole, PermissionModule } from '@/types';
import { ROLE_LABELS, ROLE_COLORS, MODULE_LABELS } from '@/types';

const ALL_MODULES: PermissionModule[] = ['dashboard', 'models', 'isos', 'software', 'audit', 'admin'];

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; desc: string }> = [
  { value: 'super_admin', label: '超级管理员', desc: '管理所有栏目，拥有全部权限' },
  { value: 'admin', label: '普通管理员', desc: '可管理指定栏目' },
  { value: 'user', label: '普通用户', desc: '仅可查看，无管理功能' },
];

export default function UserManagement() {
  const { user: currentUser, allUsers, addUser, updateUser, deleteUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    role: 'user' as UserRole,
    assignedModules: [] as PermissionModule[],
    status: 'active' as 'active' | 'disabled',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState('');

  const openAdd = () => {
    setEditingId(null);
    setForm({
      username: '',
      displayName: '',
      email: '',
      password: '',
      role: 'user',
      assignedModules: [],
      status: 'active',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (u: UserType) => {
    setEditingId(u.id);
    setForm({
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      password: '',
      role: u.role,
      assignedModules: u.assignedModules || [],
      status: u.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const save = () => {
    setFormError('');
    if (!form.username || !form.displayName) {
      setFormError('用户名和显示名称不能为空');
      return;
    }
    if (!editingId && !form.password) {
      setFormError('新建用户必须设置密码');
      return;
    }
    if (!editingId && form.password.length < 4) {
      setFormError('密码至少 4 位');
      return;
    }

    if (editingId) {
      const payload: Partial<UserType> & { password?: string } = {
        username: form.username,
        displayName: form.displayName,
        email: form.email,
        role: form.role,
        assignedModules: form.role === 'admin' ? form.assignedModules : undefined,
        status: form.status,
      };
      if (form.password) {
        payload.password = form.password;
      }
      updateUser(editingId, payload);
    } else {
      const ok = addUser({
        username: form.username,
        password: form.password,
        displayName: form.displayName,
        email: form.email,
        role: form.role,
        assignedModules: form.role === 'admin' ? form.assignedModules : undefined,
        status: form.status,
      });
      if (!ok) {
        setFormError('用户名已存在');
        return;
      }
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
  };

  const toggleModule = (mod: PermissionModule) => {
    setForm((prev) => ({
      ...prev,
      assignedModules: prev.assignedModules.includes(mod)
        ? prev.assignedModules.filter((m) => m !== mod)
        : [...prev.assignedModules, mod],
    }));
  };

  const getRoleIcon = (role: UserRole) => {
    if (role === 'super_admin') return Shield;
    if (role === 'admin') return UserCog;
    return UserIcon;
  };

  return (
    <div className="min-h-screen bg-tbase pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            to="/admin"
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--brand)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            管理后台
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ backgroundColor: 'var(--brand-dim)', borderColor: 'var(--brand-dim-2)' }}
              >
                <Users className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              </div>
              <span className="text-xs font-mono-data uppercase tracking-wider" style={{ color: 'var(--brand)' }}>
                User Management
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              <HackerText text="用户管理" trigger="mount" />
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>管理系统用户，分配角色和权限</p>
          </div>

          <button onClick={openAdd} className="liquid-cta-btn py-3 px-5 text-sm">
            <Plus className="w-4 h-4 mr-2" />
            添加用户
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '总用户', value: allUsers.length, color: 'var(--brand)' },
            { label: '超级管理员', value: allUsers.filter((u) => u.role === 'super_admin').length, color: 'var(--status-synced)' },
            { label: '普通管理员', value: allUsers.filter((u) => u.role === 'admin').length, color: 'var(--status-pending)' },
            { label: '普通用户', value: allUsers.filter((u) => u.role === 'user').length, color: 'var(--text-muted)' },
          ].map((s, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-2xl font-bold font-mono-data" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* User Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['用户', '角色', '管理栏目', '状态', '创建日期', '最后登录', '操作'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium uppercase tracking-wider px-6 py-4"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => {
                  const RoleIcon = getRoleIcon(u.role);
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              backgroundColor: ROLE_COLORS[u.role] + '20',
                              color: ROLE_COLORS[u.role],
                            }}
                          >
                            {u.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {u.displayName}
                            </p>
                            <p className="text-[10px] font-mono-data" style={{ color: 'var(--text-muted)' }}>
                              @{u.username}
                            </p>
                          </div>
                          {isSelf && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ color: 'var(--brand)', backgroundColor: 'var(--brand-dim)' }}
                            >
                              自己
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            color: ROLE_COLORS[u.role],
                            backgroundColor: ROLE_COLORS[u.role] + '15',
                          }}
                        >
                          <RoleIcon className="w-2.5 h-2.5" />
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.role === 'super_admin' ? (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ color: 'var(--brand)', backgroundColor: 'var(--brand-dim)' }}
                            >
                              全部
                            </span>
                          ) : u.assignedModules ? (
                            u.assignedModules.map((m) => (
                              <span
                                key={m}
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'var(--bg-input)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {MODULE_LABELS[m]}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              -
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            color: u.status === 'active' ? 'var(--status-synced)' : 'var(--status-failed)',
                            backgroundColor:
                              u.status === 'active' ? 'rgba(54,244,194,0.1)' : 'rgba(242,76,54,0.1)',
                          }}
                        >
                          {u.status === 'active' ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                          {u.status === 'active' ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono-data" style={{ color: 'var(--text-muted)' }}>
                        {u.createdAt}
                      </td>
                      <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={isSelf}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                            style={{ color: isSelf ? 'var(--text-muted)' : 'var(--status-failed)' }}
                            onMouseEnter={(e) => {
                              if (!isSelf) e.currentTarget.style.backgroundColor = 'rgba(242,76,54,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowModal(false)} />
          <div
            className="relative w-full max-w-lg rounded-3xl animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hover)',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editingId ? '编辑用户' : '添加用户'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                >
                  <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    用户名 *
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field"
                    placeholder="例如: zhangsan"
                    disabled={!!editingId}
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    显示名称 *
                  </label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field"
                    placeholder="例如: 张三"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field"
                    placeholder="zhangsan@amax.lab"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {editingId ? '密码（留空则不修改）' : '密码 *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field pr-10"
                      placeholder={editingId ? '不修改请留空' : '至少 4 位'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
                    角色
                  </label>
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setForm((p) => ({ ...p, role: opt.value, assignedModules: [] }))}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                        style={{
                          borderColor: form.role === opt.value ? ROLE_COLORS[opt.value] + '40' : 'var(--border)',
                          backgroundColor: form.role === opt.value ? ROLE_COLORS[opt.value] + '08' : 'var(--bg-card)',
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: form.role === opt.value ? ROLE_COLORS[opt.value] : 'var(--border)' }}
                        >
                          {form.role === opt.value && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[opt.value] }} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {opt.label}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module Assignment (admin only) */}
                {form.role === 'admin' && (
                  <div>
                    <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
                      管理栏目
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_MODULES.map((mod) => (
                        <button
                          key={mod}
                          onClick={() => toggleModule(mod)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all"
                          style={{
                            borderColor: form.assignedModules.includes(mod)
                              ? 'var(--brand-dim-2)'
                              : 'var(--border)',
                            backgroundColor: form.assignedModules.includes(mod)
                              ? 'var(--brand-dim-5)'
                              : 'var(--bg-card)',
                            color: form.assignedModules.includes(mod) ? 'var(--brand)' : 'var(--text-secondary)',
                          }}
                        >
                          {form.assignedModules.includes(mod) ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                          {MODULE_LABELS[mod]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
                    状态
                  </label>
                  <div className="flex gap-3">
                    {(['active', 'disabled'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm((p) => ({ ...p, status: s }))}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all"
                        style={{
                          borderColor:
                            form.status === s
                              ? s === 'active'
                                ? 'var(--status-synced)'
                                : 'var(--status-failed)'
                              : 'var(--border)',
                          backgroundColor:
                            form.status === s
                              ? s === 'active'
                                ? 'rgba(54,244,194,0.05)'
                                : 'rgba(242,76,54,0.05)'
                              : 'var(--bg-card)',
                          color:
                            form.status === s
                              ? s === 'active'
                                ? 'var(--status-synced)'
                                : 'var(--status-failed)'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {s === 'active' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {s === 'active' ? '启用' : '禁用'}
                      </button>
                    ))}
                  </div>
                </div>

                {formError && (
                  <p className="text-xs" style={{ color: 'var(--status-failed)' }}>
                    {formError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={!form.username || !form.displayName || (!editingId && !form.password)}
                  className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50"
                >
                  {editingId ? '保存修改' : '添加用户'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
