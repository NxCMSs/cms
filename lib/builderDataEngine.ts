/**
 * lib/builderDataEngine.ts
 *
 * Centralized data engine for Builder.tsx.
 * Imports and executes batched queries for all 9 core models:
 *   - Post (@/models/post)
 *   - PostInfo (@/models/post_info)
 *   - Cat (@/models/cat)
 *   - CatInfo (@/models/cat_info)
 *   - Users (@/models/Users)
 *   - UsersInfo (@/models/Users_info)
 *   - Comment (@/models/Comment)
 *   - Permalink (@/models/permalink)
 *   - Template (@/models/template)
 *
 * Provides pre-enriched model data context directly to Builder.tsx and all elements.
 */

import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import CatInfo from "@/models/cat_info";
import User from "@/models/Users";
import UserInfo from "@/models/Users_info";
import Comment from "@/models/Comment";
import Permalink from "@/models/permalink";
import Template from "@/models/template";
import { Types } from "mongoose";

export interface EnrichedTab {
    _id: string;
    title: string;
    slug: string;
    url: string;
    type?: string;
    info?: Record<string, string>;
}

export interface EnrichedPost {
    _id: string;
    title: string;
    slug: string;
    postUrl: string;
    categoryTitle: string | null;
    categoryUrl: string | null;
    createdAt: string;
    image: string;
    excerpt: string;
    authorName?: string;
    authorImage?: string;
    ratingStats?: { averageRating: number; totalCount: number };
    info: Record<string, string>;
}

export interface BuilderDataContext {
    tabs: EnrichedTab[];
    postsByCategory: Record<string, EnrichedPost[]>;
    permalinks: Record<string, string>;
    templates: any[];
}

function buildUrl(prefix: string, slug: string): string {
    const trimmed = (prefix ?? "").trim().replace(/^\/+|\/+$/g, "");
    return trimmed ? `/${trimmed}/${slug}` : `/${slug}`;
}

function resolveImage(info: Record<string, string>): string {
    if (info.images) {
        try {
            const arr = JSON.parse(info.images);
            if (Array.isArray(arr) && arr[0]) return arr[0] as string;
            if (typeof arr === "string" && arr) return arr;
        } catch {
            if (typeof info.images === "string" && info.images.startsWith("http")) return info.images;
        }
    }
    if (info.image) return info.image;
    const yId = info.youtube || info.youtubeId;
    if (yId && typeof yId === "string") {
        const trimmed = yId.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
            return `https://img.youtube.com/vi/${trimmed}/hqdefault.jpg`;
        }
        const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
        if (match && match[1]) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return "";
}

