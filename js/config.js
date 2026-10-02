// Sked Configuration
// Configure your Gemini API key and Model here directly in the code.
// Frontend users will NEVER be prompted for API keys or models.

export const CONFIG = {
  // Put your Gemini API Key here (starts with AIzaSy...):
  GEMINI_API_KEY: 'AQ.Ab8RN6Jn5tAdnuvyVh_hECBOOaKdJuiZs4pZ0dVD_DY7A-dd1Q',

  // AI Model - gemini-flash-latest is Google's active, least congested Flash alias
  DEFAULT_MODEL: 'gemini-flash-latest',
  FALLBACK_MODELS: ['gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash']
};
