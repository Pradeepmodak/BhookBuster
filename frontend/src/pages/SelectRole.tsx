import { useState, useEffect } from 'react'
import { useAppData } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authService } from '../main';

type Role = "customer" | "rider" | "seller" | null

const roleConfig = {
    customer: {
        emoji: "🍽️",
        label: "Customer",
        desc: "Order food from your favourite restaurants",
    },
    rider: {
        emoji: "🛵",
        label: "Delivery Rider",
        desc: "Deliver orders and earn on your schedule",
    },
    seller: {
        emoji: "🍳",
        label: "Restaurant",
        desc: "List your menu and reach more customers",
    },
}

const SelectRole = () => {
    const [role, setRole] = useState<Role>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [shouldNavigate, setShouldNavigate] = useState(false);
    const { setUser, user } = useAppData();
    const navigate = useNavigate();
    const roles: Exclude<Role, null>[] = ["customer", "rider", "seller"];

    // Navigate after user state is updated with role
    useEffect(() => {
        if (shouldNavigate && user?.role) {
            navigate("/", { replace: true });
            setShouldNavigate(false);
        }
    }, [user, shouldNavigate, navigate]);

    const addRole = async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.put(`${authService}/api/auth/add/role`, { role }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            localStorage.setItem("token", data.token);
            setUser(data.user);
            setShouldNavigate(true);
        } catch (error) {
            console.log(error);
            alert("Error adding role");
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4">
            <div className="w-full max-w-md space-y-6">

                {/* Header */}
                <div className="text-center space-y-1">
                    <h1 className="text-3xl font-bold text-[#E23774]">BhookBuster</h1>
                    <p className="text-gray-500 text-sm">How would you like to use the app?</p>
                </div>

                {/* Role Cards */}
                <div className="space-y-3">
                    {roles.map((r) => {
                        const config = roleConfig[r];
                        const isSelected = role === r;
                        return (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                                    ${isSelected
                                        ? "border-[#E23774] bg-pink-50"
                                        : "border-gray-200 hover:border-pink-200 hover:bg-gray-50"
                                    }`}
                            >
                                <span className="text-3xl">{config.emoji}</span>
                                <div>
                                    <p className={`font-semibold text-sm ${isSelected ? "text-[#E23774]" : "text-gray-800"}`}>
                                        {config.label}
                                    </p>
                                    <p className="text-xs text-gray-400">{config.desc}</p>
                                </div>
                                {/* Radio indicator */}
                                <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center
                                    ${isSelected ? "border-[#E23774]" : "border-gray-300"}`}>
                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#E23774]" />}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Continue Button */}
                <button
                    disabled={!role || isLoading}
                    onClick={addRole}
                    className="w-full py-3 rounded-xl bg-[#E23774] text-white font-semibold text-sm
                        hover:bg-[#c41e5b] transition-colors
                        disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Processing..." : `Continue as ${role ? roleConfig[role].label : "..."}`}
                </button>

                <p className="text-center text-xs text-gray-400">
                    You can change this later in your profile settings
                </p>
            </div>
        </div>
    )
}

export default SelectRole