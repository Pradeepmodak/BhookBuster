import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { BiLogOut, BiMapPin, BiPackage, BiRefresh } from "react-icons/bi";
import { FiUser } from "react-icons/fi";
import { useState } from "react";
import { motion } from "framer-motion";

const Account = () => {
  const { user, setUser, setIsAuth, fetchUser } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const firstLetter = user?.name?.charAt(0).toUpperCase() || "B";
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUser();
      toast.success("Profile synced with server");
    } catch {
      toast.error("Failed to sync profile");
    } finally {
      setRefreshing(false);
    }
  };

  const logoutHandler = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const actions = [
    {
      label: refreshing ? "Refreshing..." : "Sync Profile",
      icon: BiRefresh,
      onClick: handleRefresh,
      iconClass: refreshing ? "animate-spin" : "",
    },
    {
      label: "Your Orders",
      icon: BiPackage,
      onClick: () => navigate("/orders"),
      iconClass: "",
    },
    {
      label: "Addresses",
      icon: BiMapPin,
      onClick: () => navigate("/address"),
      iconClass: "",
    },
    {
      label: "Logout",
      icon: BiLogOut,
      onClick: logoutHandler,
      iconClass: "",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-white/10 bg-[#121212] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-4 py-2 text-sm text-[#facc15]">
              <FiUser />
              Account center
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#facc15] text-2xl font-semibold text-[#0f0f0f]">
                {firstLetter}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{user?.name}</h1>
                <p className="text-sm text-neutral-400">{user?.email}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Role", value: user?.role || "Customer" },
                { label: "Status", value: "Active" },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-neutral-400">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[32px] border border-white/10 bg-[#171717] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          >
            <h2 className="text-2xl font-semibold">Quick actions</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Manage your account, sync profile changes, and move quickly across your order flow.
            </p>

            <div className="mt-6 grid gap-4">
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-left transition hover:border-[#facc15]/40 hover:bg-black/30"
                >
                  <div className="rounded-2xl bg-[#facc15]/10 p-3 text-[#facc15]">
                    <action.icon className={`h-5 w-5 ${action.iconClass}`} />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Account;
