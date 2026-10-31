# Brightloop Architectural Patterns & Conventions

This document guides Developer 2 on how to build additional modules (Plans, Subscriptions, Invoices, Quotation Templates, Discounts, Taxes, Payments) following the exact patterns established in the **Products** reference module.

---

## 1. Directory Structure

```text
/server
  /prisma
    schema.prisma         # Single source of truth for database schema & relations
  /src
    /config               # Environment & system configurations
    /database             # Prisma client instance & seed scripts
    /middleware           # Global middleware: auth, rbac, validation, rate limiting, error handling
    /modules              # Domain modules (routes, controller, service, validator)
      /auth
      /staff
      /products           # Reference implementation
        product.routes.js     # Route definitions, auth & RBAC middleware, validation attachments
        product.controller.js # Request parsing & HTTP response formatting
        product.service.js    # Business logic, Prisma queries, Decimal calculations
        product.validator.js  # Zod validation schemas for body/query/params
    /utils                # Standardized errors, pagination helper, mailer
    app.js                # Express app setup (helmet, cors, morgan, json)
    routes.js             # Central router mounted at /api/v1
    index.js              # Server entrypoint

/client
  /src
    /api                  # Axios API wrappers (client.js with JWT interceptor & 401 redirect)
    /components           # Reusable UI components (Button, Input, Table, Badge, Modal, etc.)
    /config               # routesConfig.jsx & navConfig.js
    /context              # AuthContext & ToastContext
    /layouts              # AppLayout (Sidebar, Topbar, Breadcrumbs)
    /pages
      /auth               # Login, Signup, Forgot, Reset
      /products           # Reference module UI (ProductListPage, ProductModal)
      /staff              # Staff directory & provision modal
```

---

## 2. Backend Conventions

### Route Registration
All API endpoints live under `/api/v1`. Register new modules inside `server/src/routes.js`.

### Error Format
All errors return the standardized structure:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | CONFLICT | UNAUTHORIZED",
    "message": "Human-readable description",
    "fields": { "fieldName": "Field-specific error message" }
  }
}
```

### Money & Numbers
Always store monetary amounts using Prisma's `Decimal` type (`@db.Decimal(12, 2)`). Never use Javascript floating point math directly for billing calculations without converting to/from `Prisma.Decimal` or precision arithmetic.

### Reusable Pagination Helper
In queries that list records, use `parsePaginationParams` and `formatPaginatedResponse` from `server/src/utils/pagination.js`:
```javascript
const { page, limit, skip, search, orderBy } = parsePaginationParams(req.query);
// ... prisma findMany with skip, take: limit, where, orderBy ...
return formatPaginatedResponse({ data, total, page, limit });
```

### Role-Based Access Control (RBAC)
Protect endpoints using `authenticate` and `requireRole`:
```javascript
// Example: Admin has full access, Staff read-only, Customer none
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), controller.list);
router.post('/', authenticate, requireRole('ADMIN'), validate(createSchema), controller.create);
router.put('/:id', authenticate, requireRole('ADMIN'), validate(updateSchema), controller.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), controller.delete);
```

For customer-owned records (e.g. Subscriptions, Invoices), use the `checkOwnership(customer_id, req.user)` helper from `server/src/middleware/auth.js`.

---

## 3. Frontend Conventions

### Adding Routes & Nav Items
- Add new sidebar entries to `client/src/config/navConfig.js`. Define `roles: ['ADMIN', 'STAFF']` or `roles: ['CUSTOMER']`.
- Add route definitions to `client/src/config/routesConfig.jsx` wrapped with `<ProtectedRoute allowedRoles={[...]}>`.

### Status Badges
Status colors must match the project palette:
- **Draft**: Grey (`draft`)
- **Quotation**: Blue (`quotation`)
- **Confirmed**: Amber (`confirmed`)
- **Active / Paid**: Green (`active` or `paid`)
- **Closed / Overdue**: Red (`closed` or `overdue`)

Usage:
```jsx
<Badge status="active">Active</Badge>
<Badge status={item.status} />
```

### Form Handling & Validation
Always use `react-hook-form` with `@hookform/resolvers/zod` matching the backend validation schema.

