import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import AuthService from "../services/AuthService";
import UserService from "../services/UserService";
import { requireUser } from "../middleware/auth";
import { registerSchema, loginSchema, profileSchema } from "../schemas";

class AuthController extends BaseController {
  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = registerSchema.parse(req.body);
    this.sendSuccess(res, await AuthService.register(name, email, password, role), 201);
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = loginSchema.parse(req.body);
    this.sendSuccess(res, await AuthService.login(email, password));
  }

  // Lives under /auth so the web proxy re-issues the session cookie with the new name
  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = await UserService.updateProfile(requireUser(req).id, profileSchema.parse(req.body));
    this.sendSuccess(res, { user, token: AuthService.tokenFor(user) });
  }
}

export default new AuthController();
