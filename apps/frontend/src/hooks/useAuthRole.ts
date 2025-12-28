import {useEffect, useState} from 'react';
import {API_BASE_URL} from '../config/api';
import {getCredentials} from '../utils/auth';

type Role = 'developer' | 'consumer';

function extractRole(json: any): Role | null {
  // Accept several shapes: {role}, {user:{role}}, {roles:['developer',...]}
  if (!json) return null;

  const r =
    json.role ??
    json?.user?.role ??
    (Array.isArray(json.roles)
      ? json.roles.find((x: string) => typeof x === 'string')
      : undefined);

  if (typeof r === 'string') {
    const clean = r.trim().toLowerCase();
    if (clean === 'developer' || clean === 'consumer') return clean as Role;
  }
  return null;
}

export function useAuthRole() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const creds = await getCredentials();
        const token = creds?.accessToken;
        if (!token) {
          // console.log('[useAuthRole] No access token; default → consumer');
          setRole('consumer');
          return;
        }

        const url = `${API_BASE_URL.replace(/\/+$/, '')}/users/me`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          /* leave json null */
        }

        // console.log('[useAuthRole] /me status:', res.status);
        // console.log('[useAuthRole] /me body:', json ?? text);

        if (!res.ok) {
          // console.log('[useAuthRole] Non-200 from /me; default → consumer');
          setRole('consumer');
          return;
        }

        const extracted = extractRole(json);
        if (extracted) {
          setRole(extracted);
        } else {
          // console.log(
          //   '[useAuthRole] Could not find role in response; default → consumer',
          // );
          setRole('consumer');
        }
      } catch (e) {
        // console.warn('[useAuthRole] fetch /me failed:', e);
        setRole('consumer');
      }
    })();
  }, []);

  return role;
}
