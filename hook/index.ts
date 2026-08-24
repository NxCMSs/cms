import type { ComponentType } from "react";

// ─── Field props that every UI component receives ───
export interface FieldProps {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options?: { label: string; value: string }[];
    /**
     * Optional ambient context passed by the parent form.
     * Components can read e.g. ctx?.title, ctx?.postId without the form
     * needing to know anything about the component.
     */
    ctx?: Record<string, unknown>;
}

// ─── Hook field definition registered by plugins ───
export interface FormHookField {
    key: string;
    label?: string;
    type?: string;
    slug?: string;
    active?: boolean;
    style?: "left" | "right";
    position?: number;
    /**
     * Declares the field's rendering behaviour.
     * - undefined / omitted  → standard component (Text, Select, Switch, etc.)
     * - "content"                → rich-text editor (Content component)
     * - "gallery"                → single-image Gallery picker
     * - "gallery-multiple"       → multi-image Gallery picker (value stored as JSON array string)
     * - "linked-cats"            → multi-select checkbox list fetched from /cat?type=<linkedCatType>
     * - "specification"          → CategorySpecification box builder (value stored as JSON array string)
     * - "category-flat"          → flat <select> category picker; value = selected category _id,
     *                              updates the form's core category state
     * - "category-hierarchical"  → drill-down category picker; value = selected category _id,
     *                              also updates the form's core category + categoryPath state
     */
    fieldType?: "content" | "gallery" | "gallery-multiple" | "linked-cats" | "specification" | "category-flat" | "category-hierarchical";
    /** For fieldType "linked-cats": the cat type to fetch options from */
    linkedCatType?: string;
    /** For fieldType "category-flat" or "category-hierarchical": the cat type to fetch */
    hierarchicalCatType?: string;
    component?: ComponentType<any>;
    path?: ComponentType<any>;
    /**
     * Lazy component key registered via registerLazyComponent().
     * Used instead of `path` when the component should be dynamically
     * imported only when the plugin is active (avoids static bundle inclusion).
     * The admin/account/root page renderers call resolveLazyComponent(lazyPath)
     * before rendering.
     */
    lazyPath?: string;
    options?: { label: string; value: string }[];
    pluginNx?: string; // stamped automatically by addHook
}

// ─── Nav hook field registered by plugins via addHook("admin.nav", ...) ───
export interface NavHookField {
    key: string;       // unique id for this item
    label: string;
    icon: string;      // Iconify icon name
    slug: string;      // URL path segment, e.g. "plugin" or "plugin/list"
    parent: string;    // key of parent item, "" for top-level
    position: number;
    /**
     * When true, this nav item is only shown to users with type === "seller".
     * The account layout reads this flag to conditionally render the item.
     */
    sellerOnly?: boolean;
    /**
     * When true, this nav item is only shown to users with type === "reporter".
     * The account layout reads this flag to conditionally render the item.
     */
    reporterOnly?: boolean;
    pluginNx?: string; // stamped automatically by addHook
}

// ─── Data Input hook field registered by plugins via addHook("data.input", ...) ───
export interface DataInputHookField {
    key: string;
    name: string;
    icon?: string;         // File icon (e.g. "solar:document-text-bold")
    description?: string;
    pluginNx?: string;     // stamped automatically by addHook
    data?: any;
}


// ─── Type alias for Form components to import ───
export type FormHooks = FormHookField[];

// ─── Plugin metadata shape ───
export interface PluginMeta {
    nx: string;       // canonical unique identifier, e.g. "blog"
    name: string;
    version: string;
    description: string;
    author: string;
    path: string;
    icon: string;     // Iconify icon name, e.g. "solar:document-bold"
    color: string;    // Tailwind gradient classes, e.g. "from-violet-500 to-purple-600"
    youtubeId?: string;
    price?: number;
}

