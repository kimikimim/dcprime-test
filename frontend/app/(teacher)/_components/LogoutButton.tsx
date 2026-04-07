"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
  return (
    <button onClick={logout} className="text-indigo-200 hover:text-white text-sm">
      로그아웃
    </button>
  );
}
