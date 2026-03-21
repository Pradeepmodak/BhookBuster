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
        <div className='w-full max-w-sm space-y-6'>
            <h1 className='text-center text-2xl font-bold'>
                Select Your Role
                <div className="space-y-4">
                    {
                        roles.map((r)=>(
                            <button
                                key={r}
                                className='w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600'
                                onClick={()=>setRole(r)}
                            >
                                Continue as {r}
                            </button>
                        ))
                    }
                </div>
         <button disabled={!role} onClick={addRole} className='w-full py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed'>
                Next
            </button>
            </h1>
        </div>
    </div>
  )
}

export default selectRole