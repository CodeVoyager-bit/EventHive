import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import AuthService from "../services/AuthService";

class AuthController extends BaseController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        this.sendError(res, "Name, email, and password are required");
        return;
      }
      const result = await AuthService.register(
        name,
        email,
        password,
        role || "attendee"
      );
      this.sendSuccess(res, result, 201);
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        this.sendError(res, "Email and password are required");
        return;
      }
      const result = await AuthService.login(email, password);
      this.sendSuccess(res, result);
    } catch (error: any) {
      this.sendError(res, error.message, 401);
    }
  }
}

export default new AuthController();
