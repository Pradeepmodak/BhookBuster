import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
 import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider } from './context/AppContext.tsx';
import 'leaflet/dist/leaflet.css'
import { SocketProvider } from './context/SocketContext.tsx';

const env = import.meta.env;

export const authService = env.VITE_AUTH_SERVICE_URL || `http://localhost:5000`;
export const restaurantService = env.VITE_RESTAURANT_SERVICE_URL || `http://localhost:3000`;
export const utilsService = env.VITE_UTILS_SERVICE_URL || `http://localhost:7000`;
export const realtimeService = env.VITE_REALTIME_SERVICE_URL || `http://localhost:4000`;
export const riderService = env.VITE_RIDER_SERVICE_URL || `http://localhost:5001`;
export const adminService = env.VITE_ADMIN_SERVICE_URL || `http://localhost:2000`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={env.VITE_GOOGLE_CLIENT_ID || "853594873939-8ccoivpvceo8qiij9jqho1siichobjdk.apps.googleusercontent.com"}>
      <AppProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
