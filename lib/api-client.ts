"use client";

import axios, { AxiosInstance, AxiosResponse } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1337/api",
});

// ✅ Attach token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const expirationTime = localStorage.getItem("tokenExpiration");

  if (token && expirationTime) {
    const currentTime = Date.now();

    if (currentTime > parseInt(expirationTime)) {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");
      window.location.href = "/";
      throw new Error("Session expired");
    }

    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ✅ Response handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
