/**
 * hook/pluginApiRoutes.ts — Server-only plugin API route registry.
 *
 * Uses require.context to automatically discover every plugin's
 * api/[...]/route.ts files. Each discovered file may export any combination
 * of HTTP verb handlers: GET, POST, PUT, PATCH, DELETE.
 *
 * The slug key is derived from the file path by stripping the leading
 * "./<pluginName>/api/" prefix and the trailing "/route.ts" suffix, then
 * collapsing any "[id]"-style dynamic segments into ":id".
 *
 * Example mappings:
 *   ./epaper/api/epaper/route.ts          -> "epaper"
 *   ./epaper/api/epaper/[id]/route.ts     -> "epaper/:id"
 *   ./product/api/product-price/route.ts  -> "product-price"
 *
 * THIS FILE IS SERVER-ONLY. Never import it from client components or
 * hook/index.ts. Only import it from app/api/[...slug]/route.ts or other
 * pure server-side files.
 */

import type { NextRequest } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HttpVerb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RouteHandler = (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> }
) => Promise<Response> | Response;

export interface ApiRouteEntry {
    /** The normalised path key, e.g. "epaper" or "epaper/:id" */
    key: string;
    /** The original require.context path, e.g. "./epaper/api/epaper/route.ts" */
    filePath: string;
    /** Exported HTTP verb handlers from the route module */
    handlers: Partial<Record<HttpVerb, RouteHandler>>;
    /** Whether this route has dynamic segments (i.e. ":id" placeholders) */
    isDynamic: boolean;
    /** Ordered list of path segments used for dynamic matching */
    segments: string[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const _routes: ApiRouteEntry[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a require.context key like "./epaper/api/epaper/[id]/route.ts"
 * into a normalised route key like "epaper/:id".
 *
 * Steps:
 *  1. Strip "./<pluginName>/api/" prefix
 *  2. Strip "/route.ts" suffix
 *  3. Replace Next.js "[param]" segments with ":param"
 */
function filePathToKey(contextKey: string): string {
    // contextKey shape: "./<pluginName>/api/<rest>/route.ts"
    const withoutLeadingDot = contextKey.replace(/^\.\//, ""); // "epaper/api/epaper/[id]/route.ts"
    const parts = withoutLeadingDot.split("/");

    // parts[0] = pluginName, parts[1] = "api", parts[2..n-1] = route segments, parts[n] = "route.ts"
    // We want parts[2..n-1]
    const routeSegments = parts.slice(2, -1); // ["epaper", "[id]"]

    return routeSegments
        .map((seg) => seg.replace(/^\[(.+)\]$/, ":$1")) // [id] -> :id
        .join("/");
}

/**
 * Split a key into its segments for matching purposes.
 */
function keyToSegments(key: string): string[] {
    return key.split("/").filter(Boolean);
}

// ─── Auto-discovery ───────────────────────────────────────────────────────────

interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(
        directory: string,
        useSubdirectories?: boolean,
        regExp?: RegExp
    ): RequireContext;
    (id: string): any;
};

const VERBS: HttpVerb[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const apiContext = require.context(
    "../plugin",
    true,
    /^\.\/[^/]+\/api\/.+\/route\.(ts|js)$/
);

apiContext.keys().forEach((contextKey: string) => {
    const mod = apiContext(contextKey);

    const handlers: Partial<Record<HttpVerb, RouteHandler>> = {};
    VERBS.forEach((verb) => {
        if (typeof mod[verb] === "function") {
            handlers[verb] = mod[verb] as RouteHandler;
        }
    });

    // Skip files that export no recognised HTTP handlers
    if (Object.keys(handlers).length === 0) return;

    const key = filePathToKey(contextKey);
    const segments = keyToSegments(key);
    const isDynamic = segments.some((s) => s.startsWith(":"));

    // Deduplicate — last registration wins on hot-reload
    const existingIdx = _routes.findIndex((r) => r.key === key);
    const entry: ApiRouteEntry = { key, filePath: contextKey, handlers, isDynamic, segments };

    if (existingIdx >= 0) {
        _routes[existingIdx] = entry;
    } else {
        _routes.push(entry);
    }
});

// Sort routes so that static segments have higher precedence over dynamic segments (:id)
function routeSpecificityScore(route: ApiRouteEntry): number {
    let score = 0;
    for (const seg of route.segments) {
        if (seg.startsWith(":")) {
            score += 1; // Dynamic segment = lower priority
        } else {
            score += 100; // Static segment = high priority
        }
    }
    return score;
}

_routes.sort((a, b) => routeSpecificityScore(b) - routeSpecificityScore(a));

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ResolvedRoute {
    handler: RouteHandler;
    /** Dynamic param values extracted from the URL, e.g. { id: "abc123" } */
    params: Record<string, string>;
}

/**
 * Look up the handler for a given HTTP verb and slug path.
 *
 * @param verb     - HTTP method in uppercase, e.g. "GET"
 * @param slugPath - URL path after /api/, e.g. "epaper" or "epaper/abc123"
 * @returns        - The matching handler + extracted params, or null if no match
 */
export function getApiHandler(
    verb: HttpVerb,
    slugPath: string
): ResolvedRoute | null {
    const incomingSegments = slugPath.split("/").filter(Boolean);

    for (const route of _routes) {
        if (route.segments.length !== incomingSegments.length) continue;

        // Skip routes that do not support the requested HTTP verb
        const handler = route.handlers[verb];
        if (!handler) continue;

        const params: Record<string, string> = {};
        let matched = true;

        for (let i = 0; i < route.segments.length; i++) {
            const routeSeg = route.segments[i];
            const incomingSeg = incomingSegments[i];

            if (routeSeg.startsWith(":")) {
                // Dynamic segment — capture the value
                params[routeSeg.slice(1)] = incomingSeg;
            } else if (routeSeg !== incomingSeg) {
                matched = false;
                break;
            }
        }

        if (!matched) continue;

        return { handler, params };
    }

    return null;
}

/**
 * Checks whether any route exists for the given slug path across any HTTP verb.
 */
export function hasAnyApiHandler(slugPath: string): boolean {
    const incomingSegments = slugPath.split("/").filter(Boolean);

    for (const route of _routes) {
        if (route.segments.length !== incomingSegments.length) continue;

        let matched = true;
        for (let i = 0; i < route.segments.length; i++) {
            const routeSeg = route.segments[i];
            const incomingSeg = incomingSegments[i];

            if (!routeSeg.startsWith(":") && routeSeg !== incomingSeg) {
                matched = false;
                break;
            }
        }

        if (matched) return true;
    }

    return false;
}

/**
 * Returns a snapshot of all registered plugin API routes.
 * Useful for debugging or admin tooling.
 */
export function getAllApiRoutes(): ApiRouteEntry[] {
    return [..._routes];
}
