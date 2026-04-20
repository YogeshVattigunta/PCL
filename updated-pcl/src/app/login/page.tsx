"use client"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { GraduationCap, Loader2 } from "lucide-react"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await signInWithEmailAndPassword(auth, email, password)
            toast.success("Welcome back!")
            router.push("/dashboard")
        } catch (error) {
            console.error(error)
            toast.error("Failed to login. Please check your credentials.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-primary/10 p-4 mb-4">
                        <GraduationCap className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">ASEAS Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Automated Script Evaluation and Analysis System</p>
                </div>

                <Card className="border-border/50 shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl">Sign in</CardTitle>
                        <CardDescription>
                            Enter your email and password to access the teacher dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <form onSubmit={handleLogin}>
                            <div className="grid gap-2 mb-4">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="teacher@aseas.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2 mb-6">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <div className="text-xs text-muted-foreground text-center w-full">
                            Protected by ASEAS Security
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
