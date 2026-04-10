# Shane Inventory Management Platform - Design Specification

## Overview

A production-ready, multi-tenant inventory management platform inspired by a Power Platform implementation, rebuilt as a containerized web application. The system manages the full inventory lifecycle: vendor management, procurement, order receiving with AI-powered packing slip extraction, asset tagging via barcode scanning, and a conversational AI assistant for natural language inventory interactions.

**Target audience:** Fortune 100/500 companies needing a bespoke inventory management solution.

**Deployment model:** Single Docker container with mounted volume for file persistence. SQLite database with a clear migration path to PostgreSQL via Prisma ORM abstraction.

---

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | ShadCN native home, SSR/SSG, API routes for backend logic, single deployable unit |
| Language | TypeScript | Type safety across full stack |
| Database | SQLite (via Prisma ORM) | Portable, zero-config; Prisma enables Postgres swap with config change |
| Auth | NextAuth.js (v5) | Credentials provider + extensible for SSO/LDAP/SAML |
| UI Components | ShadCN + Radix UI + Tailwind CSS | Fortune 500 polish, accessible, consistent design system |
| AI | OpenAI API (GPT-5.4-nano) | Packing slip extraction (Vision), conversational agent, smart suggestions |
| PDF Generation | @react-pdf/renderer | Purchase orders, inventory reports |
| Barcode Scanning | html5-qrcode | Browser-native, works on mobile without native app |
| Image Assets | Pexels API | Professional photography for UI enhancement |
| Container | Docker | Single container, volume mount for /data (DB, uploads, generated files) |
| Email | Nodemailer (SMTP configurable) | Purchase order delivery to vendors |

### Container Architecture

```
Docker Container
├── Next.js Application (port 3000)
├── /app/data/          (mounted volume)
│   ├── inventory.db    (SQLite database)
│   ├── uploads/        (packing slip photos)
│   ├── generated/      (PDFs, exports)
│   └── backups/        (automated DB snapshots)
└── /app/public/assets/ (static images from Pexels)
```

**Volume mount:** `-v /host/path/data:/app/data`

This ensures database persistence, uploaded files, and generated documents survive container restarts/upgrades.

### Multi-Tenancy Model

Row-level tenant isolation. Every data table includes a `tenantId` foreign key. All queries are automatically scoped via Prisma middleware that injects the tenant filter. No data leakage between organizations.

```
Tenant A ─┐
           ├─ Same database, same tables
Tenant B ─┘   Every row tagged with tenantId
               Prisma middleware enforces scope
```

**Super Admin** operates outside tenant scope for platform management.

---

## Data Model

### Core Entities

#### Tenant
```
- id: UUID (primary key)
- name: string
- slug: string (unique, URL-safe)
- logoUrl: string (nullable)
- settings: JSON (branding, preferences)
- isActive: boolean
- createdAt, updatedAt: datetime
```

#### User
```
- id: UUID
- tenantId: UUID (FK -> Tenant)
- email: string (unique per tenant)
- passwordHash: string
- firstName, lastName: string
- role: enum (SUPER_ADMIN, ORG_ADMIN, MANAGER, WAREHOUSE_STAFF)
- avatarUrl: string (nullable)
- isActive: boolean
- lastLoginAt: datetime (nullable)
- createdAt, updatedAt: datetime
```

#### Vendor
```
- id: UUID
- tenantId: UUID (FK -> Tenant)
- name: string
- contactName: string (nullable)
- email: string
- phone: string (nullable)
- address: string (nullable)
- city, state, zip, country: string (nullable)
- website: string (nullable)
- notes: text (nullable)
- isActive: boolean
- rating: decimal (nullable, 1-5)
- createdAt, updatedAt: datetime
```

#### ItemCategory
```
- id: UUID
- tenantId: UUID
- name: string
- description: string (nullable)
- iconName: string (nullable, maps to Lucide icon)
- createdAt, updatedAt: datetime
```

#### Item (Catalog Item)
```
- id: UUID
- tenantId: UUID
- vendorId: UUID (FK -> Vendor)
- categoryId: UUID (FK -> ItemCategory, nullable)
- name: string
- sku: string (nullable)
- description: text (nullable)
- unitPrice: decimal
- imageUrl: string (nullable)
- externalId: string (nullable, from API import)
- isActive: boolean
- createdAt, updatedAt: datetime
```

