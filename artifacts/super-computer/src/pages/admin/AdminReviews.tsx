import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { ref, onValue, remove, update, get, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Star, Trash, CheckCircle, XCircle, MessageSquare, Loader2, Search, Image, Video, PlusCircle } from "lucide-react";
import { toast } from "sonner";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star className={`h-6 w-6 ${s <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </div>
  );
}

const FAKE_NAMES = [
  "Rahul Sharma", "Priya Singh", "Amit Kumar", "Neha Gupta", "Vikas Yadav",
  "Sunita Verma", "Rajesh Patel", "Pooja Joshi", "Deepak Nair", "Anjali Mehta",
  "Suresh Reddy", "Kavita Iyer", "Manish Tiwari", "Rekha Bhatia", "Arjun Das",
  "Nisha Pandey", "Sanjay Mishra", "Divya Kapoor", "Rohit Agarwal", "Anita Rao",
];

const FAKE_COMMENTS = [
  "Bahut acha product hai! Bilkul waise hi jaise picture mein tha. Delivery bhi fast thi.",
  "Excellent quality! Price ke hisaab se bahut hi badiya hai. Highly recommend karta hoon.",
  "Super fast delivery aur product bilkul genuine hai. Very happy with this purchase.",
  "Great product! Performance wise ekdum top notch. Paise vasool hai.",
  "Mast product mila. Quality first class hai. Dono bhai ke liye liya, dono khush hain.",
  "Awesome! Isse better deal kahin nahi milegi. Super Computer pe hi milta hai aisa.",
  "Product exactly as described. No issues at all. Will buy again for sure.",
  "Zabardast quality! Mere dost ne bhi same product liya. Both of us very satisfied.",
  "Bahut fast delivery mili aur packaging bhi safe thi. Product bhi genuine nikla.",
  "Best purchase of this year! Quality dekhke dil khush ho gaya.",
];

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; reviewId: string; existing: string }>({ open: false, reviewId: "", existing: "" });
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [mediaDialog, setMediaDialog] = useState<{ open: boolean; items: string[]; type: "image" | "video" }>({ open: false, items: [], type: "image" });

  const [fakeDialog, setFakeDialog] = useState(false);
  const [fakeForm, setFakeForm] = useState({
    productId: "",
    userName: "",
    rating: 5,
    title: "",
    body: "",
    isApproved: true,
  });
  const [addingFake, setAddingFake] = useState(false);

  useEffect(() => {
    const reviewsRef = ref(db, "reviews");
    const unsubscribe = onValue(reviewsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setReviews(
          Object.entries(data)
            .map(([id, val]: any) => ({ id, ...val }))
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      } else {
        setReviews([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const productsRef = ref(db, "products");
    get(productsRef).then((snap) => {
      if (snap.exists()) setProducts(snap.val());
    });
  }, []);

  const handleApprove = async (id: string) => {
    await update(ref(db, `reviews/${id}`), { isApproved: true });
    toast.success("Review approved");
  };

  const handleReject = async (id: string) => {
    await update(ref(db, `reviews/${id}`), { isApproved: false });
    toast.success("Review rejected");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await remove(ref(db, `reviews/${id}`));
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openReply = (review: any) => {
    setReplyDialog({ open: true, reviewId: review.id, existing: review.adminReply || "" });
    setReplyText(review.adminReply || "");
  };

  const handleReply = async () => {
    if (!replyText.trim()) { toast.error("Reply cannot be empty"); return; }
    setReplying(true);
    try {
      await update(ref(db, `reviews/${replyDialog.reviewId}`), { adminReply: replyText.trim() });
      toast.success("Reply saved");
      setReplyDialog({ open: false, reviewId: "", existing: "" });
    } catch {
      toast.error("Failed to save reply");
    } finally {
      setReplying(false);
    }
  };

  const randomizeFakeForm = () => {
    setFakeForm((f) => ({
      ...f,
      userName: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
      body: FAKE_COMMENTS[Math.floor(Math.random() * FAKE_COMMENTS.length)],
      rating: 4 + Math.round(Math.random()),
    }));
  };

  const handleAddFake = async () => {
    if (!fakeForm.productId) { toast.error("Product select karo"); return; }
    if (!fakeForm.userName.trim()) { toast.error("Reviewer ka naam dalo"); return; }
    if (!fakeForm.body.trim()) { toast.error("Review text likho"); return; }

    setAddingFake(true);
    try {
      const reviewRef = push(ref(db, "reviews"));
      const daysAgo = Math.floor(Math.random() * 30);
      await set(reviewRef, {
        productId: fakeForm.productId,
        userName: fakeForm.userName.trim(),
        rating: fakeForm.rating,
        title: fakeForm.title.trim(),
        body: fakeForm.body.trim(),
        comment: fakeForm.body.trim(),
        isApproved: fakeForm.isApproved,
        isFake: true,
        createdAt: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
        userId: `fake_${Date.now()}`,
      });

      toast.success("Fake review add ho gaya!");
      setFakeDialog(false);
      setFakeForm({ productId: "", userName: "", rating: 5, title: "", body: "", isApproved: true });
    } catch (e) {
      toast.error("Review add karne mein error aaya");
    } finally {
      setAddingFake(false);
    }
  };

  const filtered = reviews.filter((r) => {
    const matchesSearch =
      !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.body?.toLowerCase().includes(search.toLowerCase()) ||
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      (products[r.productId]?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      tab === "all" ||
      (tab === "pending" && !r.isApproved) ||
      (tab === "approved" && r.isApproved) ||
      (tab === "fake" && r.isFake);

    return matchesSearch && matchesTab;
  });

  const pendingCount = reviews.filter((r) => !r.isApproved).length;
  const fakeCount = reviews.filter((r) => r.isFake).length;

  const isVideoUrl = (url: string) => /\.(mp4|mov|webm|avi)(\?|$)/i.test(url);

  const getMediaItems = (review: any) => {
    const items: { url: string; type: "image" | "video" }[] = [];
    if (review.images) {
      (Array.isArray(review.images) ? review.images : Object.values(review.images)).forEach((url: any) => {
        items.push({ url, type: isVideoUrl(url) ? "video" : "image" });
      });
    }
    if (review.videos) {
      (Array.isArray(review.videos) ? review.videos : Object.values(review.videos)).forEach((url: any) => {
        items.push({ url, type: "video" });
      });
    }
    return items;
  };

  const productList = Object.entries(products).map(([id, p]: any) => ({ id, name: p.name }));

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Reviews</h1>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
          )}
        </div>
        <Button onClick={() => { setFakeDialog(true); randomizeFakeForm(); }} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Fake Review Add Karo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by product, customer, or review text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({reviews.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({reviews.length - pendingCount})</TabsTrigger>
            <TabsTrigger value="fake">Fake ({fakeCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed">
          <Star className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">{search ? "No reviews match your search." : "No reviews yet."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => {
            const product = products[review.productId];
            const media = getMediaItems(review);

            return (
              <div key={review.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${review.isFake ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm flex-shrink-0">
                        {review.userName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{review.userName || "Anonymous"}</span>
                          <StarRating rating={review.rating} />
                          <Badge variant={review.isApproved ? "default" : "secondary"} className="text-xs">
                            {review.isApproved ? "Approved" : "Pending"}
                          </Badge>
                          {review.isFake && (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300">Fake</Badge>
                          )}
                        </div>
                        {product && (
                          <p className="text-xs text-slate-500 mt-0.5">on <span className="font-medium text-slate-700">{product.name}</span></p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!review.isApproved ? (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleApprove(review.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-slate-500" onClick={() => handleReject(review.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Unapprove
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openReply(review)}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> {review.adminReply ? "Edit Reply" : "Reply"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(review.id)}>
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {review.title && <p className="font-semibold mt-3">{review.title}</p>}
                  {review.body && <p className="text-slate-600 text-sm mt-1 leading-relaxed">{review.body}</p>}

                  {media.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {media.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMediaDialog({ open: true, items: media.map((m) => m.url), type: item.type })}
                          className="relative h-20 w-20 rounded-lg overflow-hidden bg-slate-100 border hover:opacity-90 transition-opacity"
                        >
                          {item.type === "video" ? (
                            <div className="h-full w-full flex items-center justify-center bg-slate-800">
                              <Video className="h-8 w-8 text-white" />
                            </div>
                          ) : (
                            <img src={item.url} alt="Review media" className="h-full w-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {review.adminReply && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <p className="text-xs font-semibold text-primary mb-1">Admin Reply</p>
                      <p className="text-sm text-slate-600">{review.adminReply}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={replyDialog.open} onOpenChange={(o) => setReplyDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              rows={4}
              placeholder="Write your reply to the customer..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog({ open: false, reviewId: "", existing: "" })}>Cancel</Button>
            <Button onClick={handleReply} disabled={replying}>
              {replying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mediaDialog.open} onOpenChange={(o) => setMediaDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Review Media</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto py-2">
            {mediaDialog.items.map((url, idx) =>
              isVideoUrl(url) ? (
                <video key={idx} src={url} controls className="w-full rounded-lg" />
              ) : (
                <img key={idx} src={url} alt="Media" className="w-full rounded-lg object-contain bg-slate-50" />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fakeDialog} onOpenChange={setFakeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              Fake Review Add Karo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={fakeForm.productId} onValueChange={(v) => setFakeForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Product select karo..." />
                </SelectTrigger>
                <SelectContent>
                  {productList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Reviewer ka Naam *</Label>
                <button
                  type="button"
                  onClick={randomizeFakeForm}
                  className="text-xs text-primary hover:underline"
                >
                  🎲 Random karo
                </button>
              </div>
              <Input
                placeholder="Jaise: Rahul Sharma"
                value={fakeForm.userName}
                onChange={(e) => setFakeForm((f) => ({ ...f, userName: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Rating *</Label>
              <div className="flex items-center gap-3">
                <StarRatingInput value={fakeForm.rating} onChange={(v) => setFakeForm((f) => ({ ...f, rating: v }))} />
                <span className="text-lg font-bold text-amber-500">{fakeForm.rating}.0 ⭐</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Review Title (Optional)</Label>
              <Input
                placeholder="Jaise: Best laptop under 50k!"
                value={fakeForm.title}
                onChange={(e) => setFakeForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Review Text *</Label>
              <Textarea
                rows={3}
                placeholder="Review likho..."
                value={fakeForm.body}
                onChange={(e) => setFakeForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-approve"
                checked={fakeForm.isApproved}
                onChange={(e) => setFakeForm((f) => ({ ...f, isApproved: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="auto-approve" className="cursor-pointer">Auto-approve karo (immediately dikhega)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFakeDialog(false)}>Cancel</Button>
            <Button onClick={handleAddFake} disabled={addingFake}>
              {addingFake ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</> : "Review Add Karo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
