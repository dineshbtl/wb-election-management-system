import axios from "axios";
import { cookies } from "next/headers";

const apiServer = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1337/api",
});

apiServer.interceptors.request.use((config) => {
  const token = cookies().get("token")?.value; // or "jwt"

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiServer;