#### PurchaseOrder
```
- id: UUID
- tenantId: UUID
- orderNumber: string (auto-generated, tenant-scoped sequence)
- vendorId: UUID (FK -> Vendor)
- createdById: UUID (FK -> User)
- approvedById: UUID (FK -> User, nullable)
- status: enum (DRAFT, PENDING_APPROVAL, APPROVED, SUBMITTED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED)
- reason: text (nullable)
- subtotal: decimal
- tax: decimal
- total: decimal
- pdfUrl: string (nullable)
- submittedAt: datetime (nullable)
- approvedAt: datetime (nullable)
- notes: text (nullable)
- createdAt, updatedAt: datetime
```

#### PurchaseOrderLine
```
- id: UUID
- purchaseOrderId: UUID (FK -> PurchaseOrder)
- itemId: UUID (FK -> Item)
- quantity: integer
- unitPrice: decimal
- totalPrice: decimal
- quantityReceived: integer (default 0)
- createdAt, updatedAt: datetime
```

#### Asset (Inventory Instance)
```
- id: UUID
- tenantId: UUID
- itemId: UUID (FK -> Item)
- purchaseOrderId: UUID (FK -> PurchaseOrder, nullable)
- assetTag: string (unique per tenant, barcode value)
- serialNumber: string (nullable)
- status: enum (AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, LOST)
- assignedToId: UUID (FK -> User, nullable)
- assignedAt: datetime (nullable)
- location: string (nullable)
- notes: text (nullable)
- createdAt, updatedAt: datetime
```

#### ReceivingSession
```
- id: UUID
- tenantId: UUID
- purchaseOrderId: UUID (FK -> PurchaseOrder)
- receivedById: UUID (FK -> User)
- packingSlipImageUrl: string (nullable)
- aiExtractionData: JSON (nullable, raw AI response)
- status: enum (IN_PROGRESS, COMPLETED, CANCELLED)
- completedAt: datetime (nullable)
- createdAt, updatedAt: datetime
```

#### AuditLog
```
- id: UUID
- tenantId: UUID
- userId: UUID (FK -> User)
- action: string (e.g., "ASSET_CREATED", "ORDER_SUBMITTED")
- entityType: string (e.g., "Asset", "PurchaseOrder")
- entityId: UUID
- details: JSON (before/after state)
- ipAddress: string (nullable)
- createdAt: datetime
```

#### Notification
```
- id: UUID
- tenantId: UUID
- userId: UUID (FK -> User, recipient)
- type: enum (ORDER_STATUS, LOW_STOCK, APPROVAL_REQUIRED, ASSET_ASSIGNED, SYSTEM)
- title: string
- message: text
- isRead: boolean (default false)
- actionUrl: string (nullable)
- createdAt: datetime
```

#### ChatConversation
```
- id: UUID
- tenantId: UUID
- userId: UUID (FK -> User)
- title: string (nullable, auto-generated)
- createdAt, updatedAt: datetime
```

#### ChatMessage
```
- id: UUID
- conversationId: UUID (FK -> ChatConversation)
- role: enum (USER, ASSISTANT, SYSTEM)
- content: text
- toolCalls: JSON (nullable, actions taken by AI)
- createdAt: datetime
```

#### SystemConfig
```
- id: UUID
- key: string (unique, e.g., "openai_api_key", "smtp_host")
- value: text (AES-256-GCM encrypted for secrets, plaintext for non-sensitive)
- isSecret: boolean
- category: string (e.g., "ai", "email", "integrations", "platform")
- description: string (nullable, human-readable label)
- createdAt, updatedAt: datetime
```

#### SetupState
```
- id: integer (always 1, singleton)
- isSetupComplete: boolean
- setupCompletedAt: datetime (nullable)
- setupCompletedByUserId: UUID (nullable)
- encryptionKeySalt: bytes (Argon2id salt)
- encryptionKeyHash: bytes (for vault key verification)
- createdAt, updatedAt: datetime
```

### Relationships Diagram

```
Tenant
 ├── User (many)
 ├── Vendor (many)
 │    └── Item (many)
 │         └── PurchaseOrderLine (many)
 │              └── PurchaseOrder (parent)
 ├── ItemCategory (many)
 ├── PurchaseOrder (many)
 │    ├── PurchaseOrderLine (many)
 │    └── ReceivingSession (many)
 ├── Asset (many)
 │    ├── linked to Item
 │    ├── linked to PurchaseOrder (origin)
 │    └── assigned to User (nullable)
 ├── AuditLog (many)
 ├── Notification (many)
 └── ChatConversation (many)
      └── ChatMessage (many)
```

