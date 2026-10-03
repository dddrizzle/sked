// Sked Configuration
// Configure your Gemini API key and Model here directly in the code.
// Frontend users will NEVER be prompted for API keys or models.

export const CONFIG = {
  // Put your Gemini API Key here (starts with AIzaSy...):
  GEMINI_API_KEY: 'AQ.Ab8RN6Jn5tAdnuvyVh_hECBOOaKdJuiZs4pZ0dVD_DY7A-dd1Q',

  // AI Model - gemini-2.0-flash has 1,500 free requests/day (unlike gemini-flash-latest/2.5-flash which is capped at 20 RPD on free tier)
  DEFAULT_MODEL: 'gemini-2.0-flash',
  FALLBACK_MODELS: ['gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-flash-latest'],

  // Default Admin Passcode (can also be changed inside the Admin Console)
  ADMIN_PASSCODE: 'skedadmin'
};
