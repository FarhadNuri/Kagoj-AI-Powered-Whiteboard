import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { resolveUserFromToken } from "../utils/ResolveUser.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  // Guard: Determine the actual request object
  const actualReq = req?.headers ? req : (res?.headers ? res : null);

  if (!actualReq) {
    throw ApiError.unauthorized("Authentication required");
  }

  const header = actualReq.headers.authorization || actualReq.header?.("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    throw ApiError.unauthorized("Missing authentication token");
  }

  try {
    actualReq.user = await resolveUserFromToken(token);
  } catch (err) {
    if (err.isApiError) throw err;
    throw ApiError.unauthorized("Invalid or expired token");
  }

  next();
});