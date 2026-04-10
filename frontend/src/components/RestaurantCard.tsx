import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiClock, FiMapPin } from "react-icons/fi";

type Props = {
  id: string;
  image: string;
  name: string;
  distance: string;
  isOpen: boolean;
  description?: string;
  address?: string;
  isVerified?: boolean;
};

const RestaurantCard = ({
  id,
  image,
  name,
  distance,
  isOpen,
  description,
  address,
  isVerified,
}: Props) => {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.01 }}
      className={`group cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-[#171717] shadow-[0_16px_48px_rgba(0,0,0,0.26)] transition hover:border-[#facc15]/40 hover:shadow-[0_18px_48px_rgba(250,204,21,0.12)] ${!isOpen ? "opacity-80" : ""}`}
      onClick={() => navigate(`/restaurant/${id}`)}
    >
      <div className="relative h-44 w-full overflow-hidden">
        <img
          src={image}
          alt={name}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-110 ${!isOpen ? "grayscale" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${isOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-200"}`}
          >
            {isOpen ? "Open now" : "Closed"}
          </span>
          {isVerified && (
            <span className="rounded-full bg-[#facc15]/20 px-3 py-1 text-xs font-semibold text-[#facc15]">
              Verified
            </span>
          )}
        </div>

        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-md bg-black/80 px-3 py-1 text-sm font-semibold text-white">
              Closed
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-base font-semibold text-white">{name}</h3>
          <FiArrowRight className="mt-1 text-[#facc15] transition group-hover:translate-x-1" />
        </div>

        {description && <p className="line-clamp-2 text-sm text-neutral-400">{description}</p>}

        <div className="grid gap-2 text-sm text-neutral-300">
          <div className="flex items-center gap-2">
            <FiMapPin className="text-[#facc15]" />
            <span>{distance} km away</span>
          </div>
          <div className="flex items-center gap-2">
            <FiClock className="text-[#facc15]" />
            <span>{isOpen ? "Accepting orders" : "Back soon"}</span>
          </div>
          {address && (
            <div className="flex items-center gap-2">
              <FiCheckCircle className="text-[#facc15]" />
              <span className="truncate">{address}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RestaurantCard;
