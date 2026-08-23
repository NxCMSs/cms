/**
 * Core Admin Hook Registrations
 *
 * The single source of truth for built-in nav items and default form fields.
 * Runs on every reregisterHooks() call and is ALWAYS active — bypasses the
 * plugin gate entirely via registerCoreHooks() in hook/index.ts.
 *
 * Add nav items here instead of the old DEFAULT_NAV array in nav.ts.
 * Never import DB models or server-only code here.
 */

import { addHook, addPostType, addCatType } from "@/hook";
import { Text, Textarea, Tags, CategorySelect, CategoryHierarchicalSelect, Switch, Select, Number, ColorPicker, BuilderSelect } from "@/components/ui";
import BlogLayout1 from "@/components/page/blog/Layout1";
import BlogLayout2 from "@/components/page/blog/Layout2";
import BlogCategoryLayout1 from "@/components/page/blog-category/Layout1";
import BlogCategoryLayout2 from "@/components/page/blog-category/Layout2";
import BlogBox1 from "@/components/page/blog-box/Box-1";
import BlogBox2 from "@/components/page/blog-box/Box-2";
import PageLayout1 from "@/components/page/page/Layout1";
import PageLayout2 from "@/components/page/page/Layout2";
import Header1 from "@/components/page/header/Header1";
import Header2 from "@/components/page/header/Header2";
import Header3 from "@/components/page/header/Header3";
import Footer1 from "@/components/page/footer/Footer1";
import Footer2 from "@/components/page/footer/Footer2";
import Footer3 from "@/components/page/footer/Footer3";

/** The nx identifier stamped onto every core-registered field. */
export const CORE_NX = "com.system.core";

/**
 * Register all built-in hooks.
 * Called automatically by reregisterHooks() — do not call this directly.
 */
