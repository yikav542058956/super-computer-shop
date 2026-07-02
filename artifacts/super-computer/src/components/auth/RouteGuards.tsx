import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, loading } = useAuth();
  const { openLoginDialog } = useLoginDialog();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      openLoginDialog();
    }
  }, [isLoggedIn, loading]);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center"><Skeleton className="h-32 w-32 rounded-full" /></div>;
  }

  return isLoggedIn ? <>{children}</> : null;
};

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, extUser, isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();

  const isLoggedInAny = !!currentUser || !!extUser;

  useEffect(() => {
    if (!loading) {
      if (!isLoggedInAny || !isAdmin) {
        setLocation("/admin/login");
      }
    }
  }, [isLoggedInAny, isAdmin, loading, setLocation]);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center"><Skeleton className="h-32 w-32 rounded-full" /></div>;
  }

  return (isLoggedInAny && isAdmin) ? <>{children}</> : null;
};