// ─── Post type definition ───
export interface PostTypeField {
    key: string;       // e.g. "blog", "page", "product"
    label: string;      // e.g. "Blog Post", "Page", "Product"
    icon?: string;      // Iconify icon name
    color?: string;    // Tailwind gradient classes
    hasCategory?: boolean; // whether this post type uses categories (default: true)
    position?: number;  // ordering in UI
    pluginNx?: string; // stamped automatically by addPostType
}

// ─── Category type definition ───
export interface CatTypeField {
    key: string;       // e.g. "blog-category", "product-category"
    label: string;      // e.g. "Blog Category", "Product Category"
    postType: string;   // e.g. "blog", "product" (the parent post type key)
    icon?: string;      // Iconify icon name
    color?: string;    // Tailwind gradient classes
    position?: number;  // ordering in UI
    pluginNx?: string; // stamped automatically by addCatType
}

// ─────────────────────────────────────────────────────────────────────────────
// Active-plugin gate
//
// Keyed by `nx` — the canonical unique identifier — so name casing/spacing
// is completely irrelevant.
//
// State: null  → gate not yet initialised (open — allows registrations during
//                early boot / tests where setActivePlugins was never called).
//        Set   → gate is armed; only listed nx values may register hooks.
// ─────────────────────────────────────────────────────────────────────────────

let _activePlugins: Set<string> | null = null;

// ─── The core nx is always active — never expires, never requires DB entry ────
const CORE_NX = "com.system.core";

/**
 * Arm the active-plugin gate.
 * Call this ONCE, before importing any plugin modules, with the `nx` values
 * of every plugin whose status is "active" in the database.
 *
 * CORE_NX ("com.system.core") is always injected regardless of the provided
 * list — it has no expiry and must never be blocked by the gate.
 *
 * @param nxIds - plugin nx identifiers that are allowed to register hooks
 */
export function setActivePlugins(nxIds: string[]): void {
    _activePlugins = new Set([CORE_NX, ...nxIds]);
}

/**
 * Returns true when the gate is armed and the given nx is active.
 * Returns true when the gate has not been armed yet (open during boot/tests).
 */
export function isPluginActive(nx: string): boolean {
    if (_activePlugins === null) return true; // gate not armed → open
    return _activePlugins.has(nx);
}

/**
 * Reset the gate (useful for testing).
 */
export function resetActivePlugins(): void {
    _activePlugins = null;
}

// ─── Internal hook registry (module-level singleton) ───
const hooks: Record<string, FormHookField[]> = {};

// ─── Permanent root pages store ───────────────────────────────────────────────
// Written to by every addHook("root.pages", ...) call regardless of gate state.
// Never cleared by clearHooks() so server components always have the full list.
const _rootPages: FormHookField[] = [];

// ─── Permanent admin pages store ─────────────────────────────────────────────
// Written to by every addHook("admin.pages", ...) call regardless of gate state.
// Never cleared by clearHooks() so server components always have the full list.
const _adminPages: FormHookField[] = [];

/**
 * Returns every root.pages entry ever registered across all plugins.
 * Filters out entries whose plugin is no longer active (expired / inactive).
 * Not affected by clearHooks — safe to call from server components.
 */
