# Graph Report - /home/dwiwahyuilahi/Personal/Projects/FKG/simlab/simlab-fkg  (2026-07-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1536 nodes · 3229 edges · 178 communities (89 shown, 89 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1f91452`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- users.ts
- user
- createAuditLog
- schema.ts
- equipment
- index.ts
- inventaris-dfrl.ts
- Database Table Definitions
- svelte/elements
- auth.schema.ts
- $lib/components/ui/card
- index.ts
- $lib/components/ui/button
- Database Management Scripts
- maintenance.ts
- $lib/components/ui/dropdown-menu
- $app/navigation
- practicumModule
- Practicum Group Distribution
- $lib/utils
- inventaris-preparasi.ts
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
- +page.svelte
- UI Component Configuration
- devDependencies
- +server.ts
- Scoring Criteria Management
- $lib/components/ui/accordion
- Toast State Management
- Database Migration Schema
- App Layout and PWA
- Popover UI Components
- Sidebar State Management
- Package Metadata
- Module Definition Logic
- blok.ts
- tw-animate-css
- Student Lending UI
- Student Group Migration
- Equipment and Lab Migration
- Linting and Svelte Config
- Project Documentation Visuals
- ./index.js
- Deployment and Documentation
- Practicum Module Migration
- Lending Migration
- Lending Scheduler Migration
- Welcome Component Tests
- Global Type Definitions
- Sample Item Data
- @vite-pwa/sveltekit
- Greeting Utility Tests
- Generated File Server
- Uploads File Server
- index.ts
- CSL Assessment Generation
- laboratoriumMember
- Biome Linting Tool
- reminder.ts
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
- practicumAssessment
- Internationalized Date Library
- Theme Mode Watcher
- bhpPeriodicReport.ts
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
- 0014_lying_maelstrom.sql
- alatPeriodicReport.ts
- mahasiswa.ts
- laboratorium
- laboratorium.ts
- Summary of Changes for INSTRUKSI_PERBAIKAN_INVENTARIS.md
- drizzle-kit
- accessControl
- auth.ts
- @better-auth/cli
- +page.svelte
- +error.svelte
- better-auth
- @better-auth/api-key
- 0015_wandering_human_fly.sql

## God Nodes (most connected - your core abstractions)
1. `$lib/utils` - 155 edges
2. `db` - 105 edges
3. `$lib/components/ui/button` - 90 edges
4. `$lib/components/ui/card` - 83 edges
5. `$lib/components/ui/select` - 54 edges
6. `$lib/components/ui/input` - 54 edges
7. `$lib/components/ui/label/index.js` - 45 edges
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
  src/lib/server/db/seeds/inventaris-dfrl.ts → package.json
- `seedBahan()` --references--> `xlsx`  [EXTRACTED]
  src/lib/server/db/seeds/inventaris-dfrl.ts → package.json

## Import Cycles
- 3-file cycle: `src/lib/components/ui/range-calendar/index.ts -> src/lib/components/ui/range-calendar/range-calendar-caption.svelte -> src/lib/components/ui/range-calendar/range-calendar.svelte -> src/lib/components/ui/range-calendar/index.ts`

## Hyperedges (group relationships)
- **Inventory Management Logic** — flow_distribusi, flow_lending [EXTRACTED 1.00]
- **Deployment Infrastructure** — deployment, docker_compose, readme [EXTRACTED 0.90]

## Communities (178 total, 89 thin omitted)

### Community 0 - "users.ts"
Cohesion: 0.15
Nodes (15): kepalaLab, koordinator, laboran, spmi, statement, teknisi, allAuthRoles, auth (+7 more)

### Community 1 - "user"
Cohesion: 0.12
Nodes (10): user, practicumClass, practicumSchedule, practicumScheduleInstructor, practicumScheduleModule, practicumSeries, actions, actions (+2 more)

### Community 2 - "createAuditLog"
Cohesion: 0.07
Nodes (31): ./$types, ./$types, ./$types, ./$types, AuditParams, createAuditLog(), auditLog, notDeleted() (+23 more)

