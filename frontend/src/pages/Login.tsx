import axios from "axios";
import { authService } from "../config";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";
import { motion } from "framer-motion";
import { FiShield, FiZap } from "react-icons/fi";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  const responseGoogle = async (authResult: { code?: string }) => {
    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/login`, {
        code: authResult.code,
      });
      localStorage.setItem("token", result.data.token);
      toast.success(result.data.message);
      setUser(result.data.user);
      setIsAuth(true);
      navigate("/");
    } catch (error) {
      console.log(error);
      toast.error("Problem logging in");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (authResult) => {
      await responseGoogle(authResult);
    },
    onError: (error) => {
      console.log(error);
      toast.error("Google login failed");
    },
    flow: "auth-code",
  });

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[80vh] max-w-6xl overflow-hidden rounded-[36px] border border-white/10 bg-[url('/premium-orbit.svg'),linear-gradient(180deg,#121212,#121212)] bg-cover bg-center shadow-[0_30px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-10">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-[#facc15]/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-4 py-2 text-sm text-[#facc15]">
              <FiZap />
              Premium delivery platform
            </div>
            <h1 className="mt-8 text-4xl font-semibold tracking-tight md:text-5xl">
              Welcome to BhookBuster operations and ordering.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-neutral-300">
              Sign in to place orders as a customer, run fulfillment as a restaurant, or deliver as a rider with realtime order updates.
            </p>
          </div>

          <div className="relative mt-10 grid gap-4 md:grid-cols-2">
            {[
              {
                title: "End-to-end order lifecycle",
                description: "Track each stage from placed to delivered across customer, seller, and rider flows.",
              },
              {
                title: "Single sign-in, multi-role access",
                description: "One Google login lets you continue as customer, rider, or restaurant owner.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                <FiShield className="text-lg text-[#facc15]" />
                <div className="mt-3 text-lg font-semibold">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-neutral-400">{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#171717] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
          >
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-white">BhookBuster Prime</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400">
                Continue into the BhookBuster platform to order, manage restaurant operations, or handle deliveries.
              </p>
            </div>

            <button
              onClick={() => googleLogin()}
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#facc15] px-4 py-3.5 text-sm font-semibold text-[#0f0f0f] transition hover:brightness-110 disabled:opacity-70"
            >
              <FcGoogle size={20} />
              {loading ? "Signing you in..." : "Continue with Google"}
            </button>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-neutral-400">
              By continuing, you agree to our <span className="text-[#facc15]">Terms of Service</span> and{" "}
              <span className="text-[#facc15]">Privacy Policy</span>.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;

