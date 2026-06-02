import { useState } from "react";
import type { IMenuItem } from "../types";
import { BsCartPlus } from "react-icons/bs";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import { FiCheckCircle, FiEyeOff } from "react-icons/fi";
import toast from "react-hot-toast";
import { restaurantService } from "../config";
import axios from "axios";
import { useAppData } from "../context/AppContext";
import { motion } from "framer-motion";
import Button from "./ui/Button";
import Card from "./ui/Card";
import { getErrorMessage } from "../utils/http";

interface MenuGridProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuGrid = ({ items, onItemDeleted, isSeller }: MenuGridProps) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [statusItemId, setStatusItemId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const { cart, fetchCart } = useAppData();

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Delete this item?")) return;

    try {
      setDeleteItemId(itemId);
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Item deleted");
      onItemDeleted();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteItemId(null);
    }
  };

  const toggleAvailability = async (itemId: string) => {
    try {
      setStatusItemId(itemId);
      const { data } = await axios.put(
        `${restaurantService}/api/item/status/${itemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success(data.message);
      onItemDeleted();
    } catch {
      toast.error("Status update failed");
    } finally {
      setStatusItemId(null);
    }
  };

  const addToCart = async (restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);
      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        { restaurantId, itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success(data.message);
      fetchCart();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to add"));
    } finally {
      setLoadingItemId(null);
    }
  };

  const incrementCart = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/inc`,
        { itemId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      fetchCart();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to increase"));
    } finally {
      setLoadingItemId(null);
    }
  };

  const decrementCart = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      fetchCart();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to decrease"));
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => {
        const isLoading = loadingItemId === item._id;
        const isStatusLoading = statusItemId === item._id;
        const isDeleteLoading = deleteItemId === item._id;
        const itemBusy = isLoading || isStatusLoading || isDeleteLoading;

        return (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={item.isAvailable ? "" : "opacity-60"}
          >
            <Card className="group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-yellow-500/40">
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className={`h-36 w-full object-cover transition ${
                    !item.isAvailable ? "grayscale brightness-50" : "group-hover:scale-105"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute left-3 top-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      item.isAvailable
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                        : "border-rose-400/40 bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {item.isAvailable ? <FiCheckCircle size={12} /> : <FiEyeOff size={12} />}
                    {item.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>

                {!item.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-widest text-gray-300 uppercase">
                    Not Available
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 truncate text-sm font-semibold text-white">{item.name}</h3>
                {item.description && (
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-400">{item.description}</p>
                )}

                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold text-yellow-400">Rs {item.price}</span>
                  <div className="flex gap-2">
                    {isSeller ? (
                      <>
                        <Button
                          variant={item.isAvailable ? "ghost" : "primary"}
                          size="sm"
                          onClick={() => toggleAvailability(item._id)}
                          disabled={itemBusy}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold"
                        >
                          {isStatusLoading ? (
                            <VscLoading className="animate-spin" size={14} />
                          ) : item.isAvailable ? (
                            "Set Unavailable"
                          ) : (
                            "Set Available"
                          )}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(item._id)}
                          disabled={itemBusy}
                          className="rounded-xl p-2"
                        >
                          {isDeleteLoading ? <VscLoading className="animate-spin" size={16} /> : <BiTrash size={16} />}
                        </Button>
                      </>
                    ) : (() => {
                      const cartItem = cart?.find((c: any) => c.itemId === item._id || c.itemId?._id === item._id);
                      const quantity = cartItem?.quantity || 0;

                      if (quantity > 0) {
                        return (
                          <div className="flex items-center gap-2 rounded-xl bg-yellow-400 p-1 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
                            <button
                              disabled={itemBusy}
                              onClick={() => decrementCart(item._id)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/10 text-black transition hover:bg-black/20 disabled:opacity-50"
                            >
                              <span className="text-lg font-bold leading-none -mt-0.5">-</span>
                            </button>
                            {isLoading ? (
                              <div className="flex w-4 justify-center"><VscLoading className="animate-spin text-black" size={14} /></div>
                            ) : (
                              <span className="w-4 text-center text-sm font-bold text-black">{quantity}</span>
                            )}
                            <button
                              disabled={itemBusy}
                              onClick={() => incrementCart(item._id)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/10 text-black transition hover:bg-black/20 disabled:opacity-50"
                            >
                              <span className="text-lg font-bold leading-none -mt-0.5">+</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <Button
                          disabled={!item.isAvailable || itemBusy}
                          onClick={() => addToCart(item.restaurantId, item._id)}
                          size="sm"
                          className="rounded-xl p-2 bg-yellow-400 text-black hover:brightness-110"
                        >
                          {isLoading ? <VscLoading className="animate-spin text-black" size={16} /> : <BsCartPlus className="text-black" size={16} />}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <VscLoading className="animate-spin text-yellow-400" size={24} />
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MenuGrid;

