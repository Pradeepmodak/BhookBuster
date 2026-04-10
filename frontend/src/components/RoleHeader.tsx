import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiLogOut } from "react-icons/bi";

const roleLabels: Record<string, string> = {
  seller: "Restaurant Command",
  rider: "Rider Command",
  admin: "Admin Command",
};

const RoleHeader = () => {
  const { user, setUser, setIsAuth } = useAppData();
  const roleName = user?.role ? roleLabels[user.role] || "Dashboard" : "Dashboard";

  const logoutHandler = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    toast.success("Logged out successfully");
  };

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#111111]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#facc15] text-lg font-bold text-[#0f0f0f]">
            B
          </span>
          <div>
            <div className="text-xl font-semibold text-white">BhookBuster</div>
            <div className="inline-flex rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[#facc15]">
              {roleName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && <span className="hidden text-sm text-neutral-300 sm:inline">{user.name}</span>}
          <button
            onClick={logoutHandler}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-[#facc15]/40 hover:text-[#facc15]"
          >
            <BiLogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleHeader;
