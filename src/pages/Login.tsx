import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, LogIn, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { ROLE_LABELS } from '@/types';

const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  username: string;
  password: string;
  desc: string;
  icon: React.ElementType;
}> = [
  { role: 'super_admin', username: 'admin', password: 'admin888', desc: '管理所有栏目', icon: Shield },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      navigate('/');
    } else {
      setError('用户名或密码错误');
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setError('');
    setLoading(true);
    const ok = await login(u, p);
    setLoading(false);
    if (ok) {
      navigate('/');
    } else {
      setError('快速登录失败');
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-tbase flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border"
            style={{ backgroundColor: 'var(--brand-dim)', borderColor: 'var(--brand-dim-2)' }}
          >
            <Server className="w-8 h-8" style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Amax<span style={{ color: 'var(--brand)' }}>工具箱</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>服务器运维管理平台</p>
        </div>

        {/* Login card */}
        <div
          className="rounded-3xl p-8"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hover)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm input-field"
                placeholder="输入用户名"
              />
            </div>

            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm input-field pr-10"
                  placeholder="输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs" style={{ color: 'var(--status-failed)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full liquid-cta-btn py-3 text-sm disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs text-center mb-3" style={{ color: 'var(--text-muted)' }}>
              默认管理员账号
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.role}
                    onClick={() => {
                      fillDemo(acc.username, acc.password);
                      handleQuickLogin(acc.username, acc.password);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand-dim-2)';
                      e.currentTarget.style.backgroundColor = 'var(--brand-dim-5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--brand-dim-5)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {ROLE_LABELS[acc.role]}
                      </p>
                      <p className="text-[10px] font-mono-data" style={{ color: 'var(--text-muted)' }}>
                        {acc.username} / {acc.password}
                      </p>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {acc.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
