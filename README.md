# Sked — Multilingual AI Timetable & Schedule Graphic Generator

A sleek, personalized web application that converts natural language notes in any language directly into structured, manageable schedule data, interactive weekly timetables, and downloadable graphics.

---

## Features

- **Schedule Image & Screenshot Upload**:
  - Drag and drop or browse any image of your schedule (class timetable, matriculation form, photo of a syllabus, screenshot of Google Calendar or text).
  - Works with image only, text notes only, or both combined.
- **Append & Overlap Support**:
  - Adding a new schedule doesn't erase your existing commitments—it appends to your schedule and automatically calculates overlapping columns.
  - Hovering over an overlapping event expands it above neighbors for easy reading and editing.
  - "Reset Schedule" button available whenever you want to start fresh.
- **Deadlines & Non-Repeating Events**:
  - Supports recurring weekly classes and one-time tasks, exams, appointments, and deadlines.
  - Deadlines and one-time tasks are highlighted with distinct styling and optional specific dates.
- **Dedicated Login Gate**:
  - Starts with a sleek login screen (neither "drizzle" nor "admin" logged in by default).
  - Strict case-sensitive profiles (`drizzle` vs `Drizzle`).
  - Disallows special characters (only letters and numbers).
- **Multilingual AI Understanding**: Type or upload schedules in any language (English, Spanish, Tagalog, Japanese, German, etc.).
- **Manageable Data Structure**:
  - **Weekly Timetable Grid**: Interactive 7-day schedule with collision detection for overlapping events.
  - **Daily Agenda**: Day-by-day task timeline.
  - **Manageable Data Table**: Inline event editing, custom category tags, color picker, and deletion.
  - **Raw JSON**: View, copy, or download structured JSON.
- **Graphics & Exports**:
  - Export weekly schedule as a high-resolution PNG Graphic (retina 2x).
  - Export `.ics` Calendar file to import directly into Google Calendar, Apple Calendar, or Outlook.
  - Export CSV spreadsheet.

---

## AI Key Setup (In Code)

Open [`js/config.js`](file:///c:/Users/janmh/OneDrive/Documents/Projects/Sked/js/config.js) and paste your Gemini API key:

```javascript
export const CONFIG = {
  // Paste your key here:
  GEMINI_API_KEY: 'AIzaSy...',

  // AI Model (gemini-flash-latest with fallback):
  DEFAULT_MODEL: 'gemini-flash-latest',
  FALLBACK_MODELS: ['gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash']
};
```

---

## Running Locally

1. Start the local server:
   ```bash
   node server.js
   # or
   npm run dev
   ```

2. Open your browser:
   ```
   http://localhost:3000
   ```

---

## Deploying to GitHub Pages (Access From Any Device)

Because Sked is built with zero-dependency modern web standards, you can host it for free on GitHub Pages and open it from your phone, laptop, or any other device:

1. In your terminal in this project folder:
   ```bash
   git init
   git add .
   git commit -m "Deploy Sked AI Timetable"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. Open your GitHub repository in your browser:
   - Go to **Settings** -> **Pages** (in the left sidebar).
   - Under **Build and deployment** -> **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.

3. In ~60 seconds, your site will be live at:
   `https://<your-username>.github.io/<your-repo-name>/`