### Community 3 - "schema.ts"
Cohesion: 0.03
Nodes (58): approvalRelations, auditLogRelations, blockRelations, departmentRelations, equipmentCategoryRelations, equipmentRelations, inventoryReportRelations, itemRelations (+50 more)

### Community 4 - "equipment"
Cohesion: 0.07
Nodes (18): ./$types, equipment, item, lending, lendingItem, movement, stock, stockBatch (+10 more)

### Community 5 - "index.ts"
Cohesion: 0.06
Nodes (16): session, client, db, auditChecklist, equipmentCategory, generateInventoryExport(), actions, actions (+8 more)

### Community 6 - "inventaris-dfrl.ts"
Cohesion: 0.13
Nodes (29): categoryCache, classifyAlatCondition(), clean(), client, db, DRY_RUN, FILE_PATH, getCategoryHeaderRows() (+21 more)

### Community 7 - "Database Table Definitions"
Cohesion: 0.12
Nodes (43): `account`, `api_key`, `approval`, `audit_checklist`, `audit_log`, `block`, `department`, `equipment` (+35 more)

### Community 9 - "auth.schema.ts"
Cohesion: 0.11
Nodes (12): account, accountRelations, apiKey, apiKeyRelations, laboratoriumMemberRelations, sessionRelations, softDeleteColumns, verification (+4 more)

### Community 10 - "$lib/components/ui/card"
Cohesion: 0.11
Nodes (28): $lib/components/dashboard/InstrukturDashboard.svelte, $lib/components/dashboard/KepalaLabDashboard.svelte, $lib/components/dashboard/KoordinatorDashboard.svelte, $lib/components/dashboard/LaboranDashboard.svelte, $lib/components/dashboard/PenelitiDashboard.svelte, $lib/components/dashboard/skeletons/InstrukturSkeleton.svelte, $lib/components/dashboard/skeletons/KepalaLabSkeleton.svelte, $lib/components/dashboard/skeletons/KoordinatorSkeleton.svelte (+20 more)

### Community 11 - "index.ts"
Cohesion: 0.07
Nodes (7): ./context.svelte, ./constants.js, ./context.svelte.js, Getter, SidebarStateProps, useSidebar(), state

### Community 12 - "$lib/components/ui/button"
Cohesion: 0.14
Nodes (9): $app/forms, $app/paths, $lib/components/ConfirmationDialog.svelte, $lib/components/NotificationDialog.svelte, $lib/components/ui/button, $lib/components/ui/dialog, $lib/components/ui/input, $lib/components/ui/label/index.js (+1 more)

### Community 13 - "Database Management Scripts"
Cohesion: 0.07
Nodes (29): scripts, auth:schema, build, check, check:watch, db:generate, db:migrate, db:push (+21 more)

### Community 14 - "maintenance.ts"
Cohesion: 0.07
Nodes (17): ./$types, approval, maintenance, maintenanceCost, maintenanceCostItem, reviewMaintenanceApproval(), submitMaintenanceForApproval(), actions (+9 more)

### Community 15 - "$lib/components/ui/dropdown-menu"
Cohesion: 0.09
Nodes (3): @lucide/svelte/icons/check, @lucide/svelte/icons/minus, $lib/components/ui/dropdown-menu

### Community 16 - "$app/navigation"
Cohesion: 0.19
Nodes (6): $app/navigation, $lib/components/Avatar.svelte, $lib/components/NotificationBell.svelte, $lib/components/PWAInstallButton.svelte, $lib/components/ui/table, $app/state

### Community 17 - "practicumModule"
Cohesion: 0.10
Nodes (14): block, department, practicumCriteriaBand, practicumLogbookTemplate, practicumLogbookTemplateField, practicumModule, actions, ALLOWED_ROLES (+6 more)

### Community 18 - "Practicum Group Distribution"
Cohesion: 0.08
Nodes (22): assignedElsewhere(), availableGroupsFor(), blockTriggerContent, classTriggerContent, filteredInstructors, filteredModules, groupsForClass, hasUnassignedGroups (+14 more)

