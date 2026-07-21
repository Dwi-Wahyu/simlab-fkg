# Graph Report - /home/dwiwahyuilahi/Personal/Projects/FKG/simlab/simlab-fkg  (2026-07-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1486 nodes · 3113 edges · 174 communities (81 shown, 93 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82bb17fc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- user
- createAuditLog
- schema.ts
- equipment
- db
- inventaris-dfrl.ts
- Database Table Definitions
- $lib/utils
- auth.schema.ts
- $lib/components/ui/card
- index.ts
- $lib/components/ui/input
- Database Management Scripts
- maintenance
- $lib/components/ui/dropdown-menu
- $lib/components/ui/button
- Practicum Configuration
- Practicum Group Distribution
- index.ts
- Inventory Preparation Scripts
- UI Animation and Overlays
- $lib/components/ui/select
- $lib/components/toast
- dependencies
- chart-utils.ts
- generateLogbook.ts
- TypeScript and Vite Configuration
- Equipment Management UI
- globals
- Student Scoring UI
- Maintenance Request UI
- Data Table Components
- $lib/components/ui/tooltip/index.js
- UI Component Configuration
- devDependencies
- +page.svelte
- Scoring Criteria Management
- $lib/components/ui/accordion
- Toast State Management
- Database Migration Schema
- App Layout and PWA
- Popover UI Components
- Sidebar State Management
- Package Metadata
- Module Definition Logic
- Block Mapping Data
- Department Seed Data
- Student Lending UI
- Student Group Migration
- Equipment and Lab Migration
- Linting and Svelte Config
- Project Documentation Visuals
- $lib/components/ui/dialog
- Deployment and Documentation
- Practicum Module Migration
- Lending Migration
- Lending Scheduler Migration
- Welcome Component Tests
- Global Type Definitions
- Sample Item Data
- $lib/components/ui/tabs
- Greeting Utility Tests
- Generated File Server
- Uploads File Server
- index.ts
- CSL Assessment Generation
- index.ts
- Biome Linting Tool
- @lucide/svelte/icons/check
- Environment Variable Tool
- Maintenance Migration
- Stock Batch Migration
- Lending Migration
- Audit Checklist Migration
- Criteria Band Migration
- Practicum Series Migration
- Practicum Series Migration
- @lucide/svelte
- Drizzle ORM Library
- ESLint Compatibility
- ESLint Prettier Config
- Mock Data Generation
- Figtree Font
- Inter Font
- Public Sans Font
- Internationalized Date Library
- Theme Mode Watcher
- Tailwind Animation Plugin
- Bits UI Library
- Zip Compression Library
- End-to-End Testing
- Code Formatting Tool
- Svelte Formatting Plugin
- Tailwind Formatting Plugin
- Svelte Framework
- Svelte Type Checking
- Svelte Toast Notifications
- SvelteKit Node Adapter
- SvelteKit Framework
- Svelte Vite Plugin
- Tailwind CSS Styling
- Tailwind Forms Plugin
- Tailwind Typography Plugin
- TanStack Table Core
- TypeScript Execution Utility
- D3 Scale Type Definitions
- D3 Shape Type Definitions
- ExcelJS Type Definitions
- Node.js Type Definitions
- TypeScript Language
- TypeScript Linting
- Vite Build Tool
- Vitest Testing Framework
- Vitest Browser Playwright
- Vitest Svelte Testing
- Authentication Client Logic
- Simlab Implementation Protocol
- Gemini MCP Instructions
- Lucide Svelte Icons
- Application Shell Component
- Small Application Icon
- Large Application Icon
- Dental Tools Asset
- Warehouse Login Background
- Microscope Login Background
- Dental Lab Illustration
- Simlab Brand Logo
- University Brand Logo
- Transparent Dental Illustration
- Search Engine Configuration
- Error Notification UI
- Info Notification UI
- Success Notification UI
- Warning Notification UI
- d3-scale
- 0014_lying_maelstrom.sql
- SvelteKit PWA Plugin
- mahasiswa.ts
- +server.ts
- laboratorium.ts
- Summary of Changes for INSTRUKSI_PERBAIKAN_INVENTARIS.md
- drizzle-kit
- accessControl
- +page.server.ts
- @better-auth/cli

