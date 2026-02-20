// API Configuration
// Use a relative API base by default so the dev server proxy handles the backend port.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_ENDPOINTS = {
  // Dashboard
  VEHICLE_SUMMARY: `${API_BASE_URL}/api/dashboard/vehicle-summary`,
  VEHICLES_BY_STATUS: (status: string) => `${API_BASE_URL}/api/dashboard/vehicles-by-status/${status}`,
  VEHICLES_MOT_DUE: `${API_BASE_URL}/api/dashboard/vehicles-mot-due`,
  VEHICLES_SERVICE_DUE: `${API_BASE_URL}/api/dashboard/vehicles-service-due`,
  VEHICLES_TAX_DUE: `${API_BASE_URL}/api/dashboard/vehicles-tax-due`,
  
  // Auth
  MICROSOFT_AUTH: `${API_BASE_URL}/api/auth/microsoft`,
  SESSION: `${API_BASE_URL}/api/auth/session`,
  SIGNOUT: `${API_BASE_URL}/api/auth/signout`,
  
  // Webfleet
  DRIVERS_EXCEL: `${API_BASE_URL}/api/dashboard/drivers/excel`,
  
  // Chatbot
  CHAT: `${API_BASE_URL}/api/chat/send`,
};
