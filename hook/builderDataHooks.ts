// hook/builderDataHooks.ts
// Server-only registry. Maps builder element types to async server components.
// Auto-discovers plugin lib/builderData.tsx files.
// SERVER-ONLY - never import from client components.

import React from "react";
import type { ReactNode } from "react";
import Menus from "@/components/Menus";

// A server component factory: receives the element's schema and optional page data, returns JSX.
type BuilderElementComponent = (schema: any, data?: any) => ReactNode | Promise<ReactNode>;

// Safe global registry to prevent TDZ / circular import initialization errors
function getRegistry(): Map<string, BuilderElementComponent> {
    const g = globalThis as any;
    if (!g.__builder_registry) {
        g.__builder_registry = new Map<string, BuilderElementComponent>();
    }
    return g.__builder_registry;
}

type BuilderWrapperFn = (builderComponent: ReactNode, data?: any, pageData?: any, settings?: any, permalinkMap?: any) => ReactNode;

let _builderWrapper: BuilderWrapperFn | null = null;

export function registerBuilderWrapper(fn: BuilderWrapperFn): void {
    _builderWrapper = fn;
}

export function runBuilderWrapper(
    builderComponent: ReactNode,
    data?: any,
    pageData?: any,
    settings?: any,
    permalinkMap?: any
): ReactNode {
    if (!_builderWrapper) return builderComponent;
    return _builderWrapper(builderComponent, data, pageData, settings, permalinkMap);
}

/**
 * Register a server-side component for a builder element type.
 * Called by plugin lib/builderData.tsx files.
 */
export function registerBuilderElement(
    elementType: string,
    component: BuilderElementComponent,
    pluginNx?: string
): void {
    const reg = getRegistry();
    if (pluginNx) {
        reg.set(`${pluginNx}::${elementType}`, component);
    }
    reg.set(elementType, component);
}

/**
 * Returns true when a server component is registered for this element type.
 */
export function hasBuilderElement(elementType: string, pluginNx?: string): boolean {
    const reg = getRegistry();
    if (pluginNx && reg.has(`${pluginNx}::${elementType}`)) return true;
    return reg.has(elementType);
}

/**
 * Render the registered server component for an element.
 * Returns null if none is registered.
 */
export async function renderBuilderElement(
    elementType: string,
    schema: any,
    data?: any,
    pluginNx?: string
): Promise<ReactNode> {
    const reg = getRegistry();
    const component = (pluginNx && reg.get(`${pluginNx}::${elementType}`)) || reg.get(elementType);
    if (!component) return null;
    return component(schema, data);
}

registerBuilderElement("menus", async (schema: any) => {
    const location = schema.content?.location || "header-1";
    const menuType = schema.content?.menu_type || "desktop";
    return React.createElement(Menus, { location, menuType, settings: schema.style || {} });
});

// Auto-discovery fallback: scans any additional plugin/*/lib/builderData.ts files.
interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
    (id: string): any;
};

try {
    const ctx = require.context(
        "../plugin",
        true,
        /^\.\/[^/]+\/lib\/builderData\.(ts|tsx|js|jsx)$/
    );

    ctx.keys().forEach((key: string) => {
        try {
            ctx(key);
        } catch {
            // Guard against stale HMR
        }
    });
} catch {
    // Guard in environments where require.context is not available
}
