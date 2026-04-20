"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSelection } from "@/contexts/selection-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Plus, Loader2 } from "lucide-react"

export function USNEntryForm() {
    const [usn, setUsn] = useState("")
    const [loading, setLoading] = useState(false)
    const { user } = useAuth()
    const { selectedExam, selectedSubject } = useSelection()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!usn.trim() || !user || !selectedExam || !selectedSubject) return

        const formattedUsn = usn.trim().toUpperCase()
        setLoading(true)

        try {
            const studentRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/students`, formattedUsn)
            const studentSnap = await getDoc(studentRef)

            if (studentSnap.exists()) {
                toast.warning(`USN ${formattedUsn} already exists for ${selectedExam}.`)
                setLoading(false)
                return
            }

            await setDoc(studentRef, {
                usn: formattedUsn,
                subjectCode: selectedSubject,
                examName: selectedExam,
                addedAt: serverTimestamp(),
                status: "unknown",
                pdfCount: 0,
            })

            toast.success(`Added ${formattedUsn} to ${selectedExam}`)
            setUsn("")
        } catch (error) {
            console.error(error)
            toast.error("Failed to add USN.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Add Student</CardTitle>
                <CardDescription>
                    {selectedSubject && selectedExam
                        ? `Adding to ${selectedSubject} > ${selectedExam}`
                        : "Select Subject and Exam first"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="usn">USN</Label>
                        <Input
                            id="usn"
                            placeholder="e.g. 1MS21IS001"
                            value={usn}
                            onChange={(e) => setUsn(e.target.value.toUpperCase())}
                            disabled={!selectedSubject || !selectedExam}
                        />
                    </div>
                    <Button type="submit" disabled={!usn || loading || !selectedExam || !selectedSubject}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Add</span>
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
