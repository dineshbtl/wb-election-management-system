import axios from "axios";
import { message } from "antd";

  const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1337/api";

// 💥 Full-access token (use only for secure admin dashboards)
// const ADMIN_TOKEN =
//   "9f622acd2035e3ae704d2fc4914a52e6beba7442dfcef490c38c44763b53e3eb0416d4fbbc28c320837048ed71544f0a306b65fede220fac91523263d4ff43f753ca5bd4bbc9440615c07256cec588cd54b0fb859f7186e79e9e97b9a80dc4f330bcf699b86fbd7b19de3452c1a2827cf492ee80ecd1b3d8b57517cc46e03d58";

// const ADMIN_TOKEN =
//   "9f622acd2035e3ae704d2fc4914a52e6beba7442dfcef490c38c44763b53e3eb0416d4fbbc28c320837048ed71544f0a306b65fede220fac91523263d4ff43f753ca5bd4bbc9440615c07256cec588cd54b0fb859f7186e79e9e97b9a80dc4f330bcf699b86fbd7b19de3452c1a2827cf492ee80ecd1b3d8b57517cc46e03d58";

// const ADMIN_TOKEN =
//   "23c61f690c5da9373bcfcb393c7a2823c2b165c308ab5b3944834f4e16c32cc0edeef4e32e03fddc9a3025a672b0a275d0f5c06583d129a97515025516fac48f09953956e6b110eb7267be0e9e83a3c0ae925983f45e0509e1dcffd19ee7652eb1498bee7d0df17e096df5aeff80110478047b3186fcc65125123271ae8bd40b";

const ADMIN_TOKEN =
  "d5f8af8234fa8584952cbfaec1c983178e08dbc6cc50da305fde00ee844fb21bc61f8ad91f935385df212e1bdae474b4d9ca50320612cf3ff25e4a46bc4e159e3bddd7f1f0ff8dca02275158ace62f539eff8812c6c3f83193b90567e293c0ec75e44d4130491e4134dea13841e1303e76595ab56d412bd222eeba9581a7fbe8";

// const ADMIN_TOKEN ="9f622acd2035e3ae704d2fc4914a52e6beba7442dfcef490c38c44763b53e3eb0416d4fbbc28c320837048ed71544f0a306b65fede220fac91523263d4ff43f753ca5bd4bbc9440615c07256cec588cd54b0fb859f7186e79e9e97b9a80dc4f330bcf699b86fbd7b19de3452c1a2827cf492ee80ecd1b3d8b57517cc46e03d58"
// ✅ Create Axios instance — no client timeout for survey/upload flows (avoids 30s aborts on slow networks).
// Survey create/upload now use api + survey-api; bpi remains for admin operations (districts, locations, etc).
const bpi = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${ADMIN_TOKEN}`, // 🔒 Always use admin token
  },
});

// ✅ Global error handler — include request URL in timeout message for debugging
bpi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? error.config?.baseURL ?? "request";
    if (error.response?.status === 401) {
      message.error("Unauthorized access — check your admin token.");
    } else if (error.code === "ECONNABORTED") {
      message.error(`Request timed out (${url}). Check your connection and try again.`);
    } else if (error.message === "Network Error") {
      message.error("Network connection issue.");
    } else if (error.response?.status === 403) {
      message.error("Forbidden — your token lacks access rights.");
    }
    return Promise.reject(error);
  },
);

export default bpi;
