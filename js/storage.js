// LocalStorage and App State Management with Case-Sensitive Multi-User Support

import { DEFAULT_DRIZZLE_SCHEDULE, DEFAULT_ADMIN_SCHEDULE, DEFAULT_XYZ_SCHEDULE } from './samples.js';
import { CONFIG } from './config.js';

const STORAGE_KEYS = {
  CURRENT_USER: 'sked_current_user',
  SCHEDULE_PREFIX: 'sked_schedule_',
  THEME: 'sked_theme',
  SETTINGS: 'sked_settings',
  ADMIN_PASSCODE: 'sked_admin_passcode',
  FEEDBACK_LOG: 'sked_feedback_log',
  DELETED_USERS: 'sked_deleted_users'
};

const DEFAULT_FEEDBACK = [
  {
    id: 'fb-seed-dobs',
    username: 'dobs',
    type: 'Suggestion',
    message: 'schedules on the calendar could include redirects to pdf,docs or submissions bins',
    timestamp: 'Today at 2:47 PM',
    status: 'Planned'
  }
];

const DEFAULT_SETTINGS = {
  timeFormat: '12h',
  weekStart: 'Mon',
  startHour: 7,
  endHour: 22
};

export const Storage = {
  getCurrentUser() {
    // Always show login screen upon opening site and on refresh
    return null;
  },

  setCurrentUser(username) {
    if (!username) {
      this.clearCurrentUser();
      return null;
    }
    // Case-sensitive, trimmed, sanitized
    const cleanUser = username.trim();
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, cleanUser);
    return cleanUser;
  },

  clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getApiKey() {
    return CONFIG.GEMINI_API_KEY || '';
  },

  getModel() {
    return CONFIG.DEFAULT_MODEL || 'gemini-flash-latest';
  },

  getUserSchedule(username) {
    if (!username) return [];
    // Strict case-sensitive key lookup
    const user = username.trim();
    if (this.getDeletedUsers().includes(user)) return [];

    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.SCHEDULE_PREFIX}${user}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((e, idx) => ({
            ...e,
            id: e.id ? String(e.id) : `evt_${user}_${Date.now()}_${idx}`,
            recurring: e.recurring !== undefined ? Boolean(e.recurring) : true,
            isDeadline: Boolean(e.isDeadline),
            url: e.url ? String(e.url).trim() : ''
          }));
        }
      }
    } catch (e) {
      console.error(`Error loading schedule for ${user}`, e);
    }

    // Default starter schedules for exact 'drizzle', 'xyz', and 'admin'
    if (user === 'drizzle') {
      return DEFAULT_DRIZZLE_SCHEDULE.map((e, idx) => ({
        ...e,
        id: `drizzle_${idx + 1}`,
        recurring: true,
        isDeadline: false,
        url: e.url ? String(e.url).trim() : ''
      }));
    }
    if (user === 'xyz') {
      return DEFAULT_XYZ_SCHEDULE.map((e, idx) => ({
        ...e,
        id: `xyz_${idx + 1}`,
        recurring: true,
        isDeadline: false,
        url: e.url ? String(e.url).trim() : ''
      }));
    }
    if (user === 'admin') {
      return DEFAULT_ADMIN_SCHEDULE.map((e, idx) => ({
        ...e,
        id: `admin_${idx + 1}`,
        recurring: true,
        isDeadline: false,
        url: e.url ? String(e.url).trim() : ''
      }));
    }
    return [];
  },

  setUserSchedule(username, events) {
    if (!username) return;
    const user = username.trim();
    const deleted = this.getDeletedUsers().filter(u => u !== user);
    localStorage.setItem(STORAGE_KEYS.DELETED_USERS, JSON.stringify(deleted));
    try {
      localStorage.setItem(`${STORAGE_KEYS.SCHEDULE_PREFIX}${user}`, JSON.stringify(events));
    } catch (e) {
      console.error(`Error saving schedule for ${user}`, e);
    }
  },

  async fetchCloudSchedule(username) {
    if (!username) return null;
    const user = username.trim();
    if (this.getDeletedUsers().includes(user)) return null;

    try {
      console.log(`[Sked Cloud] Checking cloud schedule for user: "${user}"...`);
      const res = await fetch(`/api/schedule?user=${encodeURIComponent(user)}`);
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Sked Cloud] Cloud returned status ${res.status}:`, errText);
        return null;
      }
      const data = await res.json();
      console.log(`[Sked Cloud] Data received from cloud:`, data);
      if (Array.isArray(data)) {
        return data.map((e, idx) => ({
          ...e,
          id: e.id ? String(e.id) : `evt_${user}_${Date.now()}_${idx}`,
          recurring: e.recurring !== undefined ? Boolean(e.recurring) : true,
          isDeadline: Boolean(e.isDeadline),
          url: e.url ? String(e.url).trim() : ''
        }));
      }
      return null;
    } catch (err) {
      console.warn(`[Sked Cloud] Network error fetching cloud data:`, err);
      return null;
    }
  },

  async syncToCloud(username, events) {
    if (!username || !Array.isArray(events)) return false;
    const user = username.trim();
    try {
      console.log(`[Sked Cloud] Saving ${events.length} events to cloud for "${user}"...`);
      const res = await fetch(`/api/schedule?user=${encodeURIComponent(user)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Sked Cloud] Failed to save (${res.status}):`, errText);
        return false;
      }
      console.log(`[Sked Cloud] Successfully synced to Cloudflare KV for "${user}"!`);
      return true;
    } catch (err) {
      console.warn(`[Sked Cloud] Network error syncing to cloud:`, err);
      return false;
    }
  },

  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  },

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(newSettings) {
    const updated = { ...this.getSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  // ==================== ADMIN & DIAGNOSTICS ====================

  getAdminPasscode() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASSCODE) || CONFIG.ADMIN_PASSCODE || 'skedadmin';
  },

  setAdminPasscode(newPasscode) {
    if (!newPasscode || !newPasscode.trim()) return false;
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSCODE, newPasscode.trim());
    return true;
  },

  resetAdminPasscode() {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_PASSCODE);
    return CONFIG.ADMIN_PASSCODE || 'skedadmin';
  },

  validateAdminPasscode(entered) {
    if (!entered) return false;
    return entered.trim() === this.getAdminPasscode();
  },

  getStorageStats() {
    let totalBytes = 0;
    const items = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      const bytes = (key.length + val.length) * 2; // UTF-16 approximate
      totalBytes += bytes;
      if (key.startsWith('sked_')) {
        items.push({ key, bytes, length: val.length });
      }
    }

    const estimatedQuota = 5 * 1024 * 1024; // 5MB standard browser quota
    const percentUsed = Math.min(100, (totalBytes / estimatedQuota) * 100);

    return {
      totalBytes,
      totalKB: (totalBytes / 1024).toFixed(2),
      estimatedQuotaMB: 5,
      percentUsed: percentUsed.toFixed(2),
      skedItemsCount: items.length,
      items
    };
  },

  getDeletedUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getAllUserAccounts() {
    const userMap = new Map();
    const deleted = this.getDeletedUsers();

    // Default system users to guarantee they appear (unless explicitly deleted)
    if (!deleted.includes('admin')) {
      userMap.set('admin', {
        username: 'admin',
        isSystem: true,
        events: this.getUserSchedule('admin')
      });
    }
    if (!deleted.includes('drizzle')) {
      userMap.set('drizzle', {
        username: 'drizzle',
        isSystem: true,
        events: this.getUserSchedule('drizzle')
      });
    }
    if (!deleted.includes('xyz')) {
      userMap.set('xyz', {
        username: 'xyz',
        isSystem: false,
        events: this.getUserSchedule('xyz')
      });
    }

    // Scan localStorage for custom users
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.SCHEDULE_PREFIX)) {
        const username = key.substring(STORAGE_KEYS.SCHEDULE_PREFIX.length);
        if (username && !deleted.includes(username)) {
          const events = this.getUserSchedule(username);
          userMap.set(username, {
            username,
            isSystem: username === 'admin' || username === 'drizzle',
            events
          });
        }
      }
    }

    return Array.from(userMap.values()).map(u => {
      const recurringCount = u.events.filter(e => e.recurring !== false && !e.isDeadline).length;
      const deadlineCount = u.events.filter(e => e.isDeadline).length;
      const oneTimeCount = u.events.filter(e => e.recurring === false && !e.isDeadline).length;
      const jsonStr = JSON.stringify(u.events);

      return {
        username: u.username,
        isSystem: u.isSystem,
        totalEvents: u.events.length,
        recurringCount,
        deadlineCount,
        oneTimeCount,
        dataSizeKB: (jsonStr.length / 1024).toFixed(1),
        events: u.events
      };
    });
  },

  deleteUserAccount(username) {
    if (!username) return false;
    const user = username.trim();
    localStorage.removeItem(`${STORAGE_KEYS.SCHEDULE_PREFIX}${user}`);
    const deleted = this.getDeletedUsers();
    if (!deleted.includes(user)) {
      deleted.push(user);
      localStorage.setItem(STORAGE_KEYS.DELETED_USERS, JSON.stringify(deleted));
    }
    // Also clear from cloud if supported
    try {
      fetch(`/api/schedule?user=${encodeURIComponent(user)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      }).catch(() => {});
    } catch {}
    return true;
  },

  getFeedbackSubmissions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FEEDBACK_LOG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading feedback log:', e);
    }
    // Seed with initial feedback if empty
    this.saveFeedbackLog(DEFAULT_FEEDBACK);
    return DEFAULT_FEEDBACK;
  },

  saveFeedbackLog(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.FEEDBACK_LOG, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving feedback log:', e);
    }
  },

  saveFeedbackSubmission(entry) {
    const list = this.getFeedbackSubmissions();
    const newEntry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: entry.username || 'Anonymous',
      type: entry.type || 'Suggestion',
      message: entry.message || '',
      timestamp: entry.timestamp || new Date().toLocaleString(),
      status: entry.status || 'New'
    };
    list.unshift(newEntry);
    this.saveFeedbackLog(list);
    return newEntry;
  },

  updateFeedbackStatus(id, newStatus) {
    const list = this.getFeedbackSubmissions();
    const target = list.find(item => item.id === id);
    if (target) {
      target.status = newStatus;
      this.saveFeedbackLog(list);
      return true;
    }
    return false;
  },

  deleteFeedbackItem(id) {
    const list = this.getFeedbackSubmissions();
    const filtered = list.filter(item => item.id !== id);
    this.saveFeedbackLog(filtered);
    return true;
  },

  getFullBackupData() {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      users: this.getAllUserAccounts().map(u => ({
        username: u.username,
        events: u.events
      })),
      feedback: this.getFeedbackSubmissions(),
      settings: this.getSettings()
    };
    return backup;
  }
};
