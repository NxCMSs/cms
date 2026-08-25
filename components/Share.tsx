'use client';

/**
 * Social Media Share Component
 * cms/components/Share.tsx
 *
 * Provides 3 customizable styles (1: Full Bar, 2: Compact Popup / Dropdown, 3: Minimal Inline Icons).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

export interface ShareProps {
    title?: string;
    url?: string;
    description?: string;
    variant?: '1' | '2' | '3' | 1 | 2 | 3 | 'bar' | 'popup' | 'minimal';
    className?: string;
    buttonClassName?: string;
    align?: 'left' | 'right' | 'center';
}

export default function Share({
    title = '',
    url = '',
    description = '',
    variant = '1',
    className = '',
    buttonClassName = '',
    align = 'right',
}: ShareProps) {
    const [shareUrl, setShareUrl] = useState(url);
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!url && typeof window !== 'undefined') {
            setShareUrl(window.location.href);
        } else {
            setShareUrl(url);
        }
    }, [url]);

    // Close popup on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title || description);

    const shareLinks = [
        {
            name: 'Facebook',
            icon: 'ic:baseline-facebook',
            color: 'bg-[#1877F2] text-white hover:bg-[#0d65d9]',
            iconColor: 'text-[#1877F2] hover:bg-[#1877F2]/10',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
            name: 'WhatsApp',
            icon: 'ri:whatsapp-fill',
            color: 'bg-[#25D366] text-white hover:bg-[#20bd5a]',
            iconColor: 'text-[#25D366] hover:bg-[#25D366]/10',
            href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
        },
        {
            name: 'X (Twitter)',
            icon: 'ri:twitter-x-fill',
            color: 'bg-black text-white hover:bg-gray-800',
            iconColor: 'text-black hover:bg-black/10',
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        },
        {
            name: 'LinkedIn',
            icon: 'ri:linkedin-fill',
            color: 'bg-[#0A66C2] text-white hover:bg-[#084e96]',
            iconColor: 'text-[#0A66C2] hover:bg-[#0A66C2]/10',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        },
        {
            name: 'Telegram',
            icon: 'ri:telegram-fill',
            color: 'bg-[#229ED9] text-white hover:bg-[#1d87b9]',
            iconColor: 'text-[#229ED9] hover:bg-[#229ED9]/10',
            href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        },
    ];

    const handleCopy = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const styleKey = String(variant);

    // ─────────────────────────────────────────────────────────────────────────────
    // STYLE 2: Compact Popup Dropdown (Ideal for cards, image overlays & galleries)
    // ─────────────────────────────────────────────────────────────────────────────
    if (styleKey === '2' || styleKey === 'popup' || styleKey === 'dropdown') {
        const alignClasses =
            align === 'left'
                ? 'left-0 origin-top-left'
                : align === 'center'
                ? 'left-1/2 -translate-x-1/2 origin-top'
                : 'right-0 origin-top-right';

        return (
            <div className={`relative inline-block select-none ${className}`} ref={popupRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className={`w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-main flex items-center justify-center shadow-sm transition active:scale-95 cursor-pointer backdrop-blur-xs ${buttonClassName}`}
                    title="Share"
                    aria-label="Share"
                >
                    <Icon icon={isOpen ? 'solar:close-circle-linear' : 'solar:share-linear'} width={18} />
                </button>

                {isOpen && (
                    <div
                        className={`absolute top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 ${alignClasses}`}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <Icon icon="solar:share-bold" width={15} className="text-main" />
                                <span>Share this item</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded-full"
                            >
                                <Icon icon="solar:close-circle-bold" width={16} />
                            </button>
                        </div>

                        {/* Social Brand Icons */}
                        <div className="flex items-center justify-between gap-1.5 py-3.5">
                            {shareLinks.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-1 group/btn cursor-pointer"
                                    title={`Share on ${item.name}`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover/btn:scale-110 shadow-2xs ${item.color}`}
                                    >
                                        <Icon icon={item.icon} className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-600 group-hover/btn:text-gray-900 truncate max-w-13">
                                        {item.name.split(' ')[0]}
                                    </span>
                                </a>
                            ))}
                        </div>

                        {/* Copy Link Input Bar */}
                        <div className="mt-1 pt-2.5 border-t border-gray-100 flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className="text-[11px] text-gray-600 bg-transparent flex-1 px-2 outline-hidden truncate select-all"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="px-3 py-1.5 rounded-lg bg-main hover:bg-main/90 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs active:scale-95"
                            >
                                <Icon
                                    icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'}
                                    width={13}
                                />
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STYLE 3: Minimal Inline Icons (Clean rounded icon buttons without labels)
    // ─────────────────────────────────────────────────────────────────────────────
    if (styleKey === '3' || styleKey === 'minimal' || styleKey === 'icons-only') {
        return (
            <div className={`flex items-center gap-1.5 select-none ${className}`}>
                <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                    <Icon icon="solar:share-linear" width={14} />
                    <span>Share:</span>
                </span>

                {shareLinks.map((item) => (
                    <a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-2xs ${item.color}`}
                        title={`Share on ${item.name}`}
                    >
                        <Icon icon={item.icon} className="w-3.5 h-3.5 text-white" />
                    </a>
                ))}

                <button
                    onClick={handleCopy}
                    type="button"
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                    title={copied ? 'Link Copied!' : 'Copy Link'}
                >
                    <Icon
                        icon={copied ? 'solar:check-circle-bold' : 'solar:link-round-bold'}
                        className={`w-3.5 h-3.5 ${copied ? 'text-emerald-600' : 'text-gray-600'}`}
                    />
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STYLE 1: Full Bar (Default horizontal row with buttons and labels)
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className={`select-none ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Icon icon="solar:share-bold" className="text-main w-5 h-5" />
                    <span>Share:</span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    {shareLinks.map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105 active:scale-95 ${item.color}`}
                            title={`Share on ${item.name}`}
                        >
                            <Icon icon={item.icon} className="w-4 h-4" />
                            <span className="hidden sm:inline">{item.name}</span>
                        </a>
                    ))}

                    <button
                        onClick={handleCopy}
                        type="button"
                        className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                        title="Copy Link"
                    >
                        <Icon
                            icon={copied ? 'solar:check-circle-bold' : 'solar:link-round-bold'}
                            className={`w-4 h-4 ${copied ? 'text-emerald-600' : 'text-gray-600'}`}
                        />
                        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
