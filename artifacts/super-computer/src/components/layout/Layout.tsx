import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WhatsAppFloat } from "@/components/WhatsAppButton";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        {children}
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};