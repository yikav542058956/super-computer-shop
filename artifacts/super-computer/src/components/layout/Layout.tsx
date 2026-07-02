import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { WhatsAppFloat } from "@/components/WhatsAppButton";

export const Layout = ({ children, noFooter, noNav }: { children: React.ReactNode; noFooter?: boolean; noNav?: boolean }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {!noNav && <Navbar />}
      <main className={`flex-1 bg-background ${noNav ? "" : "pb-16 md:pb-0"}`}>
        {children}
      </main>
      {!noFooter && !noNav && <Footer />}
      {!noNav && <WhatsAppFloat />}
      {!noNav && <MobileBottomNav />}
    </div>
  );
};