export async function fetchEnrichedBuilderData(options?: {
    categoryIds?: string[];
    limit?: number;
    postType?: string;
    categoryType?: string;
}): Promise<BuilderDataContext> {
    await connectDB();

    const postType = options?.postType || "blog";
    const categoryType = options?.categoryType || "blog-category";
    const limit = Math.min(Math.max(Number(options?.limit) || 6, 1), 48);

    // 1. Fetch Permalinks & Templates in parallel
    const [postPermalinkDoc, catPermalinkDoc, templates] = await Promise.all([
        Permalink.findOne({ contentType: postType }).lean() as Promise<any>,
        Permalink.findOne({ contentType: categoryType }).lean() as Promise<any>,
        Template.find({ type: { $in: ["cat", "post"] } }).lean(),
    ]);

    const postPrefix = (postPermalinkDoc?.prefix ?? "").trim().replace(/^\/+|\/+$/g, "");
    const catPrefix = (catPermalinkDoc?.prefix ?? "").trim().replace(/^\/+|\/+$/g, "");

    const permalinks = {
        [postType]: postPrefix,
        [categoryType]: catPrefix,
    };

    // 2. Fetch Categories & CatInfo
    let catDocs: any[] = [];
    const categoryIds = options?.categoryIds ?? [];

    if (categoryIds.length > 0) {
        const validIds = categoryIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
        catDocs = await Cat.find({ _id: { $in: validIds }, status: "published" }).select("_id title slug type").lean();
        const order = new Map(categoryIds.map((id, i) => [id, i]));
        catDocs.sort((a: any, b: any) => (order.get(a._id.toString()) ?? 999) - (order.get(b._id.toString()) ?? 999));
    } else {
        catDocs = await Cat.find({ type: categoryType, status: "published" }).select("_id title slug type").sort({ title: 1 }).lean();
    }

    const catIds = catDocs.map((c) => c._id);
    const catInfos = catIds.length > 0
        ? await CatInfo.find({ catId: { $in: catIds } }).lean()
        : [];

    const catInfoMap: Record<string, Record<string, string>> = {};
    for (const info of catInfos) {
        const key = info.catId.toString();
        if (!catInfoMap[key]) catInfoMap[key] = {};
        catInfoMap[key][info.name] = info.value;
    }

    const tabs: EnrichedTab[] = catDocs.map((c: any) => {
        const idStr = c._id.toString();
        return {
            _id: idStr,
            title: c.title,
            slug: c.slug,
            url: buildUrl(catPrefix, c.slug),
            type: c.type,
            info: catInfoMap[idStr] ?? {},
        };
    });

    // 3. Fetch Posts per category
    const allPostsByCategory = tabs.length > 0
        ? await Promise.all(
            tabs.map((tab) =>
                Post.find({ type: postType, status: "published", category: new Types.ObjectId(tab._id) })
                    .select("_id title slug userId category createdAt")
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean()
            )
        )
        : [];

    const allPosts = allPostsByCategory.flat();
    const postIds = allPosts.map((p) => p._id);
    const userIds = [...new Set(allPosts.map((p) => p.userId).filter(Boolean))];

    // 4. Batch fetch PostInfo, Users, UsersInfo, Comments/Ratings
    const [postInfos, users, userInfos, ratingStats] = await Promise.all([
        postIds.length > 0
            ? PostInfo.find({ postId: { $in: postIds } }).select("postId name value").lean()
            : [],
        userIds.length > 0
            ? User.find({ _id: { $in: userIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) } }).select("_id name image").lean()
            : [],
        userIds.length > 0
            ? UserInfo.find({ userId: { $in: userIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) } }).lean()
            : [],
        postIds.length > 0
            ? Comment.aggregate([
                { $match: { targetId: { $in: postIds.map((id) => id.toString()) }, status: "approved" } },
                {
                    $group: {
                        _id: "$targetId",
                        averageRating: { $avg: "$rating" },
                        totalCount: { $sum: 1 },
                    },
                },
            ]).catch(() => [])
            : [],
    ]);

    // Map PostInfo
    const postInfoMap: Record<string, Record<string, string>> = {};
    for (const info of postInfos) {
        const key = info.postId.toString();
        if (!postInfoMap[key]) postInfoMap[key] = {};
        postInfoMap[key][info.name] = info.value;
    }

    // Map Users
    const userMap: Record<string, { name: string; image: string }> = {};
    for (const u of users) {
        userMap[u._id.toString()] = { name: u.name ?? "", image: u.image ?? "" };
    }

    // Map Ratings
    const ratingMap: Record<string, { averageRating: number; totalCount: number }> = {};
    for (const r of ratingStats as any[]) {
        ratingMap[String(r._id)] = {
            averageRating: parseFloat((r.averageRating || 0).toFixed(1)),
            totalCount: r.totalCount || 0,
        };
    }

    // 5. Build Enriched Posts by Category
    const postsByCategory: Record<string, EnrichedPost[]> = {};
    tabs.forEach((tab, i) => {
        postsByCategory[tab._id] = (allPostsByCategory[i] ?? []).map((p: any) => {
            const id = p._id.toString();
            const info = postInfoMap[id] ?? {};
            const author = p.userId ? userMap[p.userId] : undefined;

            return {
                _id: id,
                title: p.title,
                slug: p.slug,
                postUrl: buildUrl(postPrefix, p.slug),
                categoryTitle: tab.title,
                categoryUrl: tab.url,
                createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
                image: resolveImage(info),
                excerpt: info.excerpt ?? info.description ?? "",
                authorName: author?.name,
                authorImage: author?.image,
                ratingStats: ratingMap[id] ?? { averageRating: 0, totalCount: 0 },
                info,
            };
        });
    });

    // 6. Global posts fallback if categoryIds is empty or no posts found in categories
    if (!categoryIds || categoryIds.length === 0 || allPosts.length === 0) {
        try {
            const globalDocs = await Post.find({ type: postType, status: "published" })
                .select("_id title slug userId category createdAt")
                .sort({ createdAt: -1 })
                .limit(limit * 2)
                .lean();

            if (globalDocs.length > 0) {
                const missingIds = globalDocs.map((p) => p._id).filter((id) => !postInfoMap[id.toString()]);
                const missingUserIds = [...new Set(globalDocs.map((p) => p.userId).filter(Boolean))]
                    .filter((uid) => !userMap[uid.toString()]);

                const [extraInfos, extraUsers] = await Promise.all([
                    missingIds.length > 0
                        ? PostInfo.find({ postId: { $in: missingIds } }).select("postId name value").lean()
                        : [],
                    missingUserIds.length > 0
                        ? User.find({ _id: { $in: missingUserIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) } }).select("_id name image").lean()
                        : [],
                ]);

                for (const info of extraInfos) {
                    const key = info.postId.toString();
                    if (!postInfoMap[key]) postInfoMap[key] = {};
                    postInfoMap[key][info.name] = info.value;
                }
                for (const u of extraUsers) {
                    userMap[u._id.toString()] = { name: u.name ?? "", image: u.image ?? "" };
                }

                const globalEnriched: EnrichedPost[] = globalDocs.map((p: any) => {
                    const id = p._id.toString();
                    const info = postInfoMap[id] ?? {};
                    const author = p.userId ? userMap[p.userId] : undefined;
                    return {
                        _id: id,
                        title: p.title,
                        slug: p.slug,
                        postUrl: buildUrl(postPrefix, p.slug),
                        categoryTitle: null,
                        categoryUrl: null,
                        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
                        image: resolveImage(info),
                        excerpt: info.excerpt ?? info.description ?? "",
                        authorName: author?.name,
                        authorImage: author?.image,
                        ratingStats: ratingMap[id] ?? { averageRating: 0, totalCount: 0 },
                        info,
                    };
                });

                postsByCategory[""] = globalEnriched;
                if (tabs[0] && (!postsByCategory[tabs[0]._id] || postsByCategory[tabs[0]._id].length === 0)) {
                    postsByCategory[tabs[0]._id] = globalEnriched;
                }
            }
        } catch {}
    }

    return {
        tabs,
        postsByCategory,
        permalinks,
        templates,
    };
}
