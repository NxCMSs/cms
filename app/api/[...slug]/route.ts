/**
 * app/api/[...slug]/route.ts — Dynamic catch-all for plugin API routes.
 *
 * Any request to /api/<anything> that does NOT match a static file in
 * app/api/ falls through here. This handler:
 *
 *  1. Joins the slug segments into a path string
 *     e.g. ["product", "import"] -> "product/import"
 *          ["epaper", "abc"]     -> "epaper/abc"
 *
 *  2. Looks up the matching plugin route handler via getApiHandler()
 *     from hook/pluginApiRoutes.ts (populated via require.context).
 *
 *  3. If not found in the initial bundle cache (e.g. new plugin route files),
 *     falls back to a recursive filesystem search inside plugin/<pluginName>/api/...
 *     and imports the handler dynamically.
 *
 *  4. Forwards the request — including extracted dynamic params —
 *     to the matched handler, or returns 404 / 405 when no match exists.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiHandler, hasAnyApiHandler, type HttpVerb } from "@/hook/pluginApiRoutes";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const HTTP_VERBS: HttpVerb[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

interface SlugParams {
    params: Promise<{ slug: string[] }>;
}

// ─── Filesystem Fallback Discovery ────────────────────────────────────────────

function searchRouteInDir(
    currentDir: string,
    segments: string[],
    index: number,
    params: Record<string, string>
): { filePath: string; params: Record<string, string> } | null {
    if (index === segments.length) {
        const tsFile = path.join(currentDir, "route.ts");
        const jsFile = path.join(currentDir, "route.js");
        if (fs.existsSync(tsFile)) return { filePath: tsFile, params };
        if (fs.existsSync(jsFile)) return { filePath: jsFile, params };
        return null;
    }

    const currentSeg = segments[index];
    if (!fs.existsSync(currentDir)) return null;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    // 1. Try exact static directory match
    const staticEntry = entries.find((e) => e.isDirectory() && e.name === currentSeg);
    if (staticEntry) {
        const res = searchRouteInDir(path.join(currentDir, staticEntry.name), segments, index + 1, params);
        if (res) return res;
    }

    // 2. Try dynamic directory [param] match
    const dynamicEntries = entries.filter((e) => e.isDirectory() && e.name.startsWith("[") && e.name.endsWith("]"));
    for (const dyn of dynamicEntries) {
        const paramName = dyn.name.slice(1, -1);
        const newParams = { ...params, [paramName]: currentSeg };
        const res = searchRouteInDir(path.join(currentDir, dyn.name), segments, index + 1, newParams);
        if (res) return res;
    }

    return null;
}

function findPluginRouteFile(incomingSegments: string[]): { filePath: string; params: Record<string, string> } | null {
    const pluginDir = path.join(process.cwd(), "plugin");
    if (!fs.existsSync(pluginDir)) return null;

    const plugins = fs.readdirSync(pluginDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    for (const plugin of plugins) {
        const apiDir = path.join(pluginDir, plugin, "api");
        if (!fs.existsSync(apiDir)) continue;

        // 1. Try direct exact match inside plugin/[name]/api/[...incomingSegments]/route.ts
        const directTs = path.join(apiDir, ...incomingSegments, "route.ts");
        const directJs = path.join(apiDir, ...incomingSegments, "route.js");
        if (fs.existsSync(directTs)) return { filePath: directTs, params: {} };
        if (fs.existsSync(directJs)) return { filePath: directJs, params: {} };

        // 2. Recursive match (supports dynamic params [id], etc.)
        const match = searchRouteInDir(apiDir, incomingSegments, 0, {});
        if (match) return match;
    }

    return null;
}

// ─── Shared Dispatcher ────────────────────────────────────────────────────────

async function dispatch(req: NextRequest, { params }: SlugParams): Promise<Response> {
    const { slug } = await params;
    const incomingSegments = Array.isArray(slug) ? slug : [slug];
    const slugPath = incomingSegments.join("/");
    const verb = req.method.toUpperCase() as HttpVerb;

    // 1. Look up in require.context in-memory registry
    let resolved = getApiHandler(verb, slugPath);

    // 2. Fallback: Dynamic filesystem lookup (ensures immediate discovery of all plugin routes)
    if (!resolved) {
        const fsMatch = findPluginRouteFile(incomingSegments);
        if (fsMatch) {
            try {
                const mod = await import(`@/plugin/${path.relative(path.join(process.cwd(), "plugin"), fsMatch.filePath).replace(/\\/g, "/").replace(/\.(ts|js)$/, "")}`);
                if (typeof mod[verb] === "function") {
                    resolved = {
                        handler: mod[verb],
                        params: fsMatch.params,
                    };
                } else if (HTTP_VERBS.some((v) => typeof mod[v] === "function")) {
                    return NextResponse.json(
                        { error: `Method ${verb} not allowed` },
                        { status: 405 }
                    );
                }
            } catch (importErr: any) {
                console.error(`Failed to import plugin route ${fsMatch.filePath}:`, importErr);
            }
        }
    }

    if (!resolved) {
        if (hasAnyApiHandler(slugPath)) {
            return NextResponse.json(
                { error: `Method ${verb} not allowed` },
                { status: 405 }
            );
        }

        return NextResponse.json(
            { error: `API route not found: /api/${slugPath}` },
            { status: 404 }
        );
    }

    const resolvedParams = resolved.params;
    const ctxParams = Promise.resolve(resolvedParams);

    return resolved.handler(req, { params: ctxParams });
}

// ─── HTTP Verb Exports ────────────────────────────────────────────────────────

export function GET(req: NextRequest, ctx: SlugParams) {
    return dispatch(req, ctx);
}

export function POST(req: NextRequest, ctx: SlugParams) {
    return dispatch(req, ctx);
}

export function PUT(req: NextRequest, ctx: SlugParams) {
    return dispatch(req, ctx);
}

export function PATCH(req: NextRequest, ctx: SlugParams) {
    return dispatch(req, ctx);
}

export function DELETE(req: NextRequest, ctx: SlugParams) {
    return dispatch(req, ctx);
}
