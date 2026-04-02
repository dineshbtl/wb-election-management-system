// import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

// const api: AxiosInstance = axios.create({
//   baseURL: process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1339/api",
// });

// // Request interceptor to add Bearer token and check expiration
// api.interceptors.request.use((config: AxiosRequestConfig) => {
//   const token = localStorage.getItem("token");
//   const expirationTime = localStorage.getItem("tokenExpiration");

//   if (token && expirationTime) {
//     const currentTime = Date.now();
//     if (currentTime > parseInt(expirationTime)) {
//       localStorage.removeItem("token");
//       localStorage.removeItem("tokenExpiration");
//       if (typeof window !== "undefined") {
//         window.location.href = "/"; // Fallback for non-React context
//       }
//       throw new Error("Session expired. Please log in again.");
//     }
//     config.headers = config.headers || {};
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Response interceptor for centralized error handling
// api.interceptors.response.use(
//   (response: AxiosResponse) => response,
//   (error) => {
//     const errorMessage =
//       error.response?.data?.error?.message || error.message || "Request failed";

//     // Log detailed error for debugging
//     console.error("API Error Details:", {
//       status: error.response?.status,
//       data: error.response?.data,
//       message: errorMessage,
//       url: error.config?.url,
//     });

//     // Handle 401 Unauthorized (expired or invalid token)
//     if (error.response?.status === 401) {
//       localStorage.removeItem("token");
//       localStorage.removeItem("tokenExpiration");
//       if (typeof window !== "undefined") {
//         window.location.href = "/"; // Fallback for non-React context
//       }
//       return Promise.reject(new Error("Session expired. Please log in again."));
//     }

//     return Promise.reject(new Error(errorMessage));
//   }
// );

// export default api;

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1337/api",
  timeout: 120_000,
});

// ✅ Request interceptor to add Bearer token and check expiration
api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  const expirationTime = localStorage.getItem("tokenExpiration");

  if (token && expirationTime) {
    const currentTime = Date.now();

    // If token expired → remove and redirect
    if (currentTime > parseInt(expirationTime)) {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");

      if (typeof window !== "undefined") {
        window.location.href = "/"; // Redirect to login
      }

      throw new Error("Session expired. Please log in again.");
    }

    // Attach Bearer token
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ✅ Response interceptor for centralized error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    // Support multiple error formats (Strapi v4/v5, generic APIs)
    const data = error.response?.data;
    const errorMessage =
      (typeof data?.error === "string" ? data.error : null) ||
      data?.error?.message ||
      data?.message ||
      data?.errors?.[0]?.message ||
      error.message ||
      "Request failed";

    // Log detailed error for debugging (serialize safely to avoid empty {})
    if (process.env.NODE_ENV === "development") {
      const details: Record<string, unknown> = {
        status: error.response?.status,
        message: errorMessage,
        url: error.config?.url || error.config?.baseURL,
      };
      if (data) details.data = data;
      if (error.code) details.code = error.code;
      console.error("API Error Details:", JSON.stringify(details, null, 2));
    }

    // Handle 401 Unauthorized (expired or invalid token)
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");

      if (typeof window !== "undefined") {
        window.location.href = "/"; // Redirect to login
      }

      return Promise.reject(new Error("Session expired. Please log in again."));
    }

    if (error.response?.status === 429) {
      return Promise.reject(
        new Error("Too Many Requests, Please Try Again Later."),
      );
    }

    if (error.code === "ECONNABORTED" || /timeout/i.test(String(error.message || ""))) {
      return Promise.reject(
        new Error("Request Timed Out. The server may be slow or your network is unstable. Please try again."),
      );
    }

    if (error.message === "Network Error") {
      return Promise.reject(
        new Error("Network Connection Issue. Check your internet and try again."),
      );
    }

    return Promise.reject(new Error(errorMessage));
  },
);

export default api;

// import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

// const api: AxiosInstance = axios.create({
//   baseURL: process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1339/api",
// });

// // ✅ Request interceptor — attach token only (don’t force logout by time)
// api.interceptors.request.use((config: AxiosRequestConfig) => {
//   const token = localStorage.getItem("token");

//   if (token) {
//     config.headers = config.headers || {};
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   return config;
// });

// // ✅ Response interceptor for centralized error handling
// api.interceptors.response.use(
//   (response: AxiosResponse) => response,
//   (error) => {
//     const errorMessage =
//       error.response?.data?.error?.message || error.message || "Request failed";

//     console.error("API Error Details:", {
//       status: error.response?.status,
//       data: error.response?.data,
//       message: errorMessage,
//       url: error.config?.url,
//     });

//     // Handle 401 Unauthorized (token expired/invalid)
//     // if (error.response?.status === 401) {
//     //   console.warn("🚫 Unauthorized: clearing session");
//     //   localStorage.removeItem("token");
//     //   localStorage.removeItem("tokenExpiration");
//     //   if (typeof window !== "undefined") {
//     //     window.location.href = "/";
//     //   }
//     // }

//     return Promise.reject(error);
//   }
// );

// export default api;
