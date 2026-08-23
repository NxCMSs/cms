import connectDB from "@/lib/mongodb";
import Builder from "@/components/Builder";
import Template from "@/models/template";
import { Settings } from "@/lib/settings";
import { getAuthSession } from "@/lib/session";
import { getRootPages } from "@/hook/rootPages";
import { resolveLazyComponent } from "@/hook/pluginHooks";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Homepage — Server Side Rendered (SSR)
 * Supports:
 *  1. type=both: Universal homepage builder / template for all visitors
 *  2. type=login: Distinct homepage builder / template for Logged-In vs Guest users
 *  3. Dynamically resolves DB templates, plugin hook templates, or visual builder documents.
 */
export default async function Home() {
    const [settings, user] = await Promise.all([
        Settings(),
        getAuthSession(),
    ]);

    const isLoggedIn = Boolean(user?._id);
    const homepageType = (settings.homepage_type as string) || "both";

    let target: string | undefined;

    if (homepageType === "login") {
        target = isLoggedIn
            ? (settings.homepage_logged_in as string) || (settings.homepage as string) || (settings.homepage_guest as string)
            : (settings.homepage_guest as string) || (settings.homepage_logged_in as string) || (settings.homepage as string);
    } else {
        target =
            (settings.homepage as string) ||
            (isLoggedIn ? (settings.homepage_logged_in as string) : (settings.homepage_guest as string)) ||
            (settings.homepage_logged_in as string) ||
            (settings.homepage_guest as string);
    }

    const trimmed = target?.trim();
    if (!trimmed) return null;

    // 1. Explicit builder ID format (builder:<id>)
    if (trimmed.startsWith("builder:")) {
        const builderId = trimmed.replace("builder:", "");
        return <Builder id={builderId} />;
    }

    // 2. Check if target matches a DB Template record by _id, key, or label
    let targetKey = trimmed;
    try {
        await connectDB();
        let tplDoc: any = null;
        if (mongoose.Types.ObjectId.isValid(trimmed)) {
            tplDoc = await Template.findById(trimmed).lean();
        }
        if (!tplDoc) {
            tplDoc = await Template.findOne({
                $or: [{ key: trimmed }, { label: trimmed }],
            }).lean();
        }

        if (tplDoc) {
            // If template points to a visual builder document
            if (tplDoc.builderId) {
                return <Builder id={tplDoc.builderId} />;
            }
            if (tplDoc.key) {
                targetKey = tplDoc.key;
            }
        }
    } catch {
        // Fall through to hook search
    }

    // 3. Dynamically match registered root.pages template or plugin page
    const rootPages = getRootPages();
    const matchedPage = rootPages.find(
        (p) =>
            p.key === targetKey ||
            p.key === trimmed ||
            p.label === targetKey ||
            p.label === trimmed ||
            p.slug === targetKey ||
            `slug:${p.slug}` === targetKey ||
            `template:${p.type}:${p.label}` === targetKey ||
            `hook:${p.type}:${p.label}` === targetKey ||
            p.label?.toLowerCase() === targetKey.toLowerCase() ||
            p.key?.toLowerCase() === targetKey.toLowerCase()
    );

    if (matchedPage) {
        let Component = matchedPage.component as any;
        if (!Component && matchedPage.lazyPath) {
            Component = await resolveLazyComponent(matchedPage.lazyPath);
        }
        if (Component) {
            return <Component settings={settings} user={user} />;
        }
    }

    // 4. Fallback: Treat trimmed ID as Builder Page ID
    return <Builder id={trimmed} />;
}
