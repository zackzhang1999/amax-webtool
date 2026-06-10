import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Server, Shield, Clock, LayoutDashboard, AppWindow, Menu, X, Sun, Moon,
  Disc3, LogOut, UserCircle, Lock, Eye, EyeOff, Check,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/types';
import type { PermissionModule } from '@/types';

const ALL_NAV_ITEMS: Array<{
  label: string;
  icon: React.ElementType;
  href: string;
  module: PermissionModule;
}> = [
  { label: '驾驶舱', icon: LayoutDashboard, href: '/', module: 'dashboard' },
  { label: '机型库', icon: Server, href: '/models', module: 'models' },
  { label: '镜像中心', icon: Disc3, href: '/isos', module: 'isos' },
  { label: '软件中心', icon: AppWindow, href: '/software', module: 'software' },
  { label: '合规监控', icon: Clock, href: '/audit', module: 'audit' },
  { label: '管理后台', icon: Shield, href: '/admin', module: 'admin' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, canAccessModule, updateCurrentUserPassword } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const isActive = (href: string) =>
    location.pathname === href || (href !== '/' && location.pathname.startsWith(href));

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (!isAuthenticated) return item.module !== 'admin';
    return canAccessModule(item.module);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openPwdModal = () => {
    setShowPwdModal(true);
    setUserMenuOpen(false);
    setOldPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdError('');
    setPwdSuccess('');
  };

  const submitChangePassword = () => {
    setPwdError('');
    setPwdSuccess('');
    if (!oldPwd || !newPwd || !confirmPwd) {
      setPwdError('请填写所有字段');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('两次输入的新密码不一致');
      return;
    }
    if (newPwd.length < 4) {
      setPwdError('新密码至少 4 位');
      return;
    }
    const ok = updateCurrentUserPassword(oldPwd, newPwd);
    if (ok) {
      setPwdSuccess('密码修改成功，下次登录请使用新密码');
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setShowPwdModal(false), 1500);
    } else {
      setPwdError('原密码错误');
    }
  };

  if (location.pathname === '/login') return null;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'liquid-glass py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="w-full px-6 lg:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors"
              style={{ backgroundColor: 'var(--brand-dim)', borderColor: 'var(--brand-dim-2)' }}
            >
              <Server className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Amax<span style={{ color: 'var(--brand)' }}>工具箱</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
                  style={{ color: active ? 'var(--brand)' : 'var(--text-secondary)' }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {active && (
                    <span
                      className="absolute inset-0 rounded-full border"
                      style={{ backgroundColor: 'var(--brand-dim)', borderColor: 'var(--brand-dim-2)' }}
                    />
                  )}
                  <item.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-2 w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--brand)';
                e.currentTarget.style.borderColor = 'var(--brand-dim-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Menu */}
            {isAuthenticated && user && (
              <div className="relative ml-2">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition-all"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand)' }}
                  >
                    {user.avatar}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {user.displayName}
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden animate-slide-up"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-hover)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {user.displayName}
                      </p>
                      <p className="text-[10px] font-mono-data mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {user.email}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-2"
                        style={{
                          color:
                            user.role === 'super_admin'
                              ? 'var(--status-synced)'
                              : user.role === 'admin'
                              ? 'var(--status-pending)'
                              : 'var(--text-muted)',
                          backgroundColor:
                            user.role === 'super_admin'
                              ? 'rgba(54,244,194,0.1)'
                              : user.role === 'admin'
                              ? 'rgba(217,161,76,0.1)'
                              : 'rgba(89,89,105,0.1)',
                        }}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>
                    {user.role === 'super_admin' && (
                      <Link
                        to="/admin/users"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        <UserCircle className="w-4 h-4" />
                        用户管理
                      </Link>
                    )}
                    <button
                      onClick={openPwdModal}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <Lock className="w-4 h-4" />
                      修改密码
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--status-failed)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(242,76,54,0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated && user && (
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ color: 'var(--status-failed)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 flex items-center justify-center"
              style={{ color: 'var(--text-primary)' }}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden mt-2 mx-4 rounded-2xl p-4 animate-slide-up"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hover)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {isAuthenticated && user && (
              <div className="flex items-center gap-3 px-4 py-3 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand)' }}
                >
                  {user.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {user.displayName}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
              </div>
            )}
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    color: active ? 'var(--brand)' : 'var(--text-secondary)',
                    backgroundColor: active ? 'var(--brand-dim)' : 'transparent',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            {isAuthenticated && user?.role === 'super_admin' && (
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <UserCircle className="w-4 h-4" />
                用户管理
              </Link>
            )}
            {isAuthenticated && (
              <button
                onClick={openPwdModal}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Lock className="w-4 h-4" />
                修改密码
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPwdModal(false)}
          />
          <div
            className="relative w-full max-w-md rounded-3xl animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hover)',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  修改密码
                </h2>
                <button
                  onClick={() => setShowPwdModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                >
                  <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Old Password */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    原密码
                  </label>
                  <div className="relative">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={oldPwd}
                      onChange={(e) => setOldPwd(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field pr-10"
                      placeholder="输入当前密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    新密码
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field pr-10"
                      placeholder="至少 4 位"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    确认新密码
                  </label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field"
                    placeholder="再次输入新密码"
                  />
                </div>

                {pwdError && (
                  <p className="text-xs" style={{ color: 'var(--status-failed)' }}>
                    {pwdError}
                  </p>
                )}
                {pwdSuccess && (
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--status-synced)' }}>
                    <Check className="w-3.5 h-3.5" />
                    {pwdSuccess}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setShowPwdModal(false)}
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  取消
                </button>
                <button
                  onClick={submitChangePassword}
                  disabled={!oldPwd || !newPwd || !confirmPwd}
                  className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50"
                >
                  确认修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
