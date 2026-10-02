// Sked AI - Application Orchestrator with Multimodal Vision, Deadlines & Clean Professional UI

import { Storage } from './storage.js';
import { parseScheduleWithGemini } from './gemini.js';
import { renderTimetable, renderAgenda, formatTime } from './timetable.js';
import { exportToImage, exportToIcs, exportToCsv, exportToJson } from './exporter.js';

class SkedApp {
  constructor() {
    this.currentUser = Storage.getCurrentUser();
    this.events = [];
    this.settings = Storage.getSettings();
    this.activeTab = 'weekly';

    // Image state
    this.currentImageBase64 = null;
    this.currentImageMimeType = null;

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
    this.loginErrorMsg = document.getElementById('login-error-msg');
    this.btnQuickLogins = document.querySelectorAll('.btn-quick-login');

    // 2. Main App View Elements
    this.appView = document.getElementById('app-view');
    this.currentUsernameDisplay = document.getElementById('current-username-display');
    this.btnLogout = document.getElementById('btn-logout');

    // Prompt & Image Upload Elements
    this.promptInput = document.getElementById('prompt-input');
    this.btnGenerate = document.getElementById('btn-generate');
    this.btnClearPrompt = document.getElementById('btn-clear-prompt');
    this.checkboxAppendMode = document.getElementById('checkbox-append-mode');
    
    this.imageFileInput = document.getElementById('image-file-input');
    this.imageDropzone = document.getElementById('image-dropzone');
    this.imagePreviewContainer = document.getElementById('image-preview-container');
    this.imagePreviewImg = document.getElementById('image-preview-img');
    this.imagePreviewName = document.getElementById('image-preview-name');
    this.imagePreviewSize = document.getElementById('image-preview-size');
    this.btnRemoveImage = document.getElementById('btn-remove-image');

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
    this.btnCopyJson = document.getElementById('btn-copy-json');
    this.btnDownloadJson = document.getElementById('btn-download-json');
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
    this.imageDropzone.addEventListener('click', () => {
      this.imageFileInput.click();
    });

    this.imageDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.imageFileInput.click();
      }
    });

    this.imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.processUploadedFile(file);
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.imageDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.imageDropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.imageDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.imageDropzone.classList.remove('drag-active');
      });
    });

    this.imageDropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        this.processUploadedFile(file);
      }
    });

    this.btnRemoveImage.addEventListener('click', () => {
      this.clearUploadedImage();
    });
  }

  processUploadedFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showToast('Please upload an image file (PNG, JPG, WEBP)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showToast('Image size exceeds 10MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result;
      this.currentImageBase64 = resultStr.split(',')[1];
      this.currentImageMimeType = file.type;

      this.imagePreviewImg.src = resultStr;
      this.imagePreviewName.textContent = file.name;
      this.imagePreviewSize.textContent = this.formatFileSize(file.size);

      this.imageDropzone.style.display = 'none';
      this.imagePreviewContainer.style.display = 'flex';
      this.showToast('Image attached. Ready to analyze.', 'success');
    };
    reader.onerror = () => {
      this.showToast('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  }

  clearUploadedImage() {
    this.currentImageBase64 = null;
    this.currentImageMimeType = null;
    this.imageFileInput.value = '';
    this.imagePreviewImg.src = '';
    this.imagePreviewContainer.style.display = 'none';
    this.imageDropzone.style.display = 'flex';
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

    // Real-time input validation: disallow special characters
    this.loginUsernameInput.addEventListener('input', () => {
      const val = this.loginUsernameInput.value;
      if (val && !/^[a-zA-Z0-9]+$/.test(val)) {
        this.showLoginError('Special characters and spaces are not allowed. Only letters and numbers.');
      } else {
        this.clearLoginError();
      }
    });

    // Quick Login buttons (drizzle and admin)
    this.btnQuickLogins.forEach(btn => {
      btn.addEventListener('click', () => {
        const user = btn.dataset.user;
        this.loginUsernameInput.value = user;
        this.clearLoginError();
        this.executeLogin(user);
      });
    });

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

    this.clearLoginError();
    this.executeLogin(rawValue);
  }

  executeLogin(username) {
    const cleanUser = Storage.setCurrentUser(username);
    this.currentUser = cleanUser;
    this.loadUserSession(cleanUser);
    this.showToast(`Logged in as ${cleanUser}`, 'success');
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
      this.currentUsernameDisplay.textContent = username;
    }

    this.loginView.style.display = 'none';
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
        // If cloud is empty, seed it with the starter schedule so other devices get it
        if (this.events && this.events.length > 0) {
          Storage.syncToCloud(username, this.events);
        }
      }
    } catch {
      // Operates in offline/local mode if KV binding is not yet attached
    }
  }

  logout() {
    Storage.clearCurrentUser();
    this.currentUser = null;
    this.events = [];
    this.clearUploadedImage();
    this.showLoginView();
    this.showToast('Logged out.', 'success');
  }

  showLoginView() {
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
    const hasImage = !!this.currentImageBase64;

    if (!text && !hasImage) {
      this.showToast('Please type notes or upload a schedule image first.', 'error');
      this.promptInput.focus();
      return;
    }

    this.setLoading(true);

    try {
      const inputPayload = {
        text,
        imageBase64: this.currentImageBase64,
        imageMimeType: this.currentImageMimeType
      };

      const extractedEvents = await parseScheduleWithGemini(inputPayload);

      if (!extractedEvents || extractedEvents.length === 0) {
        this.showToast('No events could be detected. Try phrasing with days/times or upload a clearer image.', 'error');
      } else {
        const isAppendMode = this.checkboxAppendMode ? this.checkboxAppendMode.checked : true;

        if (isAppendMode) {
          this.events = [...this.events, ...extractedEvents];
          this.showToast(`Added ${extractedEvents.length} items (${this.events.length} total).`, 'success');
        } else {
          this.events = extractedEvents;
          this.showToast(`Loaded ${extractedEvents.length} new items for ${this.currentUser}.`, 'success');
        }

        this.persistEvents();
        this.renderAllViews();

        this.promptInput.value = '';
        this.clearUploadedImage();
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
        <td style="font-weight: 700;">
          <span class="color-dot" style="background-color: ${ev.color || '#6366f1'}"></span>
          ${this.escape(ev.title)}
        </td>
        <td>${typeLabel}</td>
        <td>
          ${daysHtml}
          ${dateDisplay}
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem;">${timeRange}</td>
        <td><span class="event-category-tag" style="background: ${ev.color}22; color: ${ev.color}">${this.escape(ev.category)}</span></td>
        <td>${this.escape(ev.location) || '<span style="color: var(--text-muted);">-</span>'}</td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${this.escape(ev.notes) || '<span style="color: var(--text-muted);">-</span>'}</td>
        <td style="text-align: right;">
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
      notes
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
