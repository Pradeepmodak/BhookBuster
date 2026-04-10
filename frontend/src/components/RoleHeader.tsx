import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiLogOut } from "react-icons/bi";

const roleLabels: Record<string, string> = {
  seller: "Restaurant Dashboard",
  rider: "Rider Dashboard",
  admin: "Admin Dashboard",
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
    <div className="w-full bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-[#E23774]">BhookBuster</span>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {roleName}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user.name}
            </span>
          )}
          <button
            onClick={logoutHandler}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#E23774] transition"
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
