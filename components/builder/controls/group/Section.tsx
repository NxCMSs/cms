"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

interface Props {
    label: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export default function Section({ label, defaultOpen = false, children }: Props) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="mb-4 block">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between w-full"
            >
                <span className="text-sm font-medium text-left text-gray-600">{label}</span>
                <Icon
                    icon="mdi:chevron-down"
                    width="15"
                    className={`text-gray-400 transition-transform duration-300 ${open ? "rotate-180 text-fuchsia-500" : ""}`}
                />
            </button>
            {open && (
                <div className="pt-2 animate-[fadeSlideIn_0.2s_ease-out]">
                    {children}
                </div>
            )}
        </div>
    );
}
