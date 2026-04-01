import { IUser } from "../model/User.js";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

export {};