---

## Module Specifications

### Module 1: Dashboard

**Purpose:** At-a-glance operational overview with actionable insights.

**KPI Cards:**
- Total Assets (count by status)
- Pending Orders (awaiting approval or receiving)
- Inventory Value (sum of asset values)
- Low Stock Alerts (categories below threshold)

**Widgets:**
- Recent Activity feed (from AuditLog)
- Orders by Status (donut chart)
- Inventory by Category (bar chart)
- Pending Approvals (action list for Managers)
- Top Vendors by Order Volume

**Behavior:**
- Auto-refreshes every 60 seconds
- Widgets are role-aware (Warehouse Staff sees receiving queue; Managers see approvals)
- Click-through on any KPI navigates to the relevant module with filters applied

### Module 2: Vendor Management

**Purpose:** Complete vendor lifecycle management.

**Views:**
- Grid view (default): Card layout with vendor logo/avatar, name, rating, contact, order count
- Table view: Dense data table with sorting, filtering, pagination

**CRUD Operations:**
- Create vendor with full contact details
- Edit inline or via detail drawer
- Soft delete (deactivate, never hard delete due to audit requirements)
- Vendor detail page: contact info, order history, item catalog, performance metrics

**Features:**
- Star rating system (1-5)
- Quick actions: New Order, View Items, Email Vendor
- Search and filter by name, category, rating, active status
- Export vendor list (CSV)

### Module 3: Procurement (Purchase Orders)

**Purpose:** End-to-end purchase order lifecycle.

**Workflow:**
```
DRAFT -> PENDING_APPROVAL -> APPROVED -> SUBMITTED -> PARTIALLY_RECEIVED -> RECEIVED
                                  \-> CANCELLED (at any pre-submitted stage)
```

**Create Order Flow:**
1. Select vendor (dropdown with search)
2. Enter reason/notes
3. Add line items from vendor's catalog (editable grid)
4. Quantities and prices auto-calculate totals
5. Save as Draft or Submit for Approval

**Item Catalog Management:**
- Manual item creation (name, SKU, price, category, vendor)
- **API Import:** "Add from Online Catalog" button triggers a server-side API call to a product catalog API, returns items, user selects which to import. Uses a configurable external API endpoint per tenant.
- Item search and filtering
- Category management

**PDF Generation:**
- Branded purchase order PDF with tenant logo, vendor details, line items, totals
- Stored in /data/generated/
- Auto-attached to submission email

**Email to Vendor:**
- On "Submit Order," generates PDF, sends email via SMTP
- Configurable email templates per tenant

**Approval Workflow:**
- Orders over a configurable threshold require Manager approval
- Approval request creates a Notification
- Manager can approve/reject with comments
- Approval recorded in AuditLog

### Module 4: Receiving & Asset Tagging

**Purpose:** Mobile-optimized workflow for receiving shipments and tagging assets.

**Responsive design priority:** This module is mobile-first. The layout adapts but the primary usage is on phones/tablets at a warehouse dock.

**Workflow:**
1. **Select Order** - List of orders with status SUBMITTED or PARTIALLY_RECEIVED
2. **Capture Packing Slip** - Camera capture or file upload
3. **AI Extraction** - Photo sent to OpenAI Vision API with a structured prompt:
   - Extract order number, vendor name, line items (name, quantity, serial numbers)
   - Return structured JSON
   - Display extracted data for user verification/correction
4. **Asset Tagging** - For each line item:
   - Show item details and expected quantity
   - Barcode scanner activates (html5-qrcode)
   - Scan physical asset tag sticker
   - Asset record created with tag, serial, status=AVAILABLE
   - Visual progress indicator (X of Y tagged)
5. **Complete Receiving** - All items tagged, session marked complete
   - PurchaseOrder status updated (PARTIALLY_RECEIVED or RECEIVED)
   - Assets created in inventory with status AVAILABLE
   - AuditLog entries created

**AI Prompt Strategy:**
- System prompt with strict JSON output format
- Few-shot examples for common packing slip formats
- Handles handwritten, torn, or low-quality images gracefully
- Confidence scoring on extracted fields

### Module 5: Inventory Management

**Purpose:** Full asset lifecycle tracking and management.

