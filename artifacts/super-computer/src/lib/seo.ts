import { useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

export function useDynamicSEO() {
  useEffect(() => {
    const unsub = onValue(ref(db, "settings/seo"), (snap) => {
      if (!snap.exists()) return;
      const d = snap.val();

      if (d.metaTitle) {
        document.title = d.metaTitle;
        setMeta("og:title", d.metaTitle);
        setMeta("twitter:title", d.metaTitle);
      }
      if (d.metaDescription) {
        setMetaName("description", d.metaDescription);
        setMeta("og:description", d.metaDescription);
        setMeta("twitter:description", d.metaDescription);
      }
      if (d.metaKeywords) {
        setMetaName("keywords", d.metaKeywords);
      }
      if (d.canonicalUrl) {
        let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
        if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
        link.href = d.canonicalUrl;
        setMeta("og:url", d.canonicalUrl);
      }
    });
    return () => unsub();
  }, []);
}

function setMetaName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

function setMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
  el.content = content;
}