### Community 19 - "$lib/utils"
Cohesion: 0.07
Nodes (9): @lucide/svelte/icons/chevron-left, @lucide/svelte/icons/chevron-right, $lib/components/ui/separator, $lib/components/ui/tabs, $lib/utils, WithElementRef, WithoutChild, WithoutChildren (+1 more)

### Community 20 - "inventaris-preparasi.ts"
Cohesion: 0.11
Nodes (29): xlsx, xlsx, AlatEntry, buildMergeGroupMap(), classifyWord(), clean(), client, db (+21 more)

### Community 21 - "UI Animation and Overlays"
Cohesion: 0.11
Nodes (14): svelte/easing, ./toast.svelte, ./ui/sidebar/context.svelte, $lib/components/Modal.svelte, $lib/components/Sidebar.svelte, opacity, isGroupActive, isMobile (+6 more)

### Community 22 - "$lib/components/ui/select"
Cohesion: 0.12
Nodes (4): $lib/components/ExportPeriodicReportDialog.svelte, $lib/components/ui/checkbox, $lib/components/ui/searchable-select, $lib/components/ui/select

### Community 23 - "$lib/components/toast"
Cohesion: 0.23
Nodes (7): @sveltejs/kit, $lib/components/toast, toast, ToastItem, ToastOptions, ToastPosition, ToastType

### Community 24 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, d3-scale, d3-shape, docx-templates, exceljs, dependencies, clsx, d3-scale (+13 more)

### Community 25 - "chart-utils.ts"
Cohesion: 0.12
Nodes (8): themeContents, ChartConfig, chartContextKey, ChartContextValue, ExtractSnippetParams, getPayloadConfigFromPayload(), THEMES, TooltipPayload

### Community 26 - "generateLogbook.ts"
Cohesion: 0.16
Nodes (17): practicumLogbookGeneration, BuilderContext, buildLogbookRowspanTableXml(), convertDocxToPdf(), escapeXml(), GENERATED_DIR, generateLogbookForSeries(), generateReport (+9 more)

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

### Community 33 - "+page.svelte"
Cohesion: 0.15
Nodes (15): $lib/components/ui/tooltip/index.js, ./tooltip-provider.svelte, $lib/utils/item-badge, isWithinNewItemWindow(), shouldShowNewBadge(), currentSort, executeSearch(), handleCategoryChange() (+7 more)

### Community 34 - "UI Component Configuration"
Cohesion: 0.15
Nodes (12): aliases, components, hooks, lib, ui, utils, registry, $schema (+4 more)

### Community 35 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint, @eslint/js, eslint-plugin-svelte, mysql2, devDependencies, bits-ui, eslint, @eslint/js (+5 more)

### Community 37 - "+server.ts"
Cohesion: 0.12
Nodes (22): ./$types, $lib/rekap/buildRekapMatrix, buildRekapColumns(), RekapColumn, RekapModule, RekapScheduleGroup, RekapScheduleInput, kelompokMahasiswa (+14 more)

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

### Community 47 - "blok.ts"
Cohesion: 0.18
Nodes (6): BLOK_MAPPINGS, client, db, client, db, DEPARTEMEN_SEEDS

### Community 50 - "Student Group Migration"
Cohesion: 0.83
Nodes (3): `kelompok_mahasiswa`, `kelompok_mahasiswa_member`, `practicum_schedule_instructor`

### Community 51 - "Equipment and Lab Migration"
Cohesion: 0.50
Nodes (3): `equipment`, `laboratorium`, `user`

### Community 53 - "Project Documentation Visuals"
Cohesion: 0.67
Nodes (4): Distribution Flow Logic, Lending Flow Logic, Military Base Illustration Background, Inventory Dashboard UI Screenshot

### Community 54 - "./index.js"
Cohesion: 0.09
Nodes (4): @lucide/svelte/icons/chevron-down, @internationalized/date, @/components/ui/button/button.svelte, ./index.js

### Community 55 - "Deployment and Documentation"
Cohesion: 0.67
Nodes (3): Deployment Guide, Docker Compose Configuration, Project README

