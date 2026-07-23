const env = import.meta.env;
console.log("AUTH:", env.VITE_AUTH_SERVICE_URL);
console.log("RESTAURANT:", env.VITE_RESTAURANT_SERVICE_URL);
console.log("REALTIME:", env.VITE_REALTIME_SERVICE_URL);
console.log("RIDER:", env.VITE_RIDER_SERVICE_URL);
console.log("ADMIN:", env.VITE_ADMIN_SERVICE_URL);
console.log("UTILS:", env.VITE_UTILS_SERVICE_URL);
const formatUrl = (url: string | undefined, fallback: string): string => {
  // Missing or empty → use fallback
  if (!url || url.trim() === "") {
    console.warn(`Missing environment variable. Using fallback: ${fallback}`);
    return fallback;
  }

  const formatted = url.trim().startsWith("http://") || url.trim().startsWith("https://")
    ? url.trim()
    : `https://${url.trim()}`;

  // Validate URL
  try {
    new URL(formatted);
    return formatted;
  } catch {
    console.error(`Invalid URL "${formatted}". Using fallback: ${fallback}`);
    return fallback;
  }
};

export const authService = formatUrl(
  env.VITE_AUTH_SERVICE_URL,
  "http://localhost:5000"
);

export const restaurantService = formatUrl(
  env.VITE_RESTAURANT_SERVICE_URL,
  "http://localhost:3000"
);

export const utilsService = formatUrl(
  env.VITE_UTILS_SERVICE_URL,
  "http://localhost:7000"
);

export const realtimeService = formatUrl(
  env.VITE_REALTIME_SERVICE_URL,
  "http://localhost:4000"
);

export const riderService = formatUrl(
  env.VITE_RIDER_SERVICE_URL,
  "http://localhost:5001"
);

export const adminService = formatUrl(
  env.VITE_ADMIN_SERVICE_URL,
  "http://localhost:2000"
);