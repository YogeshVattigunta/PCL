"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSelection } from "@/contexts/selection-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, AlertTriangle } from "lucide-react"
import { ExamContext } from "@/types"

export default function ViewContextPage() {
    const { user } = useAuth()
    const { selectedExam, selectedSubject } = useSelection()
    const [rubric, setRubric] = useState<ExamContext | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!user || !selectedExam || !selectedSubject) {
            setLoading(false)
            return
        }

        const fetchRubric = async () => {
            setLoading(true)
            setError(null)
            try {
                const rubricRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/rubric`, "main")
                const snapshot = await getDoc(rubricRef)

                if (snapshot.exists()) {
                    setRubric(snapshot.data() as ExamContext)
                } else {
                    setError("No rubric found for this exam. Please go to Setup.")
                }
            } catch (err) {
                console.error(err)
                setError("Failed to load rubric.")
            } finally {
                setLoading(false)
            }
        }

        fetchRubric()
    }, [user, selectedExam, selectedSubject])

    if (!selectedExam || !selectedSubject) {
        return <div className="p-4 text-center text-muted-foreground">Please select Subject and Exam.</div>
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    if (error || !rubric) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
                <p className="text-lg font-medium">{error || "Rubric not found"}</p>
                <Button variant="outline" asChild>
                    <a href="/dashboard/setup">Go to Setup</a>
                </Button>
            </div>
        )
    }

    // Helper to safely render a value that might be a string or an object
    const safeString = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        if (typeof val === 'object') {
            if (val.point) return String(val.point);
            if (val.text) return String(val.text);
            return JSON.stringify(val);
        }
        return String(val);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Exam Context View</h2>
                    <p className="text-muted-foreground">
                        {rubric.examName} ({rubric.subjectCode}) | Total Marks: {rubric.totalMarks}
                    </p>
                </div>
                <Button variant="outline" onClick={() => {
                    const blob = new Blob([JSON.stringify(rubric, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `${selectedExam}_rubric.json`
                    a.click()
                }}>
                    <Download className="mr-2 h-4 w-4" />
                    Download JSON
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Grading Rules */}
                <Card className="md:col-span-1 flex flex-col min-h-0">
                    <CardHeader>
                        <CardTitle>Grading Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-y-auto space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Grading Scale</h4>
                            <div className="flex flex-wrap gap-2">
                                {rubric.gradingScale?.map((scale: any, i: number) => (
                                    <Badge key={i} variant="secondary">
                                        {scale.score}% Score = {scale.mark}% Marks
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        {rubric.teacherRules && rubric.teacherRules.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Teacher Rules</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {rubric.teacherRules.map((rule: any, i: number) => (
                                        <li key={i}>{safeString(rule)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Modules</h4>
                            <div className="flex flex-wrap gap-2">
                                {rubric.modules?.map((mod: any, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{safeString(mod)}</Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Questions Accordion */}
                <Card className="md:col-span-2 flex flex-col min-h-0">
                    <CardHeader>
                        <CardTitle>Question Breakdown</CardTitle>
                        <CardDescription>Detailed marking scheme per question.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 relative">
                        <ScrollArea className="h-full pr-4">
                            <Accordion type="single" collapsible className="w-full">
                                {rubric.questions?.map((q: any) => (
                                    <AccordionItem key={q.id} value={q.id}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex w-full justify-between pr-4 items-center">
                                                <span className="font-semibold text-left">Q{q.id}: {q.text?.substring(0, 60)}...</span>
                                                <Badge>{q.maxMarks} Marks</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-4 p-2 bg-muted/20 rounded-md">
                                            <div className="text-sm mb-2">{q.text}</div>

                                            {q.visualContext && (
                                                <div className="text-xs bg-yellow-500/10 text-yellow-600 p-2 rounded border border-yellow-500/20">
                                                    <strong>Visual:</strong> {q.visualContext}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <h5 className="text-xs font-semibold uppercase text-muted-foreground">Answer Key Points</h5>
                                                {q.answerKey?.parts?.map((part: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-start text-sm border-b pb-2 last:border-0">
                                                        <div className="space-y-1">
                                                            <p>• {safeString(part.point)}</p>
                                                            {part.keywords && Array.isArray(part.keywords) && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Keywords: {part.keywords.map((k: any) => safeString(k)).join(", ")}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className="shrink-0">{safeString(part.marks)}m</Badge>
                                                    </div>
                                                ))}
                                                {q.answerKey?.text && !q.answerKey.parts && (
                                                    <p className="text-sm text-muted-foreground italic">{q.answerKey.text}</p>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
