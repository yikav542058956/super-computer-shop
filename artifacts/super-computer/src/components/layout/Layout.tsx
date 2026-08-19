import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { WhatsAppFloat } from "@/components/WhatsAppButton";
import { useLoginDialog } from "@/contexts/LoginDialogContext";

export const Layout = ({ children, noFooter, noNav }: { children: React.ReactNode; noFooter?: boolean; noNav?: boolean }) => {
  const { isOpen: isLoginOpen } = useLoginDialog();
  const hideNavigation = noNav || isLoginOpen;

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavigation && <Navbar />}
      <main className={`flex-1 bg-background ${hideNavigation ? "" : "pb-16 md:pb-0"}`}>
        {children}
      </main>
      {!noFooter && !hideNavigation && <Footer />}
      {!hideNavigation && <WhatsAppFloat />}
      {!hideNavigation && <MobileBottomNav />}
    </div>
  );
};
