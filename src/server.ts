import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { logError } from "./lib/logger";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * List of allowed origins (comma-separated from environment variable)
 * Falls back to empty array if not set - server will reject all requests
 */
const ALLOWED_ORIGINS: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

/**
 * Maximum file size in bytes (default: 10MB)
 */
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE
  ? parseInt(process.env.MAX_FILE_SIZE, 10)
  : 10 * 1024 * 1024; // 10MB

/**
 * Request timeout in milliseconds (default: 30 seconds)
 */
const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT
  ? parseInt(process.env.REQUEST_TIMEOUT, 10)
  : 30000; // 30 seconds

/**
 * Helper function to set CORS headers on response
 */
const setCorsHeaders = (req: Request, res: Response): void => {
  const origin = req.headers.origin || req.headers.referer;
  let allowed_cors_origin =
    ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS[0] : "*"; // Default to first allowed origin or * if none set

  if (origin && ALLOWED_ORIGINS.length > 0) {
    try {
      const origin_url = new URL(origin);
      if (ALLOWED_ORIGINS.includes(origin_url.origin)) {
        allowed_cors_origin = origin_url.origin;
      }
    } catch {
      // Use default if parsing fails
    }
  }

  res.set({
    "Access-Control-Allow-Origin": allowed_cors_origin,
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
  });
};

/**
 * Middleware to check if request origin is allowed
 * Only allows cross-origin requests from origins specified in ALLOWED_ORIGINS
 */
const checkOrigin = (
  req: Request,
  res: Response,
  next: express.NextFunction
): void => {
  const origin = req.headers.origin || req.headers.referer;

  // Require origin header - only allow requests from allowed origins
  if (!origin) {
    setCorsHeaders(req, res);
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Validate that origin is in the allowed list
  try {
    const origin_url = new URL(origin);
    const origin_origin = origin_url.origin;

    // Check if origin is in the allowed list
    const is_allowed = ALLOWED_ORIGINS.includes(origin_origin);

    if (!is_allowed) {
      setCorsHeaders(req, res);
      res.status(403).json({ error: "Access denied: Origin not allowed" });
      return;
    }

    next();
  } catch {
    setCorsHeaders(req, res);
    res.status(403).json({ error: "Invalid origin format" });
    return;
  }
};

/**
 * Proxies image downloads to bypass CORS restrictions
 * Downloads the image server-side and forwards it to the client
 * GET /?url=<image_url>
 */

// Handle OPTIONS preflight requests
app.options("/", (req: Request, res: Response): void => {
  setCorsHeaders(req, res);
  res.status(204).send();
});

app.get(
  "/",
  checkOrigin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const image_url = req.query.url as string;

      if (!image_url) {
        setCorsHeaders(req, res);
        res.status(400).json({ error: "Image URL is required" });
        return;
      }

      // Validate URL format
      let parsed_url: URL;
      try {
        parsed_url = new URL(image_url);
      } catch {
        setCorsHeaders(req, res);
        res.status(400).json({ error: "Invalid URL format" });
        return;
      }

      // Basic security: only allow HTTP/HTTPS URLs
      if (!["http:", "https:"].includes(parsed_url.protocol)) {
        setCorsHeaders(req, res);
        res.status(400).json({
          error: "Only HTTP and HTTPS URLs are allowed",
        });
        return;
      }

      // Basic security: check file size limit

      // Download the image server-side
      const response = await fetch(image_url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Referer: parsed_url.origin,
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        setCorsHeaders(req, res);
        res.status(response.status).json({
          error: `Failed to fetch image: ${response.status} ${response.statusText}`,
        });
        return;
      }

      // Check content type to ensure it's an image
      const content_type = response.headers.get("content-type") || "image/jpeg";
      if (!content_type.startsWith("image/")) {
        await logError(
          {
            error_details: `None image type: ${content_type}`,
            log_context: "image-proxy",
            build_version: "1.0.0",
          },
          false
        );
        setCorsHeaders(req, res);
        res.status(400).json({
          error: "URL does not point to a valid image",
        });
        return;
      }

      // Get the image data
      const image_buffer = await response.arrayBuffer();

      // Check file size limit
      if (image_buffer.byteLength > MAX_FILE_SIZE) {
        await logError(
          {
            error_details: `Image file size exceeds ${MAX_FILE_SIZE} bytes limit: ${image_buffer.byteLength} bytes`,
            log_context: "image-proxy",
            build_version: "1.0.0",
          },
          false
        );

        setCorsHeaders(req, res);
        res.status(413).json({
          error: `Image file size exceeds ${Math.round(
            MAX_FILE_SIZE / 1024 / 1024
          )}MB limit`,
        });
        return;
      }

      // Get the origin from request headers for CORS
      const request_origin = req.headers.origin || req.headers.referer;
      let allowed_cors_origin =
        ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS[0] : "*"; // Default to first allowed origin or * if none set

      // Use the request origin if it's in the allowed list
      if (request_origin && ALLOWED_ORIGINS.length > 0) {
        try {
          const origin_url = new URL(request_origin);
          if (ALLOWED_ORIGINS.includes(origin_url.origin)) {
            allowed_cors_origin = origin_url.origin;
          }
        } catch {
          // Use default if parsing fails
        }
      }

      // Create response with appropriate headers
      res
        .status(200)
        .set({
          "Content-Type": content_type,
          "Content-Length": image_buffer.byteLength.toString(),
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": allowed_cors_origin,
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        })
        .send(Buffer.from(image_buffer));
    } catch (error) {
      console.error("Image proxy error:", error);
      setCorsHeaders(req, res);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Health check endpoint
app.get("/health", (req: Request, res: Response): void => {
  res.status(200).json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Image proxy server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Proxy endpoint: http://localhost:${PORT}/?url=<image_url>`);
});