### Community 66 - "index.ts"
Cohesion: 0.29
Nodes (8): allAuthRoles, auth, client, db, main(), seedLaboratorium(), main(), seedLogbookTemplates()

### Community 67 - "CSL Assessment Generation"
Cohesion: 0.31
Nodes (8): buildCslBlockXml(), CslModuleData, escapeXml(), generateCslAssessmentForStudent(), GENERATED_DIR, generateReport, TEMPLATE_DIR, GET()

### Community 68 - "laboratoriumMember"
Cohesion: 0.12
Nodes (9): ./$types, ./$types, ./$types, laboratoriumMember, actions, actions, actions, roleToLabel (+1 more)

### Community 70 - "reminder.ts"
Cohesion: 0.19
Nodes (11): notification, schedulerState, CreateNotificationParams, NotificationAction, NotificationPriority, maybeRunLendingReminderScan(), notifyForLending(), runLendingReminderScan() (+3 more)

### Community 87 - "practicumAssessment"
Cohesion: 0.29
Nodes (7): ./$types, saveAssessment(), practicumAssessment, practicumAssessmentCriteriaScore, practicumModuleCriteria, actions, actions

### Community 90 - "bhpPeriodicReport.ts"
Cohesion: 0.39
Nodes (6): formatPeriodString(), generateBhpPeriodicReport(), ReportParams, signedQty(), GET(), monthsIndo

### Community 166 - "alatPeriodicReport.ts"
Cohesion: 0.43
Nodes (5): formatPeriodString(), generateAlatPeriodicReport(), ReportParams, GET(), monthsIndo

### Community 167 - "mahasiswa.ts"
Cohesion: 0.24
Nodes (10): instruktur, peneliti, allAuthRoles, auth, client, db, main(), seedKelompokMahasiswa() (+2 more)

### Community 168 - "laboratorium"
Cohesion: 0.11
Nodes (9): ./$types, ./$types, ./$types, laboratorium, inventoryReport, safetyIncident, wasteLog, actions (+1 more)

### Community 169 - "laboratorium.ts"
Cohesion: 0.25
Nodes (7): superadmin, allAuthRoles, auth, client, db, LABORATORIUM_SEEDS, main()

### Community 170 - "Summary of Changes for INSTRUKSI_PERBAIKAN_INVENTARIS.md"
Cohesion: 0.40
Nodes (4): Impact on Graph:, Logic Changes:, Modified Files:, Summary of Changes for INSTRUKSI_PERBAIKAN_INVENTARIS.md

### Community 172 - "accessControl"
Cohesion: 0.60
Nodes (4): accessControl, requireAuth(), requirePermission(), requireRole()

### Community 173 - "auth.ts"
Cohesion: 0.14
Nodes (7): ./$types, auth, actions, roleToLabel, slugToRole, actions, actions

### Community 175 - "+page.svelte"
Cohesion: 0.33
Nodes (3): @/components/ui/input/input.svelte, filteredGroups, uniqueLabs

## Knowledge Gaps
- **493 isolated node(s):** `$schema`, `css`, `baseColor`, `components`, `utils` (+488 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **89 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `xlsx` connect `inventaris-preparasi.ts` to `dependencies`, `+server.ts`, `inventaris-dfrl.ts`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `Package Metadata`, `@lucide/svelte`, `tw-animate-css`, `inventaris-preparasi.ts`, `@better-auth/api-key`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `$lib/utils` connect `$lib/utils` to `+page.svelte`, `Alert Dialog Components`, `$lib/components/ui/accordion`, `svelte/elements`, `$lib/components/ui/card`, `Popover UI Components`, `$lib/components/ui/button`, `index.ts`, `$lib/components/ui/dropdown-menu`, `$app/navigation`, `+page.svelte`, `Student Lending UI`, `./index.js`, `$lib/components/ui/select`, `chart-utils.ts`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `$schema`, `css`, `baseColor` to the rest of the system?**
  _493 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._
- **Should `createAuditLog` be split into smaller, more focused modules?**
  _Cohesion score 0.07265306122448979 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03333333333333333 - nodes in this community are weakly interconnected._