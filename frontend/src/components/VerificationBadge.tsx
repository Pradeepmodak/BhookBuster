import { MdVerified, MdInfoOutline } from "react-icons/md";

const VerificationBadge = ({ isVerified, size = 16, showUnverified = true }: { isVerified: boolean; size?: number; showUnverified?: boolean }) => {
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-blue-600 border border-blue-200 shadow-sm" title="Verified">
        <MdVerified size={size} className="text-blue-500" />
        Verified
      </span>
    );
  }

  return showUnverified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-gray-500 border border-gray-200 shadow-sm" title="Not Verified">
      <MdInfoOutline size={size} className="text-gray-400" />
      Not Verified
    </span>
  ) : null;
};

export default VerificationBadge;
