import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiMapPin } from "react-icons/fi";
import { MdVerified } from "react-icons/md";

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
      whileHover={{ y: -6 }}
      className={`group cursor-pointer rounded-3xl border border-white/5 bg-[#141414] shadow-lg transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-black/50 ${!isOpen ? "opacity-75" : ""}`}
      onClick={() => navigate(`/restaurant/${id}`)}
    >
      {/* Image Header */}
      <div className="relative h-52 w-full overflow-hidden rounded-t-3xl">
        <img
          src={image}
          alt={name}
          className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${!isOpen ? "grayscale" : ""}`}
        />
        
        {/* Soft bottom gradient to blend into content */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/10 to-transparent opacity-90" />

        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium tracking-widest text-white uppercase backdrop-blur-md">
              Currently Closed
            </span>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-5">
        {/* Title & Verified Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <h3 className="truncate text-xl font-semibold tracking-tight text-white/95">
              {name}
            </h3>
            {isVerified && (
              <MdVerified className="shrink-0 text-[18px] text-[#facc15]" />
            )}
          </div>
        </div>

        {/* Quick Stats: Distance & Status */}
        <div className="mt-2 flex items-center gap-2 text-[13px] font-medium text-white/60">
          <span>{distance} km away</span>
          <span className="text-white/30">•</span>
          <div className="flex items-center gap-1.5">
            {isOpen ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400/90">Accepting orders</span>
              </>
            ) : (
              <span className="text-white/40">Opens later</span>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/40">
            {description}
          </p>
        )}

        {/* Address Footer */}
        {address && (
          <div className="mt-4 flex items-start gap-1.5 text-xs text-white/30">
            <FiMapPin className="mt-[2px] shrink-0 text-white/20" />
            <span className="line-clamp-1">{address}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RestaurantCard;
