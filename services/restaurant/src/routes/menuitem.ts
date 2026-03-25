import express from 'express';
import {isAuth,isSeller} from "../middlewares/isAuth.js";
import { addMenuItem } from '../controllers/menuitem.js';
import { deleteMenuItem,toggleMenuItemAvailability } from '../controllers/menuitem.js';
const router=express.Router();

router.post('/new',isAuth,isSeller,addMenuItem);
router.get("/all/:id",isAuth,addMenuItem); // user aur seller dono ke lie yhi rhega
router.delete("/:id", isAuth, isSeller, deleteMenuItem);
router.delete("/status/:id", isAuth, isSeller, toggleMenuItemAvailability);

export default router;