// Sked Admin Console - System Diagnostics, AI Status, User Manager, and Feedback Hub
import { Storage } from './storage.js';
import { CONFIG } from './config.js';
import { DEFAULT_ADMIN_SCHEDULE, DEFAULT_DRIZZLE_SCHEDULE, DEFAULT_XYZ_SCHEDULE } from './samples.js';

export class AdminDashboard {
  constructor(appInstance) {
    this.app = appInstance;
    this.container = null;
    this.activeTab = 'diagnostics'; // 'diagnostics' | 'users' | 'feedback' | 'security'
    this.testResults = {
      ai: null,
      cloud: null
    };
  }

  mount(containerEl) {
    this.container = containerEl;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="admin-dashboard-container">
        <!-- Top Navigation Bar -->
        <header class="admin-topbar">
          <div class="admin-brand">
            <div class="admin-shield-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div class="admin-title-row">
                <h1 class="admin-heading">Sked Control Center</h1>
                <span class="admin-role-pill">ADMIN ROOT</span>
              </div>
              <p class="admin-subheading">System Diagnostics, AI Inference Health, User Data & Feedback Hub</p>
            </div>
          </div>

          <div class="admin-topbar-actions">
            <button id="btn-admin-return" class="btn-admin-action primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Timetable</span>
            </button>
            <button id="btn-admin-theme" class="btn-admin-icon" title="Toggle Theme">
              <span>${Storage.getTheme() === 'light' ? '☀️' : '🌙'}</span>
            </button>
            <button id="btn-admin-logout" class="btn-admin-action danger" title="Log out of admin session">
              <span>Log Out</span>
            </button>
          </div>
        </header>

        <!-- Admin Navigation Tabs -->
        <nav class="admin-tabs-nav">
          <button class="admin-tab-btn ${this.activeTab === 'diagnostics' ? 'active' : ''}" data-tab="diagnostics">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>System & AI Diagnostics</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'users' ? 'active' : ''}" data-tab="users">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>User Schedules</span>
            <span class="admin-tab-badge" id="admin-user-count-badge">0</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'feedback' ? 'active' : ''}" data-tab="feedback">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Feedback & Suggestions</span>
            <span class="admin-tab-badge amber" id="admin-feedback-count-badge">0</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'security' ? 'active' : ''}" data-tab="security">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Security & Passcode</span>
          </button>
        </nav>

        <!-- Main Tab Panels -->
        <main class="admin-body">
          <div id="admin-panel-content" class="admin-panel-content"></div>
        </main>
      </div>

      <!-- User Schedule Inspector Modal -->
      <div id="modal-admin-user-inspector" class="modal-backdrop" style="display: none;">
        <div class="modal-card admin-modal-card">
          <div class="modal-header">
            <h3 id="admin-inspector-title">User Schedule Inspector</h3>
            <button id="btn-close-admin-inspector" class="modal-close" type="button">&times;</button>
          </div>
          <div class="modal-body" id="admin-inspector-body"></div>
          <div class="modal-footer">
            <button type="button" id="btn-admin-inspector-export" class="btn-action">Download JSON</button>
            <button type="button" id="btn-admin-inspector-close" class="btn-secondary">Close</button>
          </div>
        </div>
      </div>
    `;

    this.bindGlobalEvents();
    this.renderCurrentTab();
  }

  bindGlobalEvents() {
    // Return to Timetable
    this.container.querySelector('#btn-admin-return')?.addEventListener('click', () => {
      this.app.closeAdminView();
    });

    // Theme Toggle
    this.container.querySelector('#btn-admin-theme')?.addEventListener('click', () => {
      this.app.toggleTheme();
      const iconEl = this.container.querySelector('#btn-admin-theme span');
      if (iconEl) iconEl.textContent = Storage.getTheme() === 'light' ? '☀️' : '🌙';
    });

    // Logout
    this.container.querySelector('#btn-admin-logout')?.addEventListener('click', () => {
      this.app.logout();
    });

    // Tabs Switcher
    this.container.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.container.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderCurrentTab();
        }
      });
    });

    // Inspector Modal Close
    const inspectorModal = this.container.querySelector('#modal-admin-user-inspector');
    const closeModal = () => {
      if (inspectorModal) {
        inspectorModal.classList.remove('open');
        setTimeout(() => {
          if (!inspectorModal.classList.contains('open')) {
            inspectorModal.style.display = 'none';
          }
        }, 180);
      }
    };

    this.container.querySelector('#btn-close-admin-inspector')?.addEventListener('click', closeModal);
    this.container.querySelector('#btn-admin-inspector-close')?.addEventListener('click', closeModal);
    inspectorModal?.addEventListener('click', (e) => {
      if (e.target === inspectorModal) closeModal();
    });
  }

  renderCurrentTab() {
    const mountPoint = this.container.querySelector('#admin-panel-content');
    if (!mountPoint) return;

    // Update counts on badges
    const userAccounts = Storage.getAllUserAccounts();
    const feedbackList = Storage.getFeedbackSubmissions();
    const userBadge = this.container.querySelector('#admin-user-count-badge');
    const feedbackBadge = this.container.querySelector('#admin-feedback-count-badge');
    if (userBadge) userBadge.textContent = userAccounts.length;
    if (feedbackBadge) feedbackBadge.textContent = feedbackList.length;

    switch (this.activeTab) {
      case 'diagnostics':
        this.renderDiagnosticsTab(mountPoint);
        break;
      case 'users':
        this.renderUsersTab(mountPoint, userAccounts);
        break;
      case 'feedback':
        this.renderFeedbackTab(mountPoint, feedbackList);
        break;
      case 'security':
        this.renderSecurityTab(mountPoint);
        break;
      default:
        this.renderDiagnosticsTab(mountPoint);
    }
  }

  // ==================== 1. DIAGNOSTICS TAB ====================

  renderDiagnosticsTab(mountPoint) {
    const stats = Storage.getStorageStats();
    const activeModel = CONFIG.DEFAULT_MODEL || 'gemini-flash-latest';
    const hasKey = Boolean(CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY.trim());
    const keyPreview = hasKey ? `${CONFIG.GEMINI_API_KEY.substring(0, 4)}...${CONFIG.GEMINI_API_KEY.slice(-4)}` : 'Not Configured';

    mountPoint.innerHTML = `
      <div class="admin-section-grid">

        <!-- KPI 1: Gemini AI Status -->
        <div class="admin-kpi-card ${hasKey ? 'status-good' : 'status-bad'}">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">Gemini AI Engine</span>
            <span class="admin-status-dot ${hasKey ? 'online' : 'offline'}"></span>
          </div>
          <div class="admin-kpi-metric">${hasKey ? 'Configured & Ready' : 'Key Missing'}</div>
          <div class="admin-kpi-meta">
            <span>Model: <code>${activeModel}</code></span>
            <span>Key: <code>${keyPreview}</code></span>
          </div>
        </div>

        <!-- KPI 2: Cloud Sync / KV Health -->
        <div class="admin-kpi-card status-good" id="kpi-cloud-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">Persistence & Sync</span>
            <span class="admin-status-dot online"></span>
          </div>
          <div class="admin-kpi-metric" id="kpi-cloud-status">Endpoint Active</div>
          <div class="admin-kpi-meta">
            <span>Route: <code>/api/schedule</code></span>
            <span id="kpi-cloud-type">Cloudflare KV / Local Mock</span>
          </div>
        </div>

        <!-- KPI 3: Local Storage Quota -->
        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">Storage Utilization</span>
            <span class="admin-kpi-pill">${stats.percentUsed}% Used</span>
          </div>
          <div class="admin-kpi-metric">${stats.totalKB} KB</div>
          <div class="admin-kpi-meta">
            <span>Quota: ~5.0 MB (Browser)</span>
            <span>Sked Keys: ${stats.skedItemsCount}</span>
          </div>
          <div class="admin-storage-bar">
            <div class="admin-storage-bar-fill" style="width: ${Math.max(1, stats.percentUsed)}%;"></div>
          </div>
        </div>

        <!-- KPI 4: Active Profiles -->
        <div class="admin-kpi-card">
          <div class="admin-kpi-header">
            <span class="admin-kpi-title">Discovered Profiles</span>
            <span class="admin-kpi-pill purple">${Storage.getAllUserAccounts().length} Users</span>
          </div>
          <div class="admin-kpi-metric">${Storage.getAllUserAccounts().reduce((acc, u) => acc + u.totalEvents, 0)} Total Events</div>
          <div class="admin-kpi-meta">
            <span>Profiles: <code>admin</code>, <code>💙 drizzle</code>, <code>💛 xyz</code></span>
            <span>Format: JSON Storage</span>
          </div>
        </div>

      </div>

      <!-- Interactive Diagnostic Action Panels -->
      <div class="admin-diagnostics-layout">

        <!-- AI Engine Latency Tester -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div class="admin-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <h3>Gemini AI Inference & Latency Test</h3>
            </div>
            <button id="btn-run-ai-test" class="btn-action primary">
              <span>Run Live AI Test</span>
            </button>
          </div>
          <div class="admin-card-body">
            <p class="admin-card-desc">Sends a lightweight test payload directly to the Gemini API to measure response latency, JSON compliance, and check quota availability.</p>
            
            <div class="admin-test-config-row">
              <label>Target Model:</label>
              <select id="admin-test-model-select" class="form-control admin-select">
                <option value="${activeModel}">${activeModel} (Default)</option>
                ${(CONFIG.FALLBACK_MODELS || []).map(m => `<option value="${m}">${m} (Fallback)</option>`).join('')}
              </select>
            </div>

            <div id="ai-test-output-box" class="admin-console-output">
              <span class="output-placeholder">Click "Run Live AI Test" above to execute an inference ping.</span>
            </div>
          </div>
        </div>

        <!-- Cloud Persistence & Sync Health Check -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div class="admin-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
              </svg>
              <h3>Cloud Persistence & Sync Health</h3>
            </div>
            <button id="btn-run-cloud-test" class="btn-action">
              <span>Ping Cloud Storage</span>
            </button>
          </div>
          <div class="admin-card-body">
            <p class="admin-card-desc">Verifies read and write access to the schedule endpoint (Cloudflare Pages KV worker in production, or local filesystem mock in dev server).</p>
            
            <div class="admin-test-config-row">
              <label>Target Route:</label>
              <select id="admin-test-cloud-target" class="form-control admin-select">
                <option value="admin">/api/schedule?user=admin</option>
                <option value="drizzle">/api/schedule?user=drizzle (💙 drizzle)</option>
                <option value="xyz">/api/schedule?user=xyz (💛 xyz)</option>
              </select>
            </div>

            <div id="cloud-test-output-box" class="admin-console-output">
              <span class="output-placeholder">Click "Ping Cloud Storage" to check roundtrip connection.</span>
            </div>
          </div>
        </div>

        <!-- Storage Keys Explorer & Backup -->
        <div class="admin-card full-width">
          <div class="admin-card-header">
            <div class="admin-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              <h3>LocalStorage Keys Breakdown & Full System Backup</h3>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button id="btn-admin-export-backup" class="btn-action">
                <span>Download Full System Backup (.json)</span>
              </button>
            </div>
          </div>
          <div class="admin-card-body">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Storage Key</th>
                  <th>Type</th>
                  <th>Payload Size</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${stats.items.map(item => `
                  <tr>
                    <td><code>${escapeHtml(item.key)}</code></td>
                    <td><span class="admin-type-chip">${item.key.includes('schedule') ? 'Schedule Data' : (item.key.includes('feedback') ? 'Feedback Log' : 'Config')}</span></td>
                    <td>${(item.bytes / 1024).toFixed(2)} KB (${item.length} chars)</td>
                    <td style="text-align: right;">
                      <button class="btn-table-action view-key-btn" data-key="${escapeHtml(item.key)}">Inspect</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Bind AI Test Event
    mountPoint.querySelector('#btn-run-ai-test')?.addEventListener('click', () => this.runAiTest());

    // Bind Cloud Test Event
    mountPoint.querySelector('#btn-run-cloud-test')?.addEventListener('click', () => this.runCloudTest());

    // Bind Full Backup Export
    mountPoint.querySelector('#btn-admin-export-backup')?.addEventListener('click', () => {
      const data = Storage.getFullBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sked-system-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.app.showToast('Full system backup downloaded.', 'success');
    });

    // Bind Inspect Key
    mountPoint.querySelectorAll('.view-key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (!key) return;
        const val = localStorage.getItem(key);
        let formatted = val;
        try {
          formatted = JSON.stringify(JSON.parse(val), null, 2);
        } catch {
          // keep as string
        }
        this.openInspectorModal(`Storage Key: ${key}`, formatted);
      });
    });
  }

  async runAiTest() {
    const outputBox = this.container.querySelector('#ai-test-output-box');
    const selectEl = this.container.querySelector('#admin-test-model-select');
    const btn = this.container.querySelector('#btn-run-ai-test');
    const model = selectEl ? selectEl.value : CONFIG.DEFAULT_MODEL;
    const apiKey = CONFIG.GEMINI_API_KEY;

    if (!outputBox || !btn) return;

    if (!apiKey) {
      outputBox.innerHTML = `
        <div class="admin-output-status error">
          <span>❌ Error: Gemini API Key is missing. Add your key in <code>js/config.js</code>.</span>
        </div>
      `;
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>Testing Inference...</span>`;
    outputBox.innerHTML = `<span class="admin-output-status testing">Connecting to Google Gemini API (model: ${model})...</span>`;

    const startTime = performance.now();

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{
          parts: [{ text: "System check ping. Reply with valid JSON: {\"status\": \"ok\", \"service\": \"Gemini AI\", \"timestamp\": " + Date.now() + "}" }]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      outputBox.innerHTML = `
        <div class="admin-output-status success">
          <div class="status-badge-row">
            <span class="badge-success">● Connected (200 OK)</span>
            <span class="badge-metric">Latency: <strong>${elapsed} ms</strong></span>
            <span class="badge-metric">Model: <strong>${model}</strong></span>
          </div>
          <div class="output-response-label">Raw Model Response:</div>
          <pre class="output-code-snippet">${escapeHtml(answer)}</pre>
        </div>
      `;
      this.app.showToast(`AI Test passed in ${elapsed}ms`, 'success');
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      outputBox.innerHTML = `
        <div class="admin-output-status error">
          <div class="status-badge-row">
            <span class="badge-danger">● Failed (${elapsed} ms)</span>
            <span class="badge-metric">Model: <strong>${model}</strong></span>
          </div>
          <div class="output-response-label">Error Details:</div>
          <pre class="output-code-snippet error">${escapeHtml(err.message)}</pre>
        </div>
      `;
      this.app.showToast(`AI test failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Run Live AI Test</span>`;
    }
  }

  async runCloudTest() {
    const outputBox = this.container.querySelector('#cloud-test-output-box');
    const btn = this.container.querySelector('#btn-run-cloud-test');
    const targetSelect = this.container.querySelector('#admin-test-cloud-target');
    const targetUser = targetSelect ? targetSelect.value : 'admin';
    if (!outputBox || !btn) return;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>Pinging...</span>`;
    outputBox.innerHTML = `<span class="admin-output-status testing">Testing /api/schedule endpoint with profile '${escapeHtml(targetUser)}'...</span>`;

    const startTime = performance.now();

    try {
      const res = await fetch(`/api/schedule?user=${encodeURIComponent(targetUser)}`);
      const elapsed = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Status ${res.status}: ${text}`);
      }

      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      const userBadgeLabel = targetUser === 'drizzle' ? '💙 drizzle' : (targetUser === 'xyz' ? '💛 xyz' : targetUser);

      outputBox.innerHTML = `
        <div class="admin-output-status success">
          <div class="status-badge-row">
            <span class="badge-success">● Endpoint Responsive (200 OK)</span>
            <span class="badge-metric">Roundtrip: <strong>${elapsed} ms</strong></span>
            <span class="badge-metric">Target: <strong>${userBadgeLabel}</strong></span>
            <span class="badge-metric">Records: <strong>${count} events</strong></span>
          </div>
          <div class="output-response-label">Sync Backend Status:</div>
          <p style="margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--text-secondary);">
            Cloud persistence is operational for <code>${escapeHtml(targetUser)}</code>. Changes are synchronized across connected devices.
          </p>
        </div>
      `;
      this.app.showToast(`Cloud storage responded in ${elapsed}ms`, 'success');
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      outputBox.innerHTML = `
        <div class="admin-output-status warning">
          <div class="status-badge-row">
            <span class="badge-warning">● Offline / Fallback Active</span>
            <span class="badge-metric">Time: <strong>${elapsed} ms</strong></span>
          </div>
          <p style="margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--text-secondary);">
            ${escapeHtml(err.message)}<br>
            <em>Note: If running on Cloudflare Pages without a bound KV namespace, schedules safely continue saving in browser local storage.</em>
          </p>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Ping Cloud Storage</span>`;
    }
  }

  // ==================== 2. USERS & SCHEDULES TAB ====================

  renderUsersTab(mountPoint, userAccounts) {
    mountPoint.innerHTML = `
      <div class="admin-card full-width">
        <div class="admin-card-header">
          <div class="admin-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h3>User Schedule Accounts (${userAccounts.length})</h3>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-admin-seed-user" class="btn-action primary">
              <span>+ Seed / Create Profile</span>
            </button>
          </div>
        </div>
        <div class="admin-card-body">
          <p class="admin-card-desc">Inspect, manage, and reset schedules for any user account saved in local storage or cloud.</p>
          
          <table class="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role / Type</th>
                <th>Total Events</th>
                <th>Breakdown</th>
                <th>Payload Size</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${userAccounts.map(u => {
                const isDrizzle = u.username === 'drizzle';
                const isXyz = u.username === 'xyz';
                const isAdmin = u.username === 'admin';

                let avatarClass = 'user-avatar-pill';
                let avatarContent = escapeHtml(u.username.substring(0, 2).toUpperCase());
                let displayName = escapeHtml(u.username);
                let badgeHtml = u.isSystem ? '<span class="admin-badge-system">System Profile</span>' : '<span class="admin-badge-user">User Profile</span>';

                if (isDrizzle) {
                  avatarClass += ' avatar-drizzle';
                  avatarContent = '💙';
                  displayName = '<span class="heart-inline heart-blue">💙</span> drizzle';
                  badgeHtml = '<span class="admin-badge-user badge-drizzle">Verified Profile</span>';
                } else if (isXyz) {
                  avatarClass += ' avatar-xyz';
                  avatarContent = '💛';
                  displayName = '<span class="heart-inline heart-yellow">💛</span> xyz';
                  badgeHtml = '<span class="admin-badge-user badge-xyz">VIP Profile</span>';
                } else if (isAdmin) {
                  avatarClass += ' avatar-admin';
                  avatarContent = '🛡️';
                  badgeHtml = '<span class="admin-badge-system">System Admin</span>';
                }

                return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <span class="${avatarClass}">${avatarContent}</span>
                      <strong style="color: var(--text-main); font-family: var(--font-mono);">${displayName}</strong>
                      ${u.username === this.app.currentUser ? '<span class="current-user-tag">Current</span>' : ''}
                    </div>
                  </td>
                  <td>${badgeHtml}</td>
                  <td>
                    <strong style="font-size: 1rem; color: var(--accent-primary);">${u.totalEvents}</strong> items
                  </td>
                  <td>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">
                      ${u.recurringCount} recurring • ${u.deadlineCount} deadlines • ${u.oneTimeCount} one-time
                    </span>
                  </td>
                  <td>${u.dataSizeKB} KB</td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 0.35rem;">
                      <button class="btn-table-action inspect-user-btn" data-user="${escapeHtml(u.username)}" title="Inspect timetable items">Inspect</button>
                      <button class="btn-table-action export-user-btn" data-user="${escapeHtml(u.username)}" title="Download user schedule JSON">JSON</button>
                      <button class="btn-table-action reset-user-btn" data-user="${escapeHtml(u.username)}" title="Reset schedule">Reset</button>
                      <button class="btn-table-action delete-user-btn" data-user="${escapeHtml(u.username)}" ${u.username === this.app.currentUser ? 'disabled title="Cannot delete active session"' : 'title="Permanently remove user" style="color: var(--accent-rose);"'} >Delete</button>
                    </div>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Seed/Create User
    mountPoint.querySelector('#btn-admin-seed-user')?.addEventListener('click', () => {
      const name = prompt('Enter a new username to create or seed with starter schedule:');
      if (name && name.trim()) {
        const clean = name.trim();
        const seedSchedule = clean === 'xyz' ? DEFAULT_XYZ_SCHEDULE : DEFAULT_DRIZZLE_SCHEDULE;
        Storage.setUserSchedule(clean, seedSchedule);
        this.app.showToast(`User '${clean}' created with starter schedule.`, 'success');
        this.renderCurrentTab();
      }
    });

    // Inspect user
    mountPoint.querySelectorAll('.inspect-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = btn.getAttribute('data-user');
        if (!user) return;
        const events = Storage.getUserSchedule(user);
        const displayTitle = user === 'drizzle' ? 'Schedule for user: 💙 drizzle' : (user === 'xyz' ? 'Schedule for user: 💛 xyz' : `Schedule for user: ${user}`);
        this.openInspectorModal(displayTitle, JSON.stringify(events, null, 2), events, user);
      });
    });

    // Export user JSON
    mountPoint.querySelectorAll('.export-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = btn.getAttribute('data-user');
        if (!user) return;
        const events = Storage.getUserSchedule(user);
        const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sked-${user}-schedule.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // Reset user schedule
    mountPoint.querySelectorAll('.reset-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = btn.getAttribute('data-user');
        if (!user) return;
        if (confirm(`Are you sure you want to reset schedule data for user "${user}"?`)) {
          if (user === 'drizzle') {
            Storage.setUserSchedule('drizzle', DEFAULT_DRIZZLE_SCHEDULE);
          } else if (user === 'xyz') {
            Storage.setUserSchedule('xyz', DEFAULT_XYZ_SCHEDULE);
          } else if (user === 'admin') {
            Storage.setUserSchedule('admin', DEFAULT_ADMIN_SCHEDULE);
          } else {
            Storage.setUserSchedule(user, []);
          }
          this.app.showToast(`Schedule for '${user}' has been reset.`, 'success');
          this.renderCurrentTab();
        }
      });
    });

    // Delete user account
    mountPoint.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = btn.getAttribute('data-user');
        if (!user) return;
        if (confirm(`Are you sure you want to permanently delete user "${user}" and remove their schedule data?`)) {
          Storage.deleteUserAccount(user);
          this.app.showToast(`User account '${user}' permanently removed.`, 'success');
          this.renderCurrentTab();
        }
      });
    });
  }

  // ==================== 3. FEEDBACK & SUGGESTIONS TAB ====================

  renderFeedbackTab(mountPoint, feedbackList) {
    mountPoint.innerHTML = `
      <div class="admin-card full-width">
        <div class="admin-card-header">
          <div class="admin-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3>User Feedback & Suggestions Inbox (${feedbackList.length})</h3>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-admin-add-mock-feedback" class="btn-action">
              <span>+ Add Note / Submission</span>
            </button>
          </div>
        </div>
        <div class="admin-card-body">
          <p class="admin-card-desc">Review and triage suggestions, feature requests, and bug reports sent by users.</p>
          
          <div class="feedback-inbox-list">
            ${feedbackList.map(item => {
              const categoryColor = {
                'Suggestion': 'var(--accent-primary)',
                'Bug Report': 'var(--accent-rose)',
                'UI Idea': 'var(--accent-cyan)',
                'General': 'var(--accent-emerald)'
              }[item.type] || 'var(--accent-primary)';

              return `
                <div class="admin-feedback-card" data-id="${item.id}">
                  <div class="feedback-card-top">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <span class="feedback-type-badge" style="background-color: ${categoryColor}22; color: ${categoryColor}; border: 1px solid ${categoryColor}44;">
                        ${escapeHtml(item.type || 'Suggestion')}
                      </span>
                      <span class="feedback-user-tag">👤 <code>${escapeHtml(item.username || 'Anonymous')}</code></span>
                      <span class="feedback-time-text">${escapeHtml(item.timestamp || '')}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <select class="form-control feedback-status-select" data-id="${item.id}">
                        <option value="New" ${item.status === 'New' ? 'selected' : ''}>New</option>
                        <option value="Under Review" ${item.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                        <option value="Planned" ${item.status === 'Planned' ? 'selected' : ''}>Planned</option>
                        <option value="Implemented" ${item.status === 'Implemented' ? 'selected' : ''}>Implemented</option>
                        <option value="Dismissed" ${item.status === 'Dismissed' ? 'selected' : ''}>Dismissed</option>
                      </select>
                      <button class="btn-table-action delete-feedback-btn" data-id="${item.id}" title="Remove submission">✕</button>
                    </div>
                  </div>

                  <div class="feedback-card-message">
                    "${escapeHtml(item.message)}"
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Status change
    mountPoint.querySelectorAll('.feedback-status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-id');
        const newStatus = e.target.value;
        Storage.updateFeedbackStatus(id, newStatus);
        this.app.showToast(`Feedback status updated to '${newStatus}'.`, 'success');
      });
    });

    // Delete feedback
    mountPoint.querySelectorAll('.delete-feedback-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this feedback item?')) {
          Storage.deleteFeedbackItem(id);
          this.renderCurrentTab();
          this.app.showToast('Feedback item removed.', 'success');
        }
      });
    });

    // Add note/mock feedback
    mountPoint.querySelector('#btn-admin-add-mock-feedback')?.addEventListener('click', () => {
      const msg = prompt('Enter a suggestion or feature note to record:');
      if (msg && msg.trim()) {
        Storage.saveFeedbackSubmission({
          username: 'admin',
          type: 'Suggestion',
          message: msg.trim(),
          timestamp: new Date().toLocaleString(),
          status: 'Planned'
        });
        this.app.showToast('Feedback recorded.', 'success');
        this.renderCurrentTab();
      }
    });
  }

  // ==================== 4. SECURITY & PASSCODE TAB ====================

  renderSecurityTab(mountPoint) {
    const currentPasscode = Storage.getAdminPasscode();
    const isDefault = currentPasscode === 'skedadmin';

    mountPoint.innerHTML = `
      <div class="admin-diagnostics-layout">

        <!-- Change Admin Passcode -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div class="admin-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <h3>Admin Passcode Settings</h3>
            </div>
          </div>
          <div class="admin-card-body">
            <p class="admin-card-desc">Users logging in as <code>admin</code> must enter this secret passcode to access admin controls.</p>
            
            <div class="admin-security-status-box ${isDefault ? 'warning' : 'good'}">
              <span>Status: <strong>${isDefault ? 'Default Passcode Active (skedadmin)' : 'Custom Passcode Active'}</strong></span>
            </div>

            <form id="form-admin-change-passcode" class="admin-form" style="margin-top: 1rem;">
              <div class="form-group">
                <label for="admin-new-passcode">New Admin Passcode</label>
                <input type="password" id="admin-new-passcode" class="form-control" placeholder="Enter new passcode" required>
              </div>

              <div class="form-group">
                <label for="admin-confirm-passcode">Confirm New Passcode</label>
                <input type="password" id="admin-confirm-passcode" class="form-control" placeholder="Re-enter new passcode" required>
              </div>

              <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button type="submit" class="btn-action primary">Save New Passcode</button>
                <button type="button" id="btn-admin-reset-passcode" class="btn-action">Reset to Default</button>
              </div>
            </form>
          </div>
        </div>

        <!-- System Reset & Safety Actions -->
        <div class="admin-card">
          <div class="admin-card-header">
            <div class="admin-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3>Maintenance & Reset Actions</h3>
            </div>
          </div>
          <div class="admin-card-body">
            <p class="admin-card-desc">Safety operations for cache management and emergency state clearing.</p>

            <div class="admin-maintenance-row">
              <div>
                <strong>Clear Browser Storage Cache</strong>
                <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">Purges temporary settings while preserving user schedules.</p>
              </div>
              <button id="btn-admin-clear-cache" class="btn-action">Clear Cache</button>
            </div>

            <div class="admin-maintenance-row" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <div>
                <strong style="color: var(--accent-rose);">Reset Admin Schedule</strong>
                <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">Restores the admin account schedule to its factory default timetable.</p>
              </div>
              <button id="btn-admin-reset-admin-schedule" class="btn-action danger">Reset Schedule</button>
            </div>
          </div>
        </div>

      </div>
    `;

    // Form Change Passcode
    mountPoint.querySelector('#form-admin-change-passcode')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const p1 = mountPoint.querySelector('#admin-new-passcode').value;
      const p2 = mountPoint.querySelector('#admin-confirm-passcode').value;
      if (p1 !== p2) {
        this.app.showToast('Passcodes do not match!', 'error');
        return;
      }
      if (p1.length < 4) {
        this.app.showToast('Passcode must be at least 4 characters long.', 'error');
        return;
      }
      Storage.setAdminPasscode(p1);
      this.app.showToast('Admin passcode updated successfully!', 'success');
      this.renderCurrentTab();
    });

    // Reset Passcode
    mountPoint.querySelector('#btn-admin-reset-passcode')?.addEventListener('click', () => {
      if (confirm('Reset admin passcode to default ("skedadmin")?')) {
        Storage.resetAdminPasscode();
        this.app.showToast('Passcode reset to default "skedadmin".', 'success');
        this.renderCurrentTab();
      }
    });

    // Clear Cache
    mountPoint.querySelector('#btn-admin-clear-cache')?.addEventListener('click', () => {
      localStorage.removeItem('sked_settings');
      this.app.showToast('Settings cache cleared.', 'success');
    });

    // Reset Admin Schedule
    mountPoint.querySelector('#btn-admin-reset-admin-schedule')?.addEventListener('click', () => {
      if (confirm('Reset admin schedule to factory default?')) {
        Storage.setUserSchedule('admin', DEFAULT_ADMIN_SCHEDULE);
        this.app.showToast('Admin schedule restored to default.', 'success');
      }
    });
  }

  // ==================== MODAL INSPECTOR ====================

  openInspectorModal(title, codeString, events = null, username = '') {
    const modal = this.container?.querySelector('#modal-admin-user-inspector') || document.getElementById('modal-admin-user-inspector');
    const titleEl = modal?.querySelector('#admin-inspector-title');
    const bodyEl = modal?.querySelector('#admin-inspector-body');
    const exportBtn = modal?.querySelector('#btn-admin-inspector-export');

    if (!modal || !titleEl || !bodyEl) {
      console.error('Inspector modal elements not found');
      return;
    }

    titleEl.textContent = title;
    const displayProfile = username === 'drizzle' ? '💙 drizzle' : (username === 'xyz' ? '💛 xyz' : escapeHtml(username));

    if (events && Array.isArray(events)) {
      bodyEl.innerHTML = `
        <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">${events.length} schedule commitments recorded</span>
          <span style="font-size: 0.85rem; color: var(--accent-primary); font-family: var(--font-mono);">Profile: <strong>${displayProfile}</strong></span>
        </div>
        <div class="admin-inspector-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Days / Date</th>
                <th>Time</th>
                <th>Category</th>
                <th>Location</th>
                <th>Link / Bin</th>
              </tr>
            </thead>
            <tbody>
              ${events.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No commitments scheduled for this profile.</td>
                </tr>
              ` : events.map(ev => `
                <tr>
                  <td><strong>${escapeHtml(ev.title)}</strong></td>
                  <td>${escapeHtml((ev.days || []).join(', ') || ev.date || '-')}</td>
                  <td>${escapeHtml(ev.startTime)} - ${escapeHtml(ev.endTime)}</td>
                  <td><span class="event-category-tag" style="background: ${ev.color || '#6366f1'}22; color: ${ev.color || '#6366f1'}">${escapeHtml(ev.category || 'General')}</span></td>
                  <td>${escapeHtml(ev.location || '-')}</td>
                  <td>${ev.url ? `<a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-cyan); text-decoration: underline;">Link ↗</a>` : '<span style="color: var(--text-muted);">-</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      bodyEl.innerHTML = `<pre class="json-code-box">${escapeHtml(codeString)}</pre>`;
    }

    if (exportBtn) {
      exportBtn.onclick = () => {
        const blob = new Blob([codeString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${username || 'storage'}-inspect.json`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('open');
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
