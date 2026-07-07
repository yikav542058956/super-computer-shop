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
  "Excellent product! Exactly as shown in the pictures. Delivery was very fast too.",
  "Excellent quality! Great value for money. Highly recommend to everyone.",
  "Super fast delivery and the product is 100% genuine. Very happy with this purchase.",
  "Great product! Performance is absolutely top notch. Totally worth the price.",
  "Amazing product. First class quality. Bought it for both my brothers, both are happy.",
  "Awesome! You won't find a better deal anywhere. Super Computer is the best.",
  "Product exactly as described. No issues at all. Will buy again for sure.",
  "Outstanding quality! My friend also bought the same product. Both of us very satisfied.",
  "Very fast delivery and packaging was safe. Product is also 100% genuine.",
  "Best purchase of this year! Absolutely love the quality.",
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

  // Selective delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const toggleSelectReview = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} review(s) permanently?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => remove(ref(db, `reviews/${id}`))));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} review(s) deleted`);
    } catch (e: any) { toast.error("Failed: " + e.message); }
    finally { setBulkDeleting(false); }
  };

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
    if (!fakeForm.productId) { toast.error("Please select a product"); return; }
    if (!fakeForm.userName.trim()) { toast.error("Reviewer name is required"); return; }
    if (!fakeForm.body.trim()) { toast.error("Review text is required"); return; }

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

      toast.success("Fake review added!");
      setFakeDialog(false);
      setFakeForm({ productId: "", userName: "", rating: 5, title: "", body: "", isApproved: true });
    } catch (e) {
      toast.error("Failed to add review. Please try again.");
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
          Add Fake Review
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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
          <span className="text-sm text-red-700 font-semibold">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
            Delete Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50">Clear</button>
        </div>
      )}

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
              <div key={review.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${selectedIds.has(review.id) ? "border-red-200 bg-red-50/30" : ""} ${review.isFake ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <input type="checkbox" className="mt-1 rounded cursor-pointer"
                        checked={selectedIds.has(review.id)}
                        onChange={() => toggleSelectReview(review.id)} />
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
              Add Fake Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={fakeForm.productId} onValueChange={(v) => setFakeForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product..." />
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
                <Label>Reviewer Name *</Label>
                <button
                  type="button"
                  onClick={randomizeFakeForm}
                  className="text-xs text-primary hover:underline"
                >
                  🎲 Randomize
                </button>
              </div>
              <Input
                placeholder="e.g. Rahul Sharma"
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
                placeholder="e.g. Best laptop under 50k!"
                value={fakeForm.title}
                onChange={(e) => setFakeForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Review Text *</Label>
              <Textarea
                rows={3}
                placeholder="Write the review..."
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
              <Label htmlFor="auto-approve" className="cursor-pointer">Auto-approve (visible immediately)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFakeDialog(false)}>Cancel</Button>
            <Button onClick={handleAddFake} disabled={addingFake}>
              {addingFake ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</> : "Add Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
