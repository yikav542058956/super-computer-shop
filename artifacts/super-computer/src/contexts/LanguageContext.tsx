import React, { createContext, useContext, useState, useCallback } from "react";

type Lang = "hi" | "en";

const translations: Record<string, Record<Lang, string>> = {
  // ── Navbar ──
  search_placeholder:   { en: "Search laptops, brands...", hi: "लैपटॉप, ब्रांड खोजें..." },
  login:                { en: "Login", hi: "लॉगिन" },
  logout:               { en: "Logout", hi: "लॉगआउट" },
  my_orders:            { en: "My Orders", hi: "मेरे ऑर्डर" },
  profile:              { en: "Profile", hi: "प्रोफाइल" },
  settings:             { en: "Settings", hi: "सेटिंग्स" },
  wishlist:             { en: "Wishlist", hi: "विशलिस्ट" },
  cart:                 { en: "Cart", hi: "कार्ट" },
  wallet:               { en: "Wallet", hi: "वॉलेट" },

  // ── Categories ──
  cat_gaming:           { en: "Gaming", hi: "गेमिंग" },
  cat_business:         { en: "Business", hi: "बिज़नेस" },
  cat_student:          { en: "Student", hi: "स्टूडेंट" },
  cat_creator:          { en: "Creator", hi: "क्रिएटर" },
  cat_accessories:      { en: "Accessories", hi: "एक्सेसरीज़" },
  cat_refurbished:      { en: "Refurbished", hi: "रिफर्बिश्ड" },
  cat_premium:          { en: "Premium", hi: "प्रीमियम" },
  cat_all_laptops:      { en: "All Laptops", hi: "सभी लैपटॉप" },
  cat_workstation:      { en: "Workstation", hi: "वर्कस्टेशन" },

  // ── Home Page ──
  featured_products:    { en: "Featured Products", hi: "फीचर्ड प्रोडक्ट्स" },
  best_deals:           { en: "Best Deals", hi: "बेस्ट डील्स" },
  new_arrivals:         { en: "New Arrivals", hi: "नए प्रोडक्ट्स" },
  top_brands:           { en: "Top Brands", hi: "टॉप ब्रांड्स" },
  customer_photos:      { en: "Happy Customer Photos", hi: "खुश ग्राहकों की फोटो" },
  view_all:             { en: "View All", hi: "सभी देखें" },
  explore:              { en: "Explore", hi: "देखें" },
  shop_now:             { en: "Shop Now", hi: "खरीदें" },
  see_all:              { en: "See All", hi: "सभी देखें" },

  // ── Product Card ──
  add_to_cart:          { en: "Add to Cart", hi: "कार्ट में जोड़ें" },
  added_to_cart:        { en: "Added!", hi: "जोड़ा!" },
  buy_now:              { en: "Buy Now", hi: "अभी खरीदें" },
  out_of_stock:         { en: "Out of Stock", hi: "स्टॉक में नहीं" },
  off:                  { en: "off", hi: "छूट" },
  rating:               { en: "Rating", hi: "रेटिंग" },
  reviews:              { en: "reviews", hi: "समीक्षाएं" },
  whatsapp_enquiry:     { en: "WhatsApp Enquiry", hi: "व्हाट्सएप पर पूछें" },

  // ── Trust Badges ──
  trust_customers_stat: { en: "12,000+", hi: "12,000+" },
  trust_customers:      { en: "Happy Customers", hi: "खुश ग्राहक" },
  trust_delivery_stat:  { en: "Free", hi: "मुफ़्त" },
  trust_delivery:       { en: "Delivery Available", hi: "डिलीवरी उपलब्ध" },
  trust_genuine_stat:   { en: "100%", hi: "100%" },
  trust_genuine:        { en: "Genuine Products", hi: "असली प्रोडक्ट" },
  trust_excellence_stat:{ en: "5+ Yrs", hi: "5+ साल" },
  trust_excellence:     { en: "of Excellence", hi: "की उत्कृष्टता" },
  trust_secure_stat:    { en: "Safe", hi: "सुरक्षित" },
  trust_secure:         { en: "Secure Payments", hi: "सुरक्षित भुगतान" },
  trust_returns_stat:   { en: "Easy", hi: "आसान" },
  trust_returns:        { en: "Returns & Support", hi: "रिटर्न और सपोर्ट" },

  // ── FAQ ──
  faq_title:            { en: "Frequently Asked Questions", hi: "अक्सर पूछे जाने वाले सवाल" },
  faq_q1:               { en: "Do you provide genuine products with warranty?", hi: "क्या आप वारंटी के साथ असली प्रोडक्ट देते हैं?" },
  faq_a1:               { en: "Yes, 100% genuine products with manufacturer warranty. We are authorized resellers for HP, Dell, Lenovo, ASUS, and more.", hi: "हां, हम 100% असली प्रोडक्ट देते हैं जिन पर मैन्युफैक्चरर की वारंटी होती है। हम HP, Dell, Lenovo, ASUS और अन्य के ऑथराइज्ड रिसेलर हैं।" },
  faq_q2:               { en: "Do you offer EMI options?", hi: "क्या आप EMI का विकल्प देते हैं?" },
  faq_a2:               { en: "Yes! EMI available from ₹999/month with no-cost EMI on select products. We support multiple bank cards and finance options.", hi: "हां! ₹999/महीने से EMI उपलब्ध है। कुछ प्रोडक्ट पर नो-कॉस्ट EMI भी मिलती है। हम कई बैंक कार्ड और फाइनेंस ऑप्शन सपोर्ट करते हैं।" },
  faq_q3:               { en: "What is your delivery policy?", hi: "आपकी डिलीवरी पॉलिसी क्या है?" },
  faq_a3:               { en: "Free delivery within Kasganj and nearby areas. Express delivery available. Pan-India shipping available too.", hi: "काशगंज और आस-पास के इलाकों में फ्री डिलीवरी। एक्सप्रेस डिलीवरी भी उपलब्ध है। पूरे भारत में शिपिंग भी होती है।" },
  faq_q4:               { en: "Can I exchange my old laptop?", hi: "क्या मैं अपना पुराना लैपटॉप एक्सचेंज कर सकता हूं?" },
  faq_a4:               { en: "Yes, we accept old laptops and offer the best exchange value. Bring your old device to our store for evaluation.", hi: "हां, हम पुराने लैपटॉप लेते हैं और सबसे अच्छी एक्सचेंज वैल्यू देते हैं। अपना पुराना डिवाइस हमारी दुकान पर लाएं।" },
  faq_q5:               { en: "Do you provide laptop repair services?", hi: "क्या आप लैपटॉप रिपेयर सेवाएं देते हैं?" },
  faq_a5:               { en: "Yes, we have an in-house service center for repairs, upgrades, data recovery, and software installation.", hi: "हां, हमारे पास इन-हाउस सर्विस सेंटर है जहां रिपेयर, अपग्रेड, डेटा रिकवरी और सॉफ्टवेयर इंस्टालेशन होता है।" },
  faq_q6:               { en: "Can I compare products before buying?", hi: "क्या मैं खरीदने से पहले प्रोडक्ट की तुलना कर सकता हूं?" },
  faq_a6:               { en: "Yes! Walk into our showroom at Kasganj Road or call us at 9761809960. We'll help you compare options side by side.", hi: "हां! काशगंज रोड पर हमारे शोरूम में आएं या 9761809960 पर कॉल करें। हम आपको ऑप्शन तुलना करने में मदद करेंगे।" },

  // ── Cart Page ──
  your_cart:            { en: "Your Cart", hi: "आपका कार्ट" },
  cart_empty:           { en: "Your cart is empty", hi: "आपका कार्ट खाली है" },
  cart_empty_sub:       { en: "Browse our collection and find something you'll love!", hi: "हमारा कलेक्शन देखें और कुछ पसंद करें!" },
  browse_products:      { en: "Browse Products", hi: "प्रोडक्ट देखें" },
  proceed_checkout:     { en: "Proceed to Checkout", hi: "चेकआउट करें" },
  coupon_code:          { en: "Coupon Code", hi: "कूपन कोड" },
  have_coupon:          { en: "Have a coupon?", hi: "कूपन है?" },
  apply_coupon:         { en: "Apply", hi: "लागू करें" },
  remove_coupon:        { en: "Remove", hi: "हटाएं" },
  order_summary:        { en: "Order Summary", hi: "ऑर्डर सारांश" },
  subtotal:             { en: "Subtotal", hi: "सबटोटल" },
  discount:             { en: "Discount", hi: "छूट" },
  delivery_charge:      { en: "Delivery Charge", hi: "डिलीवरी चार्ज" },
  free:                 { en: "Free", hi: "मुफ़्त" },
  total:                { en: "Total", hi: "कुल" },
  items:                { en: "items", hi: "आइटम" },
  remove_item:          { en: "Remove", hi: "हटाएं" },
  order_on_whatsapp:    { en: "Order on WhatsApp", hi: "व्हाट्सएप पर ऑर्डर करें" },
  secure_checkout:      { en: "Secure Checkout", hi: "सुरक्षित चेकआउट" },
  free_delivery_note:   { en: "Free delivery on orders above ₹50,000", hi: "₹50,000 से ऊपर के ऑर्डर पर मुफ़्त डिलीवरी" },

  // ── Footer ──
  footer_tagline:       { en: "Your trusted destination for laptops, gaming gear, and tech accessories in Kasganj.", hi: "काशगंज में लैपटॉप, गेमिंग गियर और टेक एक्सेसरीज़ के लिए आपका भरोसेमंद ठिकाना।" },
  quick_links:          { en: "Quick Links", hi: "त्वरित लिंक" },
  categories_label:     { en: "Categories", hi: "श्रेणियां" },
  contact_us:           { en: "Contact Us", hi: "संपर्क करें" },
  about_us:             { en: "About Us", hi: "हमारे बारे में" },
  contact_page:         { en: "Contact Us", hi: "संपर्क करें" },
  all_products:         { en: "All Products", hi: "सभी प्रोडक्ट" },
  todays_deals:         { en: "Today's Deals", hi: "आज के डील्स" },
  laptops_cat:          { en: "Laptops", hi: "लैपटॉप" },
  gaming_laptops:       { en: "Gaming Laptops", hi: "गेमिंग लैपटॉप" },
  accessories_cat:      { en: "Accessories", hi: "एक्सेसरीज़" },
  desktop_pcs:          { en: "Desktop PCs", hi: "डेस्कटॉप पीसी" },
  rights_reserved:      { en: "All rights reserved.", hi: "सर्वाधिकार सुरक्षित।" },
  follow_us:            { en: "Follow Us", hi: "फॉलो करें" },

  // ── Search / Product Listing ──
  search_results:       { en: "Search Results", hi: "खोज परिणाम" },
  filters:              { en: "Filters", hi: "फ़िल्टर" },
  sort_by:              { en: "Sort By", hi: "क्रमबद्ध करें" },
  no_products:          { en: "No products found", hi: "कोई प्रोडक्ट नहीं मिला" },
  loading:              { en: "Loading...", hi: "लोड हो रहा है..." },
  price_low_high:       { en: "Price: Low to High", hi: "कीमत: कम से ज़्यादा" },
  price_high_low:       { en: "Price: High to Low", hi: "कीमत: ज़्यादा से कम" },
  newest_first:         { en: "Newest First", hi: "नए पहले" },
  in_stock:             { en: "In Stock", hi: "स्टॉक में" },

  // ── Product Detail ──
  specifications:       { en: "Specifications", hi: "स्पेसिफिकेशन" },
  description:          { en: "Description", hi: "विवरण" },
  customer_reviews:     { en: "Customer Reviews", hi: "ग्राहक समीक्षाएं" },
  write_review:         { en: "Write a Review", hi: "समीक्षा लिखें" },
  share:                { en: "Share", hi: "शेयर करें" },
  quantity:             { en: "Quantity", hi: "मात्रा" },
  availability:         { en: "Availability", hi: "उपलब्धता" },
  in_stock_label:       { en: "In Stock", hi: "स्टॉक में है" },

  // ── Announcements ──
  announcement_bar:     { en: "Announcement", hi: "घोषणा" },

  // ── General ──
  close:                { en: "Close", hi: "बंद करें" },
  cancel:               { en: "Cancel", hi: "रद्द करें" },
  save:                 { en: "Save", hi: "सहेजें" },
  confirm:              { en: "Confirm", hi: "पुष्टि करें" },
  yes:                  { en: "Yes", hi: "हां" },
  no:                   { en: "No", hi: "नहीं" },
  back:                 { en: "Back", hi: "वापस" },
  next:                 { en: "Next", hi: "आगे" },
  submit:               { en: "Submit", hi: "सबमिट करें" },
  enter_phone:          { en: "Enter mobile number", hi: "मोबाइल नंबर डालें" },
  enter_otp:            { en: "Enter OTP", hi: "OTP डालें" },
  send_otp:             { en: "Send OTP", hi: "OTP भेजें" },
  verify_otp:           { en: "Verify OTP", hi: "OTP सत्यापित करें" },
  name:                 { en: "Name", hi: "नाम" },
  email:                { en: "Email", hi: "ईमेल" },
  phone:                { en: "Phone", hi: "फ़ोन" },
  address:              { en: "Address", hi: "पता" },
  city:                 { en: "City", hi: "शहर" },
  state:                { en: "State", hi: "राज्य" },
  pincode:              { en: "Pincode", hi: "पिनकोड" },
  payment_method:       { en: "Payment Method", hi: "भुगतान तरीका" },
  place_order:          { en: "Place Order", hi: "ऑर्डर दें" },
  order_placed:         { en: "Order Placed!", hi: "ऑर्डर हो गया!" },
  continue_shopping:    { en: "Continue Shopping", hi: "खरीदारी जारी रखें" },
  order_history:        { en: "Order History", hi: "ऑर्डर इतिहास" },
  recently_viewed:      { en: "Recently Viewed", hi: "हाल में देखा" },
  coupon_invalid:       { en: "Invalid coupon code", hi: "गलत कूपन कोड" },
  coupon_inactive:      { en: "This coupon is not active", hi: "यह कूपन सक्रिय नहीं है" },
  coupon_expired:       { en: "Coupon expired", hi: "कूपन की अवधि समाप्त हो गई" },
  coupon_min_order:     { en: "Min. order required", hi: "न्यूनतम ऑर्डर आवश्यक" },
  coupon_applied:       { en: "Coupon applied! You save", hi: "कूपन लागू! आपकी बचत" },
  coupon_failed:        { en: "Failed to validate coupon", hi: "कूपन सत्यापित नहीं हो सका" },
  coupon_enter:         { en: "Please enter a coupon code", hi: "कूपन कोड डालें" },
  saving:               { en: "Saving", hi: "बचत" },
  you_save:             { en: "You're saving", hi: "आपकी बचत हो रही है" },
  on_this_order:        { en: "on this order!", hi: "इस ऑर्डर पर!" },
  track_order:          { en: "Track Order", hi: "ऑर्डर ट्रैक करें" },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "hi",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem("sc_lang") as Lang) || "hi";
    } catch {
      return "hi";
    }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("sc_lang", l); } catch {}
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] ?? translations[key]?.en ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
