import express from 'express';
import { isAuth } from '../middlewares/isAuth.js';
import { addUserRole, loginUser, myProfile } from '../controllers/auth.js';
const router = express.Router();
router.post('/login', loginUser);
router.put('/add/role', isAuth, addUserRole); // This should be changed to the correct controller function for adding user roles
router.get('/me', isAuth, myProfile);
export default router;
