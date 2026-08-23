"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useActivePlugins } from "@/hook/useActivePlugins";
import { getAllPostTypes, getAllCatTypes } from "@/hook";
import type { PostTypeField, CatTypeField } from "@/hook";
import { xFetch } from "@/lib/express";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermalinkRow {
    contentType: string;
    label: string;
    icon: string;
    color: string;
    kind: "post" | "category" | "profile";
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the preview URL from a prefix + a placeholder slug */
function buildPreview(prefix: string, slug = "[slug]"): string {
    const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
    return trimmed ? `/${trimmed}/${slug}` : `/${slug}`;
}

// ─── Row component ────────────────────────────────────────────────────────────

function PermalinkRowItem({
    row,
    initialPrefix,
    onSaved,
}: {
    row: PermalinkRow;
    initialPrefix: string;
    onSaved: (contentType: string, prefix: string) => void;
}) {
    const [prefix, setPrefix] = useState(initialPrefix);
    const [status, setStatus] = useState<SaveStatus>("idle");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync when parent loads DB values
    useEffect(() => {
        setPrefix(initialPrefix);
    }, [initialPrefix]);

    const save = async (value: string) => {
        setStatus("saving");
        try {
            const res = await xFetch("/permalink", {
                method: "PUT",
                body: JSON.stringify({ contentType: row.contentType, prefix: value.trim() }),
            });
            if (!res.ok) throw new Error();
            setStatus("saved");
            onSaved(row.contentType, value.trim());
            setTimeout(() => setStatus("idle"), 2000);
        } catch {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    const handleChange = (val: string) => {
        setPrefix(val);
        setStatus("idle");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => save(val), 600);
    };

    const preview = buildPreview(prefix);

    const kindLabel =
        row.kind === "post"
            ? "Post type"
            : row.kind === "category"
            ? "Category type"
            : "Profile type";

    return (
        <div className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
            {/* Header */}
            <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg bg-linear-to-br ${row.color} text-white shadow-sm`}>
                    <Icon icon={row.icon} width={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{row.label}</p>
                    <p className="text-xs text-gray-400">{kindLabel}</p>
                </div>
                {status === "saving" && (
                    <Icon icon="svg-spinners:ring-resize" width={16} className="text-gray-400 shrink-0" />
                )}
                {status === "saved" && (
                    <Icon icon="solar:check-circle-bold" width={16} className="text-emerald-500 shrink-0" />
                )}
                {status === "error" && (
                    <Icon icon="solar:close-circle-bold" width={16} className="text-red-400 shrink-0" />
                )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 shrink-0">domain.com /</span>
                <input
                    type="text"
                    value={prefix}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="leave blank for /{slug}"
                    className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-indigo-500 font-mono"
                />
                <span className="text-xs text-gray-400 shrink-0">/ [slug]</span>
            </div>

            {/* Preview */}
            <p className="text-xs text-indigo-500 font-mono truncate">
                Preview: <span className="font-semibold">{preview}</span>
            </p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PermalinkPage() {
    const activePlugins = useActivePlugins();

    // Permalink map loaded from DB: { [contentType]: prefix }
    const [permalinks, setPermalinks] = useState<Record<string, string>>({});
    const [dbLoaded, setDbLoaded] = useState(false);

    // Load DB values once
    useEffect(() => {
        xFetch("/permalink", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                if (data && typeof data === "object" && !data.error) {
                    setPermalinks(data);
                }
            })
            .catch(() => { })
            .finally(() => setDbLoaded(true));
    }, []);

    // Build rows from registered post types + cat types + profile types
    const postTypes: PostTypeField[] = activePlugins !== null ? getAllPostTypes() : [];
    const catTypes: CatTypeField[] = activePlugins !== null ? getAllCatTypes() : [];

    const profileRows: PermalinkRow[] = [
        {
            contentType: "user",
            label: "User Profile",
            icon: "solar:user-bold",
            color: "from-indigo-600 to-purple-600",
            kind: "profile",
        },
        {
            contentType: "seller",
            label: "Seller Profile",
            icon: "solar:shop-2-bold",
            color: "from-amber-600 to-orange-600",
            kind: "profile",
        },
        {
            contentType: "reporter",
            label: "Reporter Profile",
            icon: "solar:microphone-bold",
            color: "from-emerald-600 to-teal-600",
            kind: "profile",
        },
    ];

    const handleSaved = (contentType: string, prefix: string) => {
        setPermalinks((prev) => ({ ...prev, [contentType]: prefix }));
    };

    if (activePlugins === null || !dbLoaded) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Permalinks</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Set the URL prefix for each content type. Leave blank to use
                    <span className="font-mono text-indigo-500"> /{"{slug}"}</span> directly.
                    Changes save automatically.
                </p>
            </div>

            {/* How it works */}
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-700 space-y-1">
                <p className="font-semibold">How it works</p>
                <ul className="list-disc list-inside space-y-0.5 text-indigo-600 text-xs">
                    <li>Blank prefix → <span className="font-mono">/my-post-slug</span> or <span className="font-mono">/username</span></li>
                    <li>Prefix <span className="font-mono">user</span> → <span className="font-mono">/user/username</span></li>
                    <li>Prefix <span className="font-mono">news/blog</span> → <span className="font-mono">/news/blog/my-post-slug</span></li>
                    <li>No redirects — the router resolves content directly from the URL.</li>
                </ul>
            </div>

            {/* Profile Types */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Profile & User Types
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profileRows.map((row) => (
                        <PermalinkRowItem
                            key={row.contentType}
                            row={row}
                            initialPrefix={permalinks[row.contentType] ?? (row.contentType === "user" ? "" : row.contentType)}
                            onSaved={handleSaved}
                        />
                    ))}
                </div>
            </section>

            {/* Post types */}
            {postTypes.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Post Types
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {postTypes.map((pt) => (
                            <PermalinkRowItem
                                key={pt.key}
                                row={{
                                    contentType: pt.key,
                                    label: pt.label,
                                    icon: pt.icon,
                                    color: pt.color,
                                    kind: "post",
                                }}
                                initialPrefix={permalinks[pt.key] ?? pt.key}
                                onSaved={handleSaved}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Category types */}
            {catTypes.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Category Types
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {catTypes.map((ct) => (
                            <PermalinkRowItem
                                key={ct.key}
                                row={{
                                    contentType: ct.key,
                                    label: ct.label,
                                    icon: ct.icon,
                                    color: ct.color,
                                    kind: "category",
                                }}
                                initialPrefix={permalinks[ct.key] ?? ct.key}
                                onSaved={handleSaved}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
