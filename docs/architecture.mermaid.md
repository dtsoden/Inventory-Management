# Shane Inventory Architecture (authoritative)

This file is the source-of-truth architecture diagram for Shane Inventory. It is mirrored into the Docusaurus admin guide at `docs-site/docs/admin/architecture.md` and `docs-site/docs/admin/_architecture-diagram.md`.

## Runtime architecture

```mermaid
flowchart TB
    Browser["Browser (User / Admin)"]
    Scanner["Netum Barcode Scanner<br/>(Code 128 + QR)"]

    subgraph Edge["Edge"]
        Tunnel["Cloudflared Tunnel<br/>(HTTPS)"]
    end

    subgraph Docker["Docker Container (port 5600 to 3000)"]
        Start["start.sh entrypoint<br/>runtime SQLite migration<br/>(idempotent ALTER TABLE,<br/>adds Manufacturer, User.avatarUrl)"]

        subgraph Next["Next.js 15 (standalone)"]
            MW["middleware.ts<br/>JWT verify, CORS,<br/>/docs/admin ADMIN gate"]

            subgraph Pages["App Router Pages"]
                Auth["(authenticated) layout<br/>injects serverBranding<br/>into AppShell"]
                Header["Header<br/>Help icon dropdown<br/>(role-routed links)"]
                Setup["Setup wizard"]
            end

            subgraph API["API Route Handlers (/api/*)"]
                BaseApi["BaseApiHandler<br/>auth, audit, envelope"]
            end

            subgraph Services["Services (BaseService)"]
                ItemSvc["ItemService"]
                VendorSvc["VendorService"]
                MfgSvc["ManufacturerService"]
                POSvc["PurchaseOrderService"]
                AssetSvc["AssetService"]
                BrandSvc["BrandingService"]
                VaultSvc["EncryptionService<br/>AES-256-GCM<br/>PBKDF2 vault"]
                AssistSvc["AssistantService<br/>OpenAI tool use<br/>queryDatabase tool<br/>HTML sanitized output"]
                BarcodeSvc["Barcode module<br/>JsBarcode + qrcode-generator"]
            end

            subgraph Repos["Repositories (BaseRepository)"]
                ItemRepo["ItemRepository"]
                VendorRepo["VendorRepository"]
                MfgRepo["ManufacturerRepository"]
                PORepo["PurchaseOrderRepository"]
                AssetRepo["AssetRepository"]
                UserRepo["UserRepository"]
                CfgRepo["SystemConfigRepository"]
            end

            Prisma["Prisma 7 Client<br/>@libsql driver adapter"]
        end

        subgraph Docs["Docusaurus static site"]
            DocsBuild["docs-site build output<br/>served at /docs/*"]
            UserDocs["/docs/user/*"]
            AdminDocs["/docs/admin/*<br/>(ADMIN only)"]
            CompareDocs["/docs/comparison/*"]
        end

        SQLite[("SQLite<br/>/data/inventory.db<br/>(persistent volume)")]
    end

    OpenAI["OpenAI API<br/>chat.completions<br/>tool use"]

    Browser --> Tunnel
    Scanner --> Browser
    Tunnel --> Start
    Start --> Next
    Start --> SQLite

    Browser -->|page requests| MW
    MW --> Pages
    MW -->|role check| AdminDocs
    Pages --> API
    Header -.->|links to| Docs

    API --> BaseApi
    BaseApi --> ItemSvc
    BaseApi --> VendorSvc
    BaseApi --> MfgSvc
    BaseApi --> POSvc
    BaseApi --> AssetSvc
    BaseApi --> BrandSvc
    BaseApi --> VaultSvc
    BaseApi --> AssistSvc
    BaseApi --> BarcodeSvc

    Auth --> BrandSvc

    ItemSvc --> ItemRepo
    VendorSvc --> VendorRepo
    MfgSvc --> MfgRepo
    POSvc --> PORepo
    AssetSvc --> AssetRepo
    BrandSvc --> CfgRepo
    VaultSvc --> CfgRepo
    AssistSvc --> ItemRepo
    AssistSvc --> AssetRepo
    AssistSvc --> PORepo

    ItemRepo --> Prisma
    VendorRepo --> Prisma
    MfgRepo --> Prisma
    PORepo --> Prisma
    AssetRepo --> Prisma
    UserRepo --> Prisma
    CfgRepo --> Prisma

    Prisma --> SQLite

    AssistSvc -->|HTTPS| OpenAI

    DocsBuild --- UserDocs
    DocsBuild --- AdminDocs
    DocsBuild --- CompareDocs
    Next -.->|serves static| Docs
```

## Traceability chain

```mermaid
flowchart LR
    M[Manufacturer] --> V[Vendor]
    V --> I[Item]
    I --> POL[PurchaseOrderLine]
    PO[PurchaseOrder] --> POL
    POL --> A[Asset]
```

## Notes on recent changes

- Manufacturer entity added upstream of Vendor in the traceability chain.
- `User.avatarUrl` column added for profile avatars.
- Runtime SQLite migration now lives in `docker-init/start.sh` (no Prisma in the container; idempotent `ALTER TABLE`).
- Docusaurus documentation site is built into the same Docker image and served by Next.js at `/docs/*`, with `/docs/admin/*` gated by middleware to the ADMIN role only.
- Header has a Help icon dropdown that role-routes to `/docs/user`, `/docs/admin`, and `/docs/comparison`.
- Multi-tenancy has been removed; the app is single-tenant.
- `AssistantService` uses OpenAI tool use with a `queryDatabase` function and renders sanitized HTML output.
- Server-side branding injection in the authenticated layout eliminates color/logo flash on first paint.
- Encrypted `SystemConfig` vault (AES-256-GCM, PBKDF2 from a passphrase) stores the OpenAI key, SMTP credentials, and other secrets.
- Real Code 128 barcodes and QR codes are generated with `JsBarcode` and `qrcode-generator` for the Netum scanner workflow.
