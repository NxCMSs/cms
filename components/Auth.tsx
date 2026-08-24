"use client";

/**
 * Auth.tsx — shared form for login and signup.
 *
 * LOGIN  → single smart field (email / phone / slug auto-detected)
 * SIGNUP → tab switcher: Email tab or Phone tab
 *
 * All requests go directly to Express. No NextAuth.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { signIn } from "next-auth/react";
import { useUser } from "@/context/Provider";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "https://cms.96s.info";

function getLicenseKey(): string {
    return process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
}

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "x-license-key": getLicenseKey(),
    };
}

// ─── Detect what the user typed ───────────────────────────────────────────────
type LoginType = "email" | "phone" | "slug";

function detectLoginType(value: string): LoginType {
    const v = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";
    if (/^[+\d][\d\s\-().]{6,}$/.test(v)) return "phone";
    return "slug";
}

type SignupTab = "email" | "phone";

export interface AuthFormProps {
    mode: "login" | "signup";
    onSuccess?: (user: any) => void;
    redirectUrl?: string;
}

export default function AuthForm({ mode, onSuccess, redirectUrl }: AuthFormProps) {
    const router = useRouter();
    const { refresh } = useUser();
    const isLogin = mode === "login";

    // ── Shared state ──────────────────────────────────────────────────────────
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");

    // ── Login-specific ────────────────────────────────────────────────────────
    const [loginValue, setLoginValue] = useState("");

    // ── Signup-specific ───────────────────────────────────────────────────────
    const [signupTab, setSignupTab] = useState<SignupTab>("email");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const inputCls = "w-full rounded-xl border text-black border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10";

    // ── Google OAuth ──────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        setGoogleLoading(true);
        setError("");
        // Redirect to Express Google OAuth endpoint
        window.location.href = `${EXPRESS_API}/auth/google`;
    };

    // ── Login ─────────────────────────────────────────────────────────────────
    const handleLogin = async (loginVal: string, pass: string): Promise<any | null> => {
        try {
            // 1. Validate against Express (license check + password check + origin verification)
            const res = await fetch(`${EXPRESS_API}/auth/login`, {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders(),
                body: JSON.stringify({ login: loginVal.trim(), password: pass }),
            });

            const data = await res.json().catch(() => ({})) as { error?: string; message?: string; user?: any; token?: string };

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    const msg = data.message || data.error || "";
                    if (msg.includes("license") || msg.includes("disabled") || msg.includes("expired") || msg.includes("origin")) {
                        setError("Domain origin verification or license check failed. Please check your domain registration in CMS dashboard.");
                    } else {
                        setError(msg || "No account found or password incorrect.");
                    }
                } else {
                    setError(data.message ?? data.error ?? "No account found or password incorrect.");
                }
                return null;
            }

            if (!data.user?._id) {
                setError("Login failed. User profile data missing.");
                return null;
            }

            // 2. Pass already-validated user + Express token to NextAuth
            const result = await signIn("credentials", {
                redirect: false,
                userData: JSON.stringify({ ...data.user, expressToken: data.token ?? "" }),
            });

            if (result?.error) {
                setError("Session creation failed. Please try logging in again.");
                return null;
            }

            return data.user;
        } catch (err: unknown) {
            console.error("Login fetch error:", err);
            setError("Connection to Express Server or Domain origin failed. Please verify your network or domain configuration.");
            return null;
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                const user = await handleLogin(loginValue, password);
                if (user) {
                    await refresh();
                    if (onSuccess) {
                        onSuccess(user);
                    } else {
                        const target = redirectUrl || (user.type === "admin" ? "/admin" : "/");
                        window.location.href = target;
                    }
                }
            } else {
                // ── Sign up ───────────────────────────────────────────────────
                const res = await fetch(`${EXPRESS_API}/auth/signup`, {
                    method: "POST",
                    credentials: "include",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        name,
                        email: signupTab === "email" ? email : undefined,
                        phone: signupTab === "phone" ? phone : undefined,
                        password,
                    }),
                });

                const data = await res.json().catch(() => ({})) as { error?: string; message?: string };

                if (!res.ok) {
                    setError(data.error ?? data.message ?? "Signup failed. Domain origin or license key may be invalid.");
                    return;
                }

                // Auto sign-in after signup
                const loginField = signupTab === "email" ? email : phone;
                const user = await handleLogin(loginField, password);
                if (user) {
                    await refresh();
                    if (onSuccess) {
                        onSuccess(user);
                    } else {
                        const target = redirectUrl || (user.type === "admin" ? "/admin" : "/");
                        window.location.href = target;
                    }
                }
            }
        } catch (err) {
            console.error("Submit error:", err);
            setError("Network or domain origin connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const loginType = detectLoginType(loginValue);

    return (
        <div className="w-full rounded-2xl bg-white p-6 shadow-xl sm:p-8 max-w-md mx-auto">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                    {isLogin ? "Welcome back" : "Create an account"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                    {isLogin
                        ? "Sign in using email, phone, or username"
                        : "Join us and start exploring"}
                </p>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                    <Icon icon="solar:danger-bold" className="text-base shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {isLogin ? (
                    // ── LOGIN FIELD ───────────────────────────────────────────
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email, Phone, or Username
                        </label>
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                required
                                value={loginValue}
                                onChange={(e) => setLoginValue(e.target.value)}
                                placeholder="name@domain.com, +123456..., or username"
                                className={inputCls}
                            />
                            {loginValue.trim() && (
                                <span className="absolute right-3 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 uppercase">
                                    {loginType}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    // ── SIGNUP FIELDS ─────────────────────────────────────────
                    <>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className={inputCls}
                            />
                        </div>

                        {/* Tab switcher: Email vs Phone */}
                        <div>
                            <div className="mb-2 flex rounded-xl bg-gray-100 p-1">
                                <button
                                    type="button"
                                    onClick={() => setSignupTab("email")}
                                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                        signupTab === "email" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                                    }`}
                                >
                                    Email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSignupTab("phone")}
                                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                        signupTab === "phone" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                                    }`}
                                >
                                    Phone
                                </button>
                            </div>

                            {signupTab === "email" ? (
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@domain.com"
                                    className={inputCls}
                                />
                            ) : (
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1234567890"
                                    className={inputCls}
                                />
                            )}
                        </div>
                    </>
                )}

                {/* Password */}
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Password</label>
                    <div className="relative flex items-center">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={inputCls}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 text-gray-400 hover:text-gray-600 transition p-1"
                        >
                            <Icon icon={showPassword ? "solar:eye-closed-bold" : "solar:eye-bold"} className="text-base" />
                        </button>
                    </div>
                </div>

                {/* Submit button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Icon icon="solar:spinner-bold" className="animate-spin text-base" />
                            <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                        </div>
                    ) : (
                        <span>{isLogin ? "Sign In" : "Create Account"}</span>
                    )}
                </button>
            </form>

            {/* Social Divider */}
            <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[11px] font-semibold text-gray-400 uppercase">Or continue with</span>
                <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Google button */}
            <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
                <Icon icon="flat-color-icons:google" className="text-base" />
                <span>{googleLoading ? "Redirecting..." : "Sign in with Google"}</span>
            </button>

            {/* Footer switcher */}
            <div className="mt-6 text-center text-xs text-gray-500 space-y-3">
                {isLogin ? (
                    <p>
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-bold text-indigo-600 hover:underline">
                            Sign up
                        </Link>
                    </p>
                ) : (
                    <p>
                        Already have an account?{" "}
                        <Link href="/login" className="font-bold text-indigo-600 hover:underline">
                            Sign in
                        </Link>
                    </p>
                )}

                <div className="pt-2 border-t border-gray-100">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition"
                    >
                        <Icon icon="solar:home-2-bold" className="text-sm text-gray-400" />
                        <span>Back to Home</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