export function register(): void {
    // ─── Admin nav ──────────────────────────────────────────────────────────
    addHook("admin.nav", [
        {
            key: "dashboard",
            label: "Dashboard",
            icon: "solar:home-bold",
            slug: "",
            parent: "",
            position: 0,
        },
        // ── Page ──
        {
            key: "page",
            label: "Page",
            icon: "solar:file-text-bold",
            slug: "posts/page",
            parent: "",
            position: 11,
        },
        {
            key: "page-add",
            label: "Add Page",
            icon: "solar:add-circle-bold",
            slug: "posts/page/new",
            parent: "page",
            position: 2,
        },
        // ── Blog ──
        {
            key: "blog",
            label: "Blog",
            icon: "solar:document-bold",
            slug: "posts/blog",
            parent: "",
            position: 12,
        },
        {
            key: "blog-add",
            label: "Add Blog",
            icon: "solar:add-circle-bold",
            slug: "posts/blog/new",
            parent: "blog",
            position: 2,
        },
        {
            key: "blog-category",
            label: "Categories",
            icon: "solar:folder-with-files-bold",
            slug: "category/blog-category",
            parent: "blog",
            position: 3,
        },
        // ── Users ──
        {
            key: "users",
            label: "Users",
            icon: "solar:users-group-rounded-bold",
            slug: "users",
            parent: "",
            position: 50,
        },
        {
            key: "users-add",
            label: "Add User",
            icon: "solar:user-plus-bold",
            slug: "users/add",
            parent: "users",
            position: 1,
        },
        // ── Plugins ──
        {
            key: "plugin",
            label: "Plugins",
            icon: "solar:widget-bold",
            slug: "plugin",
            parent: "",
            position: 100,
        },
        {
            key: "plugin-list",
            label: "Plugin Store",
            icon: "solar:shop-bold",
            slug: "plugin/list",
            parent: "plugin",
            position: 1,
        },
        // ── Templates ──
        {
            key: "template",
            label: "Templates",
            icon: "solar:layers-bold",
            slug: "template",
            parent: "settings",
            position: 110,
        },
        // ── Permalinks ──
        {
            key: "permalink",
            label: "Permalinks",
            icon: "solar:link-bold",
            slug: "permalink",
            parent: "settings",
            position: 120,
        },
        {
            key: "builder",
            label: "Builder",
            icon: "boxicons:layout",
            slug: "builder",
            parent: "",
            position: 120,
        },
        {
            key: "builder-add",
            label: "Add new",
            icon: "boxicons:layout",
            slug: "builder/add",
            parent: "builder",
            position: 120,
        },
        {
            key: "builder-section",
            label: "Section",
            icon: "boxicons:layout",
            slug: "builder/section",
            parent: "builder",
            position: 120,
        },
        {
            key: "builder-placeholder",
            label: "Placeholder",
            icon: "boxicons:layout",
            slug: "builder/placeholder",
            parent: "builder",
            position: 121,
        },
        // ── Location ──
        {
            key: "location",
            label: "Location",
            icon: "solar:map-point-bold",
            slug: "category/location",
            parent: "settings",
            position: 130,
        },
        // ── AI Prompts ──
        {
            key: "prompt",
            label: "AI Prompts",
            icon: "solar:stars-bold",
            slug: "category/prompt",
            parent: "settings",
            position: 131,
        },
        // ── Menu ──
        {
            key: "menu",
            label: "Menu",
            icon: "jam:menu",
            slug: "menu",
            parent: "",
            position: 115,
        },
        {
            key: "menu-add",
            label: "Add Menu",
            icon: "jam:menu",
            slug: "menu/add",
            parent: "menu",
            position: 1,
        },
        // ── Contact Submissions ──
        {
            key: "contactus",
            label: "Contact Submissions",
            icon: "solar:letter-bold",
            slug: "contactus",
            parent: "",
            position: 150,
        },
        // ── Tools ──
        {
            key: "tools",
            label: "Tools",
            icon: "solar:tuning-bold",
            slug: "tools/export",
            parent: "",
            position: 180,
        },
        {
            key: "tools-export",
            label: "Export Data",
            icon: "solar:export-bold",
            slug: "tools/export",
            parent: "tools",
            position: 1,
        },
        {
            key: "tools-input",
            label: "Import Data",
            icon: "solar:import-bold",
            slug: "tools/input",
            parent: "tools",
            position: 2,
        },
        // ── Settings ──
        {
            key: "settings",
            label: "Settings",
            icon: "solar:settings-bold",
            slug: "settings",
            parent: "",
            position: 200,
        },
    ], CORE_NX);


    // ─── Core post types ────────────────────────────────────────────────────
    addPostType([
        {
            key: "blog",
            label: "Blog",
            icon: "solar:document-bold",
            color: "from-violet-500 to-purple-600",
            position: 10,
            hasCategory: true,
        },
        {
            key: "page",
            label: "Page",
            icon: "solar:file-text-bold",
            color: "from-sky-500 to-blue-600",
            position: 20,
            hasCategory: false,  // pages don't use categories
        },
    ], CORE_NX);

    // ─── Core category types ─────────────────────────────────────────────────
    addCatType([
        {
            key: "blog-category",
            label: "Blog Category",
            postType: "blog",
            icon: "solar:folder-with-files-bold",
            color: "from-violet-500 to-purple-600",
            position: 10,
        },
        {
            key: "location",
            label: "Location",
            postType: "",
            icon: "solar:map-point-bold",
            color: "from-sky-500 to-cyan-600",
            position: 50,
        },
        {
            key: "prompt",
            label: "AI Prompt",
            postType: "",
            icon: "solar:stars-bold",
            color: "from-fuchsia-500 to-purple-600",
            position: 51,
        },
    ], CORE_NX);

    // ─── Post form fields ───────────────────────────────────────────────────
    addHook("post.form", [
        {
            key: "description",
            label: "Description",
            type: "blog",
            style: "left",
            position: 10,
            fieldType: "content",
        },
        {
            key: "description",
            label: "Description",
            type: "page",
            style: "left",
            position: 10,
            fieldType: "content",
        },
        {
            key: "category",
            label: "Category",
            type: "blog",
            style: "right",
            position: 5,
            component: CategorySelect,
            hierarchicalCatType: "blog-category",
        },
        {
            key: "location",
            label: "Location",
            type: "blog",
            style: "right",
            position: 6,
            component: CategoryHierarchicalSelect,
            hierarchicalCatType: "location",
        },
        {
            key: "builderId",
            label: "Select Builder",
            type: "page",
            style: "left",
            position: 20,
            component: BuilderSelect,
        },
    ], CORE_NX);

    // ─── Cat form fields (universal — apply to all category types) ─────────
    addHook("cat.form", [
        {
            key: "shortDescription",
            label: "Short Description",
            type: "",
            style: "left",
            position: 100,
            fieldType: "content",
        },
        {
            key: "description",
            label: "Description",
            type: "",
            style: "left",
            position: 110,
            fieldType: "content",
        },
        {
            key: "images",
            label: "Images",
            type: "",
            style: "right",
            position: 100,
            fieldType: "gallery-multiple",
        },
        {
            key: "gallery",
            label: "Gallery",
            type: "",
            style: "right",
            position: 110,
            fieldType: "gallery-multiple",
        },
    ], CORE_NX);

    // ─── AI Prompt cat form fields ──────────────────────────────────────────
    addHook("cat.form", [
        {
            key: "description",
            label: "System Prompt",
            type: "prompt",
            style: "left",
            position: 10,
            component: Textarea,
        },
        {
            key: "metaTitle",
            label: "API Key",
            type: "prompt",
            style: "right",
            position: 10,
            component: Text,
        },
        {
            key: "metaDescription",
            label: "Model",
            type: "prompt",
            style: "right",
            position: 20,
            component: Text,
        },
    ], CORE_NX);

    // ─── Blog post page templates ────────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "blog",
            label: "Blog Layout 1",
            type: "blog",
            slug: "dynamic",
            style: "left",
            position: 10,
            active: true,
            component: BlogLayout1,
        },
        {
            key: "blog",
            label: "Blog Layout 2",
            type: "blog",
            slug: "dynamic",
            style: "left",
            position: 20,
            active: false,
            component: BlogLayout2,
        },
    ], CORE_NX);

    // ─── Blog category page templates ────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "blog-category",
            label: "Blog Category Layout 1",
            type: "blog-category",
            slug: "dynamic",
            style: "left",
            position: 10,
            active: true,
            component: BlogCategoryLayout1,
        },
        {
            key: "blog-category",
            label: "Blog Category Layout 2",
            type: "blog-category",
            slug: "dynamic",
            style: "left",
            position: 20,
            active: false,
            component: BlogCategoryLayout2,
        },
    ], CORE_NX);

    // ─── Blog box templates ───────────────────────────────────────────────────
    // type: "blog-box" — selectable in the Template manager.
    // BlogGridClient resolves the active box via getHooks("root.pages").
    addHook("root.pages", [
        {
            key: "blog-box",
            label: "Blog Box 1",
            type: "blog-box",
            slug: "dynamic",
            style: "left",
            position: 10,
            active: true,
            component: BlogBox1,
        },
        {
            key: "blog-box",
            label: "Blog Box 2",
            type: "blog-box",
            slug: "dynamic",
            style: "left",
            position: 20,
            active: false,
            component: BlogBox2,
        },
    ], CORE_NX);

    // ─── Page post templates ─────────────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "page",
            label: "Page Layout 1",
            type: "page",
            slug: "dynamic",
            style: "left",
            position: 10,
            active: true,           // first-boot default
            component: PageLayout1,
        },
        {
            key: "page",
            label: "Page Layout 2",
            type: "page",
            slug: "dynamic",
            style: "left",
            position: 20,
            active: false,
            component: PageLayout2,
        },
    ], CORE_NX);

    // ─── Site header templates ────────────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "header",
            label: "Header 1",
            type: "header",
            slug: "layout",
            style: "left",
            position: 10,
            component: Header1,
        },
        {
            key: "header",
            label: "Header 2",
            type: "header",
            slug: "layout",
            style: "left",
            position: 20,
            component: Header2,
        },
        {
            key: "header",
            label: "Header 3",
            type: "header",
            slug: "layout",
            style: "left",
            position: 30,
            component: Header3,
        },
    ], CORE_NX);

    // ─── Site footer templates ────────────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "footer",
            label: "Footer 1",
            type: "footer",
            slug: "layout",
            style: "left",
            position: 10,
            component: Footer1,
        },
        {
            key: "footer",
            label: "Footer 2",
            type: "footer",
            slug: "layout",
            style: "left",
            position: 20,
            active: false,
            component: Footer2,
        },
        {
            key: "footer",
            label: "Footer 3",
            type: "footer",
            slug: "layout",
            style: "left",
            position: 30,
            active: false,
            component: Footer3,
        },
    ], CORE_NX);

    // ─── Core settings form fields ────────────────────────────────────────────
    // Plugins can inject additional fields via addHook("setting.form", [...], nx)
    // type: "settings" means the field appears on the main /admin/settings page.
    // Leave type: "" for fields that appear on ALL settings pages (core + plugin).
    addHook("setting.form", [
        {
            key: "siteName",
            label: "Site Name",
            type: "settings",
            style: "left",
            position: 10,
            component: Text,
        },
        {
            key: "site_title",
            label: "Site Title (browser tab / SEO)",
            type: "settings",
            style: "left",
            position: 15,
            component: Text,
        },
        {
            key: "siteDescription",
            label: "Site Description",
            type: "settings",
            style: "left",
            position: 20,
            component: Textarea,
        },
        {
            key: "site_description",
            label: "Meta Description (SEO)",
            type: "settings",
            style: "left",
            position: 25,
            component: Textarea,
        },
        {
            key: "logo",
            label: "Header Logo URL",
            type: "settings",
            style: "left",
            position: 30,
            fieldType: "gallery",
        },
        {
            key: "header_logo_height",
            label: "Header Logo Height (px)",
            type: "settings",
            style: "left",
            position: 35,
            component: Number,
        },
        {
            key: "favicon",
            label: "Favicon URL",
            type: "settings",
            style: "left",
            position: 40,
            fieldType: "gallery",
        },
        {
            key: "homepage_type",
            label: "Homepage Mode",
            type: "settings",
            style: "left",
            position: 48,
            component: Select,
            options: [
                { label: "Both (Universal for all visitors)", value: "both" },
                { label: "Login (Distinct for Logged-In & Guest)", value: "login" },
            ],
        },
        {
            key: "homepage",
            label: "Homepage Builder / Template (Universal / Default)",
            type: "settings",
            style: "left",
            position: 49,
            component: BuilderSelect,
        },
        {
            key: "homepage_logged_in",
            label: "Homepage for Logged-In Users (When type is Login)",
            type: "settings",
            style: "left",
            position: 50,
            component: BuilderSelect,
        },
        {
            key: "homepage_guest",
            label: "Homepage for Guest Users (When type is Login)",
            type: "settings",
            style: "left",
            position: 51,
            component: BuilderSelect,
        },
        {
            key: "phone",
            label: "Phone",
            type: "settings",
            style: "right",
            position: 10,
            component: Text,
        },
        {
            key: "email",
            label: "Email",
            type: "settings",
            style: "right",
            position: 20,
            component: Text,
        },
        {
            key: "address",
            label: "Address",
            type: "settings",
            style: "right",
            position: 30,
            component: Text,
        },
    ], CORE_NX);

    // ─── Appearance settings ──────────────────────────────────────────────────
    // type: "appearance" → appears on the Appearance tab of the Settings page.
    // These values are injected into the root layout as CSS variables + font.
    addHook("setting.form", [
        // ── Brand colours ──
        {
            key: "color_main",
            label: "Main / Brand Colour",
            type: "appearance",
            style: "left",
            position: 10,
            component: ColorPicker,
        },
        {
            key: "color_secondary",
            label: "Secondary Colour",
            type: "appearance",
            style: "left",
            position: 20,
            component: ColorPicker,
        },
        {
            key: "color_primary",
            label: "Primary Accent Colour",
            type: "appearance",
            style: "left",
            position: 30,
            component: ColorPicker,
        },
        {
            key: "color_ff",
            label: "Background / Surface Colour",
            type: "appearance",
            style: "left",
            position: 40,
            component: ColorPicker,
        },
        // ── Layout ──
        {
            key: "width",
            label: "Container Max-Width (px)",
            type: "appearance",
            style: "right",
            position: 10,
            component: Number,
        },
        // ── Typography ──
        {
            key: "google_font",
            label: "Google Font (e.g. Inter, Roboto)",
            type: "appearance",
            style: "right",
            position: 20,
            component: Text,
        },
    ], CORE_NX);

    // ─── Navigation colour/style settings ────────────────────────────────────
    // type: "nav" → appears on the Navigation tab of the Settings page
    addHook("setting.form", [
        // ── Text colours ──
        {
            key: "nav_text",
            label: "Nav Text Colour",
            type: "nav",
            style: "left",
            position: 10,
            component: ColorPicker,
        },
        {
            key: "nav_hover_text",
            label: "Nav Hover Text Colour",
            type: "nav",
            style: "left",
            position: 20,
            component: ColorPicker,
        },
        {
            key: "nav_highlight",
            label: "Nav Highlight / Active Colour",
            type: "nav",
            style: "left",
            position: 30,
            component: ColorPicker,
        },
        {
            key: "nav_active_text",
            label: "Active Item Text Colour",
            type: "nav",
            style: "left",
            position: 40,
            component: ColorPicker,
        },
        // ── Background colours ──
        {
            key: "nav_bg",
            label: "Nav Background",
            type: "nav",
            style: "right",
            position: 10,
            component: ColorPicker,
        },
        {
            key: "nav_hover_bg",
            label: "Nav Hover Background",
            type: "nav",
            style: "right",
            position: 20,
            component: ColorPicker,
        },
        {
            key: "nav_box_bg",
            label: "Dropdown Panel Background",
            type: "nav",
            style: "right",
            position: 30,
            component: ColorPicker,
        },
        {
            key: "nav_box_text",
            label: "Dropdown Panel Text Colour",
            type: "nav",
            style: "right",
            position: 40,
            component: ColorPicker,
        },
        {
            key: "nav_border_color",
            label: "Dropdown Border Colour",
            type: "nav",
            style: "right",
            position: 50,
            component: ColorPicker,
        },
        {
            key: "nav_active_bg",
            label: "Active Item Background",
            type: "nav",
            style: "right",
            position: 60,
            component: ColorPicker,
        },
        // ── Typography / spacing ──
        {
            key: "nav_font_size",
            label: "Nav Font Size (px)",
            type: "nav",
            style: "left",
            position: 50,
            component: Number,
        },
        {
            key: "nav_font_weight",
            label: "Nav Font Weight",
            type: "nav",
            style: "left",
            position: 60,
            component: Select,
            options: [
                { value: "400", label: "400 — Regular" },
                { value: "500", label: "500 — Medium" },
                { value: "600", label: "600 — Semi-bold" },
                { value: "700", label: "700 — Bold" },
            ],
        },
        {
            key: "nav_gap",
            label: "Nav Item Gap (px)",
            type: "nav",
            style: "left",
            position: 70,
            component: Number,
        },
    ], CORE_NX);

    // ─── Header menu slot assignments ─────────────────────────────────────────
    // type: "header" → appears on the Header tab of the Settings page.
    // Each setting value is a menu location string, e.g. "header-1".
    // The header template reads these keys to know which menu to render where.
    addHook("setting.form", [
        {
            key: "header_logo_height",
            label: "Header Logo Height (px)",
            type: "header",
            style: "left",
            position: 5,
            component: Number,
        },
        {
            key: "header_main_menu",
            label: "Main Menu",
            type: "header",
            style: "left",
            position: 10,
            component: Select,
            options: [
                { value: "", label: "— None —" },
                ...Array.from({ length: 10 }, (_, i) => ({
                    value: `header-${i + 1}`,
                    label: `Header ${i + 1}`,
                })),
            ],
        },
        {
            key: "header_mobile_menu",
            label: "Mobile Menu",
            type: "header",
            style: "left",
            position: 20,
            component: Select,
            options: [
                { value: "", label: "— None —" },
                ...Array.from({ length: 10 }, (_, i) => ({
                    value: `mobile-${i + 1}`,
                    label: `Mobile ${i + 1}`,
                })),
            ],
        },
        {
            key: "header_top_menu",
            label: "Top Bar Menu",
            type: "header",
            style: "left",
            position: 30,
            component: Select,
            options: [
                { value: "", label: "— None —" },
                ...Array.from({ length: 10 }, (_, i) => ({
                    value: `header-${i + 1}`,
                    label: `Header ${i + 1}`,
                })),
            ],
        },
        {
            key: "header_right_menu",
            label: "Right Side Menu",
            type: "header",
            style: "right",
            position: 10,
            component: Select,
            options: [
                { value: "", label: "— None —" },
                ...Array.from({ length: 10 }, (_, i) => ({
                    value: `header-${i + 1}`,
                    label: `Header ${i + 1}`,
                })),
            ],
        },
        {
            key: "header_footer_menu",
            label: "Footer Menu",
            type: "header",
            style: "right",
            position: 20,
            component: Select,
            options: [
                { value: "", label: "— None —" },
                ...Array.from({ length: 10 }, (_, i) => ({
                    value: `footer-${i + 1}`,
                    label: `Footer ${i + 1}`,
                })),
            ],
        },
        {
            key: "header_sticky",
            label: "Sticky Header",
            type: "header",
            style: "right",
            position: 30,
            component: Switch,
        },
        {
            key: "header_transparent",
            label: "Transparent Header (on hero)",
            type: "header",
            style: "right",
            position: 40,
            component: Switch,
        },
    ], CORE_NX);

    // ─── Category layout grid settings ───────────────────────────────────────
    // type: "category" → appears on the Category Layout tab of the Settings page
    addHook("setting.form", [
        {
            key: "category_grid_cols_desktop",
            label: "Category Desktop Grid Columns (1-12)",
            type: "category",
            style: "left",
            position: 10,
            component: Number,
        },
        {
            key: "category_grid_cols_tablet",
            label: "Category Tablet Grid Columns (1-12)",
            type: "category",
            style: "left",
            position: 20,
            component: Number,
        },
        {
            key: "category_grid_cols_mobile",
            label: "Category Mobile Grid Columns (1-12)",
            type: "category",
            style: "left",
            position: 30,
            component: Number,
        },
        {
            key: "category_grid_gap_desktop",
            label: "Category Desktop Grid Gap Step (0-12)",
            type: "category",
            style: "right",
            position: 10,
            component: Number,
        },
        {
            key: "category_grid_gap_tablet",
            label: "Category Tablet Grid Gap Step (0-12)",
            type: "category",
            style: "right",
            position: 20,
            component: Number,
        },
        {
            key: "category_grid_gap_mobile",
            label: "Category Mobile Grid Gap Step (0-12)",
            type: "category",
            style: "right",
            position: 30,
            component: Number,
        },
    ], CORE_NX);
}