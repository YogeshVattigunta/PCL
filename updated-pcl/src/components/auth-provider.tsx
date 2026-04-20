"use client"

import { AuthProvider as AuthProviderContext } from "@/hooks/use-auth"

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <AuthProviderContext>{children}</AuthProviderContext>
}
