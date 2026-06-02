const env = import.meta.env;

export const authService = env.VITE_AUTH_SERVICE_URL || `http://localhost:5000`;
export const restaurantService = env.VITE_RESTAURANT_SERVICE_URL || `http://localhost:3000`;
export const utilsService = env.VITE_UTILS_SERVICE_URL || `http://localhost:7000`;
export const realtimeService = env.VITE_REALTIME_SERVICE_URL || `http://localhost:4000`;
export const riderService = env.VITE_RIDER_SERVICE_URL || `http://localhost:5001`;
export const adminService = env.VITE_ADMIN_SERVICE_URL || `http://localhost:2000`;
