import { Link } from "wouter";

export const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold text-xl mb-4 text-primary">Super Computer</h3>
          <p className="text-sm text-secondary-foreground/70 mb-4">
            The premium destination for laptops, gaming gear, and tech accessories.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-secondary-foreground/70">
            <li><Link href="/products?category=cat-1" className="hover:text-primary transition-colors">Laptops</Link></li>
            <li><Link href="/products?category=cat-2" className="hover:text-primary transition-colors">Gaming Laptops</Link></li>
            <li><Link href="/products?category=cat-3" className="hover:text-primary transition-colors">Accessories</Link></li>
            <li><Link href="/products?deals=true" className="hover:text-primary transition-colors">Today's Deals</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-secondary-foreground/70">
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            <li><Link href="/shipping" className="hover:text-primary transition-colors">Shipping & Returns</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">Newsletter</h4>
          <p className="text-sm text-secondary-foreground/70 mb-4">
            Subscribe for the latest deals and tech news.
          </p>
          <div className="flex">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="bg-secondary-foreground/10 border-none rounded-l-md px-3 py-2 text-sm w-full focus:outline-none"
            />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-r-md text-sm font-medium hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
      
      <div className="border-t border-secondary-foreground/10 py-6 text-center text-sm text-secondary-foreground/50">
        <p>&copy; {new Date().getFullYear()} Super Computer. All rights reserved.</p>
      </div>
    </footer>
  );
};