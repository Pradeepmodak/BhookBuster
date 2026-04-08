import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';

import axios from 'axios';
import { authService, restaurantService } from '../main';
import { type AppContextType, type User, type LocationData,type ICart, } from '../types';
import { Toaster } from 'react-hot-toast';
const AppContext=createContext<AppContextType|undefined>(undefined);

interface AppContextProviderProps{
    children:ReactNode;
} 

export const AppProvider=({children}:AppContextProviderProps)=>{
    const [user,setUser]=useState<User|null>(null);
    const [isAuth,setIsAuth]=useState<boolean>(false);
    const [loading,setLoading]=useState(true);
    const [location,setLocation]=useState<LocationData | null>(null);
    const [loadingLocation,setLoadingLocation]=useState(false);
    const [city,setCity]=useState<string>("Fetching location...");

    async function fetchUser(){
    try {
        const token=localStorage.getItem("token");
        const {data}=await axios.get(`${authService}/api/auth/me`,{
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const userData = data.user ?? data;
        setUser(userData);
        if (userData) setIsAuth(true);
    } catch (error) {
        console.log(error);
    }finally{
        setLoading(false);}
    }
   
    const [cart,setCart]=useState<ICart[]>([]);
    const [subtotal,setSubtotal]=useState(0);
    const [quantity,setQuantity]=useState(0);

    const fetchLocation = async () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser");
        return;
      }
      
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=pk.80c138d580502bcf900f951710ca327b&lat=${latitude}&lon=${longitude}&format=json&`
          );
          const data = await res.json();
          const resolvedCity =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.state ||
            data?.address?.county ||
            data?.address?.country ||
            data?.display_name ||
            "Current Location";

          setLocation({
            latitude,
            longitude,
            formattedAddress: data?.display_name || "Current Location"
          });
          setCity(resolvedCity);
          setLoadingLocation(false);
        } catch (error) {
          setLocation({
            latitude,
            longitude,
            formattedAddress: "Current Location"
          });
          setCity("Failed to Load Location");
          setLoadingLocation(false);
        }
      }, (error) => {
        console.log("Location error:", error);
        setLoadingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setCity("Location permission denied");
          alert("Location permission is required to find restaurants near you. Please allow location access and try again.");
        } else {
          setCity("Location unavailable");
          alert("Unable to get your location. Please check your browser settings.");
        }
      });
    };

async function fetchCart() {
  if (!user || user.role !== "customer") return;

  try {
    const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    setCart(data.cart || []);
    setSubtotal(data.subtotal || 0);
    setQuantity(data.cartLength);
  } catch (error) {
    console.log(error);
  }
}
    

    useEffect(()=>{
        fetchUser();
    },[]);

    useEffect(()=>{
        if(user && user.role==="customer"){
            fetchCart();
        }
    },[user]);

    useEffect(()=>{
      fetchLocation();
    },[]);

    return <AppContext.Provider value={{
        isAuth,
        setIsAuth,
        user,
        setUser,
        loading,
        setLoading,
        location,
        loadingLocation,
        city,
        cart,
        fetchCart,
        quantity,
        subtotal,
        fetchLocation,
        fetchUser,

    }}>{children}
     <Toaster/>
    </AppContext.Provider>
};

export const useAppData=():AppContextType=>{
const context=useContext(AppContext);
if(!context){
    throw new Error("useAppData must be used within AppProvider");
}
return context;
}