/**
 * Server-side root pages registry.
 *
 * Calls register() on every plugin module so their addHook("root.pages", ...)
 * calls populate the permanent _rootPages store in hook/index.ts.
 *
 * That store is never cleared by clearHooks() and bypasses the gate, so it
 * is always available for server components regardless of client-side state.
 *
 * Import this file once in any server component that needs root pages:
 *   import { getRootPages } from "@/hook/rootPages";
 */

import { getAllRootPages, getRegisteredRootPages, registerCoreHooks } from "@/hook";
import type { FormHookField } from "@/hook";
import { register as coreRegister } from "@/components/admin";

interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
    (id: string): any;
};

const pluginContext = require.context(
    "../plugin",
    true,
    /^\.\/[^/]+\/index\.(ts|tsx|js|jsx)$/
);

// Always register core hooks first so header/footer/blog/page templates
// are in the permanent store before any plugin adds its own entries.
registerCoreHooks(coreRegister);

// Call register() on every plugin — addHook("root.pages") writes to the
// permanent store which deduplicates, so repeated calls are safe.
pluginContext.keys().forEach((key: string) => {
    const mod = pluginContext(key);
    if (typeof mod.register === "function") {
        mod.register();
    }
});

/**
 * Returns all root page entries across all plugins.
 */
export function getRootPages(): FormHookField[] {
    pluginContext.keys().forEach((key: string) => {
        const mod = pluginContext(key);
        if (typeof mod.register === "function") {
            mod.register();
        }
    });
    return getRegisteredRootPages();
}
