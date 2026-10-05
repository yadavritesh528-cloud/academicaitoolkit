# Security Specification & Threat Model

## 1. System Overview
Academic AI Toolkit incorporates:
1. Public Community Reviews with mandatory moderation (`status: pending` -> `status: approved` / `rejected`).
2. Dynamic Product Pricing (`/products/academic-ai-toolkit`) synchronized across all CTAs and checkout buttons.
3. Protected Administrator Access for review moderation and price management.

## 2. Data Invariants
- **Public Submission Invariant**: Public visitors may only submit reviews with `status == 'pending'`. Any attempt to create a review with `status == 'approved'`, `verified == true`, or an `adminNote` must be rejected with `PERMISSION_DENIED`.
- **Public Read Invariant**: Normal unauthenticated site visitors may only read reviews where `status == 'approved'`. Unapproved, pending, or rejected reviews and private email addresses cannot be scraped by public visitors.
- **Price Control Invariant**: Pricing updates (`/products/{productId}`) are strictly restricted to authenticated administrators (`isAdmin()`). Normal visitors have read-only access.
- **Admin Privilege Escalation Guard**: No client user may assign themselves administrative privileges. Administrative rights require authentication matching `yadavritesh528@gmail.com` (with `email_verified == true`) or an explicit record in `/admins/{adminId}`.

## 3. ABAC & RBAC Mapping
- **Public Visitor**:
  - `reviews`: Can `create` if `status == 'pending'` and schema matches. Can `read` (list/get) only if `resource.data.status == 'approved'`.
  - `products`: Can `read` pricing. Cannot write.
  - `admins`: No access.
- **Administrator (`isAdmin()`)**:
  - `reviews`: Full read access (including pending & rejected). Can `update` (approve, reject, add internal notes, toggle verified) and `delete`.
  - `products`: Can `create`, `update`, `delete` pricing records.
  - `admins`: Can read administrator records.

## 4. Input Sanitization & Anti-XSS
- All text strings (`name`, `comment`, `role`, `institution`, `adminNote`, `productName`) are sanitized to escape HTML tags (`<`, `>`, `&`, `"`, `'`) before submission and safely rendered via `.textContent` / text nodes.
