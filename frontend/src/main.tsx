import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
 import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider } from './context/AppContext.tsx';
import 'leaflet/dist/leaflet.css'
import { SocketProvider } from './context/SocketContext.tsx';
export const authService=`http://localhost:5000`
export const restaurantService=`http://localhost:3000`
export const utilsService=`http://localhost:7000`
export const realtimeService=`http://localhost:4000`
export const riderService=`http://localhost:6000`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="853594873939-8ccoivpvceo8qiij9jqho1siichobjdk.apps.googleusercontent.com">
      <AppProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
