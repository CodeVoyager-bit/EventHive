import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";

// Thrown by services; the handler below turns it into a JSON response with the right status.
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Single place that maps errors to HTTP responses (Express 5 forwards rejected promises here).
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message });
  } else if (err instanceof ZodError) {
    const error = err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
    res.status(400).json({ success: false, error });
  } else if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ success: false, error: err.message });
  } else if (err instanceof mongoose.Error.CastError) {
    res.status(404).json({ success: false, error: "Not found" });
  } else if ((err as { code?: number })?.code === 11000) {
    res.status(409).json({ success: false, error: "Duplicate entry" });
  } else {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
