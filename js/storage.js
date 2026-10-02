// LocalStorage and App State Management with Case-Sensitive Multi-User Support

import { DEFAULT_DRIZZLE_SCHEDULE, DEFAULT_ADMIN_SCHEDULE } from './samples.js';
import { CONFIG } from './config.js';

const STORAGE_KEYS = {
  CURRENT_USER: 'sked_current_user',
  SCHEDULE_PREFIX: 'sked_schedule_',
  THEME: 'sked_theme',
  SETTINGS: 'sked_settings'
};

const DEFAULT_SETTINGS = {
  timeFormat: '12h',
  weekStart: 'Mon',
  startHour: 7,
  endHour: 22
};

export const Storage = {
  getCurrentUser() {
    // Return null by default so user is always presented with login screen if not logged in
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || null;
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
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.SCHEDULE_PREFIX}${user}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((e, idx) => ({
            ...e,
            id: e.id ? String(e.id) : `evt_${user}_${Date.now()}_${idx}`,
            recurring: e.recurring !== undefined ? Boolean(e.recurring) : true,
            isDeadline: Boolean(e.isDeadline)
          }));
        }
      }
    } catch (e) {
      console.error(`Error loading schedule for ${user}`, e);
    }

    // Default starter schedules for exact 'drizzle' and 'admin'
    if (user === 'drizzle') {
      return DEFAULT_DRIZZLE_SCHEDULE.map((e, idx) => ({
        ...e,
        id: `drizzle_${idx + 1}`,
        recurring: true,
        isDeadline: false
      }));
    }
    if (user === 'admin') {
      return DEFAULT_ADMIN_SCHEDULE.map((e, idx) => ({
        ...e,
        id: `admin_${idx + 1}`,
        recurring: true,
        isDeadline: false
      }));
    }
    return [];
  },

  setUserSchedule(username, events) {
    if (!username) return;
    const user = username.trim();
    try {
      localStorage.setItem(`${STORAGE_KEYS.SCHEDULE_PREFIX}${user}`, JSON.stringify(events));
    } catch (e) {
      console.error(`Error saving schedule for ${user}`, e);
    }
  },

  async fetchCloudSchedule(username) {
    if (!username) return null;
    const user = username.trim();
    try {
      const res = await fetch(`/api/schedule?user=${encodeURIComponent(user)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((e, idx) => ({
          ...e,
          id: e.id ? String(e.id) : `evt_${user}_${Date.now()}_${idx}`,
          recurring: e.recurring !== undefined ? Boolean(e.recurring) : true,
          isDeadline: Boolean(e.isDeadline)
        }));
      }
      return null;
    } catch {
      return null;
    }
  },

  async syncToCloud(username, events) {
    if (!username || !Array.isArray(events)) return;
    const user = username.trim();
    try {
      await fetch(`/api/schedule?user=${encodeURIComponent(user)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events)
      });
    } catch {
      // LocalStorage preserves data if cloud or KV is temporarily unavailable
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
  }
};
