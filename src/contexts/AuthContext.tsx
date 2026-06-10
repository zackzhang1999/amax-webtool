import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, PermissionModule } from '@/types';
import { getDefaultPermissions } from '@/types';

interface StoredUser extends User {
  password: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: PermissionModule, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  canAccessModule: (module: PermissionModule) => boolean;
  /* user management */
  allUsers: User[];
  addUser: (payload: {
    username: string;
    password: string;
    displayName: string;
    email: string;
    role: UserRole;
    assignedModules?: PermissionModule[];
    status: 'active' | 'disabled';
  }) => boolean;
  updateUser: (id: string, payload: Partial<Omit<StoredUser, 'id'>>) => boolean;
  deleteUser: (id: string) => boolean;
  /* current user */
  updateCurrentUserPassword: (oldPassword: string, newPassword: string) => boolean;
  updateCurrentUserProfile: (payload: Partial<User>) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';
const USERS_ENDPOINT = `${API_BASE}/api/users`;
const SESSION_KEY = 'amax-user';

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'usr-001',
    username: 'admin',
    password: 'admin888',
    displayName: '管理员',
    email: 'admin@amax.lab',
    role: 'super_admin',
    avatar: 'A',
    permissions: getDefaultPermissions('super_admin'),
    createdAt: '2024-01-01',
    status: 'active',
  },
];

async function fetchUsers(): Promise<StoredUser[]> {
  try {
    const res = await fetch(USERS_ENDPOINT);
    if (!res.ok) return DEFAULT_USERS;
    const parsed = await res.json();
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

async function persistUsers(users: StoredUser[]) {
  await fetch(USERS_ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users),
  });
}

function getSessionUser(): User | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as User;
  } catch {
    return null;
  }
}

function stripPassword(u: StoredUser): User {
  const { password: _p, ...rest } = u;
  return rest as User;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  hasPermission: () => false,
  canAccessModule: () => false,
  allUsers: [],
  addUser: () => false,
  updateUser: () => false,
  deleteUser: () => false,
  updateCurrentUserPassword: () => false,
  updateCurrentUserProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(DEFAULT_USERS);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(getSessionUser);

  const isAuthenticated = !!user;

  useEffect(() => {
    let cancelled = false;

    fetchUsers().then((serverUsers) => {
      if (cancelled) return;
      setUsers(serverUsers);
      setUser((current) => {
        if (!current) return null;
        const fresh = serverUsers.find((u) => u.id === current.id);
        return fresh ? stripPassword(fresh) : null;
      });
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persistUsers(users).catch((error) => {
      console.error('保存用户到 SQLite 失败', error);
    });
  }, [users, loaded]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      const updated = { ...found, lastLogin: new Date().toISOString() };
      setUsers(prev => prev.map(u => (u.id === found.id ? updated : u)));
      setUser(stripPassword(updated));
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (module: PermissionModule, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
      if (!user) return false;
      if (user.role === 'super_admin') return true;
      const perm = user.permissions.find(p => p.module === module);
      if (!perm) return false;
      switch (action) {
        case 'view': return perm.canView;
        case 'create': return perm.canCreate;
        case 'edit': return perm.canEdit;
        case 'delete': return perm.canDelete;
      }
    },
    [user]
  );

  const canAccessModule = useCallback(
    (module: PermissionModule): boolean => {
      if (!user) return module !== 'admin';
      return hasPermission(module, 'view');
    },
    [user, hasPermission]
  );

  const allUsers = users.map(stripPassword);

  const addUser = useCallback(
    (payload: {
      username: string;
      password: string;
      displayName: string;
      email: string;
      role: UserRole;
      assignedModules?: PermissionModule[];
      status: 'active' | 'disabled';
    }): boolean => {
      if (users.some(u => u.username === payload.username)) return false;
      const newUser: StoredUser = {
        id: `usr-${String(users.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`,
        username: payload.username,
        password: payload.password,
        displayName: payload.displayName,
        email: payload.email,
        role: payload.role,
        avatar: payload.displayName.charAt(0).toUpperCase(),
        permissions: getDefaultPermissions(payload.role, payload.assignedModules),
        assignedModules: payload.role === 'admin' ? payload.assignedModules : undefined,
        createdAt: new Date().toISOString().split('T')[0],
        status: payload.status,
      };
      setUsers(prev => [...prev, newUser]);
      return true;
    },
    [users]
  );

  const updateUser = useCallback(
    (id: string, payload: Partial<Omit<StoredUser, 'id'>>): boolean => {
      let target: StoredUser | undefined;
      setUsers(prev =>
        prev.map(u => {
          if (u.id !== id) return u;
          const updated: StoredUser = { ...u, ...payload };
          if (payload.role !== undefined || payload.assignedModules !== undefined) {
            updated.permissions = getDefaultPermissions(updated.role, updated.assignedModules);
          }
          target = updated;
          return updated;
        })
      );
      // sync session if current user changed
      if (user?.id === id && target) {
        setUser(stripPassword(target));
      }
      return true;
    },
    [user]
  );

  const deleteUser = useCallback(
    (id: string): boolean => {
      if (user?.id === id) return false;
      setUsers(prev => prev.filter(u => u.id !== id));
      return true;
    },
    [user]
  );

  const updateCurrentUserPassword = useCallback(
    (oldPassword: string, newPassword: string): boolean => {
      if (!user) return false;
      const found = users.find(u => u.id === user.id);
      if (!found || found.password !== oldPassword) return false;
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, password: newPassword } : u)));
      return true;
    },
    [users, user]
  );

  const updateCurrentUserProfile = useCallback(
    (payload: Partial<User>) => {
      if (!user) return;
      const updated = { ...user, ...payload };
      setUser(updated);
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, ...payload } : u)));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        canAccessModule,
        allUsers,
        addUser,
        updateUser,
        deleteUser,
        updateCurrentUserPassword,
        updateCurrentUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
