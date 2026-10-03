// Timetable Grid and Daily Agenda Renderer (Clean, Professional, Non-repeating task support)

const ALL_DAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_DAYS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_LABELS = {
  'Mon': 'Monday',
  'Tue': 'Tuesday',
  'Wed': 'Wednesday',
  'Thu': 'Thursday',
  'Fri': 'Friday',
  'Sat': 'Saturday',
  'Sun': 'Sunday'
};

export function renderTimetable(events, containerEl, options = {}) {
  const {
    timeFormat = '12h',
    weekStart = 'Mon',
    onEditEvent = null,
    onDeleteEvent = null
  } = options;

  containerEl.innerHTML = '';

  if (!events || events.length === 0) {
    containerEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h3>No schedule items yet</h3>
        <p>Type notes or upload a schedule image above to generate your timetable.</p>
      </div>
    `;
    return;
  }

  const daysOrder = weekStart === 'Sun' ? ALL_DAYS_SUN : ALL_DAYS_MON;

  // Calculate hour boundaries
  let minHour = 24;
  let maxHour = 0;

  events.forEach(ev => {
    const sH = parseInt(ev.startTime.split(':')[0], 10);
    const eH = parseInt(ev.endTime.split(':')[0], 10);
    const eM = parseInt(ev.endTime.split(':')[1], 10);
    if (sH < minHour) minHour = sH;
    if (eH > maxHour) maxHour = eM > 0 ? eH + 1 : eH;
  });

  // Clamp boundaries to reasonable display
  const startHour = Math.max(0, Math.min(minHour - 1, 8));
  const endHour = Math.min(24, Math.max(maxHour + 1, 19));
  const totalHours = endHour - startHour;

  // Build Grid DOM
  const gridWrapper = document.createElement('div');
  gridWrapper.className = 'timetable-wrapper';
  gridWrapper.id = 'timetable-export-target';

  // Grid Header (Days)
  const headerRow = document.createElement('div');
  headerRow.className = 'timetable-header-row';

  // Corner time label
  const cornerCell = document.createElement('div');
  cornerCell.className = 'timetable-corner-cell';
  cornerCell.innerHTML = `<span>TIME</span>`;
  headerRow.appendChild(cornerCell);

  const todayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
  const todayCode = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][todayIndex];

  daysOrder.forEach(day => {
    const dayCol = document.createElement('div');
    dayCol.className = `timetable-header-cell ${day === todayCode ? 'is-today' : ''}`;
    dayCol.innerHTML = `
      <span class="day-short">${day}</span>
      <span class="day-full">${DAY_LABELS[day]}</span>
      ${day === todayCode ? '<span class="today-badge">TODAY</span>' : ''}
    `;
    headerRow.appendChild(dayCol);
  });

  gridWrapper.appendChild(headerRow);

  // Grid Body
  const bodyEl = document.createElement('div');
  bodyEl.className = 'timetable-body';

  // Time Column
  const timeCol = document.createElement('div');
  timeCol.className = 'timetable-time-col';

  for (let h = startHour; h < endHour; h++) {
    const timeSlot = document.createElement('div');
    timeSlot.className = 'timetable-time-slot';
    timeSlot.textContent = formatHour(h, timeFormat);
    timeCol.appendChild(timeSlot);
  }
  bodyEl.appendChild(timeCol);

  // Day Columns
  const columnsContainer = document.createElement('div');
  columnsContainer.className = 'timetable-days-container';

  daysOrder.forEach(day => {
    const dayColumn = document.createElement('div');
    dayColumn.className = `timetable-day-column ${day === todayCode ? 'is-today' : ''}`;
    dayColumn.dataset.day = day;

    // Background Hour Lines
    for (let h = startHour; h < endHour; h++) {
      const line = document.createElement('div');
      line.className = 'timetable-hour-slot';
      dayColumn.appendChild(line);
    }

    // Filter events for this day
    const dayEvents = events.filter(e => e.days && e.days.includes(day));

    // Calculate layout for overlapping events
    const layoutEvents = computeEventLayout(dayEvents);

    layoutEvents.forEach(ev => {
      const sH = parseInt(ev.startTime.split(':')[0], 10);
      const sM = parseInt(ev.startTime.split(':')[1], 10);
      const eH = parseInt(ev.endTime.split(':')[0], 10);
      const eM = parseInt(ev.endTime.split(':')[1], 10);

      const startMinutesFromBase = (sH - startHour) * 60 + sM;
      const durationMinutes = Math.max(25, (eH * 60 + eM) - (sH * 60 + sM));
      const totalMinutes = totalHours * 60;

      const topPercent = Math.max(0, (startMinutesFromBase / totalMinutes) * 100);
      const heightPercent = Math.min(100 - topPercent, (durationMinutes / totalMinutes) * 100);

      const eventBlock = document.createElement('div');
      eventBlock.className = 'timetable-event-block';
      if (ev.isDeadline) eventBlock.classList.add('is-deadline');
      if (ev.recurring === false) eventBlock.classList.add('is-one-time');

      eventBlock.style.top = `${topPercent}%`;
      eventBlock.style.height = `${heightPercent}%`;
      eventBlock.style.backgroundColor = ev.color || '#6366f1';
      eventBlock.style.borderColor = adjustColorBrightness(ev.color || '#6366f1', -20);

      if (ev.totalColumns > 1) {
        eventBlock.classList.add('is-overlapping');
        const widthPercent = (100 / ev.totalColumns);
        const leftPercent = ev.columnPosition * widthPercent;
        eventBlock.style.width = `calc(${widthPercent}% - 3px)`;
        eventBlock.style.left = `calc(${leftPercent}% + 1px)`;
        eventBlock.style.zIndex = `${2 + ev.columnPosition}`;
      }

      const formattedTimeRange = `${formatTime(ev.startTime, timeFormat)} - ${formatTime(ev.endTime, timeFormat)}`;

      // Type Badge (Recurring vs One-Time / Deadline)
      let typeBadgeHtml = '';
      if (ev.isDeadline) {
        typeBadgeHtml = '<span class="event-badge deadline">Deadline</span>';
      } else if (ev.recurring === false) {
        typeBadgeHtml = '<span class="event-badge onetime">One-Time</span>';
      }

      const dateHtml = ev.date ? `<span class="event-date-tag">${escapeHtml(ev.date)}</span>` : '';

      eventBlock.innerHTML = `
        <div class="event-block-inner">
          <div class="event-header-row">
            <span class="event-time-pill">${formattedTimeRange}</span>
            ${typeBadgeHtml}
          </div>
          <div class="event-title">${escapeHtml(ev.title)}</div>
          ${ev.location ? `<div class="event-location">${escapeHtml(ev.location)}</div>` : ''}
          <div class="event-tags-row">
            ${ev.category ? `<span class="event-category-tag">${escapeHtml(ev.category)}</span>` : ''}
            ${dateHtml}
            ${ev.url ? `<a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener noreferrer" class="event-url-chip" title="Open resource / submission bin: ${escapeHtml(ev.url)}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Link ↗</span></a>` : ''}
          </div>
        </div>
      `;

      eventBlock.querySelector('.event-url-chip')?.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      eventBlock.addEventListener('click', () => {
        if (onEditEvent) onEditEvent(ev);
      });

      dayColumn.appendChild(eventBlock);
    });

    columnsContainer.appendChild(dayColumn);
  });

  bodyEl.appendChild(columnsContainer);
  gridWrapper.appendChild(bodyEl);
  containerEl.appendChild(gridWrapper);
}

// Render Daily Agenda / Timeline View
export function renderAgenda(events, containerEl, options = {}) {
  const {
    timeFormat = '12h',
    weekStart = 'Mon',
    onEditEvent = null,
    onDeleteEvent = null
  } = options;

  containerEl.innerHTML = '';

  if (!events || events.length === 0) {
    containerEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </div>
        <h3>No schedule items to show</h3>
        <p>Generate a schedule to view your day-by-day agenda.</p>
      </div>
    `;
    return;
  }

  const standardWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIndex = new Date().getDay();
  const todayCode = standardWeek[todayIndex];

  // Daily Agenda starts with current day at the very top, and continues in chronological order
  const daysOrder = [];
  for (let i = 0; i < 7; i++) {
    daysOrder.push(standardWeek[(todayIndex + i) % 7]);
  }

  const agendaWrapper = document.createElement('div');
  agendaWrapper.className = 'agenda-wrapper';

  daysOrder.forEach(day => {
    const dayEvents = events
      .filter(e => e.days && e.days.includes(day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const isToday = day === todayCode;

    // For other days, skip if empty. For TODAY, always render so the user sees today's highlighted agenda!
    if (dayEvents.length === 0 && !isToday) return;

    const daySection = document.createElement('div');
    daySection.className = `agenda-day-section ${isToday ? 'is-today' : ''}`;

    const countLabel = dayEvents.length === 0
      ? '<span class="agenda-day-count free">0 items</span>'
      : `<span class="agenda-day-count">${dayEvents.length} ${dayEvents.length === 1 ? 'item' : 'items'}</span>`;

    daySection.innerHTML = `
      <div class="agenda-day-header">
        <h4>${DAY_LABELS[day]} ${isToday ? '<span class="agenda-today-pill">Today</span>' : ''}</h4>
        ${countLabel}
      </div>
      <div class="agenda-events-list"></div>
    `;

    const listEl = daySection.querySelector('.agenda-events-list');

    if (dayEvents.length === 0 && isToday) {
      listEl.innerHTML = `
        <div class="agenda-free-day-card">
          <span class="free-day-icon">✨</span>
          <div class="free-day-text">No commitments scheduled for today. Enjoy your day!</div>
        </div>
      `;
    } else {
      dayEvents.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'agenda-event-card';
        if (ev.isDeadline) item.classList.add('is-deadline');
        if (ev.recurring === false) item.classList.add('is-one-time');

        item.style.borderLeftColor = ev.color || '#6366f1';

        const timeRange = `${formatTime(ev.startTime, timeFormat)} – ${formatTime(ev.endTime, timeFormat)}`;

        let repeatLabel = '';
        if (ev.isDeadline) {
          repeatLabel = '<span class="agenda-type-badge deadline">Deadline</span>';
        } else if (ev.recurring === false) {
          repeatLabel = '<span class="agenda-type-badge onetime">One-Time</span>';
        }

        const dateMeta = ev.date ? `<div class="agenda-card-date">Date: ${escapeHtml(ev.date)}</div>` : '';

        item.innerHTML = `
          <div class="agenda-card-time">
            <span>${timeRange}</span>
            ${repeatLabel}
          </div>
          <div class="agenda-card-body">
            <div class="agenda-card-title">${escapeHtml(ev.title)}</div>
            ${dateMeta}
            ${ev.location ? `<div class="agenda-card-meta">Location: ${escapeHtml(ev.location)}</div>` : ''}
            ${ev.notes ? `<div class="agenda-card-notes">${escapeHtml(ev.notes)}</div>` : ''}
            ${ev.url ? `<div class="agenda-card-url"><a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener noreferrer" class="agenda-redirect-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Open Submission Bin / Doc ↗</span></a></div>` : ''}
            ${ev.category ? `<span class="event-category-tag" style="background-color: ${ev.color}22; color: ${ev.color}">${escapeHtml(ev.category)}</span>` : ''}
          </div>
          <div class="agenda-card-actions">
            <button class="btn-agenda-action edit" data-id="${ev.id}">Edit</button>
            <button class="btn-agenda-action delete" data-id="${ev.id}">Delete</button>
          </div>
        `;

        item.querySelector('.edit')?.addEventListener('click', () => onEditEvent && onEditEvent(ev));
        item.querySelector('.delete')?.addEventListener('click', () => onDeleteEvent && onDeleteEvent(ev.id));

        listEl.appendChild(item);
      });
    }

    agendaWrapper.appendChild(daySection);
  });

  containerEl.appendChild(agendaWrapper);
}

// Compute overlapping columns for timetable display
function computeEventLayout(events) {
  if (!events || events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const groups = [];

  sorted.forEach(ev => {
    let placed = false;
    for (const group of groups) {
      const overlaps = group.some(other => {
        return (ev.startTime < other.endTime && ev.endTime > other.startTime);
      });
      if (overlaps) {
        group.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([ev]);
    }
  });

  const result = [];
  groups.forEach(group => {
    const totalCols = group.length;
    group.forEach((ev, idx) => {
      result.push({
        ...ev,
        columnPosition: idx,
        totalColumns: totalCols
      });
    });
  });

  return result;
}

export function formatTime(time24, format = '12h') {
  if (!time24) return '';
  if (format === '24h') return time24;

  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

export function formatHour(hour, format = '12h') {
  if (format === '24h') {
    return `${String(hour).padStart(2, '0')}:00`;
  }
  const ampm = hour >= 12 ? 'PM' : 'AM';
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h} ${ampm}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adjustColorBrightness(hex, percent) {
  let num = parseInt(hex.replace('#', ''), 16);
  let amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let B = ((num >> 8) & 0x00FF) + amt;
  let G = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
}
