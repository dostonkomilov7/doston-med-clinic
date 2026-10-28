const apiUrl = '/api';

export { apiUrl };

export const setCookie = (name: string, value: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=${value}; path=/`;
  }
};

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split('; ');
  for (const c of cookies) {
    const eq = c.indexOf('=');
    if (eq === -1) continue;
    const key = c.slice(0, eq);
    const value = c.slice(eq + 1);
    if (key === name) return value;
  }
  return null;
};

export const deleteCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

export const getUserData = async () => {
  const userId = getCookie('userId');
  if (!userId) return null;
  const res = await fetch(`${apiUrl}/users/${userId}`, { credentials: 'include' });
  return res.json();
};

export const getRole = async (): Promise<string | null> => {
  if (typeof cookieStore !== 'undefined') {
    const role = await cookieStore.get('role');
    return role?.value ?? null;
  }
  return getCookie('role');
};

export const AUTH_COOKIE = 'authenticated';

export const redirectIfAuth = async (router: { push: (path: string) => void }) => {
  const token = getCookie(AUTH_COOKIE);
  if (token) {
    const role = getCookie('role');
    if (role === 'Doctor') {
      router.push('/doctor-dashboard');
    } else if (role === 'User') {
      router.push('/user-dashboard');
    } else if (role === 'Admin') {
      router.push('/admin-dashboard');
    } else {
      router.push('/');
    }
  }
};

export const redirectIfNotAuth = (router: { push: (path: string) => void }) => {
  const token = getCookie(AUTH_COOKIE);
  if (!token) {
    router.push('/login');
  }
};

export const signOut = async () => {
  try {
    await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {
    console.error('Failed to log out on the server:', e);
  }
  deleteCookie('accessToken');
  deleteCookie('refreshToken');
  deleteCookie('userId');
  deleteCookie('role');
  deleteCookie(AUTH_COOKIE);
  if (typeof localStorage !== 'undefined') localStorage.clear();
  window.location.href = '/';
};

let authFetchGuardInstalled = false;

export const installAuthFetchGuard = () => {
  if (typeof window === 'undefined' || authFetchGuardInstalled) return;
  authFetchGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    if (response.status === 401) {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isProtectedApiCall = url.startsWith(`${apiUrl}/`) && !url.startsWith(`${apiUrl}/auth/`);

      if (isProtectedApiCall && window.location.pathname !== '/login') {
        deleteCookie('accessToken');
        deleteCookie('refreshToken');
        deleteCookie('userId');
        deleteCookie('role');
        deleteCookie(AUTH_COOKIE);
        window.location.href = '/login';
      }
    }

    return response;
  };
};

export const strMonth = (date: string): string => {
  const month = date.split('-').at(1);
  const months: Record<string, string> = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  };
  return months[month ?? ''] ?? '';
};

export const escapeHtml = (str: string): string =>
  String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const apiErrorMessage = (body: unknown, fallback: string): string => {
  const message = (body as { message?: unknown } | null | undefined)?.message;
  if (Array.isArray(message)) {
    const text = message.filter((m): m is string => typeof m === 'string').join('. ');
    return text || fallback;
  }
  return typeof message === 'string' && message.trim() ? message : fallback;
};

export const getAge = (dob: string): number | string => {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 1) return '-';
  return age;
};
