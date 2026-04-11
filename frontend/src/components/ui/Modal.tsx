import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BiX } from "react-icons/bi";
import Card from "./Card";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

const Modal = ({ isOpen, onClose, title, description, children }: ModalProps) => (
  <AnimatePresence>
    {isOpen ? (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg"
        >
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                {description ? <p className="mt-2 text-sm text-gray-400">{description}</p> : null}
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 p-2 text-gray-400 transition hover:border-[var(--color-accent)]/40 hover:text-white"
              >
                <BiX className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </Card>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default Modal;
