import express from 'express';
import {isAuth,isSeller} from "../middlewares/isAuth.js";
import { addMenuItem, getAllItems } from '../controllers/menuitem.js';
import { deleteMenuItem,toggleMenuItemAvailability } from '../controllers/menuitem.js';
import uploadFile from '../middlewares/multer.js';
import getBuffer from '../config/datauri.js';
const router=express.Router();

router.post('/new',isAuth,isSeller,uploadFile,addMenuItem);
router.get("/all/:id",isAuth,getAllItems); // user aur seller dono ke lie yhi rhega
router.delete("/:itemId", isAuth, isSeller, deleteMenuItem);
router.put("/status/:itemId", isAuth, isSeller, toggleMenuItemAvailability);

export default router;