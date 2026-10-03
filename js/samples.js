// Default starter schedules for initial user accounts with explicit recurring flag

// Default schedule for user: "drizzle"
export const DEFAULT_DRIZZLE_SCHEDULE = [
  {
    id: "drizzle-1",
    title: "Morning Run & Gym",
    days: ["Mon", "Wed", "Fri"],
    recurring: true,
    isDeadline: false,
    startTime: "07:00",
    endTime: "08:15",
    category: "Fitness",
    color: "#10b981",
    location: "Campus Fitness Center",
    notes: "Cardio & Stretching"
  },
  {
    id: "drizzle-2",
    title: "Software Engineering 101",
    days: ["Mon", "Wed", "Fri"],
    recurring: true,
    isDeadline: false,
    startTime: "09:30",
    endTime: "11:00",
    category: "Academic",
    color: "#6366f1",
    location: "Tech Building Lab 4",
    notes: "Bring laptop & assignments"
  },
  {
    id: "drizzle-3",
    title: "Algorithms Seminar",
    days: ["Tue", "Thu"],
    recurring: true,
    isDeadline: false,
    startTime: "13:30",
    endTime: "15:00",
    category: "Academic",
    color: "#06b6d4",
    location: "Lecture Hall B",
    notes: "Graph theory & dynamic programming"
  },
  {
    id: "drizzle-4",
    title: "App Dev Hack Session",
    days: ["Thu"],
    recurring: true,
    isDeadline: false,
    startTime: "16:00",
    endTime: "18:00",
    category: "Work",
    color: "#f59e0b",
    location: "Study Lounge",
    notes: "Work on personal GitHub projects"
  },
  {
    id: "drizzle-5",
    title: "Weekend Gaming & Chill",
    days: ["Sat"],
    recurring: true,
    isDeadline: false,
    startTime: "19:00",
    endTime: "22:00",
    category: "Social",
    color: "#ec4899",
    location: "Discord",
    notes: "Hang out with friends"
  }
];

// Default schedule for user: "admin"
export const DEFAULT_ADMIN_SCHEDULE = [
  {
    id: "admin-1",
    title: "System Standup & Infrastructure Check",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    recurring: true,
    isDeadline: false,
    startTime: "08:30",
    endTime: "09:15",
    category: "Work",
    color: "#f59e0b",
    location: "Main Boardroom / Slack",
    notes: "Daily server health and sprint triage"
  },
  {
    id: "admin-2",
    title: "Architecture & Security Review",
    days: ["Tue", "Thu"],
    recurring: true,
    isDeadline: false,
    startTime: "10:30",
    endTime: "12:00",
    category: "Work",
    color: "#8b5cf6",
    location: "Room 101",
    notes: "Code review & vulnerability audits"
  },
  {
    id: "admin-3",
    title: "Cross-Functional Sync",
    days: ["Wed"],
    recurring: true,
    isDeadline: false,
    startTime: "14:00",
    endTime: "15:30",
    category: "Work",
    color: "#06b6d4",
    location: "Zoom Conference A",
    notes: "Product Roadmap update"
  },
  {
    id: "admin-4",
    title: "Executive Leadership Briefing",
    days: ["Fri"],
    recurring: true,
    isDeadline: false,
    startTime: "16:00",
    endTime: "17:00",
    category: "Work",
    color: "#6366f1",
    location: "Executive Suite",
    notes: "Weekly retrospective & milestones"
  }
];

// Default schedule for user: "xyz"
export const DEFAULT_XYZ_SCHEDULE = [
  {
    id: "xyz-1",
    title: "Design Critique & Creative Sync",
    days: ["Mon", "Wed"],
    recurring: true,
    isDeadline: false,
    startTime: "10:00",
    endTime: "11:30",
    category: "Work",
    color: "#eab308",
    location: "Creative Studio Hall",
    notes: "Reviewing UI/UX wireframes and interaction flows"
  },
  {
    id: "xyz-2",
    title: "Applied AI & Neural Systems",
    days: ["Tue", "Thu"],
    recurring: true,
    isDeadline: false,
    startTime: "14:00",
    endTime: "15:45",
    category: "Academic",
    color: "#f59e0b",
    location: "Science Complex 201",
    notes: "Transformer models and attention mechanisms"
  },
  {
    id: "xyz-3",
    title: "Casual Coffee & Strategy",
    days: ["Fri"],
    recurring: true,
    isDeadline: false,
    startTime: "16:00",
    endTime: "17:15",
    category: "Social",
    color: "#10b981",
    location: "Artisan Lounge",
    notes: "Weekend team catchup and project brainstorming"
  }
];
