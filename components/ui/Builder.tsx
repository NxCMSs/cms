"use client";

import { useEffect, useState } from "react";
import { xFetch } from "@/lib/express";
import { getHooks } from "@/hook";
import { reregisterHooks } from "@/hook/PluginList";
import type { FieldProps } from "@/hook";

interface OptionItem {
    value: string;
    label: string;
    group: string;
    status?: string;
}

export function BuilderSelect({ name, label, value, onChange }: FieldProps) {
    const [options, setOptions] = useState<OptionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            setLoading(true);
            try {
                // 1. Fetch active plugins from DB and re-register hooks so plugin hooks (like social-media) are in memory
                const pluginRes = await xFetch("/plugin/installed", { cache: "no-store" }).catch(() => null);
                const pluginData = pluginRes && pluginRes.ok ? await pluginRes.json().catch(() => null) : null;
                const activeNxIds = (pluginData?.plugins ?? [])
                    .filter((p: any) => p.status === "active")
                    .map((p: any) => p.nx);

                reregisterHooks(activeNxIds);

                // 2. Fetch active builder pages (only templateType === 'builder' or standard builders)
                const builderRes = await xFetch("/builder", { cache: "no-store" }).catch(() => null);
                const builderData = builderRes && builderRes.ok ? await builderRes.json().catch(() => []) : [];

                const builderOptions: OptionItem[] = Array.isArray(builderData)
                    ? builderData
                        .filter((b: any) => !b.templateType || b.templateType === "builder")
                        .map((b: any) => ({
                            value: b._id,
                            label: b.title || "Untitled Builder Page",
                            group: "Builder Pages",
                            status: b.status,
                        }))
                    : [];

                // 3. Fetch Templates (FILTER ONLY type === "builder")
                const tplRes = await xFetch("/template", { cache: "no-store" }).catch(() => null);
                const tplData = tplRes && tplRes.ok ? await tplRes.json().catch(() => []) : [];

                // Read from hook registry (ONLY type === "builder")
                const hookEntries = getHooks("root.pages").filter((p) => p.type === "builder");
                const templateOptions: OptionItem[] = [];

                // Add from hook entries
                hookEntries.forEach((h: any) => {
                    const val = h.key || (h.slug ? `slug:${h.slug}` : `hook:${h.type}:${h.label}`);
                    if (!builderOptions.some((b) => b.value === val) && !templateOptions.some((to) => to.value === val)) {
                        templateOptions.push({
                            value: val,
                            label: `${h.label || h.key} (Template)`,
                            group: "Builder Templates",
                        });
                    }
                });

                // Add from DB templates (ONLY type === "builder")
                if (Array.isArray(tplData)) {
                    tplData
                        .filter((t: any) => t.type === "builder")
                        .forEach((t: any) => {
                            const val = t.key || `template:${t.type}:${t.label}`;
                            if (!builderOptions.some((b) => b.value === val) && !templateOptions.some((to) => to.value === val)) {
                                templateOptions.push({
                                    value: val,
                                    label: `${t.label} (Template)`,
                                    group: "Builder Templates",
                                });
                            }
                        });
                }

                if (isMounted) {
                    setOptions([...builderOptions, ...templateOptions]);
                }
            } catch (err) {
                console.error("Error loading builder/template options:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    // Group options by group name
    const grouped = options.reduce((acc, opt) => {
        const g = opt.group || "Other";
        if (!acc[g]) acc[g] = [];
        acc[g].push(opt);
        return acc;
    }, {} as Record<string, OptionItem[]>);

    return (
        <div className="flex flex-col gap-1.5 bg-white p-2 rounded">
            <label htmlFor={name} className="text-xs font-semibold">
                {label}
            </label>
            {loading ? (
                <div className="text-xs text-gray-400">Loading templates & builders...</div>
            ) : (
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 bg-white cursor-pointer"
                >
                    <option value="">-- Select Template / Builder --</option>
                    {Object.entries(grouped).map(([groupName, groupItems]) => (
                        <optgroup key={groupName} label={groupName}>
                            {groupItems.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label} {item.status === "inactive" ? "(Inactive)" : ""}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            )}
        </div>
    );
}
