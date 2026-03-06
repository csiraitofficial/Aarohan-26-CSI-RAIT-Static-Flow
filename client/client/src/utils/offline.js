// ===================================
// CampusFlow Offline Manager
// ===================================

const STORAGE_KEYS = {
    QUEUE: 'campusflow_offline_queue',
    CACHE: 'campusflow_offline_cache',
    LAST_SYNC: 'campusflow_last_sync',
  };
  
  // ===================================
  // QUEUE MANAGER
  // ===================================
  const getQueue = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || '[]');
    } catch { return []; }
  };
  
  const saveQueue = (queue) => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  };
  
  const addToQueue = (request) => {
    const queue = getQueue();
    const item = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      attempts: 0,
      ...request,
    };
    queue.push(item);
    saveQueue(queue);
    notifyListeners();
    return item.id;
  };
  
  const removeFromQueue = (id) => {
    const queue = getQueue().filter(q => q.id !== id);
    saveQueue(queue);
    notifyListeners();
  };
  
  // ===================================
  // CACHE MANAGER
  // ===================================
  const getCache = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHE) || '{}');
    } catch { return {}; }
  };
  
  const setCache = (key, data, ttlMinutes = 30) => {
    try {
      const cache = getCache();
      cache[key] = {
        data,
        expires: Date.now() + ttlMinutes * 60 * 1000,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to cache data:', e);
    }
  };
  
  const getFromCache = (key) => {
    try {
      const cache = getCache();
      const entry = cache[key];
      if (!entry) return null;
      if (Date.now() > entry.expires) {
        delete cache[key];
        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
        return null;
      }
      return entry.data;
    } catch { return null; }
  };
  
  const clearCache = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CACHE);
    } catch (e) {}
  };
  
  const clearExpiredCache = () => {
    try {
      const cache = getCache();
      const now = Date.now();
      let changed = false;
      Object.keys(cache).forEach(key => {
        if (now > cache[key].expires) {
          delete cache[key];
          changed = true;
        }
      });
      if (changed) localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
    } catch (e) {}
  };
  
  // ===================================
  // LISTENERS (for React hook)
  // ===================================
  const listeners = new Set();
  
  const notifyListeners = () => {
    const state = getOfflineState();
    listeners.forEach(fn => fn(state));
  };
  
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  
  // ===================================
  // NETWORK STATUS
  // ===================================
  let isOnline = navigator.onLine;
  
  const getOfflineState = () => ({
    isOnline,
    queueCount: getQueue().length,
    queue: getQueue(),
    lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC),
  });
  
  window.addEventListener('online', async () => {
    isOnline = true;
    notifyListeners();
    await syncQueue();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners();
  });
  
  // ===================================
  // SYNC ENGINE
  // ===================================
  let syncing = false;
  
  const syncQueue = async () => {
    if (syncing || !isOnline) return;
    const queue = getQueue();
    if (queue.length === 0) return;
  
    syncing = true;
    console.log(`[CampusFlow Offline] Syncing ${queue.length} queued requests...`);
  
    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(item.token ? { Authorization: `Bearer ${item.token}` } : {}),
            ...item.headers,
          },
          body: item.body ? JSON.stringify(item.body) : undefined,
        });
  
        if (response.ok) {
          console.log(`[CampusFlow Offline] ✅ Synced: ${item.url}`);
          removeFromQueue(item.id);
        } else {
          // Increment attempts
          const q = getQueue();
          const idx = q.findIndex(q => q.id === item.id);
          if (idx >= 0) {
            q[idx].attempts += 1;
            // Remove if too many failures
            if (q[idx].attempts >= 5) {
              q.splice(idx, 1);
              console.warn(`[CampusFlow Offline] ❌ Dropped after 5 attempts: ${item.url}`);
            }
            saveQueue(q);
          }
        }
      } catch (err) {
        console.error(`[CampusFlow Offline] Failed to sync: ${item.url}`, err);
      }
    }
  
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    syncing = false;
    notifyListeners();
  };
  
  // ===================================
  // SMART FETCH
  // Wraps any API call with offline support
  // ===================================
  const smartFetch = async ({
    url,
    method = 'GET',
    body = null,
    headers = {},
    cacheKey = null,
    cacheTTL = 30,
    token = null,
  }) => {
    const fullHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    };
  
    // GET requests: try network, fallback to cache
    if (method === 'GET') {
      if (isOnline) {
        try {
          const res = await fetch(url, { method, headers: fullHeaders });
          const data = await res.json();
          if (cacheKey) setCache(cacheKey, data, cacheTTL);
          return { data, fromCache: false, offline: false };
        } catch (err) {
          // Network failed — try cache
          if (cacheKey) {
            const cached = getFromCache(cacheKey);
            if (cached) return { data: cached, fromCache: true, offline: false };
          }
          throw err;
        }
      } else {
        // Offline — return cache
        if (cacheKey) {
          const cached = getFromCache(cacheKey);
          if (cached) return { data: cached, fromCache: true, offline: true };
        }
        throw new Error('You are offline and no cached data is available.');
      }
    }
  
    // POST/PUT/DELETE: if offline, queue it
    if (!isOnline) {
      const id = addToQueue({ url, method, body, headers, token });
      return {
        queued: true,
        queueId: id,
        offline: true,
        message: 'Action queued — will sync when back online',
      };
    }
  
    // Online — execute directly
    const res = await fetch(url, {
      method,
      headers: fullHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  
    const data = await res.json();
    return { data, fromCache: false, offline: false };
  };
  
  // ===================================
  // REACT HOOK
  // ===================================
  // Usage:
  // const { isOnline, queueCount, lastSync } = useOffline();
  //
  // Import in component:
  // import { useOffline } from '../utils/offline';
  
  import { useState, useEffect } from 'react';
  
  export const useOffline = () => {
    const [state, setState] = useState(getOfflineState());
  
    useEffect(() => {
      const unsubscribe = subscribe(setState);
      // Cleanup expired cache on mount
      clearExpiredCache();
      return unsubscribe;
    }, []);
  
    return {
      ...state,
      syncNow: syncQueue,
      clearCache,
      getFromCache,
      setCache,
      smartFetch,
      addToQueue,
    };
  };
  
  // ===================================
  // OFFLINE STATUS BANNER COMPONENT
  // ===================================
  // Auto-shows when offline or has queued items
  // Import and drop anywhere in your app
  
  import React from 'react';
  
  export const OfflineBanner = () => {
    const { isOnline, queueCount, lastSync, syncNow } = useOffline();
    const [syncing, setSyncing] = useState(false);
    const [visible, setVisible] = useState(false);
  
    useEffect(() => {
      setVisible(!isOnline || queueCount > 0);
    }, [isOnline, queueCount]);
  
    if (!visible) return null;
  
    const handleSync = async () => {
      setSyncing(true);
      await syncNow();
      setSyncing(false);
    };
  
    const formatLastSync = () => {
      if (!lastSync) return 'Never';
      const diff = Math.floor((Date.now() - new Date(lastSync)) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return new Date(lastSync).toLocaleTimeString('en-IN');
    };
  
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  
          .ob-banner {
            position: fixed;
            top: 68px;
            left: 260px;
            right: 0;
            z-index: 500;
            font-family: 'Plus Jakarta Sans', sans-serif;
            animation: obSlide 0.3s cubic-bezier(0.16,1,0.3,1);
          }
  
          @keyframes obSlide {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
  
          .ob-inner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 24px;
            flex-wrap: wrap;
          }
  
          .ob-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
            animation: obDot 1.2s ease-in-out infinite;
          }
  
          @keyframes obDot {
            0%,100% { opacity:1; transform:scale(1); }
            50% { opacity:0.4; transform:scale(0.7); }
          }
  
          .ob-text { font-size: 13px; font-weight: 600; flex: 1; }
          .ob-sub { font-size: 11px; opacity: 0.7; margin-top: 1px; }
  
          .ob-queue {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 100px;
          }
  
          .ob-sync-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 8px;
            border: none;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Plus Jakarta Sans', sans-serif;
            transition: all 0.2s ease;
          }
  
          .ob-sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  
          .ob-spinner {
            width: 12px; height: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: obSpin 0.7s linear infinite;
          }
  
          @keyframes obSpin { to { transform:rotate(360deg); } }
  
          .ob-last-sync {
            font-size: 11px;
            opacity: 0.5;
          }
  
          @media (max-width: 768px) {
            .ob-banner { left: 0; top: 68px; }
          }
        `}</style>
  
        <div className="ob-banner">
          <div
            className="ob-inner"
            style={{
              background: isOnline
                ? 'rgba(245,158,11,0.9)'
                : 'rgba(239,68,68,0.92)',
              backdropFilter: 'blur(8px)',
              borderBottom: `1px solid ${isOnline ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <div
              className="ob-dot"
              style={{ background: isOnline ? '#fef08a' : '#fecaca' }}
            />
  
            <div style={{ flex: 1 }}>
              <div className="ob-text" style={{ color: 'white' }}>
                {isOnline ? '⚡ Back Online' : '📡 You\'re Offline'}
              </div>
              <div className="ob-sub" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {isOnline
                  ? 'Connection restored — syncing your data'
                  : 'Changes will be saved and synced when reconnected'
                }
              </div>
            </div>
  
            {queueCount > 0 && (
              <div
                className="ob-queue"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              >
                📦 {queueCount} pending
              </div>
            )}
  
            {isOnline && queueCount > 0 && (
              <button
                className="ob-sync-btn"
                onClick={handleSync}
                disabled={syncing}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              >
                {syncing
                  ? <><div className="ob-spinner" /> Syncing...</>
                  : '🔄 Sync Now'
                }
              </button>
            )}
  
            {lastSync && (
              <div className="ob-last-sync" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Last sync: {formatLastSync()}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };
  
  // ===================================
  // EXPORTS
  // ===================================
  export {
    smartFetch,
    addToQueue,
    getQueue,
    getFromCache,
    setCache,
    clearCache,
    syncQueue,
    subscribe,
    getOfflineState,
  };
  
  export default {
    smartFetch,
    addToQueue,
    getQueue,
    getFromCache,
    setCache,
    clearCache,
    syncQueue,
    subscribe,
    isOnline: () => isOnline,
  };