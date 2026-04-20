
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { UserProfile } from "@/types"

interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser)
                // Fetch User Profile
                try {
                    const docRef = doc(db, "users", firebaseUser.uid)
                    const docSnap = await getDoc(docRef)
                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as UserProfile)
                    } else {
                        // Profile might not exist yet (first login)
                        setProfile(null)
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error)
                    setProfile(null)
                }
            } else {
                setUser(null)
                setProfile(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const signOut = async () => {
        await firebaseSignOut(auth)
        setProfile(null)
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
