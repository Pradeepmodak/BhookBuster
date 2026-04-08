import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {addToCart,clearCart,decrementCartItem,incrementCartItem,fetchMyCart} from "../controllers/cart.js"

const router=express.Router();
router.post("/add",isAuth,addToCart);
router.get("/all",isAuth,fetchMyCart);
router.put("/dec",isAuth,decrementCartItem);
router.put("/inc",isAuth,incrementCartItem);
router.delete("/clear",isAuth,clearCart);

export default router;