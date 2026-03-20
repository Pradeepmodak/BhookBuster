import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
 import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider } from './context/AppContext.tsx';
export const authService=`http://localhost:5000`
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="853594873939-8ccoivpvceo8qiij9jqho1siichobjdk.apps.googleusercontent.com">
      <AppProvider>
         <App />
        </AppProvider>
     
    </GoogleOAuthProvider>
  </StrictMode>,
)
