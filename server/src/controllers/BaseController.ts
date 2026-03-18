import { Request, Response } from "express";

// Encapsulation: BaseController handles common response patterns
export class BaseController {
  protected sendSuccess(res: Response, data: unknown, statusCode: number = 200): void {
    res.status(statusCode).json({ success: true, data });
  }

  protected sendError(res: Response, message: string, statusCode: number = 400): void {
    res.status(statusCode).json({ success: false, error: message });
  }

  protected sendPaginated(
    res: Response,
    data: unknown[],
    total: number,
    page: number,
    limit: number
  ): void {
    res.status(200).json({
      success: true,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  }
}
