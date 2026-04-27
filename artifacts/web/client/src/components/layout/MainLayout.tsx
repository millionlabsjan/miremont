import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";

export default function MainLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] bg-brand-offwhite min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
