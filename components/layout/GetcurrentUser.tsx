import axios from "axios";
import { useState, useEffect } from "react";

export default function useCurrentUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(
        "http://183.82.117.36:1337/api/users/me?populate=*",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUser(res.data);
    } catch (err: any) {
      console.error("❌ Error fetching current user:", err);
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  return { user, loading, error, refresh: getUser };
}
