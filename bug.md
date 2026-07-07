# Bug Prevention Checklist — Super Computer Website

> **Agent Instructions:** Read this file BEFORE starting any task. Follow every rule here to prevent common bugs.

---

## 🔥 CRITICAL — Firebase / Database Rules

### Save / Write Bugs
- [ ] **Never use `undefined` in Firebase RTDB payloads** — Firebase rejects `undefined` values silently or throws. Always use `""` (empty string) or `null` instead.
  - BAD: `{ phone: form.phone || undefined }`
  - GOOD: `{ phone: form.phone || "" }`
- [ ] **Always await Firebase writes** — use `await push(...)`, `await update(...)`, `await set(...)`. Never fire-and-forget.
- [ ] **Always wrap Firebase writes in try/catch** — show `toast.error(e.message)` AND `console.error(e)` in the catch block.
- [ ] **After save, verify data was actually written** — don't just trust `toast.success`. Re-read or rely on the `onValue` listener to confirm.
- [ ] **Check Firebase security rules** — if writes fail with "Permission denied", the Firebase rules are blocking the write (usually requires auth). The admin must be logged in.

### Read / List Bugs
- [ ] **onValue listeners must have error callbacks** — `onValue(ref, snap => {...}, err => toast.error(err.message))`
- [ ] **Always unsubscribe** — return `unsub()` from `useEffect` cleanup. Never leak listeners.
- [ ] **Sort before display** — Firebase RTDB does not guarantee order. Always sort arrays before rendering.
- [ ] **Handle snap.exists()** — always check `if (!snap.exists()) return;` before calling `.val()`.

---

## ⚛️ React / State Bugs

- [ ] **Stale state in closures** — use functional updater `setState(prev => ...)` when new state depends on old state.
- [ ] **Never mutate state directly** — always use `setState(...)`. Spread objects/arrays before editing.
- [ ] **Loading states** — every async operation needs `isLoading` state. Show spinner while loading, never show empty data.
- [ ] **Race conditions** — if a component unmounts during an async op, don't call `setState`. Use `isMounted` ref if needed.
- [ ] **Missing deps in useEffect** — add all used variables to the dependency array, or explicitly document why they're omitted.
- [ ] **Empty state** — every list needs an empty state UI (not just no content).

---

## 🖨️ PDF / Download Bugs

- [ ] **Never use `undefined` in PDF text** — jsPDF crashes on undefined. Always fallback: `bill.phone || ""`.
- [ ] **Test PDF with minimal data** — test with only required fields, no optional fields filled.
- [ ] **blob URL popup blockers** — `window.open(doc.output("bloburl"), "_blank")` may be blocked. Use `doc.save(filename)` for direct download instead of popup preview when possible.

---

## 💾 Form / Validation Bugs

- [ ] **Trim all string inputs before save** — `form.name.trim()`
- [ ] **Parse numbers explicitly** — `Number(form.price) || 0`, never trust raw string values for math.
- [ ] **Validate before submitting** — check required fields BEFORE calling Firebase. Show clear error messages.
- [ ] **Disable submit button while saving** — set `isSaving = true`, disable the button, restore on completion.
- [ ] **Reset form after successful save** — don't leave stale data in the form after create/edit.

---

## 🌐 Network / API Bugs

- [ ] **Always handle error states** — every API call needs `.catch(e => ...)` or `try/catch`.
- [ ] **Show loading indicators** — never leave the user guessing. Show spinner/skeleton during loads.
- [ ] **Avoid double submits** — disable submit buttons while request is in progress.

---

## 🎨 UI / Display Bugs

- [ ] **Mobile first** — test on small screen (375px). Use `sm:`, `md:` breakpoints.
- [ ] **Long text overflow** — use `truncate` or `break-words` on user-generated text (product names, customer names).
- [ ] **Empty/zero values** — show `0`, `₹0`, or `—` instead of blank. Never show `undefined` or `NaN` in the UI.
- [ ] **Number formatting** — use `formatINR()` for all currency. Never hardcode `₹` + raw number.

---

## 🔐 Auth / Admin Bugs

- [ ] **Admin routes must be protected** — wrap with `<AdminRoute>` component.
- [ ] **Check `isAdmin` not just `isLoggedIn`** — a logged-in user is not necessarily an admin.
- [ ] **Never expose admin routes in customer nav** — admin links must be hidden from regular users.

---

## 📦 This Project's Specific Rules

| Rule | Reason |
|------|--------|
| Use `formatINR(amount)` from `@/lib/utils` | Consistent ₹ formatting across the app |
| Firebase RTDB path for bills: `bills/` | Don't create new paths without checking existing structure |
| Admin panel stays in **English** | Language toggle is for customer-facing pages only |
| Customer site supports **Hindi + English** | Use `useLanguage()` hook + `t("key")` for all customer UI text |
| PDF format: **A5** | Match the existing bill PDF style |
| Bill save payload: no `undefined` values | Firebase RTDB rejects them — use `""` for optional strings |

---

## ✅ Pre-Task Checklist

Before every task:
1. [ ] Read this file
2. [ ] Check if the feature touches Firebase — if yes, follow Firebase rules above
3. [ ] Check if the feature has a form — if yes, follow Form rules above
4. [ ] Check if it's customer-facing — if yes, use `t("key")` for UI text (Hindi/English)
5. [ ] Check if it's admin-facing — if yes, keep English only
6. [ ] Run `pnpm --filter @workspace/super-computer run typecheck` after changes

---

## ✅ Post-Task Checklist

After every task:
1. [ ] TypeScript typecheck passes — `pnpm --filter @workspace/super-computer run typecheck`
2. [ ] No `undefined` in Firebase payloads
3. [ ] No `console.log` left in production code (use `console.error` only in catch blocks)
4. [ ] All new forms have: loading state, error handling, reset on success
5. [ ] All new lists have: loading state, empty state, error state
