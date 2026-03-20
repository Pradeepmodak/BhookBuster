import axios from "axios";
import { authService } from "../main";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useGoogleLogin } from '@react-oauth/google';
import {FcGoogle} from 'react-icons/fc';

const login = () => {
 
    const [loading ,setLoading] = useState(false);
    const navigate = useNavigate();

    const responseGoogle = async(authResult:any)=>{
        setLoading(true);
        try {
           const result=await axios.post(`${authService}/api/auth/login`,{
            code:authResult["code"]
           });
           localStorage.setItem("token",result.data.token);
           toast.success(result.data.message);
           setLoading(false);
           navigate("/"); 
        } catch (error) {
            console.log(error);
            toast.error("Problem logging in");
            setLoading(false);
        }
    };

    const googleLogin=useGoogleLogin({
  onSuccess: tokenResponse => console.log(tokenResponse),
  onError: errorResponse => console.log(errorResponse),
  flow:"auth-code",
});


    return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm space-y-6">
            <h1 className="text-center text-3xl font-bold text-[#E23774]">BhookBuster</h1>
            <p className="text-center text-gray-500">Welcome to BhookBuster
                <br />
                Login or Sign up to continue
            </p>
            <button onClick={googleLogin} className="
flex w-full items-center justify-center gap-2 rounded-md bg-[#E23774] px-4 py-2 text-white hover:bg-[#c41e5b]
            ">
              <FcGoogle size={20}/>
              {loading?"Loading...":"Continue with Google"}
            </button>
            <p className="text-center  text-gray-500">
                By logging in, you agree to our {" "}
                <span className="text-[#E23774]">Terms of Service</span>
                <span className="text-[#E23774]">Privacy Policy</span>
            </p>
        </div>
    </div>
  )
}

export default login