# React & Next.js High-Impact Code Patterns (`akit-react`)

Reference patterns adapted conceptually from `vercel-labs/agent-skills` (`react-best-practices`) and modern React 18/19 engineering standards.

---

## 1. Eliminating Async Waterfalls (`CRITICAL`)

### ❌ BAD: Sequential Server Waterfall ($T = T_1 + T_2 + T_3$)
```tsx
export default async function OrderDashboardPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const order = await getOrder(params.id);       // Waits unnecessarily for user!
  const invoices = await getInvoices(params.id); // Waits for both!
  return <DashboardView user={user} order={order} invoices={invoices} />;
}
```

### ✅ GOOD: Parallel Initiation with `Promise.all` ($T = \max(T_1, T_2, T_3)$)
```tsx
export default async function OrderDashboardPage({ params }: { params: { id: string } }) {
  const [user, order, invoices] = await Promise.all([
    getCurrentUser(),
    getOrder(params.id),
    getInvoices(params.id),
  ]);
  return <DashboardView user={user} order={order} invoices={invoices} />;
}
```

---

## 2. Replacing Redundant `useEffect` with Render-Time Derivation (`HIGH`)

### ❌ BAD: Synchronizing Derived State in `useEffect`
```tsx
function ProductList({ products, category }: Props) {
  const [visible, setVisible] = useState<Product[]>([]);
  useEffect(() => {
    setVisible(products.filter((p) => p.category === category));
  }, [products, category]); // Triggers extra render + stale flash!
  return <Grid items={visible} />;
}
```

### ✅ GOOD: Derive Directly During Render
```tsx
function ProductList({ products, category }: Props) {
  const visible = useMemo(
    () => products.filter((p) => p.category === category),
    [products, category]
  );
  return <Grid items={visible} />;
}
```

---

## 3. Server / Client Component Composition (`HIGH`)

Keep heavy server data-fetching out of the client bundle by passing Server Components as `children` to small Client interactive wrappers:

```tsx
// ClientCollapsiblePanel.tsx ('use client')
'use client';
import { useState, type ReactNode } from 'react';

export function ClientCollapsiblePanel({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label={title}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {title}
      </button>
      {open ? <div>{children}</div> : null}
    </section>
  );
}
```

---

## 4. Accessibility & Ergonomic Audit Checklist
- [ ] **Buttons vs Links:** `<button type="button">` for actions; `<a href>` / `<Link>` for route changes.
- [ ] **Icon-Only Buttons:** Every icon button has an explicit `aria-label="..."` and `<svg aria-hidden="true">`.
- [ ] **Form Associations:** Every input has `<label htmlFor={id}>` and error message linked via `aria-describedby={errorId}` + `aria-invalid={Boolean(error)}`.
- [ ] **Layout Stability (`CLS`):** Every `<img>` / `<Image>` defines explicit `width` and `height` or aspect-ratio container.
