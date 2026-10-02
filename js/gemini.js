// Gemini API Integration for Multilingual Natural Language & Multimodal Image Schedule Parsing
import { CONFIG } from './config.js';

export async function parseScheduleWithGemini(input, apiKey, model = CONFIG.DEFAULT_MODEL) {
  const activeKey = apiKey || CONFIG.GEMINI_API_KEY;

  if (!activeKey || !activeKey.trim()) {
    throw new Error('Gemini API key is not configured in js/config.js. Please paste your key into js/config.js to enable AI extraction.');
  }

  // Support both string input or object input { text, imageBase64, imageMimeType }
  const naturalText = typeof input === 'string' ? input : (input.text || '');
  const imageBase64 = typeof input === 'object' ? input.imageBase64 : null;
  const imageMimeType = typeof input === 'object' ? input.imageMimeType : 'image/jpeg';

  if (!naturalText.trim() && !imageBase64) {
    throw new Error('Please enter some text or upload an image of your schedule.');
  }

  // Cascade list: try default model, then fallbacks
  const fallbacks = CONFIG.FALLBACK_MODELS || ['gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-3.5-flash'];
  const modelsToTry = [model || CONFIG.DEFAULT_MODEL, ...fallbacks].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError = null;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`[Sked AI] Analyzing schedule with model: ${currentModel}...`);
      return await executeGeminiRequest({ naturalText, imageBase64, imageMimeType }, activeKey, currentModel);
    } catch (err) {
      lastError = err;
      const msg = (err.message || '').toLowerCase();
      // Retryable errors: 503 high demand, 404 deprecated/not found, 429 rate limit, 500 server error
      const isRetryable = msg.includes('503') || 
                          msg.includes('high demand') || 
                          msg.includes('404') || 
                          msg.includes('not found') || 
                          msg.includes('no longer available') ||
                          msg.includes('429') ||
                          msg.includes('resource_exhausted') ||
                          msg.includes('500');

      if (isRetryable) {
        console.warn(`[Sked AI] Model ${currentModel} encountered temporary issue (${err.message}). Trying fallback model...`);
        continue;
      }

      // Non-retryable error (e.g. invalid API key)
      throw err;
    }
  }

  throw lastError || new Error('Failed to analyze schedule with Gemini.');
}

