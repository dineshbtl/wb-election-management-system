/**
 * Axios client for Strapi /auth/* — must NOT send admin Bearer token.
 * Using bpi for login attaches the default admin JWT and causes random 401/403,
 * timeouts, and confusing errors for end users.
 */
import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1337/api";

export const authClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min — slow mobile / distant Strapi; avoids silent hangs
  headers: {
    "Content-Type": "application/json",
  },
});

export default authClient;
