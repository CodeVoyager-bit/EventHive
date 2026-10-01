import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import AuthService from "../services/AuthService";
import { registerSchema, loginSchema } from "../schemas";

class AuthController extends BaseController {
  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = registerSchema.parse(req.body);
    this.sendSuccess(res, await AuthService.register(name, email, password, role), 201);
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = loginSchema.parse(req.body);
    this.sendSuccess(res, await AuthService.login(email, password));
  }
}

export default new AuthController();