async function executeGeminiRequest({ naturalText, imageBase64, imageMimeType }, apiKey, model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  // Current local time reference for relative calculations
  const now = new Date();
  const dayCodes = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayCode = dayCodes[now.getDay()];
  const currentDayName = dayNames[now.getDay()];
  const currentTime24 = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDateStr = now.toISOString().split('T')[0];
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';

  const systemInstruction = `You are a world-class schedule and timetable analysis assistant with computer vision capabilities.
Your job is to read user input from text in ANY language (English, Spanish, Tagalog, Japanese, German, French, Chinese, Arabic, etc.) AND/OR examine attached timetable images (class schedules, matriculation forms, screenshots of calendars, handwritten routine photos, syllabi), extract all events, routines, classes, meetings, and habits, and structure them into a clean JSON timetable dataset.

CURRENT REFERENCE TIME (CRITICAL FOR RELATIVE TIMES):
- Today is ${currentDayName} (${currentDayCode}), ${currentDateStr} at ${currentTime24} (Timezone: ${userTimezone}).
- If the user uses relative time phrases (e.g., "in 2 hours", "2 hours from now", "in 45 minutes", "tomorrow at 3pm", "tonight at 8"), calculate the exact start time and day based on this reference time (${currentTime24} on ${currentDayCode}).
- For example: if current time is 19:40 and the prompt says "study session 2 hours from now for 1 hour", the startTime MUST be 21:40 and endTime 22:40 on ${currentDayCode}.

RECURRENCE RULES (DEFAULT IS RECURRING):
- DEFAULT: Set "recurring": true (repeating weekly routine or class) by default for all schedules UNLESS explicitly stated otherwise as a one-time event, deadline, date, or appointment (e.g. "due Friday", "exam on Oct 20", "one-time", "dentist tomorrow", "appointment").
- Only set "recurring": false if it is clearly a one-time event, date, or submission.
- Set "isDeadline": true if it is a project due date, assignment submission, or deadline.

Schema Rules:
1. "days": Array of 3-letter day codes: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].
   - Translate colloquial phrases & abbreviations:
     - "MWF" or "Mon/Wed/Fri" -> ["Mon", "Wed", "Fri"]
     - "TTh" or "Tue/Thu" -> ["Tue", "Thu"]
     - "Weekdays" -> ["Mon", "Tue", "Wed", "Thu", "Fri"]
     - "Weekends" -> ["Sat", "Sun"]
     - "Daily" or "every day" -> ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
   - For one-time events or deadlines (e.g. "due this Friday" or "tomorrow"), set the single corresponding day code: e.g. ["Fri"].
2. "recurring": boolean (default true).
3. "isDeadline": boolean. true if it represents a due date, deadline, or submission.
4. "date": string in YYYY-MM-DD format if a specific date is mentioned, otherwise "".
5. "startTime" & "endTime": Must be in 24-hour "HH:MM" format (e.g. "07:00", "09:30", "14:00", "20:30").
   - If duration is stated (e.g., "starts at 3pm for 90 minutes"), calculate endTime ("16:30").
   - For deadlines without explicit start (e.g. "due at 5pm"), set startTime to 30 mins before due time (e.g. "16:30" to "17:00").
   - If no endTime is stated, assume 1 hour duration.
6. "title": Short, descriptive event name.
7. "category": Choose one of: "Academic", "Fitness", "Work", "Study", "Personal", "Social", "Chore".
8. "color": Assign an appropriate modern hex color:
   - "Academic": "#6366f1"
   - "Fitness": "#10b981"
   - "Work": "#f59e0b"
   - "Study": "#ec4899"
   - "Personal": "#8b5cf6"
   - "Social": "#06b6d4"
   - "Chore": "#64748b"
   - If "isDeadline": "#f43f5e"
9. "location": Physical room, building, or platform if visible or mentioned, otherwise "".
10. "notes": Any additional details, section numbers, professor name, reminders.

Return ONLY a valid JSON object matching this schema:
{
  "events": [
    {
      "id": "evt-1",
      "title": "Calculus 101",
      "days": ["Mon", "Wed", "Fri"],
      "recurring": true,
      "isDeadline": false,
      "date": "",
      "startTime": "09:00",
      "endTime": "10:30",
      "category": "Academic",
      "color": "#6366f1",
      "location": "Room 304",
      "notes": "Section A"
    }
  ]
}`;

  const parts = [];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: imageMimeType || 'image/jpeg',
        data: imageBase64
      }
    });
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowDayCode = dayCodes[tomorrow.getDay()];
  const tomorrowDayName = dayNames[tomorrow.getDay()];

  const clockBanner = `[REFERENCE CLOCK CONTEXT: Today is ${currentDayName} (${currentDayCode}), ${currentDateStr}. Local Time is ${currentTime24} (Timezone: ${userTimezone}). Tomorrow is ${tomorrowDayName} (${tomorrowDayCode}). If input uses relative time like "2 hours from now", "in 45 mins", "in 2 hours", "tomorrow at 3pm", calculate the exact startTime and day based on this reference clock.]`;

  let promptText = '';
  if (naturalText && naturalText.trim()) {
    promptText = imageBase64 
      ? `${clockBanner}\n\nAnalyze this schedule input along with the attached timetable image and extract all events into the requested JSON schema:\n\n"""\n${naturalText.trim()}\n"""`
      : `${clockBanner}\n\nAnalyze the following schedule input and extract all events into the requested JSON schema:\n\n"""\n${naturalText.trim()}\n"""`;
  } else {
    promptText = `${clockBanner}\n\nCarefully inspect and transcribe all classes, routines, deadlines, and appointments from this timetable/schedule image into the requested JSON schema.`;
  }

  parts.push({ text: promptText });

  const requestBody = {
    contents: [{ parts }],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
  } catch (networkError) {
    throw new Error(`Network error while connecting to Gemini API: ${networkError.message}`);
  }

  if (!response.ok) {
    let errBody = '';
    try {
      const errJson = await response.json();
      errBody = errJson.error?.message || response.statusText;
    } catch {
      errBody = await response.text();
    }

    if (response.status === 400 || response.status === 403) {
      if (errBody.includes('API_KEY_INVALID') || response.status === 403) {
        throw new Error('Invalid Gemini API Key configured in js/config.js. Please verify your key.');
      }
    }
    throw new Error(`Gemini API Error (${response.status}): ${errBody}`);
  }

  const resultData = await response.json();
  const rawText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Gemini API returned an empty response. Please try rephrasing or uploading a clearer image.');
  }

  let parsed;
  try {
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseError) {
    console.error('Failed to parse Gemini JSON:', rawText);
    throw new Error(`Could not parse JSON from AI response: ${parseError.message}`);
  }

  const events = Array.isArray(parsed) ? parsed : (parsed.events || []);

  return events.map((ev, index) => ({
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 7)}_${index}`,
    title: String(ev.title || 'Untitled Event').trim(),
    days: Array.isArray(ev.days) && ev.days.length > 0 
      ? ev.days.filter(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(d))
      : ['Mon'],
    recurring: ev.recurring !== undefined ? Boolean(ev.recurring) : true,
    isDeadline: Boolean(ev.isDeadline),
    date: ev.date || '',
    startTime: standardizeTime(ev.startTime, '09:00'),
    endTime: standardizeTime(ev.endTime, '10:00'),
    category: ev.category || 'General',
    color: ev.isDeadline ? (ev.color || '#f43f5e') : (ev.color || '#6366f1'),
    location: ev.location || '',
    notes: ev.notes || ''
  }));
}

function standardizeTime(timeStr, fallback = '09:00') {
  if (!timeStr) return fallback;
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = String(parseInt(match[1], 10)).padStart(2, '0');
    const m = match[2];
    return `${h}:${m}`;
  }
  return fallback;
}
