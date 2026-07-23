const env = import.meta.env;

const formatUrl = (url: string | undefined, fallback: string) => {
  if (!url || url === "sensitive" || url === "https://sensitive") return fallback;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

export const authService = formatUrl(env.VITE_AUTH_SERVICE_URL, `http://localhost:5000`);
export const restaurantService = formatUrl(env.VITE_RESTAURANT_SERVICE_URL, `http://localhost:3000`);
export const utilsService = formatUrl(env.VITE_UTILS_SERVICE_URL, `http://localhost:7000`);
export const realtimeService = formatUrl(env.VITE_REALTIME_SERVICE_URL, `http://localhost:4000`);
export const riderService = formatUrl(env.VITE_RIDER_SERVICE_URL, `http://localhost:5001`);
export const adminService = formatUrl(env.VITE_ADMIN_SERVICE_URL, `http://localhost:2000`);
