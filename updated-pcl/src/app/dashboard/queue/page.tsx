"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, writeBatch, Timestamp, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { ref, listAll, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Loader2, PlayCircle, Eraser, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { evaluateStudentScript } from "@/actions/gemini-actions"
import { RuleSnapshot, ExamContext } from "@/types"

interface QueueItem {
    id: string
    usn: string
    subjectCode?: string
    examName?: string
    filename: string
    pdfPath: string
    status: "pending" | "processing" | "completed" | "failed"
    addedAt: Timestamp
}

export default function QueuePage() {
    const [items, setItems] = useState<QueueItem[]>([])
    const [loading, setLoading] = useState(true)
    const [isBatchProcessing, setIsBatchProcessing] = useState(false)
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return

        const q = query(
            collection(db, `teachers/${user.uid}/evaluation_queue`),
            orderBy("addedAt", "desc")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const queueData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as QueueItem[]
            setItems(queueData)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user])

    const handleStartBatchEvaluation = async () => {
        if (!user || items.length === 0) return
        setIsBatchProcessing(true)
        toast.info(`Starting batch evaluation for ${items.length} students...`)

        const pendingItems = items.filter(i => i.status === "pending" || i.status === "failed")

        for (const item of pendingItems) {
            const { usn, subjectCode, examName, pdfPath, id } = item
            if (!subjectCode || !examName) continue

            const queueItemRef = doc(db, `teachers/${user.uid}/evaluation_queue`, id)
            await updateDoc(queueItemRef, { status: "processing" })

            try {
                // 1. Fetch Rule Snapshot from Exam metadata
                const metaRef = doc(db, `teachers/${user.uid}/subjects/${subjectCode}/exams/${examName}/metadata`, "rubric")
                const metaSnap = await getDoc(metaRef)

                if (!metaSnap.exists()) {
                    throw new Error("Correction rule missing for " + examName)
                }
                const ruleSnapshot = metaSnap.data() as RuleSnapshot

                // 2. Fetch Exam Context
                const contextRef = doc(db, `teachers/${user.uid}/subjects/${subjectCode}/exams/${examName}/rubric`, "main")
                const contextSnap = await getDoc(contextRef)
                if (!contextSnap.exists()) {
                    throw new Error("Exam context missing for " + examName)
                }
                const examContext = contextSnap.data() as ExamContext

                // 3. Get PDF Download URL
                const pdfRef = ref(storage, pdfPath)
                const pdfUrl = await getDownloadURL(pdfRef)

                // 3.5. CHECK RESULT CACHE — skip if same rules, re-evaluate if rules changed
                const cachedResultRef = doc(db, `results/${subjectCode}/${examName}/${usn}`)
                const cachedResultSnap = await getDoc(cachedResultRef)

                if (cachedResultSnap.exists()) {
                    const cachedData = cachedResultSnap.data()
                    const sameRules =
                        cachedData.ruleId === ruleSnapshot.ruleId &&
                        cachedData.ruleVersion === ruleSnapshot.ruleVersion
                    
                    if (sameRules) {
                        // Same rules → skip re-evaluation
                        await updateDoc(queueItemRef, { status: "completed" })
                        toast.info(`Skipped ${usn} — already evaluated (${cachedData.obtainedMarks}/${cachedData.totalMarks})`)
                        continue
                    } else {
                        toast.info(`Rules changed for ${usn} — re-evaluating...`)
                    }
                }

                // 4. Run Evaluation
                // Ensure plain objects by serializing/deserializing (removes Firestore Timestamps)
                const plainExamContext = JSON.parse(JSON.stringify(examContext));
                const plainRuleSnapshot = JSON.parse(JSON.stringify(ruleSnapshot));
                const result = await evaluateStudentScript(pdfUrl, plainExamContext, plainRuleSnapshot)
                if (!result.success) throw new Error(result.error)

                const evaluationData = result.data

                // 5. Save Results (Atomic Writes)
                const globalResultRef = doc(db, `results/${subjectCode}/${examName}/${usn}`)
                const globalExamStudentRef = doc(db, `exams/${examName}/students/${usn}`)
                const studentIndexRef = doc(db, `student_exam_index/${usn}/exams/${subjectCode}_${examName}`)

                await Promise.all([
                    setDoc(globalResultRef, {
                        ...evaluationData,
                        usn,
                        subjectCode,
                        examName,
                        teacherUid: user.uid,
                        evaluatedAt: serverTimestamp(),
                        pdfPath,
                        ruleId: ruleSnapshot.ruleId,
                        ruleVersion: ruleSnapshot.ruleVersion,
                        ruleSnapshot: ruleSnapshot,
                        geminiModelUsed: "gemini-2.5-flash"
                    }),
                    setDoc(globalExamStudentRef, {
                        usn,
                        status: "graded",
                        obtainedMarks: evaluationData.obtainedMarks,
                        totalMarks: evaluationData.totalMarks,
                        evaluatedAt: serverTimestamp()
                    }, { merge: true }),
                    setDoc(studentIndexRef, {
                        subjectCode,
                        examName,
                        teacherUid: user.uid,
                        maxMarks: evaluationData.totalMarks,
                        obtainedMarks: evaluationData.obtainedMarks,
                        evaluatedAt: serverTimestamp()
                    }, { merge: true }),
                    // Update Teacher-local student status
                    updateDoc(doc(db, `teachers/${user.uid}/subjects/${subjectCode}/exams/${examName}/students`, usn), {
                        status: "graded",
                        obtainedMarks: evaluationData.obtainedMarks,
                        totalMarks: evaluationData.totalMarks
                    })
                ])

                // 6. Mark queue item as completed and optionally remove it
                await updateDoc(queueItemRef, { status: "completed" })
                // await deleteDoc(queueItemRef) // Keep it for success feedback then clear later?

            } catch (error: any) {
                console.error(`Error processing ${usn}:`, error)
                await updateDoc(queueItemRef, { status: "failed" })
                toast.error(`Failed ${usn}: ${error.message}`)
            }
        }

        setIsBatchProcessing(false)
        toast.success("Batch evaluation finished!")
    }

    const handleRemove = async (id: string) => {
        if (!user) return
        try {
            await deleteDoc(doc(db, `teachers/${user.uid}/evaluation_queue`, id))
            toast.success("Item removed from queue")
        } catch (error) {
            console.error(error)
            toast.error("Failed to remove item")
        }
    }

    const handleClearQueue = async () => {
        if (!user || items.length === 0) return
        if (!confirm("Are you sure you want to clear the entire queue?")) return

        try {
            const batch = writeBatch(db)
            items.forEach((item) => {
                const ref = doc(db, `teachers/${user.uid}/evaluation_queue`, item.id)
                batch.delete(ref)
            })
            await batch.commit()
            toast.success("Queue cleared")
        } catch (error) {
            console.error(error)
            toast.error("Failed to clear queue")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Evaluation Queue</h2>
                    <p className="text-muted-foreground">
                        Scripts waiting for AI processing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleClearQueue} disabled={items.length === 0 || isBatchProcessing}>
                        <Eraser className="mr-2 h-4 w-4" /> Clear Queue
                    </Button>
                    <Button
                        onClick={handleStartBatchEvaluation}
                        disabled={items.length === 0 || isBatchProcessing}
                        className="bg-[#5C5CFF] hover:bg-[#4a4aff] text-white"
                    >
                        {isBatchProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        {isBatchProcessing ? "Processing..." : "Start Evaluation"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Queue Status</CardTitle>
                    <CardDescription>{items.length} items pending evaluation</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>USN</TableHead>
                                <TableHead>Exam</TableHead>
                                <TableHead>Filename</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Added At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center items-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="ml-2">Loading queue...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Queue is empty.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.usn}</TableCell>
                                        <TableCell><Badge variant="outline">{item.subjectCode || "N/A"}</Badge></TableCell>
                                        <TableCell><Badge variant="outline">{item.examName || "N/A"}</Badge></TableCell>
                                        <TableCell>{item.filename}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {item.addedAt?.toDate().toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemove(item.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
