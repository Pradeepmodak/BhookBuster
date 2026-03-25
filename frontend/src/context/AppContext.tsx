import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';

import axios from 'axios';
import { authService } from '../main';
import type { AppContextType, User, LocationData, } from '../types';
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
        setUser(data);
        setIsAuth(true);
    } catch (error) {
        console.log(error);
    }finally{
        setLoading(false);}
    }
   
    useEffect(()=>{
        fetchUser();
    },[]);

    useEffect(()=>{
if(!navigator.geolocation){
  alert("Please allow location access to use the app");
  return;
}
setLoadingLocation(true); 
      navigator.geolocation.getCurrentPosition(async(position)=>{
        const {latitude,longitude}=position.coords;
        try {
const res = await fetch(
  `https://us1.locationiq.com/v1/reverse?key=pk.80c138d580502bcf900f951710ca327b&lat=${latitude}&lon=${longitude}&format=json&`
);
const data = await res.json();
            setLocation({
                latitude,
                longitude,
                formattedAddress:data.display_name || "current Location"
            });
            setCity(data.address.city || data.address.town || data.address.village || "Your Location");
            setLoadingLocation(false);
        } catch (error) {
            setLocation({
                latitude,
                longitude,
                formattedAddress:"current Location"
            });
            setCity("Failed to Load Location");
            setLoadingLocation(false);
        }
      })
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
        city
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