## God Nodes (most connected - your core abstractions)
1. `$lib/utils` - 140 edges
2. `db` - 101 edges
3. `$lib/components/ui/button` - 86 edges
4. `$lib/components/ui/card` - 83 edges
5. `$lib/components/ui/input` - 54 edges
6. `$lib/components/ui/select` - 53 edges
7. `$lib/components/ui/label/index.js` - 44 edges
8. `$lib/components/ui/table` - 44 edges
9. `$lib/components/NotificationDialog.svelte` - 37 edges
10. `$lib/components/ui/badge` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Inventory Dashboard UI Screenshot` --conceptually_related_to--> `Distribution Flow Logic`  [INFERRED]
  static/layout-example.png → flow/distribusi.md
- `Military Base Illustration Background` --conceptually_related_to--> `Lending Flow Logic`  [INFERRED]
  static/backgrounds/login.png → flow/lending.md
- `Inventory Dashboard UI Screenshot` --conceptually_related_to--> `Lending Flow Logic`  [INFERRED]
  static/layout-example.png → flow/lending.md
- `seedAlat()` --references--> `xlsx`  [EXTRACTED]
  src/lib/server/db/seeds/inventaris-preparasi.ts → package.json
- `seedBahan()` --references--> `xlsx`  [EXTRACTED]
  src/lib/server/db/seeds/inventaris-preparasi.ts → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Inventory Management Logic** — flow_distribusi, flow_lending [EXTRACTED 1.00]
- **Deployment Infrastructure** — deployment, docker_compose, readme [EXTRACTED 0.90]

## Communities (174 total, 93 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.13
Nodes (18): instruktur, kepalaLab, koordinator, laboran, peneliti, spmi, statement, superadmin (+10 more)

### Community 1 - "user"
Cohesion: 0.08
Nodes (30): ./$types, ./$types, $lib/rekap/buildRekapMatrix, buildRekapColumns(), RekapColumn, RekapModule, RekapScheduleGroup, RekapScheduleInput (+22 more)

### Community 2 - "createAuditLog"
Cohesion: 0.06
Nodes (41): ./$types, ./$types, ./$types, ./$types, ./$types, AuditParams, createAuditLog(), approval (+33 more)

### Community 3 - "schema.ts"
Cohesion: 0.03
Nodes (57): approvalRelations, auditLogRelations, blockRelations, departmentRelations, equipmentCategoryRelations, equipmentRelations, inventoryReportRelations, itemRelations (+49 more)

### Community 4 - "equipment"
Cohesion: 0.06
Nodes (22): ./$types, equipment, equipmentCategory, item, lending, lendingItem, movement, stock (+14 more)

### Community 5 - "db"
Cohesion: 0.09
Nodes (8): db, auditChecklist, practicumLogbookGeneration, actions, actions, actions, actions, GENERATED_DIR

### Community 6 - "inventaris-dfrl.ts"
Cohesion: 0.07
Nodes (43): xlsx, xlsx, categoryCache, classifyAlatCondition(), clean(), client, db, DRY_RUN (+35 more)

### Community 7 - "Database Table Definitions"
Cohesion: 0.12
Nodes (43): `account`, `api_key`, `approval`, `audit_checklist`, `audit_log`, `block`, `department`, `equipment` (+35 more)

### Community 8 - "$lib/utils"
Cohesion: 0.07
Nodes (8): svelte/elements, @/components/ui/input/input.svelte, @/components/ui/skeleton/skeleton.svelte, $lib/utils, WithElementRef, WithoutChild, WithoutChildren, WithoutChildrenOrChild

### Community 9 - "auth.schema.ts"
Cohesion: 0.11
Nodes (12): account, accountRelations, apiKey, apiKeyRelations, laboratoriumMemberRelations, sessionRelations, softDeleteColumns, verification (+4 more)

### Community 10 - "$lib/components/ui/card"
Cohesion: 0.12
Nodes (28): $lib/components/dashboard/InstrukturDashboard.svelte, $lib/components/dashboard/KepalaLabDashboard.svelte, $lib/components/dashboard/KoordinatorDashboard.svelte, $lib/components/dashboard/LaboranDashboard.svelte, $lib/components/dashboard/PenelitiDashboard.svelte, $lib/components/dashboard/skeletons/InstrukturSkeleton.svelte, $lib/components/dashboard/skeletons/KepalaLabSkeleton.svelte, $lib/components/dashboard/skeletons/KoordinatorSkeleton.svelte (+20 more)

### Community 11 - "index.ts"
Cohesion: 0.07
Nodes (7): ./context.svelte, ./constants.js, ./context.svelte.js, Getter, SidebarStateProps, useSidebar(), state

### Community 12 - "$lib/components/ui/input"
Cohesion: 0.18
Nodes (7): $app/forms, $app/navigation, $app/paths, $lib/components/NotificationDialog.svelte, $lib/components/ui/input, $lib/components/ui/label/index.js, $lib/components/ui/textarea

### Community 13 - "Database Management Scripts"
Cohesion: 0.07
Nodes (29): scripts, auth:schema, build, check, check:watch, db:generate, db:migrate, db:push (+21 more)

### Community 14 - "maintenance"
Cohesion: 0.07
Nodes (13): maintenance, maintenanceCost, maintenanceCostItem, submitMaintenanceForApproval(), actions, actions, actions, actions (+5 more)

### Community 16 - "$lib/components/ui/button"
Cohesion: 0.14
Nodes (8): $lib/components/Avatar.svelte, $lib/components/ConfirmationDialog.svelte, $lib/components/NotificationBell.svelte, $lib/components/PWAInstallButton.svelte, $lib/components/ui/button, $lib/components/ui/table, homePath, $app/state

### Community 17 - "Practicum Configuration"
Cohesion: 0.10
Nodes (13): block, department, practicumCriteriaBand, practicumLogbookTemplate, actions, ALLOWED_ROLES, load(), TEMPLATE_DIR (+5 more)

### Community 18 - "Practicum Group Distribution"
Cohesion: 0.08
Nodes (22): assignedElsewhere(), availableGroupsFor(), blockTriggerContent, classTriggerContent, filteredInstructors, filteredModules, groupsForClass, hasUnassignedGroups (+14 more)

### Community 19 - "index.ts"
Cohesion: 0.10
Nodes (4): @lucide/svelte/icons/chevron-down, @lucide/svelte/icons/chevron-left, @internationalized/date, @/components/ui/button/button.svelte

### Community 20 - "Inventory Preparation Scripts"
Cohesion: 0.15
Nodes (24): AlatEntry, buildMergeGroupMap(), classifyWord(), clean(), client, db, DRY_RUN, FILE_PATH (+16 more)

### Community 21 - "UI Animation and Overlays"
Cohesion: 0.11
Nodes (14): svelte/easing, ./toast.svelte, ./ui/sidebar/context.svelte, $lib/components/Modal.svelte, $lib/components/Sidebar.svelte, opacity, isGroupActive, isMobile (+6 more)

### Community 22 - "$lib/components/ui/select"
Cohesion: 0.15
Nodes (7): $lib/components/ui/searchable-select, $lib/components/ui/select, $lib/utils/item-badge, isWithinNewItemWindow(), shouldShowNewBadge(), filteredGroups, uniqueLabs

### Community 23 - "$lib/components/toast"
Cohesion: 0.19
Nodes (7): @sveltejs/kit, $lib/components/toast, toast, ToastItem, ToastOptions, ToastPosition, ToastType

### Community 24 - "dependencies"
Cohesion: 0.10
Nodes (21): @better-auth/api-key, clsx, d3-shape, docx-templates, exceljs, dependencies, @better-auth/api-key, clsx (+13 more)

### Community 25 - "chart-utils.ts"
Cohesion: 0.12
Nodes (8): themeContents, ChartConfig, chartContextKey, ChartContextValue, ExtractSnippetParams, getPayloadConfigFromPayload(), THEMES, TooltipPayload

### Community 26 - "generateLogbook.ts"
Cohesion: 0.15
Nodes (17): practicumLogbookTemplateField, BuilderContext, buildLogbookRowspanTableXml(), convertDocxToPdf(), escapeXml(), GENERATED_DIR, generateLogbookForSeries(), generateReport (+9 more)

### Community 27 - "TypeScript and Vite Configuration"
Cohesion: 0.10
Nodes (18): ./.svelte-kit/tsconfig.json, vite/client, vite-plugin-pwa/client, vite-plugin-pwa/info, @vite-pwa/sveltekit, compilerOptions, allowJs, checkJs (+10 more)

### Community 28 - "Equipment Management UI"
Cohesion: 0.10
Nodes (16): categoryTrigger, conditionOptions, conditionTrigger, createdAt, dialogConfig, equipmentTypeOptions, equipTrigger, labTrigger (+8 more)

### Community 30 - "Student Scoring UI"
Cohesion: 0.11
Nodes (15): allColumns, angkatan, currentPage, emptyStateMessage, filteredStudents, firstSchedule, groupedColumns, instructorTrigger (+7 more)

### Community 31 - "Maintenance Request UI"
Cohesion: 0.12
Nodes (11): for(), formData, maintenanceTypes, notificationActionLabel, notificationDescription, notificationTitle, selectedStatusTrigger, selectedTechnicianTrigger (+3 more)

### Community 32 - "Data Table Components"
Cohesion: 0.17
Nodes (10): svelte/attachments, createSvelteTable(), Intersection, MaybeThunk, mergeObjects(), renderComponent(), RenderComponentConfig, renderSnippet() (+2 more)

### Community 34 - "UI Component Configuration"
Cohesion: 0.15
Nodes (12): aliases, components, hooks, lib, ui, utils, registry, $schema (+4 more)

### Community 35 - "devDependencies"
Cohesion: 0.15
Nodes (13): better-auth, eslint, @eslint/js, eslint-plugin-svelte, mysql2, devDependencies, better-auth, eslint (+5 more)

### Community 38 - "Scoring Criteria Management"
Cohesion: 0.18
Nodes (5): blockTrigger, componentOptions, componentTrigger, scoringModeOptions, scoringModeTrigger

### Community 41 - "Database Migration Schema"
Cohesion: 0.22
Nodes (8): `equipment`, `item`, `kelompok_mahasiswa`, `laboratorium`, `practicum_module`, `practicum_schedule`, `stock_batch`, `user`

### Community 42 - "App Layout and PWA"
Cohesion: 0.22
Nodes (4): $lib/assets/favicon.svg, ./layout.css, @/components/NavProgress.svelte, pulse

### Community 44 - "Sidebar State Management"
Cohesion: 0.25
Nodes (3): $lib/components/ui/sidebar/context.svelte.js, SIDEBAR_KEY, SidebarState

### Community 45 - "Package Metadata"
Cohesion: 0.29
Nodes (6): name, overrides, @better-auth/core, private, type, version

### Community 46 - "Module Definition Logic"
Cohesion: 0.29
Nodes (4): client, db, ModuleDefinition, MODULES

### Community 47 - "Block Mapping Data"
Cohesion: 0.40
Nodes (3): BLOK_MAPPINGS, client, db

### Community 48 - "Department Seed Data"
Cohesion: 0.40
Nodes (3): client, db, DEPARTEMEN_SEEDS

### Community 50 - "Student Group Migration"
Cohesion: 0.83
Nodes (3): `kelompok_mahasiswa`, `kelompok_mahasiswa_member`, `practicum_schedule_instructor`

### Community 51 - "Equipment and Lab Migration"
Cohesion: 0.50
Nodes (3): `equipment`, `laboratorium`, `user`

### Community 53 - "Project Documentation Visuals"
Cohesion: 0.67
Nodes (4): Distribution Flow Logic, Lending Flow Logic, Military Base Illustration Background, Inventory Dashboard UI Screenshot

### Community 55 - "Deployment and Documentation"
Cohesion: 0.67
Nodes (3): Deployment Guide, Docker Compose Configuration, Project README

### Community 66 - "index.ts"
Cohesion: 0.25
Nodes (9): allAuthRoles, auth, client, db, main(), main(), seedLaboratorium(), main() (+1 more)

### Community 67 - "CSL Assessment Generation"
Cohesion: 0.31
Nodes (8): buildCslBlockXml(), CslModuleData, escapeXml(), generateCslAssessmentForStudent(), GENERATED_DIR, generateReport, TEMPLATE_DIR, GET()

### Community 68 - "index.ts"
Cohesion: 0.05
Nodes (25): ./$types, ./$types, ./$types, ./$types, auth, laboratorium, laboratoriumMember, session (+17 more)

### Community 167 - "mahasiswa.ts"
Cohesion: 0.31
Nodes (8): allAuthRoles, auth, client, db, main(), seedKelompokMahasiswa(), seedLogbooks(), seedTestingPeneliti()

### Community 168 - "+server.ts"
Cohesion: 0.11
Nodes (9): ./$types, ./$types, ./$types, inventoryReport, practicumLogbook, safetyIncident, wasteLog, actions (+1 more)

### Community 169 - "laboratorium.ts"
Cohesion: 0.33
Nodes (5): allAuthRoles, auth, client, db, LABORATORIUM_SEEDS

### Community 170 - "Summary of Changes for INSTRUKSI_PERBAIKAN_INVENTARIS.md"
Cohesion: 0.40
Nodes (4): Impact on Graph:, Logic Changes:, Modified Files:, Summary of Changes for INSTRUKSI_PERBAIKAN_INVENTARIS.md

### Community 172 - "accessControl"
Cohesion: 0.60
Nodes (4): accessControl, requireAuth(), requirePermission(), requireRole()

## Knowledge Gaps
- **484 isolated node(s):** `$schema`, `css`, `baseColor`, `components`, `utils` (+479 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **93 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `d3-scale`, `inventaris-dfrl.ts`, `Package Metadata`, `@lucide/svelte`, `Tailwind Animation Plugin`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `xlsx` connect `inventaris-dfrl.ts` to `dependencies`, `Inventory Preparation Scripts`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `globals`, `SvelteKit PWA Plugin`, `drizzle-kit`, `Package Metadata`, `@better-auth/cli`, `Biome Linting Tool`, `Environment Variable Tool`, `Drizzle ORM Library`, `ESLint Compatibility`, `ESLint Prettier Config`, `Mock Data Generation`, `Figtree Font`, `Inter Font`, `Public Sans Font`, `Internationalized Date Library`, `Theme Mode Watcher`, `Bits UI Library`, `Zip Compression Library`, `End-to-End Testing`, `Code Formatting Tool`, `Svelte Formatting Plugin`, `Tailwind Formatting Plugin`, `Svelte Framework`, `Svelte Type Checking`, `Svelte Toast Notifications`, `SvelteKit Node Adapter`, `SvelteKit Framework`, `Svelte Vite Plugin`, `Tailwind CSS Styling`, `Tailwind Forms Plugin`, `Tailwind Typography Plugin`, `TanStack Table Core`, `TypeScript Execution Utility`, `D3 Scale Type Definitions`, `D3 Shape Type Definitions`, `ExcelJS Type Definitions`, `Node.js Type Definitions`, `TypeScript Language`, `TypeScript Linting`, `Vite Build Tool`, `Vitest Testing Framework`, `Vitest Browser Playwright`, `Vitest Svelte Testing`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `$schema`, `css`, `baseColor` to the rest of the system?**
  _484 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._
- **Should `user` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._
- **Should `createAuditLog` be split into smaller, more focused modules?**
  _Cohesion score 0.060451977401129946 - nodes in this community are weakly interconnected._