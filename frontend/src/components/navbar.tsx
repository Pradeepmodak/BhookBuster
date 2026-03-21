
import { Link, useLocation, useSearchParams } from "react-router";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";

const Navbar = () => {
    const {isAuth}=useAppData();
    const currLocation=useLocation();
    const isHomePage=(currLocation.pathname==="/");
    const [searchParams,setSearchParams]=useSearchParams(); //used to get search params
    const [search,setSearch]=useState(searchParams.get("search")||"");

    // debouncing search input
    useEffect(()=>{
        const timer=setTimeout(()=>{
          if(search){
            setSearchParams({search});
          }else{
            setSearchParams({});
          }    
        },400);
    return ()=>{clearTimeout(timer); }
    },[search]);
  return (
    <div className="w-full bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-[#E23774] cursor-pointer">
            BhookBuster
        </Link>
        <div className="flex items-center gap-4">
        <Link to={'/cart'} className="relative">
        <CgShoppingCart className="text-2xl text-[#E23774]" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
            3 </span>
         </Link>
        {isAuth ?(
        <Link to={'/account'} className="text-lg font-medium text-[#E23774] hover:text-[#C11232]">
            Profile
        </Link>
        ):(
        <Link to={'/login'} className="text-lg font-medium text-[#E23774] hover:text-[#C11232]">
            Login
        </Link>
        )}
        </div>
    </div>
{/* search bar */}
{isHomePage && (
  <div className="border-t px-4 py-3">
    <div className="mx-auto flex max-w-7xl items-center rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 px-3 border-r text-gray-700">
        <BiMapPin className="h-4 w-4 text-[#E23744]" />
        <span className="text-sm truncate max-w-35">city</span>
      </div>
      <div className="flex flex-1 items-center gap-2 px-3">
        <BiSearch className="h-4 w-4 text-gray-400"/>
        <input type="text" placeholder="Search for restaurant" value={search}
        onChange={e=>setSearch(e.target.value)} className="w-full py-2 text-sm
        outline-none"/>
      </div>
    </div>
  </div>
)}
    </div>
  )
}

export default Navbar;