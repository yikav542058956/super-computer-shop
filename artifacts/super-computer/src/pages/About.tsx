import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Truck, Cpu, Clock } from "lucide-react";

export default function About() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-slate-900 py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600')] bg-cover bg-center"></div>
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Empowering Your Digital World</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Super Computer is the leading destination for premium laptops, gaming rigs, and professional workstations.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg mx-auto">
            <h2>Our Story</h2>
            <p>Founded with a passion for cutting-edge technology, Super Computer has grown from a small specialized boutique to the most trusted online destination for performance computing. We believe that everyone deserves the right tool for their craft — whether you're a designer rendering 4K video, a gamer seeking maximum framerates, or a student heading to college.</p>
            <p>We don't just sell boxes. We test, benchmark, and curate every product in our catalog to ensure we only offer what we would use ourselves.</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Card className="bg-transparent border-none shadow-none text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Authentic Products</h3>
                <p className="text-slate-500 text-sm">We are authorized partners for all major brands we carry. No gray market, ever.</p>
              </CardContent>
            </Card>
            <Card className="bg-transparent border-none shadow-none text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Cpu className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Expert Curation</h3>
                <p className="text-slate-500 text-sm">Our catalog is hand-picked by tech enthusiasts who know specs inside out.</p>
              </CardContent>
            </Card>
            <Card className="bg-transparent border-none shadow-none text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Truck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Secure Shipping</h3>
                <p className="text-slate-500 text-sm">Fully insured, carefully packed shipping gets your expensive gear to you safely.</p>
              </CardContent>
            </Card>
            <Card className="bg-transparent border-none shadow-none text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Lifetime Support</h3>
                <p className="text-slate-500 text-sm">Our relationship doesn't end at checkout. We provide tech support for the life of the product.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}