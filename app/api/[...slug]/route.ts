/**
 * app/api/[...slug]/route.ts — Dynamic catch-all for plugin API routes.
 *
 * Any request to /api/<anything> that does NOT match a static file in
 * app/api/ falls through here. This handler:
 *
 *  1. Joins the slug segments into a path string
 *     e.g. ["epaper"]        -> "epaper"
 *          ["epaper","abc"]  -> "epaper/abc"
 *
 *  2. Looks up the matching plugin route handler via getApiHandler()
 *     from hook/pluginApiRoutes.ts (which was auto-populated at module
 *     load time via require.context over plugin/[name]/api/[...]/route.ts).
 *
 *  3. Forwards the request — including any extracted dynamic params —
 *     to the matched handler, or returns 404 / 405 when no match exists.
 *
 * Plugin authors write normal Next.js route handlers inside their plugin:
 *
 *   plugin/epaper/api/epaper/route.ts          -> GET /api/epaper
 *   plugin/epaper/api/epaper/[id]/route.ts     -> GET /api/epaper/:id
 *
 * No changes are required here or in pluginApiRoutes.ts when a new plugin
 * adds api/ files — discovery is fully automatic.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiHandler, hasAnyApiHandler, type HttpVerb } from "@/hook/pluginApiRoutes";

export const dynamic = "force-dynamic";

interface SlugParams {
    params: Promise<{ slug: string[] }>;
}

// ─── Shared dispatcher ────────────────────────────────────────────────────────

async function dispatch(req: NextRequest, { params }: SlugParams): Promise<Response> {
    const { slug } = await params;

    // Join segments: ["epaper", "abc123"] → "epaper/abc123"
    const slugPath = Array.isArray(slug) ? slug.join("/") : slug;

    const verb = req.method.toUpperCase() as HttpVerb;
    const resolved = getApiHandler(verb, slugPath);

    if (!resolved) {
        // Check whether *any* handler is registered for this path (→ 405 vs 404)
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

    // Build a params promise that resolves to the extracted dynamic values
    // (e.g. { id: "abc123" }) so plugin handlers can use the same
    // Next.js `context.params` API they would use in a static route file.
    const resolvedParams = resolved.params;
    const ctxParams = Promise.resolve(resolvedParams);

    return resolved.handler(req, { params: ctxParams });
}

// ─── HTTP verb exports ────────────────────────────────────────────────────────

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
