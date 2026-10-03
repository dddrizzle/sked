// Export Suite: PNG Graphic, .ics Calendar file, CSV, and JSON

export async function exportToImage(elementId, filename = 'sked-timetable.png') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Timetable element not found to capture.');
  }

  // Ensure html2canvas is available
  if (typeof window.html2canvas === 'undefined') {
    await loadHtml2Canvas();
  }

  // Visual polish for screenshot: add temporary export styling and hide "TODAY" highlight
  const prevOverflow = element.style.overflow;
  element.style.overflow = 'visible';
  element.classList.add('is-exporting');

  try {
    const canvas = await window.html2canvas(element, {
      scale: 2, // 2x retina crisp resolution
      useCORS: true,
      backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#0f172a',
      logging: false
    });

    element.style.overflow = prevOverflow;
    element.classList.remove('is-exporting');

    // Trigger download
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return true;
  } catch (err) {
    element.style.overflow = prevOverflow;
    element.classList.remove('is-exporting');
    console.error('Snapshot failed:', err);
    throw new Error('Failed to generate image. Please try again.');
  }
}

function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load html2canvas library from CDN.'));
    document.head.appendChild(script);
  });
}

// Generate .ics (iCalendar) file compatible with Google, Apple, and Outlook Calendars
export function exportToIcs(events, filename = 'sked-schedule.ics') {
  if (!events || events.length === 0) {
    throw new Error('No events to export.');
  }

  const DAY_MAP_ICS = {
    'Mon': 'MO',
    'Tue': 'TU',
    'Wed': 'WE',
    'Thu': 'TH',
    'Fri': 'FR',
    'Sat': 'SA',
    'Sun': 'SU'
  };

  // Base date for recurring reference: next Monday
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sked AI//Schedule Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach((ev, idx) => {
    const [sH, sM] = ev.startTime.split(':');
    const [eH, eM] = ev.endTime.split(':');

    // Find the first occurrence day
    const firstDay = ev.days && ev.days.length > 0 ? ev.days[0] : 'Mon';
    const dayOffsets = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
    const eventDate = new Date(nextMonday);
    eventDate.setDate(nextMonday.getDate() + (dayOffsets[firstDay] || 0));

    const y = eventDate.getFullYear();
    const m = String(eventDate.getMonth() + 1).padStart(2, '0');
    const d = String(eventDate.getDate()).padStart(2, '0');

    const dtStart = `${y}${m}${d}T${sH}${sM}00`;
    const dtEnd = `${y}${m}${d}T${eH}${eM}00`;

    const byDays = (ev.days || ['Mon']).map(d => DAY_MAP_ICS[d] || 'MO').join(',');

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:sked-${Date.now()}-${idx}@sked.local`);
    icsContent.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    icsContent.push(`DTSTART:${dtStart}`);
    icsContent.push(`DTEND:${dtEnd}`);
    icsContent.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDays}`);
    icsContent.push(`SUMMARY:${escapeIcs(ev.title)}`);
    if (ev.location) icsContent.push(`LOCATION:${escapeIcs(ev.location)}`);
    if (ev.notes) icsContent.push(`DESCRIPTION:${escapeIcs(ev.notes)}`);
    if (ev.category) icsContent.push(`CATEGORIES:${escapeIcs(ev.category)}`);
    if (ev.url) icsContent.push(`URL:${escapeIcs(ev.url)}`);
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  triggerDownload(blob, filename);
}

// Export raw JSON
export function exportToJson(events, filename = 'sked-data.json') {
  const jsonStr = JSON.stringify(events, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerDownload(blob, filename);
}

// Export CSV
export function exportToCsv(events, filename = 'sked-schedule.csv') {
  const headers = ['Title', 'Days', 'Start Time', 'End Time', 'Category', 'Location', 'Notes', 'Link / URL'];
  const rows = events.map(ev => [
    `"${(ev.title || '').replace(/"/g, '""')}"`,
    `"${(ev.days || []).join(', ')}"`,
    `"${ev.startTime}"`,
    `"${ev.endTime}"`,
    `"${(ev.category || '').replace(/"/g, '""')}"`,
    `"${(ev.location || '').replace(/"/g, '""')}"`,
    `"${(ev.notes || '').replace(/"/g, '""')}"`,
    `"${(ev.url || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
}