export function getRegisteredRootPages(): FormHookField[] {
    return [..._rootPages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function getAllRootPages(): FormHookField[] {
    return [..._rootPages]
        .filter((f) => !f.pluginNx || isPluginActive(f.pluginNx))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Register form fields for a given hook point.
 *
 * @param hookName  - e.g. "post.form", "cat.form", "admin.pages"
 * @param fields    - array of field definitions to register
 * @param pluginNx  - the plugin's `nx` identifier (used for the gate check)
 */
export function addHook(
    hookName: string,
    fields: FormHookField[] | NavHookField[] | DataInputHookField[],
    pluginNx: string
): void {
    // ── admin.nav → permanent nav registry (no gate, never cleared) ──────────
    if (hookName === "admin.nav") {
        (fields as NavHookField[]).forEach((f) => {
            const exists = _navItems.some(
                (n) => n.pluginNx === pluginNx && n.key === f.key
            );
            if (!exists) _navItems.push({ ...f, pluginNx });
        });
        if (!isPluginActive(pluginNx)) return;
        return;
    }

    // ── user.nav → permanent user nav registry (no gate, never cleared) ──────
    if (hookName === "user.nav") {
        (fields as NavHookField[]).forEach((f) => {
            const exists = _userNavItems.some(
                (n) => n.pluginNx === pluginNx && n.key === f.key
            );
            if (!exists) _userNavItems.push({ ...f, pluginNx });
        });
        return;
    }

    // ── data.input → permanent data input registry (no gate, never cleared) ──
    if (hookName === "data.input") {
        (fields as DataInputHookField[]).forEach((f) => {
            const exists = _dataInputItems.some(
                (d) => d.pluginNx === pluginNx && d.key === f.key
            );
            if (!exists) _dataInputItems.push({ ...f, pluginNx });
        });
        return;
    }


    const stamped = (fields as FormHookField[]).map((f) => ({ ...f, pluginNx }));

    // root.pages always goes into the permanent store (no gate, never cleared)
    if (hookName === "root.pages") {
        // Update existing or add new on hot-reload re-registration
        stamped.forEach((f) => {
            const idx = _rootPages.findIndex(
                (r) => r.pluginNx === f.pluginNx && r.key === f.key && r.type === f.type
            );
            if (idx >= 0) {
                _rootPages[idx] = f;
            } else {
                _rootPages.push(f);
            }
        });
        // Also fall through to the normal registry for client-side consumers
    }

    // admin.pages always goes into the permanent store (no gate, never cleared)
    if (hookName === "admin.pages") {
        stamped.forEach((f) => {
            const exists = _adminPages.some(
                (r) => r.pluginNx === f.pluginNx && r.key === f.key
            );
            if (!exists) _adminPages.push(f);
        });
    }

    // user.page always goes into the permanent store (no gate, never cleared)
    if (hookName === "user.page") {
        stamped.forEach((f) => {
            const exists = _userPages.some(
                (r) => r.pluginNx === f.pluginNx && r.key === f.key
            );
            if (!exists) _userPages.push(f);
        });
    }

    // ── Gate check for all other hooks (and root.pages in normal registry) ────
    // admin.pages bypasses the gate so plugins can register pages without being activated
    if (!isPluginActive(pluginNx) && hookName !== "admin.pages") {
        return;
    }

    if (!hooks[hookName]) {
        hooks[hookName] = [];
    }
    // Avoid duplicates in the gated registry.
    // Use pluginNx + label as the dedup key so multiple layouts that share
    // the same key (e.g. "header", "footer", "blog") are all preserved.
    stamped.forEach((f) => {
        const exists = hooks[hookName].some(
            (h) => h.pluginNx === f.pluginNx && h.key === f.key && (h.type ?? "") === (f.type ?? "")
        );
        if (!exists) hooks[hookName].push(f);
    });
}

/**
 * Retrieve registered fields for a hook point.
 * Optionally filter by `type`:
 *   - If type is provided, return fields with matching type OR fields with no type (universal).
 *   - If type is omitted, return ALL fields.
 * Results are sorted by `position` ascending.
 *
 * Only fields whose pluginNx is currently active pass through.
 * If the gate is not armed (null) all fields are returned (open during boot/tests).
 *
 * @param hookName - e.g. "post.form", "cat.form"
 * @param type     - optional content-type filter (e.g. "post", "cat")
 */
export function getHooks(hookName: string, type?: string): FormHookField[] {
    const all = hooks[hookName] || [];

    const filtered = type
        ? all.filter((f) => !f.type || f.type === type)
        : all;

    // Filter out hooks whose plugin is no longer active
    const gated = filtered.filter((f) => !f.pluginNx || isPluginActive(f.pluginNx));

    // Merge partial key overrides per plugin (keyed by pluginNx, type, and key)
    const keyMap = new Map<string, FormHookField>();
    gated.forEach((f) => {
        const k = `${f.pluginNx ?? "core"}::${f.type ?? ""}::${f.key}`;
        if (keyMap.has(k)) {
            const prev = keyMap.get(k)!;
            keyMap.set(k, { ...prev, ...f });
        } else {
            keyMap.set(k, f);
        }
    });

    const deduped = Array.from(keyMap.values());

    // Exclude fields explicitly set to active: false
    const activeOnly = deduped.filter((f) => f.active !== false);

    return activeOnly.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Clear all registered hooks (useful for testing).
 */
export function clearHooks(): void {
    for (const key of Object.keys(hooks)) {
        delete hooks[key];
    }
}

/**
 * Register built-in core hooks.
 *
 * Accepts a callback (the core register() function) and runs it with the
 * active-plugin gate temporarily opened so CORE_NX always passes through.
 * Called by reregisterHooks() in hook/PluginList.ts after clearHooks() and
 * setActivePlugins(), ensuring core fields are always present regardless of
 * which plugins are active.
 *
 * @param registerFn - the register() export from components/admin/index.ts
 */
export function registerCoreHooks(registerFn: () => void): void {
    const previous = _activePlugins;
    _activePlugins = null; // open gate — CORE_NX always passes
    try {
        registerFn();
    } finally {
        _activePlugins = previous; // restore gate
    }
}

// ─── Nav registry (permanent, never cleared) ─────────────────────────────────
const _navItems: NavHookField[] = [];

// ─── User pages registry (permanent, never cleared) ──────────────────────────
const _userPages: FormHookField[] = [];

// ─── User nav registry (permanent, never cleared) ────────────────────────────
const _userNavItems: NavHookField[] = [];

// ─── Data Input registry (permanent, never cleared) ──────────────────────────
const _dataInputItems: DataInputHookField[] = [];

/**
 * Returns all registered data.input items across all plugins.
 */
export function getDataInputHooks(): DataInputHookField[] {
    return [..._dataInputItems].filter(
        (f) => !f.pluginNx || isPluginActive(f.pluginNx)
    );
}


/**
 * Returns every user.page entry ever registered across all plugins.
 * Filters out entries whose plugin is no longer active (expired / inactive).
 */
export function getAllUserPages(): FormHookField[] {
    return [..._userPages]
        .filter((f) => !f.pluginNx || isPluginActive(f.pluginNx))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Returns all registered user.nav items across all plugins.
 * Filters out items whose plugin is no longer active (expired / inactive).
 */
export function getAllUserNavItems(): NavHookField[] {
    return [..._userNavItems]
        .filter((f) => !f.pluginNx || isPluginActive(f.pluginNx))
        .sort((a, b) => a.position - b.position);
}

/**
 * Returns all registered admin.nav items across all plugins.
 * Filters out items whose plugin is no longer active (expired / inactive).
 * Never cleared — safe to call from anywhere.
 */
export function getAllNavItems(): NavHookField[] {
    return [..._navItems]
        .filter((f) => !f.pluginNx || isPluginActive(f.pluginNx))
        .sort((a, b) => a.position - b.position);
}

/**
 * Returns every admin.pages entry ever registered across all plugins.
 * Filters out entries whose plugin is no longer active (expired / inactive).
 * Not affected by clearHooks — safe to call from server components.
 */
export function getAllAdminPages(): FormHookField[] {
    return [..._adminPages]
        .filter((f) => !f.pluginNx || isPluginActive(f.pluginNx))
        .sort((a, b) => a.position - b.position);
}
// ─── Post types registry (permanent, never cleared) ──────────────────────────
const _postTypes: PostTypeField[] = [];
const _catTypes: CatTypeField[] = [];

/**
 * Register a post type (or array of post types).
 */
export function addPostType(
    pts: PostTypeField | PostTypeField[],
    pluginNx?: string
): void {
    const items = Array.isArray(pts) ? pts : [pts];
    for (const pt of items) {
        if (!_postTypes.some((p) => p.key === pt.key)) {
            // Auto-stamp pluginNx if provided and not already set
            if (pluginNx && !pt.pluginNx) {
                pt.pluginNx = pluginNx;
            }
            _postTypes.push(pt);
        }
    }
}

/**
 * Returns all registered post types.
 * Filters out types whose plugin is no longer active (expired / inactive).
 */
export function getAllPostTypes(): PostTypeField[] {
    return [..._postTypes].filter((p) => !p.pluginNx || isPluginActive(p.pluginNx));
}

/**
 * Returns a single post type by key, or undefined.
 * Returns undefined if the owning plugin is no longer active.
 */
export function getPostType(key: string): PostTypeField | undefined {
    const pt = _postTypes.find((p) => p.key === key);
    if (!pt) return undefined;
    if (pt.pluginNx && !isPluginActive(pt.pluginNx)) return undefined;
    return pt;
}

/**
 * Register a category type (or array of category types).
 */
export function addCatType(
    cts: CatTypeField | CatTypeField[],
    pluginNx?: string
): void {
    const items = Array.isArray(cts) ? cts : [cts];
    for (const ct of items) {
        if (!_catTypes.some((c) => c.key === ct.key)) {
            // Auto-stamp pluginNx if provided and not already set
            if (pluginNx && !ct.pluginNx) {
                ct.pluginNx = pluginNx;
            }
            _catTypes.push(ct);
        }
    }
}

/**
 * Returns all registered category types.
 * Filters out types whose plugin is no longer active (expired / inactive).
 */
export function getAllCatTypes(): CatTypeField[] {
    return [..._catTypes].filter((c) => !c.pluginNx || isPluginActive(c.pluginNx));
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side Data Hook Registry
//
// Allows plugins to register async data-provider functions that are called
// by the slug page (page.tsx) before rendering a template. This is the
// WordPress filter/action pattern — the slug page calls runDataHook() and
// any plugin that registered a handler for that content type gets to enrich
// the data passed to the template as `pageData`.
//
// Example (in plugin/product/index.ts register()):
//
//   addDataHook("product-category", getCategoryPageData);
//
// Example (in page.tsx, after fetching catData):
//
//   const pageData = await runDataHook("product-category", catData._id, catData.slug);
//
// The hook fn receives (id: string, slug: string, data: any) and returns
// any plain-serialisable object. The result is passed as `pageData` prop.
//
// Rules:
//   - Permanent store — never cleared by clearHooks()
//   - One handler per contentType key (last registration wins on duplicates)
//   - The fn must be async and return a plain serialisable object
//   - No React components — server-side only
// ─────────────────────────────────────────────────────────────────────────────

// ─── Server-side Data Hook Registry ──────────────────────────────────────────
type DataHookFn = (id: string, slug: string, data?: any) => Promise<any>;

interface DataHookEntry {
    fn: DataHookFn;
    pluginNx: string;
}

const _dataHooks: Map<string, DataHookEntry> = new Map();

/**
 * Register a server-side data provider for a content type.
 * Registration is always stored; the gate is checked at call time via runDataHook.
 *
 * @param contentType - e.g. "product-category", "product"
 * @param fn          - async function (id, slug, data?) => pageData
 * @param pluginNx    - plugin identifier (checked at retrieval time)
 */
export function addDataHook(
    contentType: string,
    fn: DataHookFn,
    pluginNx: string
): void {
    _dataHooks.set(contentType, { fn, pluginNx });
}

/**
 * Run the registered data hook for a content type.
 * Returns undefined if no hook is registered, or if the owning plugin
 * is expired / inactive / not started (gate check at call time).
 *
 * @param contentType - e.g. "product-category"
 * @param id          - MongoDB _id string of the document
 * @param slug        - slug of the document
 * @param data        - optional raw document (for context)
 */
export async function runDataHook(
    contentType: string,
    id: string,
    slug: string,
    data?: any
): Promise<any | undefined> {
    const entry = _dataHooks.get(contentType);
    if (!entry) return undefined;
    // Gate check: if the owning plugin is no longer active, return nothing
    if (!isPluginActive(entry.pluginNx)) return undefined;
    return entry.fn(id, slug, data);
}

/**
 * Returns true if a data hook is registered for the given content type
 * AND its owning plugin is currently active.
 */
export function hasDataHook(contentType: string): boolean {
    const entry = _dataHooks.get(contentType);
    if (!entry) return false;
    return isPluginActive(entry.pluginNx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder Element Registry
//
// Allows core and plugins to register builder canvas elements.
// Elements are permanent — never cleared by clearHooks() — because the
// builder canvas needs them regardless of which client-side hooks are active.
//
// Core elements are registered once at module load time via
// components/builder/elements/index.ts (imported by PluginList.ts).
// Plugin elements are registered inside the plugin's register() function.
//
// Usage (core):
//   import headingElement from "@/components/builder/elements/heading";
//   addBuilderElement(headingElement);
//
// Usage (plugin):
//   import myElement from "./elements/my-element";
//   export function register() {
//     addBuilderElement(myElement, PLUGINS.nx);
//   }
//
// Rules:
//   - Permanent store — never cleared by clearHooks()
//   - Deduped by element.type — first registration wins for core elements,
//     plugin elements with a different type are always added
//   - Gate check at retrieval time via getBuilderElements()
// ─────────────────────────────────────────────────────────────────────────────

export interface BuilderElementDef {
    type: string;
    category?: string;
    label?: string;
    icon?: string;
    schema: any;
    controls: any[];
    render: (element: any) => any;
    /** Stamped automatically by addBuilderElement */
    pluginNx?: string;
}

interface BuilderElementEntry {
    def: BuilderElementDef;
    pluginNx: string;
}

const _builderElements: BuilderElementEntry[] = [];

/** Sentinel used for elements that belong to the core (not a plugin). */
const BUILDER_CORE_NX = "__core__";

/**
 * Register a builder element definition.
 *
 * @param def       - The element definition object
 * @param pluginNx  - The plugin's nx identifier. Omit for core elements.
 */
export function addBuilderElement(
    def: BuilderElementDef,
    pluginNx: string = BUILDER_CORE_NX
): void {
    // Deduplicate by type — skip if already registered with same type + nx
    const exists = _builderElements.some(
        (e) => e.def.type === def.type && e.pluginNx === pluginNx
    );
    if (exists) return;
    _builderElements.push({ def: { ...def, pluginNx }, pluginNx });
}

/**
 * Returns all registered builder element definitions.
 * Core elements (pluginNx === "__core__") are always included.
 * Plugin elements are gated — only included when the owning plugin is active.
 */
export function getBuilderElements(): BuilderElementDef[] {
    return _builderElements
        .filter((e) =>
            e.pluginNx === BUILDER_CORE_NX || isPluginActive(e.pluginNx)
        )
        .map((e) => e.def);
}

/**
 * Returns a single builder element definition by type, or undefined.
 * Respects the active-plugin gate for plugin-owned elements.
 */
export function getBuilderElement(type: string, pluginNx?: string): BuilderElementDef | undefined {
    const list = getBuilderElements();
    if (pluginNx) {
        const match = list.find((e) => e.type === type && e.pluginNx === pluginNx);
        if (match) return match;
    }
    return list.find((e) => e.type === type);
}

// ─── Wire the plugin bus gate ──────────────────────────────────────────────────
// pluginHooks.ts is self-contained (no @/ imports) so it resolves under
// Turbopack from any plugin subdirectory. We connect isPluginActive here so
// doAction / applyFilter / resolveService respect the active-plugin gate.
import { setPluginBusGate } from "./pluginHooks";
setPluginBusGate(isPluginActive);
