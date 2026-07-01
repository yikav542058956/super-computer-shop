import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ProductListing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("search") || params.get("q") || params.get("brand") || "";
    if (q) setLocation(`/search?q=${encodeURIComponent(q)}`);
    else setLocation("/search");
  }, []);

  return null;
}