**Views:**
- Table view (default): Sortable, filterable data table with bulk actions
- Grid view: Visual card layout with item images

**Asset Lifecycle:**
```
AVAILABLE -> ASSIGNED -> AVAILABLE (returned)
AVAILABLE -> IN_MAINTENANCE -> AVAILABLE (repaired)
ANY -> RETIRED
ANY -> LOST
```

**Features:**
- Advanced filtering: by status, category, vendor, assigned user, date range, location
- Bulk operations: assign, change status, export selection
- Asset detail page: full history (from AuditLog), current assignment, origin PO, maintenance log
- Global search across asset tag, serial number, item name
- Low stock alerts: configurable thresholds per category
- Export: CSV, PDF inventory report

**Assignment Flow:**
- Search for user, assign asset, record in AuditLog
- Assigned user receives Notification
- Return flow: unassign, status back to AVAILABLE

### Module 6: AI Assistant

**Purpose:** Natural language interface for inventory operations.

**Embedded Panel (available on every page):**
- Slide-out drawer from right side
- Persistent across navigation
- Quick queries: "Any laptops available?", "What's on order from Dell?"
- Quick actions: claim an asset, check order status

**Dedicated Chat Page:**
- Full-page experience with conversation history
- Sidebar with past conversations
- Supports longer, multi-turn interactions
- Can execute complex queries with table/chart responses

**AI Capabilities (via OpenAI function calling):**
- `searchInventory(filters)` - Query assets by any combination of fields
- `getOrderStatus(orderNumber)` - Look up purchase order details
- `assignAsset(assetId, userId)` - Claim or assign an asset
- `getVendorInfo(vendorName)` - Vendor details and catalog
- `getStats()` - Dashboard-level metrics
- `createOrder(vendorId, items)` - Initiate a purchase order via chat

**Guardrails:**
- AI can only access data within user's tenant
- Destructive actions (assign, create order) require confirmation step
- All AI actions logged to AuditLog
- Rate limiting per user

---

## Cross-Cutting Concerns

### Notifications System
- In-app notification bell with unread count in header
- Notification dropdown with mark-as-read, click-through to relevant page
- Email notifications (configurable per user: all, critical only, none)
- Types: approval requests, order status changes, asset assignments, low stock, system alerts

### Audit Trail
- Every create, update, delete, status change logged
- Stores before/after state as JSON
- Filterable audit log page (Admin only)
- Retention: configurable, default unlimited for SQLite

### Search
- Global search bar in header
- Searches across: assets (tag, serial, name), vendors, orders, users
- Results grouped by entity type
- Keyboard shortcut: Cmd/Ctrl+K

### Export
- Every data table supports CSV export
- PDF reports: inventory summary, order history, vendor report
- Bulk export with current filters applied

### Branding & Theming
- Tenant-level branding: logo, primary color
- System-level theme: dark/light mode toggle
- Design language derived from PowerApps911:
  - Primary Green: #7ed321
  - Primary Purple: #742873
  - Dark text: #191919
  - Light backgrounds: #f5f5f5
  - Rounded buttons (pill shape)
  - Card-based layouts with subtle shadows
  - Roboto font family

### Responsive Design
- Desktop-first for management modules (Dashboard, Vendors, Procurement, Inventory)
- Mobile-first for field modules (Receiving & Asset Tagging)
- Breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)

---

## Synthetic Seed Data

The seed script generates realistic data for immediate demo-ability:

### Tenants
- **Acme Corporation** (primary demo tenant)
- **Globex Industries** (secondary, proves multi-tenancy)

### Users (per tenant)
- 1 Org Admin
- 2 Managers
- 4 Warehouse Staff
- Realistic names, emails

### Vendors (Acme tenant, 8 vendors)
- Dell Technologies (computers, servers)
- Cisco Systems (networking equipment)
- Ubiquiti (access points, switches)
- HP Inc. (printers, peripherals)
- Lenovo (laptops, monitors)
- Apple (mobile devices)
- Logitech (peripherals, accessories)
- APC by Schneider Electric (UPS, power)

### Items (40-60 catalog items across vendors)
- Realistic product names, SKUs, prices
- Categorized: Laptops, Desktops, Networking, Peripherals, Mobile, Power/UPS, Printers

### Purchase Orders (15-20 orders in various states)
- Mix of DRAFT, PENDING_APPROVAL, APPROVED, SUBMITTED, PARTIALLY_RECEIVED, RECEIVED
- Realistic order numbers, dates spread over 3 months
- Line items with quantities 1-10

