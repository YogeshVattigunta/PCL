"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSelection } from "@/contexts/selection-context"
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, FileText, RefreshCw, Bot, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { evaluateStudentScript } from "@/actions/gemini-actions"
import { ExamContext, RuleSnapshot } from "@/types"

interface Student {
    usn: string
    status: "unknown" | "available" | "no_uploads" | "queued" | "processing" | "completed" | "graded" | "error"
    pdfCount: number
    addedAt: Timestamp
    obtainedMarks?: number
    totalMarks?: number
}

export function StudentList() {
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [processingUsn, setProcessingUsn] = useState<string | null>(null)
    const { selectedExam, selectedSubject } = useSelection()
    const { user } = useAuth()

    useEffect(() => {
        if (!user || !selectedExam || !selectedSubject) {
            setStudents([])
            setLoading(false)
            return
        }
        setLoading(true)

        const q = query(
            collection(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/students`),
            orderBy("addedAt", "desc")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentsData = snapshot.docs.map((doc) => doc.data() as Student)
            setStudents(studentsData)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user, selectedExam, selectedSubject])

    const filteredStudents = students.filter((student) =>
        student.usn.toLowerCase().includes(search.toLowerCase())
    )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "available":
                return <Badge className="bg-blue-500 hover:bg-blue-600">Ready</Badge>
            case "no_uploads":
                return <Badge variant="destructive">No Uploads</Badge>
            case "processing":
                return <Badge variant="secondary" className="animate-pulse"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> AI Grading</Badge>
            case "completed":
            case "graded":
                return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-1 h-3 w-3" /> Graded</Badge>
            case "error":
                return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Error</Badge>
            default:
                return <Badge variant="secondary">Unknown</Badge>
        }
    }

    const handleRunEvaluation = async (student: Student) => {
        if (!selectedExam || !selectedSubject || !user) return
        if (student.status === "no_uploads") {
            toast.error("No PDF found for this student.")
            return
        }

        setProcessingUsn(student.usn)

        // Optimistic update
        const studentRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/students/${student.usn}`)
        await updateDoc(studentRef, { status: "processing" })

        try {
            // 1. Fetch Applied Rule Metadata (Snapshot)
            const metaRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/metadata`, "rubric")
            const metaSnap = await getDoc(metaRef)

            if (!metaSnap.exists()) {
                throw new Error("Please select a correction rule in the Exam Setup page before running evaluation.")
            }

            const ruleSnapshot = metaSnap.data() as RuleSnapshot

            // 2. Fetch Exam Context
            const contextRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/rubric`, "main")
            const contextSnap = await getDoc(contextRef)

            if (!contextSnap.exists()) {
                throw new Error("Exam context missing. Please setup exam context first.")
            }
            const examContext = contextSnap.data() as ExamContext;

            // 3. Get Student PDF URL
            const listRef = ref(storage, `ASEAS/${selectedSubject}/${selectedExam}/${student.usn}`)
            const res = await listAll(listRef)
            if (res.items.length === 0) {
                throw new Error("Student script not found in storage.")
            }
            const pdfRef = res.items[0]
            const pdfUrl = await getDownloadURL(pdfRef)

            // 4. CHECK RESULT CACHE — return cached if same rules, re-evaluate if rules changed
            const cachedResultRef = doc(db, `results/${selectedSubject}/${selectedExam}/${student.usn}`)
            const cachedResultSnap = await getDoc(cachedResultRef)

            if (cachedResultSnap.exists()) {
                const cachedData = cachedResultSnap.data()
                // Compare rule version: if same rules, return cached result
                const sameRules =
                    cachedData.ruleId === ruleSnapshot.ruleId &&
                    cachedData.ruleVersion === ruleSnapshot.ruleVersion
                
                if (sameRules) {
                    // Same rules → fake animation, return cached result
                    toast.info(`Evaluating ${student.usn}... this may take a minute.`)
                    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000))
                    await updateDoc(studentRef, {
                        status: "graded",
                        obtainedMarks: cachedData.obtainedMarks,
                        totalMarks: cachedData.totalMarks,
                    })
                    toast.success(`Grading Complete for ${student.usn}! Score: ${cachedData.obtainedMarks}/${cachedData.totalMarks}`)
                    setProcessingUsn(null)
                    return
                } else {
                    // Rules changed → allow re-evaluation (will proceed to step 5)
                    toast.info(`Rules changed — re-evaluating ${student.usn} with new correction logic...`)
                }
            }

            // 5. RUN AI EVALUATION
            toast.info(`Evaluating ${student.usn}... this may take a minute.`)
            // Ensure plain objects by serializing/deserializing (removes Firestore Timestamps)
            const plainExamContext = JSON.parse(JSON.stringify(examContext));
            const plainRuleSnapshot = JSON.parse(JSON.stringify(ruleSnapshot));
            const result = await evaluateStudentScript(pdfUrl, plainExamContext, plainRuleSnapshot);

            if (!result.success) {
                throw new Error(result.error || "Evaluation failed")
            }

            const evaluationData = result.data;

            // 6. GLOBAL PERSISTENCE (Redundant Writes for Student Portal/Global Access)
            const globalResultRef = doc(db, `results/${selectedSubject}/${selectedExam}/${student.usn}`);
            const globalExamStudentRef = doc(db, `exams/${selectedExam}/students/${student.usn}`);
            const studentIndexRef = doc(db, `student_exam_index/${student.usn}/exams/${selectedSubject}_${selectedExam}`);

            await Promise.all([
                // 1. Global Result (Including Rubric Snapshot)
                setDoc(globalResultRef, {
                    ...evaluationData,
                    usn: student.usn,
                    subjectCode: selectedSubject,
                    examName: selectedExam,
                    teacherUid: user.uid,
                    evaluatedAt: serverTimestamp(),
                    pdfPath: pdfRef.fullPath,
                    ruleId: ruleSnapshot.ruleId,
                    ruleVersion: ruleSnapshot.ruleVersion,
                    ruleSnapshot: ruleSnapshot, // VITAL for historical record
                    geminiModelUsed: "gemini-2.5-flash"
                }),
                // 2. Global Exam Student Status
                setDoc(globalExamStudentRef, {
                    usn: student.usn,
                    status: "graded",
                    obtainedMarks: evaluationData.obtainedMarks,
                    totalMarks: evaluationData.totalMarks,
                    evaluatedAt: serverTimestamp()
                }, { merge: true }),
                // 3. Student Exam Index
                setDoc(studentIndexRef, {
                    subjectCode: selectedSubject,
                    examName: selectedExam,
                    teacherUid: user.uid,
                    maxMarks: evaluationData.totalMarks,
                    obtainedMarks: evaluationData.obtainedMarks,
                    evaluatedAt: serverTimestamp()
                }, { merge: true }),
                // 4. Update Teacher-local student status
                updateDoc(studentRef, {
                    status: "graded",
                    obtainedMarks: evaluationData.obtainedMarks,
                    totalMarks: evaluationData.totalMarks,
                    evaluatedAt: serverTimestamp()
                })
            ]);

            toast.success(`Grading Complete for ${student.usn}! Score: ${evaluationData.obtainedMarks}/${evaluationData.totalMarks}`)

        } catch (error: any) {
            console.error("Evaluation Error:", error)
            toast.error(error.message || "Evaluation Failed")
            await updateDoc(studentRef, { status: "error" })
        } finally {
            setProcessingUsn(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold tracking-tight">
                        Mapped Students
                        {selectedSubject && selectedExam && <span className="text-sm font-normal text-muted-foreground ml-2">({selectedSubject} &gt; {selectedExam})</span>}
                    </h3>
                    <p className="text-sm text-muted-foreground">Select a student to run AI evaluation.</p>
                </div>

                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search USN..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>USN</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Marks</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="ml-2">Loading students...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    {!selectedSubject || !selectedExam
                                        ? "Select Subject and Exam to view students."
                                        : "No students found."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow key={student.usn}>
                                    <TableCell className="font-medium">{student.usn}</TableCell>
                                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                                    <TableCell>
                                        {(student.status === "completed" || student.status === "graded") && student.obtainedMarks !== undefined ? (
                                            <span className="font-bold text-green-600">
                                                {student.obtainedMarks} / {student.totalMarks}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant={(student.status === "completed" || student.status === "graded") ? "secondary" : "default"}
                                                disabled={processingUsn === student.usn || student.status === "no_uploads" || student.status === "processing"}
                                                onClick={() => handleRunEvaluation(student)}
                                            >
                                                {processingUsn === student.usn ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Bot className="mr-2 h-4 w-4" />
                                                )}
                                                {(student.status === "completed" || student.status === "graded") ? "Re-evaluate" : "AI Grade"}
                                            </Button>

                                            {(student.status === "completed" || student.status === "graded") && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/results/${student.usn}?subject=${selectedSubject}&exam=${selectedExam}`}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        Result
                                                    </Link>
                                                </Button>
                                            )}

                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/scripts/${student.usn}?subject=${selectedSubject}&exam=${selectedExam}`}>
                                                    <FileText className="h-4 w-4" />
                                                    <span className="sr-only">View Scripts</span>
                                                </Link>
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={async () => {
                                                    if (!selectedExam || !selectedSubject || !user) return
                                                    try {
                                                        const listRef = ref(storage, `ASEAS/${selectedSubject}/${selectedExam}/${student.usn}`)
                                                        const res = await listAll(listRef)
                                                        const status = res.items.length > 0 ? "available" : "no_uploads"

                                                        const studentRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/students/${student.usn}`)
                                                        await updateDoc(studentRef, {
                                                            status,
                                                            pdfCount: res.items.length
                                                        })
                                                        toast.success(`Synced ${student.usn}`)
                                                    } catch (error) {
                                                        console.error(error)
                                                        toast.error("Failed to check availability")
                                                    }
                                                }}
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                <span className="sr-only">Refresh</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
