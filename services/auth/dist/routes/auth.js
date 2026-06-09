import express from 'express';
import { isAuth } from '../middlewares/isAuth.js';
import { addUserRole, loginUser, myProfile } from '../controllers/auth.js';
import { authStrictLimiter, authGeneralLimiter } from '../middlewares/rateLimit.js';
const router = express.Router();
// Apply general rate limiting to all auth routes
router.use(authGeneralLimiter);
// Apply strict rate limiting to login
router.post('/login', authStrictLimiter, loginUser);
router.put('/add/role', isAuth, addUserRole); // This should be changed to the correct controller function for adding user roles
router.get('/me', isAuth, myProfile);
export default router;