### Assets (50-80 inventory items)
- Mix of statuses: AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED
- Realistic asset tags (e.g., ACM-2026-00001)
- Serial numbers
- Some assigned to users with assignment dates

### Audit Log Entries (200+ entries)
- Realistic action history matching the seed data state
- Timestamps spread over 3 months

### Notifications (20-30 across users)
- Mix of read/unread
- Various types matching order/asset activity

---

## Docker Configuration

### Dockerfile
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
ENV DATA_DIR=/app/data
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed:check && npm start"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  inventory:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/inventory.db
      - NEXTAUTH_URL=http://localhost:3000
      # Optional: for unattended container restarts without manual vault unlock
      # - VAULT_KEY=${VAULT_KEY}
    restart: unless-stopped
```

### Environment Variables (Minimal by Design)

Most configuration lives in the encrypted database, set via the Setup Wizard. Only infrastructure-level settings use env vars:

```
DATABASE_URL=file:/app/data/inventory.db
NEXTAUTH_URL=http://localhost:3000
VAULT_KEY=(optional, for unattended container starts - otherwise entered via UI on boot)
PORT=3000 (optional, default 3000)
```

All secrets (OpenAI API key, SMTP credentials, external API URLs) are stored encrypted in the SystemConfig table, configured through the Setup Wizard or Settings UI. No API keys or passwords in .env files.

---

## Navigation Structure

```
Sidebar (collapsible):
├── Dashboard
├── Vendors
│    ├── All Vendors
│    └── Add Vendor
├── Procurement
│    ├── Orders
│    ├── Create Order
│    └── Item Catalog
├── Receiving
│    └── Receive Shipment
├── Inventory
│    ├── All Assets
│    └── Categories
├── AI Assistant
├── Reports (future)
├── Settings
│    ├── Organization
│    ├── Users & Roles
│    ├── Notifications
│    └── Integrations
└── Audit Log (Admin only)
```

**Header:**
- Global search (Cmd+K)
- Notification bell with badge
- AI Assistant toggle button
- User avatar + dropdown (profile, theme toggle, logout)
- Tenant/org indicator

---

## Setup Wizard

On first launch (no database exists or database is empty), the application presents a guided setup wizard instead of the login screen. This eliminates the need for .env file configuration for secrets.

### Wizard Steps

**Step 1: Welcome & Platform Setup**
- Welcome screen with branding
- Set platform name
- Create master encryption key (derived from admin-provided passphrase via Argon2id)
- This key encrypts all sensitive data at rest

**Step 2: Admin Account**
- Create the first Super Admin account
- Email, password (with strength requirements), name

**Step 3: Organization Setup**
- Create the first tenant/organization
- Name, slug, optional logo upload

**Step 4: API Keys & Integrations**
- OpenAI API key (required)
- SMTP configuration for email (optional, can configure later)
- External catalog API URL (optional)
- All values encrypted with the master key before storage

**Step 5: CORS & Network Configuration**
- Default: wide open (`*`) for initial development/testing
- Option to specify allowed origins (comma-separated domain list)
- Applies uniformly across all API routes, WebSocket connections, and file serving
- Stored in SystemConfig, consumed by a single CORS middleware (not per-route)

**Step 6: Review & Launch**
- Summary of configuration
- "Launch" button initializes the system
- Seeds demo data if user opts in
- Redirects to login

### Configuration Storage

All configuration is stored in a `SystemConfig` table, encrypted at rest:

```
SystemConfig
- id: UUID
- key: string (unique, e.g., "openai_api_key", "smtp_host")
- value: text (AES-256-GCM encrypted)
- isSecret: boolean (determines if value is masked in UI)
- createdAt, updatedAt: datetime
```

The master encryption key is derived from the admin passphrase using Argon2id and stored nowhere. On each application start, the first authenticated Super Admin "unlocks" the vault by providing the passphrase. The derived key is held in memory only for the duration of the server process.

**Alternative for unattended restarts:** An optional `VAULT_KEY` environment variable can be provided as the sole .env secret, enabling the container to start without manual unlock. This is the only secret that ever touches an environment variable.

---

## Security Considerations (HIPAA-Adjacent Practices)

### Encryption at Rest
- **Database encryption:** SQLite database encrypted using SQLCipher (AES-256-CBC)
- **Field-level encryption:** Sensitive fields (API keys, SMTP passwords, vendor contact details marked as sensitive) encrypted with AES-256-GCM before storage
- **File encryption:** Uploaded packing slip images and generated PDFs encrypted at rest on the volume
- **Key management:** Master key derived from admin passphrase via Argon2id (memory-hard, resistant to GPU attacks)
- **Key rotation:** Support for re-encrypting all data with a new key via admin settings

### Authentication & Sessions
- Passwords hashed with bcrypt (12 rounds minimum)
- JWT sessions with HttpOnly, Secure, SameSite=Strict cookies
- Session timeout: configurable (default 30 minutes idle, 8 hours absolute)
- Account lockout after 5 failed attempts (15-minute cooldown)
- Password complexity requirements enforced

### Authorization
- CSRF protection via NextAuth
- Tenant isolation enforced at ORM middleware level (defense in depth)
- API routes validate session + role before processing
- Role-based access control on every endpoint and UI element

### Data Protection
- File uploads: size limits (10MB), type validation (images only for packing slips)
- AI inputs sanitized before sending to OpenAI
- Rate limiting on auth endpoints and AI chat
- No secrets in environment variables (except optional VAULT_KEY for unattended starts)
- Audit log for all data access and modifications
- PII handling: sensitive fields identified and encrypted

### Network Security
- HTTPS enforced (container should sit behind a TLS-terminating reverse proxy)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options, CSP
- CORS locked to configured origins

---

## Architecture Principles (Code + Design)

### Object-Oriented Code Architecture

All code follows strict OOP with centralized models. Write once, inherit many times.

**Base Classes (Server-Side):**
- `BaseService` - Common CRUD operations, tenant scoping, audit logging. Every domain service (VendorService, AssetService, etc.) extends this.
- `BaseRepository` - Prisma query patterns with automatic tenant filtering, pagination, sorting. Domain repositories inherit and add specific queries.
- `BaseController` (API route handlers) - Request validation, auth checks, error formatting. Domain handlers extend with specific logic.
- `EncryptionService` (singleton) - All encrypt/decrypt operations flow through one service. No scattered crypto calls.
- `ConfigService` (singleton) - Single source for all SystemConfig reads. Every part of the app gets config from here, never directly from DB or env.

**Base Classes (Client-Side):**
- `BaseApiClient` - Centralized fetch wrapper with auth headers, error handling, tenant context. All API calls flow through this.
- `BaseFormHandler` - Form state, validation, submission patterns. Individual forms extend with field definitions.

**Cross-Cutting Middleware Stack (applied once, inherited everywhere):**
1. CORS (from SystemConfig, single middleware)
2. Auth verification
3. Tenant context injection
4. Rate limiting
5. Audit logging
6. Error handling

No module re-implements any of these. They are composed once in the middleware chain.

### Object-Oriented Design Architecture (CSS/UI)

The same principle applies to design. Write once, inherit many times.

**Design Token Hierarchy:**
```
tokens/
  base.css          - Root variables: colors, spacing, radii, shadows, typography
  components.css    - Component-level tokens that reference base tokens
  themes/
    light.css       - Light theme overrides (just variable reassignments)
    dark.css        - Dark theme overrides (just variable reassignments)
```

**Tailwind Configuration:**
- All design tokens defined in `tailwind.config.ts` extending the theme
- Custom utility classes for recurring patterns (e.g., `.card-base`, `.input-base`, `.btn-base`)
- No magic numbers in components; everything references the token system

**ShadCN Component Customization:**
- Base ShadCN components customized once in `components/ui/`
- Application-level compound components (e.g., `DataTable`, `StatusBadge`, `KPICard`) compose from these base components
- Page-level components compose from application-level components
- Three-tier hierarchy: ShadCN primitives -> App components -> Page compositions

**CSS Rules:**
- No inline styles except for truly dynamic values (e.g., calculated positions)
- No duplicate color/spacing values; always reference tokens
- Component variants via Tailwind's `cva` (class-variance-authority), not conditional class strings
- Responsive behavior defined once per component via Tailwind breakpoints, not overridden per-page

---

## Future Enhancements (Out of Scope for POC)

- SSO/SAML integration
- PostgreSQL migration
- Advanced reporting and analytics
- Mobile native app (React Native)
- Webhook integrations
- Custom workflow builder
- Multi-language / i18n
- Barcode label printing
