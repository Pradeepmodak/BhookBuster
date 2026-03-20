import { useState } from 'react'
import { useAppData } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authService } from '../main';

type Role="customer"|"rider"|"seller"|null

const selectRole = () => {
    const [role,setRole]=useState<Role>(null);
    const {setUser}=useAppData();
    const navigate=useNavigate();

    const roles:Role[]=["customer","rider","seller"];

    const addRole=async()=>{
        try {
            const {data}=await axios.post(`${authService}/api/auth/add/role`,{role},{
                headers:{
                    Authorization:`Bearer ${localStorage.getItem("token")}`
                }
            });
            localStorage.setItem("token",data.token);
            setUser(data.user);
            navigate("/",{replace:true});
        } catch (error) {
            console.log(error);
            alert("Error adding role");
        }
    }
  return (
    <div className='flex min-h-screen items-center 
    justify-center bg-white px-4'>
        
    </div>
  )
}

export default selectRole