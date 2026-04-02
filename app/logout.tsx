import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function useLogout() {
  const router = useRouter();
  const { toast } = useToast();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiration");

    toast({
      variant: "success",
      title: "Logged out",
      description: "You have been signed out successfully.",
    });

    router.push("/"); // redirect to login page
  };

  return logout;
}
