import { Storage } from './storage.js';
import { parseScheduleWithGemini } from './gemini.js';
import { renderTimetable, renderAgenda, formatTime } from './timetable.js';
import { exportToImage, exportToIcs, exportToCsv, exportToJson } from './exporter.js';
import { AdminDashboard } from './admin.js';

class SkedApp {
  constructor() {
    this.currentUser = Storage.getCurrentUser();
    this.events = [];
    this.settings = Storage.getSettings();
    this.activeTab = 'weekly';
    this.adminDashboard = new AdminDashboard(this);

    // Image state
    this.uploadedImages = []; // Array of { id, name, size, type, base64, dataUrl }

    this.initElements();
    this.initTheme();
    this.initImageUpload();
    this.initEventListeners();
    this.checkAuthState();
  }

  initElements() {
    // 1. Login View Elements
    this.loginView = document.getElementById('login-view');
    this.formLogin = document.getElementById('form-login');
    this.loginUsernameInput = document.getElementById('login-username-input');
    this.loginPasscodeGroup = document.getElementById('login-passcode-group');
    this.loginPasscodeInput = document.getElementById('login-passcode-input');
    this.loginErrorMsg = document.getElementById('login-error-msg');

    // 2. Main App View Elements
    this.appView = document.getElementById('app-view');
    this.adminView = document.getElementById('admin-view');
    this.currentUsernameDisplay = document.getElementById('current-username-display');
    this.btnAdminConsole = document.getElementById('btn-admin-console');
    this.btnLogout = document.getElementById('btn-logout');

    // Prompt & Image Upload Elements
    this.promptInput = document.getElementById('prompt-input');
    this.btnGenerate = document.getElementById('btn-generate');
    this.btnClearPrompt = document.getElementById('btn-clear-prompt');
    this.checkboxAppendMode = document.getElementById('checkbox-append-mode');
    
    this.promptBoxContainer = document.getElementById('prompt-box-container');
    this.imagePreviewsList = document.getElementById('image-previews-list');
    this.btnAttachImage = document.getElementById('btn-attach-image');
    this.imageFileInput = document.getElementById('image-file-input');

    // Header Controls
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.themeIcon = document.getElementById('theme-icon');
    this.btnAddEvent = document.getElementById('btn-add-event');

    // Event Add/Edit Modal
    this.modalEvent = document.getElementById('modal-event');
    this.modalEventTitle = document.getElementById('modal-event-title');
    this.btnCloseEventModal = document.getElementById('btn-close-event-modal');
    this.formEvent = document.getElementById('form-event');
    this.btnCancelEvent = document.getElementById('btn-cancel-event');
    this.btnDeleteModalEvent = document.getElementById('btn-delete-modal-event');
    this.currentEditingId = null;
    this.selectRepeatType = document.getElementById('event-repeat-type');
    this.groupEventDate = document.getElementById('group-event-date');
    this.inputEventDate = document.getElementById('event-date');

    // Mounts & Tabs
    this.timetableMount = document.getElementById('timetable-mount');
    this.agendaMount = document.getElementById('agenda-mount');
    this.dataTableBody = document.getElementById('data-table-body');
    this.jsonCodeBox = document.getElementById('json-code-box');
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Export Actions
    this.btnExportPng = document.getElementById('btn-export-png');
    this.btnExportIcs = document.getElementById('btn-export-ics');
    this.btnExportCsv = document.getElementById('btn-export-csv');
    this.btnClearAll = document.getElementById('btn-clear-all');

    // JSON Actions
    this.btnCopyJson = document.getElementById('btn-copy-json');
    this.btnDownloadJson = document.getElementById('btn-download-json');

    // Feedback / Suggestion Elements
    this.btnFeedbackFab = document.getElementById('btn-feedback-fab');
    this.modalFeedback = document.getElementById('modal-feedback');
    this.formFeedback = document.getElementById('form-feedback');
    this.btnCloseFeedbackModal = document.getElementById('btn-close-feedback-modal');
    this.btnCancelFeedback = document.getElementById('btn-cancel-feedback');
    this.btnSubmitFeedback = document.getElementById('btn-submit-feedback');
    this.feedbackType = document.getElementById('feedback-type');
    this.feedbackMessage = document.getElementById('feedback-message');
  }

  initTheme() {
    const currentTheme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', currentTheme);
    this.themeIcon.textContent = currentTheme === 'light' ? '☀️' : '🌙';
  }

