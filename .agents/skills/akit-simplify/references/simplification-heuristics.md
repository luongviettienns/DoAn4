# Code Simplification Heuristics & Before/After Catalog (`akit-simplify`)

Reference patterns inspired by `getsentry/skills` for reducing cognitive complexity while preserving 100% behavior parity.

---

## 1. Flatten Nested Conditionals with Guard Clauses

### ❌ BEFORE: Deeply Nested Arrowhead (Cognitive Complexity = 6)
```typescript
async function issueRefund(order: Order | null, actor: User): Promise<RefundResult> {
  if (order !== null) {
    if (order.organizationId === actor.organizationId) {
      if (order.status === 'PAID') {
        if (order.refundableCents > 0) {
          return await paymentGateway.refund(order.id, order.refundableCents);
        } else {
          throw new BadRequestError('No refundable balance remaining');
        }
      } else {
        throw new ConflictError('Only PAID orders can be refunded');
      }
    } else {
      throw new ForbiddenError('Cross-tenant access denied');
    }
  } else {
    throw new NotFoundError('Order not found');
  }
}
```

### ✅ AFTER: Linear Guard Clauses (Cognitive Complexity = 1)
```typescript
async function issueRefund(order: Order | null, actor: User): Promise<RefundResult> {
  if (!order) throw new NotFoundError('Order not found');
  if (order.organizationId !== actor.organizationId) {
    throw new ForbiddenError('Cross-tenant access denied');
  }
  if (order.status !== 'PAID') {
    throw new ConflictError('Only PAID orders can be refunded');
  }
  if (order.refundableCents <= 0) {
    throw new BadRequestError('No refundable balance remaining');
  }
  return paymentGateway.refund(order.id, order.refundableCents);
}
```

---

## 2. Eliminate Premature / Single-Use Abstractions

| Smell | Symptom in Diff | Simplification Action |
| :--- | :--- | :--- |
| **Speculative Interface** | `interface IInvoicePdfGenerator` with only 1 class `InvoicePdfGenerator` | Delete the interface; use the concrete class until a 2nd implementation or test boundary requires it |
| **Pass-Through Wrapper** | ` formatUserDate(d) { return formatIsoDate(d); }` | Inline `formatIsoDate(d)` at call sites |
| **Redundant Boolean Wrapper** | `if (isValid === true) { return true; } else { return false; }` | Replace with `return isValid;` |
| **Over-Configured Builder** | 120-line Builder class used in only 1 place | Replace with a plain typed function + default parameter object |

---

## 3. Post-Simplification Verification Checklist
- [ ] **Cyclomatic / Nesting Depth:** Maximum indentation depth inside modified functions is `<= 2` levels.
- [ ] **No Dead Artifacts:** Zero unused imports, unused private helpers, or commented-out blocks in `git diff`.
- [ ] **Behavior Parity Proven:** Scoped unit + integration tests and typechecker run and return Exit `0`.
