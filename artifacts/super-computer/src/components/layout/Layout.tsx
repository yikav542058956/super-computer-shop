import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { WhatsAppFloat } from "@/components/WhatsAppButton";

export const Layout = ({ children, noFooter }: { children: React.ReactNode; noFooter?: boolean }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background pb-16 md:pb-0">
        {children}
      </main>
      {!noFooter && <Footer />}
      <WhatsAppFloat />
      <MobileBottomNav />
    </div>
  );
};
