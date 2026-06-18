import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";
import { FiClock } from "react-icons/fi";
import { MdRestaurant } from "react-icons/md";
import { TbToolsKitchen2 } from "react-icons/tb";
import Button from "./ui/Button";
import Card from "./ui/Card";

const Navbar = () => {
  const { isAuth, city, quantity } = useAppData();
  const currLocation = useLocation();
  const isHomePage = currLocation.pathname === "/";
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [searchType, setSearchType] = useState<"dishes" | "restaurants">(
    (searchParams.get("searchType") as "dishes" | "restaurants") || "dishes"
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (search && searchType !== "dishes") params.searchType = searchType;
      setSearchParams(params);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [search, searchType, setSearchParams]);

  return (
    <div className="sticky top-0 z-[9999] w-full border-b border-white/10 bg-[#111111]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex cursor-pointer items-center gap-3 text-xl font-semibold text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#facc15] text-[#0f0f0f] shadow-[0_0_30px_rgba(250,204,21,0.28)]">
            B
          </span>
          <span>
            BhookBuster
            <span className="ml-2 text-xs font-medium uppercase tracking-[0.3em] text-[#facc15]">Prime</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/cart"
            className="relative rounded-full border border-white/10 bg-white/5 p-3 text-white transition hover:border-[#facc15]/40 hover:text-[#facc15]"
          >
            <CgShoppingCart className="text-2xl" />
            <span className="absolute -right-2 -top-2 rounded-full bg-[#facc15] px-1.5 text-xs font-semibold text-[#0f0f0f]">
              {quantity}
            </span>
          </Link>

          {isAuth ? (
            <Link to="/account">
              <Button variant="secondary" size="sm">Profile</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="secondary" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>

      {isHomePage && (
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[auto_1fr_auto]">
            <Card className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[#d4d4d4]">
              <BiMapPin className="h-5 w-5 text-[#facc15]" />
              <span className="truncate text-sm font-medium">{city}</span>
            </Card>

            {/* Premium Search Bar with integrated toggle */}
            <div className="group relative flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-black/20 transition-all duration-300 focus-within:border-[#facc15]/40 focus-within:shadow-[0_0_20px_rgba(250,204,21,0.08)]">
              {/* Search Type Toggle (inside the bar) */}
              <div className="flex items-center border-r border-white/10 px-1">
                <button
                  type="button"
                  onClick={() => setSearchType("dishes")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                    searchType === "dishes"
                      ? "bg-[#facc15] text-[#0f0f0f] shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="Search for dishes"
                >
                  <TbToolsKitchen2 className="text-sm" />
                  <span className="hidden sm:inline">Dishes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchType("restaurants")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                    searchType === "restaurants"
                      ? "bg-[#facc15] text-[#0f0f0f] shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="Search for restaurants"
                >
                  <MdRestaurant className="text-sm" />
                  <span className="hidden sm:inline">Restaurants</span>
                </button>
              </div>

              {/* Search Icon */}
              <div className="flex items-center pl-4">
                <BiSearch className="h-5 w-5 text-[#facc15]" />
              </div>

              {/* Textarea-style input */}
              <textarea
                rows={1}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  searchType === "dishes"
                    ? "Search dishes... e.g. 'spicy biryani under 300', 'healthy vegan breakfast'"
                    : "Search restaurants... e.g. 'best pizza place', 'south indian near me'"
                }
                className="w-full resize-none bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-gray-500 scrollbar-none"
                style={{ lineHeight: "1.5" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />

              {/* Clear button */}
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="flex items-center px-3 text-gray-400 transition hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <Card className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm text-neutral-300">
              <FiClock className="text-[#facc15]" />
              Fastest delivery first
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
