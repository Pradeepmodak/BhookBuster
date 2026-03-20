import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import axios from 'axios';
import { authService } from '../main';
import type { AppContextType, User} from '../types';
const AppContext=createContext<AppContextType|undefined>(undefined);

interface AppContextProviderProps{
    children:ReactNode;
} 

export const AppProvider=({children}:AppContextProviderProps)=>{
    const [user,setUser]=useState<User|null>(null);
    const [isAuth,setIsAuth]=useState(false);
    const [loading,setLoading]=useState(true);
    const [location,setLocation]=useState(null);
    const [loadingLocation,setLoadingLocation]=useState(false);
    const [city,setCity]=useState("Fetching location...");

    async function fetchUser(){
    try {
        const token=localStorage.getItem("token");
        const {data}=await axios.get(`${authService}/api/auth/me`,{
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        setUser(data.user);
        setIsAuth(true);
    } catch (error) {
        console.log(error);
    }finally{
        setLoading(false);}
    }
   
    useEffect(()=>{
        fetchUser();
    },[]);

    return <AppContext.Provider value={{
        isAuth,
        setIsAuth,
        user,
        setUser,
        loading,
        setLoading
    }}>{children}</AppContext.Provider>
};

export const useAppData=():AppContextType=>{
const context=useContext(AppContext);
if(!context){
    throw new Error("useAppData must be used within AppProvider");
}
return context;
}