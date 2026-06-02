import { useState, useEffect } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../config";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { FiHome, FiShoppingBag, FiTruck } from "react-icons/fi";

type Role = "customer" | "rider" | "seller" | null;

const roleConfig = {
  customer: {
    icon: FiShoppingBag,
    label: "Customer",
    desc: "Browse nearby restaurants, order food, and track deliveries live.",
  },
  rider: {
    icon: FiTruck,
    label: "Delivery Rider",
    desc: "Accept nearby delivery requests and manage active orders.",
  },
  seller: {
    icon: FiHome,
    label: "Restaurant Owner",
    desc: "Manage menu, orders, and sales analytics in one dashboard.",
  },
};

const SelectRole = () => {
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const { user, setUser } = useAppData();
  const navigate = useNavigate();
  const roles: Exclude<Role, null>[] = ["customer", "rider", "seller"];

  useEffect(() => {
    if (shouldNavigate && user?.role) {
      navigate("/", { replace: true });
      setShouldNavigate(false);
    }
  }, [user, shouldNavigate, navigate]);

  const addRole = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.put(
        `${authService}/api/auth/add/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setShouldNavigate(true);
    } catch (error) {
      console.log(error);
      alert("Error adding role");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 text-white">
      <div className="mx-auto grid min-h-[84vh] max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[url('/premium-orbit.svg'),linear-gradient(180deg,#121212,#121212)] bg-cover bg-center shadow-[0_26px_90px_rgba(0,0,0,0.4)] lg:grid-cols-[1fr_1.1fr]">
        <div className="border-b border-white/10 p-7 lg:border-b-0 lg:border-r lg:p-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-[#facc15]">
            BhookBuster setup
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Choose how you want to use BhookBuster.</h1>
          <p className="mt-4 text-sm leading-6 text-neutral-300">
            Your role controls what dashboard and tools you see first. You can still switch later in account settings.
          </p>
          <div className="mt-8 grid gap-3">
            <Card className="border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-[#facc15]">Customer</p>
              <p className="mt-1 text-xs text-neutral-400">Order and track with realtime updates.</p>
            </Card>
            <Card className="border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-[#facc15]">Rider</p>
              <p className="mt-1 text-xs text-neutral-400">Go online, accept nearby jobs, and deliver.</p>
            </Card>
            <Card className="border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-[#facc15]">Restaurant Owner</p>
              <p className="mt-1 text-xs text-neutral-400">Run menu, fulfillment, and business analytics.</p>
            </Card>
          </div>
        </div>

        <div className="flex items-center p-6 lg:p-9">
          <div className="w-full space-y-4">
            {roles.map((r) => {
              const config = roleConfig[r];
              const Icon = config.icon;
              const isSelected = role === r;
              return (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                    isSelected
                      ? "border-[#facc15]/40 bg-[#facc15]/10 shadow-[0_12px_40px_rgba(250,204,21,0.12)]"
                      : "border-white/10 bg-[#171717] hover:border-white/20 hover:bg-[#1c1c1c]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        isSelected ? "bg-[#facc15] text-[#0f0f0f]" : "bg-white/10 text-[#facc15]"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${isSelected ? "text-[#facc15]" : "text-white"}`}>{config.label}</p>
                      <p className="mt-1 text-xs text-neutral-400">{config.desc}</p>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        isSelected ? "border-[#facc15] bg-[#facc15]" : "border-white/30"
                      }`}
                    />
                  </div>
                </button>
              );
            })}

            <Button fullWidth size="lg" disabled={!role || isLoading} onClick={addRole} className="mt-3">
              {isLoading ? "Processing..." : `Continue as ${role ? roleConfig[role].label : "..."}`}
            </Button>

            <p className="text-center text-xs text-neutral-500">
              This only sets your starting dashboard. You can update role preferences later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectRole;