  toggleTheme() {
    const currentTheme = Storage.getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    Storage.setTheme(newTheme);
    this.themeIcon.textContent = newTheme === 'light' ? '☀️' : '🌙';
    if (this.currentUser) {
      this.renderAllViews();
    }
  }

  initImageUpload() {
    if (this.btnAttachImage) {
      this.btnAttachImage.addEventListener('click', () => {
        if (this.imageFileInput) this.imageFileInput.click();
      });
    }

    if (this.imageFileInput) {
      this.imageFileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
          this.processUploadedFiles(files);
        }
        this.imageFileInput.value = '';
      });
    }

    if (this.promptBoxContainer) {
      ['dragenter', 'dragover'].forEach(eventName => {
        this.promptBoxContainer.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.promptBoxContainer.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.promptBoxContainer.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.promptBoxContainer.classList.remove('drag-active');
        });
      });

      this.promptBoxContainer.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
          this.processUploadedFiles(files);
        } else if (e.dataTransfer?.files?.length > 0) {
          this.showToast('Please upload image files (PNG, JPG, WEBP).', 'error');
        }
      });
    }
  }

  processUploadedFiles(files) {
    let addedCount = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.showToast(`Skipped non-image file: ${file.name}`, 'error');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.showToast(`Image "${file.name}" exceeds 10MB limit.`, 'error');
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result;
        const base64 = resultStr.split(',')[1];
        const newImg = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64,
          dataUrl: resultStr
        };
        this.uploadedImages.push(newImg);
        this.renderImagePreviews();
      };
      reader.onerror = () => {
        this.showToast(`Failed to read ${file.name}`, 'error');
      };
      reader.readAsDataURL(file);
      addedCount++;
    }

    if (addedCount > 0) {
      this.showToast(`Attached ${addedCount} photo${addedCount > 1 ? 's' : ''}.`, 'success');
    }
  }

  renderImagePreviews() {
    if (!this.imagePreviewsList) return;

    if (this.uploadedImages.length === 0) {
      this.imagePreviewsList.style.display = 'none';
      this.imagePreviewsList.innerHTML = '';
      return;
    }

    this.imagePreviewsList.style.display = 'flex';
    this.imagePreviewsList.innerHTML = '';

    this.uploadedImages.forEach(img => {
      const chip = document.createElement('div');
      chip.className = 'image-chip';
      chip.innerHTML = `
        <img src="${img.dataUrl}" alt="${this.escape(img.name)}" class="image-chip-thumb" />
        <span class="image-chip-name" title="${this.escape(img.name)}">${this.escape(img.name)}</span>
        <button type="button" class="btn-chip-remove" title="Remove image">&times;</button>
      `;

      chip.querySelector('.btn-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeUploadedImage(img.id);
      });

      this.imagePreviewsList.appendChild(chip);
    });
  }

  removeUploadedImage(id) {
    this.uploadedImages = this.uploadedImages.filter(img => img.id !== id);
    this.renderImagePreviews();
  }

  clearUploadedImages() {
    this.uploadedImages = [];
    if (this.imageFileInput) this.imageFileInput.value = '';
    this.renderImagePreviews();
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }

  initEventListeners() {
    this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());

    // Login Form Submit
    this.formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLoginSubmit();
    });

    // Real-time input validation: disallow special characters & toggle passcode
    this.loginUsernameInput.addEventListener('input', () => {
      const val = this.loginUsernameInput.value.trim();
      if (val && !/^[a-zA-Z0-9]+$/.test(val)) {
        this.showLoginError('Special characters and spaces are not allowed. Only letters and numbers.');
      } else {
        this.clearLoginError();
      }

      if (val.toLowerCase() === 'admin') {
        if (this.loginPasscodeGroup) {
          this.loginPasscodeGroup.style.display = 'block';
        }
      } else {
        if (this.loginPasscodeGroup) {
          this.loginPasscodeGroup.style.display = 'none';
          if (this.loginPasscodeInput) this.loginPasscodeInput.value = '';
        }
      }
    });

    // Admin Console Button
    this.btnAdminConsole?.addEventListener('click', () => this.openAdminView());

    // Logout / Switch User
    this.btnLogout.addEventListener('click', () => this.logout());

    // Fixed Clear Text Button
    this.btnClearPrompt.addEventListener('click', () => {
      this.promptInput.value = '';
      this.promptInput.focus();
      this.showToast('Text cleared.', 'success');
    });

    this.btnGenerate.addEventListener('click', () => this.handleGenerate());

    // Tabs
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Event Modal
    this.btnAddEvent.addEventListener('click', () => this.openAddEventModal());
    this.btnCloseEventModal.addEventListener('click', () => this.closeEventModal());
    this.btnCancelEvent.addEventListener('click', () => this.closeEventModal());
    this.btnDeleteModalEvent?.addEventListener('click', () => {
      if (this.currentEditingId) {
        this.deleteEvent(this.currentEditingId);
        this.closeEventModal();
      }
    });
    this.modalEvent.addEventListener('click', (e) => {
      if (e.target === this.modalEvent) this.closeEventModal();
    });
    this.formEvent.addEventListener('submit', (e) => this.handleSaveEvent(e));

    // Repeat Type toggle in Event Modal
    this.selectRepeatType?.addEventListener('change', (e) => {
      const isOnetimeOrDeadline = e.target.value !== 'weekly';
      this.groupEventDate.style.display = isOnetimeOrDeadline ? 'flex' : 'none';
      if (e.target.value === 'deadline') {
        document.getElementById('event-color').value = '#f43f5e';
      }
    });

    // When a date is picked, auto-select the weekday
    this.inputEventDate?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        const d = new Date(val + 'T00:00:00');
        const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCode = dayMap[d.getDay()];
        document.querySelectorAll('input[name="event-day"]').forEach(cb => {
          cb.checked = (cb.value === dayCode);
        });
      }
    });

    // Category Color Auto-fill
    document.getElementById('event-category')?.addEventListener('change', (e) => {
      const cat = e.target.value;
      const colorMap = {
        'Academic': '#6366f1',
        'Fitness': '#10b981',
        'Work': '#f59e0b',
        'Study': '#ec4899',
        'Personal': '#8b5cf6',
        'Social': '#06b6d4',
        'Chore': '#64748b',
        'General': '#6366f1'
      };
      if (colorMap[cat] && this.selectRepeatType.value !== 'deadline') {
        document.getElementById('event-color').value = colorMap[cat];
      }
    });

    // Exports
    this.btnExportPng.addEventListener('click', () => this.handleExportPng());
    this.btnExportIcs.addEventListener('click', () => {
      try {
        exportToIcs(this.events, `sked-${this.currentUser}-schedule.ics`);
        this.showToast('Calendar .ics file downloaded.', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
    this.btnExportCsv.addEventListener('click', () => {
      try {
        exportToCsv(this.events, `sked-${this.currentUser}-schedule.csv`);
        this.showToast('CSV file downloaded.', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
    this.btnClearAll.addEventListener('click', () => {
      if (confirm(`Reset and clear all schedule events for "${this.currentUser}"?`)) {
        this.events = [];
        this.persistEvents();
        this.renderAllViews();
        this.showToast(`Schedule reset for ${this.currentUser}.`, 'success');
      }
    });

    // JSON Actions
    this.btnCopyJson.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(this.events, null, 2))
        .then(() => this.showToast('JSON copied to clipboard.', 'success'))
        .catch(() => this.showToast('Failed to copy JSON.', 'error'));
    });
    this.btnDownloadJson.addEventListener('click', () => {
      exportToJson(this.events, `sked-${this.currentUser}-data.json`);
      this.showToast('JSON file downloaded.', 'success');
    });

    // Feedback Modal Open / Close
    this.btnFeedbackFab?.addEventListener('click', () => this.openFeedbackModal());
    this.btnCloseFeedbackModal?.addEventListener('click', () => this.closeFeedbackModal());
    this.btnCancelFeedback?.addEventListener('click', () => this.closeFeedbackModal());
    this.modalFeedback?.addEventListener('click', (e) => {
      if (e.target === this.modalFeedback) this.closeFeedbackModal();
    });
    this.formFeedback?.addEventListener('submit', (e) => this.handleSubmitFeedback(e));
  }

  // ==================== AUTHENTICATION & LOGIN LOGIC ====================

  checkAuthState() {
    if (this.currentUser) {
      this.loadUserSession(this.currentUser);
    } else {
      this.showLoginView();
    }
  }

  handleLoginSubmit() {
    const rawValue = this.loginUsernameInput.value.trim();

    if (!rawValue) {
      this.showLoginError('Please enter a username.');
      return;
    }

    const validAlphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!validAlphanumericRegex.test(rawValue)) {
      this.showLoginError('Invalid username. Only letters and numbers are allowed (no special characters or spaces).');
      return;
    }

    // Admin Passcode Verification
    if (rawValue.toLowerCase() === 'admin') {
      if (this.loginPasscodeGroup) this.loginPasscodeGroup.style.display = 'block';
      const enteredPasscode = this.loginPasscodeInput ? this.loginPasscodeInput.value : '';
      if (!enteredPasscode) {
        this.showLoginError('Admin passcode is required.');
        this.loginPasscodeInput?.focus();
        return;
      }
      if (!Storage.validateAdminPasscode(enteredPasscode)) {
        this.showLoginError('Incorrect admin passcode.');
        this.loginPasscodeInput?.focus();
        return;
      }
    }

    this.clearLoginError();
    this.executeLogin(rawValue);
  }

  executeLogin(username) {
    const cleanUser = Storage.setCurrentUser(username);
    this.currentUser = cleanUser;
    this.loadUserSession(cleanUser);
    const label = cleanUser === 'drizzle' ? '💙 drizzle' : (cleanUser === 'xyz' ? '💛 xyz' : cleanUser);
    this.showToast(`Logged in as ${label}`, 'success');
  }

  async loadUserSession(username) {
    this.currentUser = username;
    const rawEvents = Storage.getUserSchedule(username);
    this.events = rawEvents.map((ev, idx) => ({
      ...ev,
      id: ev.id ? String(ev.id) : `evt_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
      recurring: ev.recurring !== undefined ? Boolean(ev.recurring) : true,
      isDeadline: Boolean(ev.isDeadline)
    }));

    if (this.currentUsernameDisplay) {
      if (username === 'drizzle') {
        this.currentUsernameDisplay.innerHTML = '<span class="user-heart-icon heart-blue" title="drizzle">💙</span> drizzle';
      } else if (username === 'xyz') {
        this.currentUsernameDisplay.innerHTML = '<span class="user-heart-icon heart-yellow" title="xyz">💛</span> xyz';
      } else {
        this.currentUsernameDisplay.textContent = username;
      }
    }

    // Show or hide the Admin Console button based on user identity
    if (this.btnAdminConsole) {
      this.btnAdminConsole.style.display = (username.toLowerCase() === 'admin') ? 'inline-flex' : 'none';
    }

    this.loginView.style.display = 'none';
    if (this.adminView) this.adminView.style.display = 'none';
    this.appView.style.display = 'block';

    this.renderAllViews();

    // Background Cloud Sync (Cloudflare KV)
    try {
      const cloudEvents = await Storage.fetchCloudSchedule(username);
      if (cloudEvents && Array.isArray(cloudEvents)) {
        this.events = cloudEvents;
        Storage.setUserSchedule(username, cloudEvents);
        this.renderAllViews();
        this.showToast(`Cloud synced: ${cloudEvents.length} items loaded.`, 'success');
      } else {
        // If cloud is empty, seed it with the starter schedule so other devices get it (only system starters)
        if (this.events && this.events.length > 0 && (username === 'admin' || username === 'drizzle')) {
          Storage.syncToCloud(username, this.events);
        }
      }
    } catch {
      // Operates in offline/local mode if KV binding is not yet attached
    }
  }

  openAdminView() {
    if (this.appView) this.appView.style.display = 'none';
    if (this.adminView) {
      this.adminView.style.display = 'block';
      this.adminDashboard.mount(this.adminView);
    }
  }

  closeAdminView() {
    if (this.adminView) this.adminView.style.display = 'none';
    if (this.appView) {
      this.appView.style.display = 'block';
      this.renderAllViews();
    }
  }

  logout() {
    Storage.clearCurrentUser();
    this.currentUser = null;
    this.events = [];
    this.clearUploadedImages();
    if (this.adminView) this.adminView.style.display = 'none';
    if (this.btnAdminConsole) this.btnAdminConsole.style.display = 'none';
    this.showLoginView();
    this.showToast('Logged out.', 'success');
  }

  showLoginView() {
    if (this.adminView) this.adminView.style.display = 'none';
    if (this.btnAdminConsole) this.btnAdminConsole.style.display = 'none';
    if (this.loginPasscodeGroup) {
      this.loginPasscodeGroup.style.display = 'none';
      if (this.loginPasscodeInput) this.loginPasscodeInput.value = '';
    }
    this.appView.style.display = 'none';
    this.loginView.style.display = 'flex';
    this.loginUsernameInput.value = '';
    this.clearLoginError();
    setTimeout(() => this.loginUsernameInput.focus(), 100);
  }

  showLoginError(msg) {
    this.loginErrorMsg.style.display = 'block';
    this.loginErrorMsg.textContent = msg;
  }

  clearLoginError() {
    this.loginErrorMsg.style.display = 'none';
    this.loginErrorMsg.textContent = '';
  }

  // ==================== VIEWS & RENDERING ====================

  switchTab(tabName) {
    this.activeTab = tabName;
    this.tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    this.tabContents.forEach(c => {
      const isTarget = c.id === `view-${tabName}`;
      c.style.display = isTarget ? 'block' : 'none';
      c.classList.toggle('active', isTarget);
    });

    if (tabName === 'weekly') {
      renderTimetable(this.events, this.timetableMount, {
        onEditEvent: (ev) => this.openEditEventModal(ev),
        onDeleteEvent: (id) => this.deleteEvent(id)
      });
    } else if (tabName === 'agenda') {
      renderAgenda(this.events, this.agendaMount, {
        onEditEvent: (ev) => this.openEditEventModal(ev),
        onDeleteEvent: (id) => this.deleteEvent(id)
      });
    } else if (tabName === 'table') {
      this.renderDataTable();
    } else if (tabName === 'json') {
      this.renderJsonView();
    }
  }

  async handleGenerate() {
    const text = this.promptInput.value.trim();
    const hasImages = this.uploadedImages.length > 0;

    if (!text && !hasImages) {
      this.showToast('Please type schedule notes or attach photos first.', 'error');
      this.promptInput.focus();
      return;
    }

    this.setLoading(true);

    try {
      const inputPayload = {
        text,
        images: this.uploadedImages.map(img => ({
          base64: img.base64,
          mimeType: img.type
        })),
        currentUser: this.currentUser
      };

      const extractedEvents = await parseScheduleWithGemini(inputPayload);

      if (!extractedEvents || extractedEvents.length === 0) {
        this.showToast('No events could be detected. Try phrasing with days/times or attach clearer photos.', 'error');
      } else {
        const isAppendMode = this.checkboxAppendMode ? this.checkboxAppendMode.checked : true;

        if (isAppendMode) {
          this.events = [...this.events, ...extractedEvents];
          this.showToast(`Added ${extractedEvents.length} items (${this.events.length} total).`, 'success');
        } else {
          this.events = extractedEvents;
          this.showToast(`Loaded ${extractedEvents.length} items for ${this.currentUser}.`, 'success');
        }

        this.persistEvents();
        this.renderAllViews();

        this.promptInput.value = '';
        this.clearUploadedImages();
      }
    } catch (err) {
      console.error(err);
      this.showToast(err.message || 'Error parsing schedule.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    this.btnGenerate.disabled = isLoading;
    if (isLoading) {
      this.btnGenerate.innerHTML = `<span class="spinner"></span> <span>Analyzing with AI...</span>`;
    } else {
      this.btnGenerate.innerHTML = `<span class="btn-text">Analyze & Add to Timetable</span>`;
    }
  }

  renderAllViews() {
    this.switchTab(this.activeTab);
  }

  renderDataTable() {
    this.dataTableBody.innerHTML = '';
    if (!this.events || this.events.length === 0) {
      this.dataTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No data available for ${this.currentUser}</td></tr>`;
      return;
    }

    this.events.forEach(ev => {
      const tr = document.createElement('tr');
      const daysHtml = (ev.days || []).map(d => `<span class="badge-day">${d}</span>`).join('');
      const timeRange = `${formatTime(ev.startTime)} - ${formatTime(ev.endTime)}`;

      let typeLabel = '<span class="badge-type weekly">Weekly</span>';
      if (ev.isDeadline) {
        typeLabel = '<span class="badge-type deadline">Deadline</span>';
      } else if (ev.recurring === false) {
        typeLabel = '<span class="badge-type onetime">One-Time</span>';
      }

      const dateDisplay = ev.date ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${ev.date}</div>` : '';

      tr.innerHTML = `
        <td class="cell-event-title" title="${this.escape(ev.title)}">
          <div class="table-title-row">
            <span class="color-dot" style="background-color: ${ev.color || '#6366f1'}"></span>
            <span class="event-title-text">${this.escape(ev.title)}</span>
          </div>
        </td>
        <td class="cell-type">${typeLabel}</td>
        <td class="cell-days">
          ${daysHtml}
          ${dateDisplay}
        </td>
        <td class="cell-time" style="font-family: var(--font-mono); font-size: 0.82rem;">${timeRange}</td>
        <td class="cell-cat"><span class="event-category-tag" style="background: ${ev.color}22; color: ${ev.color}">${this.escape(ev.category)}</span></td>
        <td class="cell-location" title="${this.escape(ev.location)}">${this.escape(ev.location) || '<span style="color: var(--text-muted);">-</span>'}</td>
        <td class="cell-notes" title="${this.escape(ev.notes)}">${this.escape(ev.notes) || '<span style="color: var(--text-muted);">-</span>'}</td>
        <td class="cell-link">
          ${ev.url ? `<a href="${this.escape(ev.url)}" target="_blank" rel="noopener noreferrer" class="table-link-chip" title="${this.escape(ev.url)}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> <span>Open ↗</span></a>` : '<span style="color: var(--text-muted);">-</span>'}
        </td>
        <td class="cell-actions" style="text-align: right;">
          <button class="btn-agenda-action edit-btn" style="margin-right: 4px;">Edit</button>
          <button class="btn-agenda-action delete-btn" style="color: var(--accent-rose);">Delete</button>
        </td>
      `;

      tr.querySelector('.edit-btn')?.addEventListener('click', () => this.openEditEventModal(ev));
      tr.querySelector('.delete-btn')?.addEventListener('click', () => this.deleteEvent(ev.id));

      this.dataTableBody.appendChild(tr);
    });
  }

  renderJsonView() {
    this.jsonCodeBox.textContent = JSON.stringify(this.events, null, 2);
  }

  async handleExportPng() {
    if (this.activeTab !== 'weekly') {
      this.switchTab('weekly');
    }

    this.showToast('Rendering high-res graphic...', 'success');
    try {
      await exportToImage('timetable-export-target', `sked-${this.currentUser}-timetable-${Date.now()}.png`);
      this.showToast('PNG graphic downloaded.', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ==================== EVENT MODAL HANDLERS ====================

  openAddEventModal() {
    this.currentEditingId = null;
    this.modalEventTitle.textContent = `Add Event (${this.currentUser})`;
    this.formEvent.reset();
    document.getElementById('event-id').value = '';
    document.getElementById('event-start-time').value = '09:00';
    document.getElementById('event-end-time').value = '10:00';
    document.getElementById('event-color').value = '#6366f1';
    document.getElementById('event-url').value = '';
    this.selectRepeatType.value = 'weekly';
    this.groupEventDate.style.display = 'none';
    this.inputEventDate.value = '';
    
    if (this.btnDeleteModalEvent) {
      this.btnDeleteModalEvent.style.display = 'none';
    }

    document.querySelectorAll('input[name="event-day"]').forEach(cb => {
      cb.checked = cb.value === 'Mon';
    });

    this.modalEvent.classList.add('open');
  }

  openEditEventModal(ev) {
    this.currentEditingId = ev.id;
    this.modalEventTitle.textContent = `Edit Event (${this.currentUser})`;
    document.getElementById('event-id').value = ev.id;
    document.getElementById('event-title-input').value = ev.title;
    document.getElementById('event-start-time').value = ev.startTime;
    document.getElementById('event-end-time').value = ev.endTime;
    document.getElementById('event-category').value = ev.category || 'General';
    document.getElementById('event-color').value = ev.color || '#6366f1';
    document.getElementById('event-location').value = ev.location || '';
    document.getElementById('event-notes').value = ev.notes || '';
    document.getElementById('event-url').value = ev.url || '';

    if (this.btnDeleteModalEvent) {
      this.btnDeleteModalEvent.style.display = 'inline-flex';
    }

    // Repeat type
    if (ev.isDeadline) {
      this.selectRepeatType.value = 'deadline';
      this.groupEventDate.style.display = 'flex';
    } else if (ev.recurring === false) {
      this.selectRepeatType.value = 'onetime';
      this.groupEventDate.style.display = 'flex';
    } else {
      this.selectRepeatType.value = 'weekly';
      this.groupEventDate.style.display = 'none';
    }

    this.inputEventDate.value = ev.date || '';

    const days = ev.days || [];
    document.querySelectorAll('input[name="event-day"]').forEach(cb => {
      cb.checked = days.includes(cb.value);
    });

    this.modalEvent.classList.add('open');
  }

  closeEventModal() {
    this.modalEvent.classList.remove('open');
  }

  handleSaveEvent(e) {
    e.preventDefault();

    const rawId = document.getElementById('event-id').value;
    const id = rawId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const title = document.getElementById('event-title-input').value.trim();
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const category = document.getElementById('event-category').value;
    const color = document.getElementById('event-color').value;
    const location = document.getElementById('event-location').value.trim();
    const notes = document.getElementById('event-notes').value.trim();
    const url = (document.getElementById('event-url').value || '').trim();

    const repeatType = this.selectRepeatType.value;
    const recurring = repeatType === 'weekly';
    const isDeadline = repeatType === 'deadline';
    const date = this.inputEventDate.value || '';

    const selectedDays = [];
    document.querySelectorAll('input[name="event-day"]:checked').forEach(cb => {
      selectedDays.push(cb.value);
    });

    if (selectedDays.length === 0) {
      this.showToast('Please select at least one day.', 'error');
      return;
    }

    const eventObj = {
      id,
      title,
      days: selectedDays,
      recurring,
      isDeadline,
      date,
      startTime,
      endTime,
      category,
      color,
      location,
      notes,
      url
    };

    const existingIndex = this.events.findIndex(e => e && String(e.id) === String(id));
    if (existingIndex >= 0) {
      this.events[existingIndex] = eventObj;
      this.showToast('Event updated.', 'success');
    } else {
      this.events.push(eventObj);
      this.showToast('Event added.', 'success');
    }

    this.persistEvents();
    this.closeEventModal();
    this.renderAllViews();
  }

  deleteEvent(id) {
    if (!id) {
      console.warn('Cannot delete event: no ID provided');
      return;
    }
    if (confirm('Delete this event?')) {
      const targetIdStr = String(id);
      const index = this.events.findIndex(e => e && String(e.id) === targetIdStr);
      if (index !== -1) {
        this.events.splice(index, 1);
        this.persistEvents();
        this.renderAllViews();
        this.showToast('Event deleted.', 'success');
      } else {
        this.events = this.events.filter(e => e && String(e.id) !== targetIdStr);
        this.persistEvents();
        this.renderAllViews();
        this.showToast('Event deleted.', 'success');
      }
    }
  }

  async persistEvents() {
    Storage.setUserSchedule(this.currentUser, this.events);
    const synced = await Storage.syncToCloud(this.currentUser, this.events);
    if (synced) {
      this.showToast('Changes saved to cloud.', 'success');
    }
  }

  // ==================== FEEDBACK / SUGGESTION MODAL ====================

  openFeedbackModal() {
    this.modalFeedback?.classList.add('open');
    setTimeout(() => this.feedbackMessage?.focus(), 150);
  }

  closeFeedbackModal() {
    this.modalFeedback?.classList.remove('open');
  }

  async handleSubmitFeedback(e) {
    e.preventDefault();
    const msg = this.feedbackMessage.value.trim();
    if (!msg) {
      this.showToast('Please type a message before sending.', 'error');
      return;
    }

    const type = this.feedbackType.value;
    const username = this.currentUser || 'Anonymous';

    this.btnSubmitFeedback.disabled = true;
    this.btnSubmitFeedback.innerHTML = '<span class="spinner"></span> <span>Sending...</span>';

    try {
      // Log to local feedback inbox for Admin Hub
      Storage.saveFeedbackSubmission({
        username,
        type,
        message: msg,
        timestamp: new Date().toLocaleString(),
        status: 'New'
      });

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, type, message: msg })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send feedback.');
      }

      this.closeFeedbackModal();
      this.formFeedback.reset();
      this.showToast('Your feedback has been submitted! Thank you!', 'success');
    } catch (err) {
      console.error(err);
      this.showToast(err.message || 'Error submitting feedback.', 'error');
    } finally {
      this.btnSubmitFeedback.disabled = false;
      this.btnSubmitFeedback.innerHTML = '<span>Submit Feedback</span>';
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${this.escape(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.skedApp = new SkedApp();
});
