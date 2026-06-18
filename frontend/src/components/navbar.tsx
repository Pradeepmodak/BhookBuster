import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";
import { FiClock } from "react-icons/fi";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";

const Navbar = () => {
  const { isAuth, city, quantity } = useAppData();
  const currLocation = useLocation();
  const isHomePage = currLocation.pathname === "/";
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setSearchParams({ search });
      } else {
        setSearchParams({});
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [search, setSearchParams]);

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
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="rounded-full border border-white/10 bg-white/5 p-3 text-white transition hover:border-[#facc15]/40 hover:text-[#facc15]"
            title="Search"
          >
            <BiSearch className="text-2xl" />
          </Link>
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
          <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[1.1fr_1.8fr_auto]">
            <Card className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[#d4d4d4]">
              <BiMapPin className="h-5 w-5 text-[#facc15]" />
              <span className="truncate text-sm font-medium">{city}</span>
            </Card>

            <Input
              icon={<BiSearch className="h-5 w-5" />}
              placeholder="Search for anything (e.g. 'spicy biryani', 'healthy vegan')"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-2xl px-4"
            />

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
