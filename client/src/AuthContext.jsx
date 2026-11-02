import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { apiUrl } from './api';

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshPromise = useRef(null);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshPromise.current) {
      refreshPromise.current = (async () => {
        const response = await fetch(apiUrl('/api/auth/refresh-token'), {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          setAccessToken(null);
          return null;
        }

        const data = await response.json();
        if (!data.accessToken) {
          throw new Error('Refresh response did not include an access token.');
        }

        setAccessToken(data.accessToken);
        return data.accessToken;
      })().finally(() => {
        refreshPromise.current = null;
      });
    }

    return refreshPromise.current;
  }, []);

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const sendRequest = (token) => {
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(apiUrl(url), { ...options, headers });
    };

    let response = await sendRequest(accessToken);
    if (response.status !== 401) {
      return response;
    }

    const renewedToken = await refreshAccessToken();
    if (!renewedToken) {
      return response;
    }

    response = await sendRequest(renewedToken);
    return response;
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    const refreshSession = async () => {
      try {
        await refreshAccessToken();
      } catch (err) {
        console.error("Session restoration failed:", err);
      } finally {
        setLoading(false);
      }
    };

    refreshSession();
  }, [refreshAccessToken]);

  const login = (token) => setAccessToken(token);
  const logout = () => {
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ accessToken, setAccessToken, login, logout, loading, authenticatedFetch }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
