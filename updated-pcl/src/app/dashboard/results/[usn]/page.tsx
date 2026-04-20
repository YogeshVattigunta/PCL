"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Download, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { EvaluationResult, ExamContext } from "@/types"
import Link from "next/link"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"

export default function ResultPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const usn = params.usn as string
    const subject = searchParams.get("subject")
    const exam = searchParams.get("exam")
    const { user } = useAuth()

    const [result, setResult] = useState<EvaluationResult | null>(null)
    const [examContext, setExamContext] = useState<ExamContext | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!user || !subject || !exam || !usn) {
            setLoading(false)
            return
        }

        const fetchData = async () => {
            setLoading(true)
            try {
                // Fetch Result
                const resultRef = doc(db, `results/${subject}/${exam}/${usn}`)
                const resultSnap = await getDoc(resultRef)

                // Fetch Exam Context
                const contextRef = doc(db, `teachers/${user.uid}/subjects/${subject}/exams/${exam}/rubric`, "main")
                const contextSnap = await getDoc(contextRef)

                if (resultSnap.exists()) {
                    setResult(resultSnap.data() as EvaluationResult)
                } else {
                    setError("Result not found. Has this student been evaluated?")
                }

                if (contextSnap.exists()) {
                    setExamContext(contextSnap.data() as ExamContext)
                }
            } catch (err: any) {
                console.error(err)
                setError("Failed to load data.")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user, subject, exam, usn])

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    if (error || !result) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
                <h2 className="text-xl font-bold">Evaluation Not Found</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button asChild>
                    <Link href="/dashboard/students">Back to Students</Link>
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
            // Handle {point, marks, keywords} shape from Gemini
            if (val.point) return String(val.point);
            if (val.text) return String(val.text);
            return JSON.stringify(val);
        }
        return String(val);
    };

    const percentage = result.totalMarks > 0 ? Math.round((result.obtainedMarks / result.totalMarks) * 100) : 0

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/students"><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{result.usn}</h1>
                        <p className="text-muted-foreground">{result.examName} | {result.subjectCode}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">Total Score</div>
                        <div className={`text-4xl font-bold ${percentage >= 40 ? 'text-green-600' : 'text-red-600'}`}>
                            {result.obtainedMarks}/{result.totalMarks}
                        </div>
                    </div>
                    <Badge variant={percentage >= 40 ? "default" : "destructive"} className="text-lg px-4 py-1">
                        {percentage}% {percentage >= 40 ? "PASS" : "FAIL"}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="evaluation" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="evaluation">Evaluation Result</TabsTrigger>
                    <TabsTrigger value="rules">Correction Rules</TabsTrigger>
                    <TabsTrigger value="rubric">Exam Context</TabsTrigger>
                </TabsList>

                <TabsContent value="evaluation" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Summary */}
                        <Card className="lg:col-span-1 h-fit">
                            <CardHeader>
                                <CardTitle>Performance Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Strengths</h4>
                                    <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                                        {result.strengths?.map((s, i) => <li key={i}>{safeString(s)}</li>)}
                                        {!result.strengths?.length && <li>No specific strengths noted.</li>}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Areas for Improvement</h4>
                                    <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                                        {result.improvements?.map((s, i) => <li key={i}>{safeString(s)}</li>)}
                                        {!result.improvements?.length && <li>No specific improvements noted.</li>}
                                    </ul>
                                </div>
                                <div className="bg-muted p-4 rounded-md">
                                    <h4 className="font-semibold mb-2 text-sm">Overall Feedback</h4>
                                    <p className="text-sm text-muted-foreground italic">"{result.overallFeedback}"</p>
                                </div>
                                <div className="pt-4 border-t">
                                    <h4 className="font-semibold mb-1 text-sm">Verdict</h4>
                                    <p className="text-lg font-bold">{result.finalVerdict}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: Question Breakdown */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Question-wise Breakdown</CardTitle>
                                <CardDescription>Detailed analysis of each answer.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    {result.questionWiseMarks?.map((q, idx) => (
                                        <AccordionItem key={idx} value={`item-${idx}`}>
                                            <AccordionTrigger className="hover:no-underline px-2">
                                                <div className="flex w-full justify-between items-center pr-4">
                                                    <span className="font-semibold">{q.question}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`font-mono font-bold ${q.obtained === q.maxMarks ? 'text-green-600' : q.obtained === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                                                            {q.obtained} / {q.maxMarks}
                                                        </span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 bg-muted/30 rounded-md space-y-4">

                                                {q.remarks && (
                                                    <div className="text-sm bg-blue-50/50 p-2 rounded border border-blue-100">
                                                        <strong>Examiner Remark:</strong> {q.remarks}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                    <div>
                                                        <h5 className="font-semibold text-green-600 mb-1">Correct Points</h5>
                                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                            {q.correctPoints?.length ? q.correctPoints.map((p: any, i: number) => <li key={i}>{safeString(p)}</li>) : <li>None</li>}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-red-600 mb-1">Missing / Wrong</h5>
                                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                            {q.missingPoints?.map((p: any, i: number) => <li key={i} className="text-red-500/80">Missing: {safeString(p)}</li>)}
                                                            {q.wrongPoints?.map((p: any, i: number) => <li key={i} className="text-red-600/80">Wrong: {safeString(p)}</li>)}
                                                            {!q.missingPoints?.length && !q.wrongPoints?.length && <li>None</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="rules" className="mt-6">
                    {result.ruleSnapshot ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Badge className="bg-[#5C5CFF]">{result.ruleSnapshot.ruleType}</Badge>
                                    {result.ruleSnapshot.mindsetTitle || "Applied Rules"}
                                </CardTitle>
                                <CardDescription>Behavior summary used for this evaluation.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 uppercase tracking-tighter text-muted-foreground">Strictness Level</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#5C5CFF]" style={{ width: `${result.ruleSnapshot.strictnessLevel}%` }} />
                                                </div>
                                                <span className="font-bold">{result.ruleSnapshot.strictnessLevel}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 uppercase tracking-tighter text-muted-foreground">Evaluation Policy</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Badge variant={result.ruleSnapshot.allowSynonyms ? "default" : "outline"} className="h-5">Synonyms</Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Badge variant={result.ruleSnapshot.allowStepwiseMarking ? "default" : "outline"} className="h-5">Stepwise</Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Badge variant={result.ruleSnapshot.penalizeWrongUnits ? "default" : "outline"} className="h-5">Units Penalty</Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Badge variant={result.ruleSnapshot.requireDiagrams ? "default" : "outline"} className="h-5">Diagrams Req</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-3 bg-secondary/30 rounded-lg border">
                                            <h4 className="text-xs font-bold text-[#5C5CFF] mb-1 uppercase">Mindset Behavior</h4>
                                            <p className="text-xs text-muted-foreground italic leading-relaxed">
                                                {result.ruleSnapshot.behaviorSummary || result.ruleSnapshot.ruleText}
                                            </p>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Applied by {result.ruleSnapshot.appliedBy} on {result.ruleSnapshot.appliedAt ? format(result.ruleSnapshot.appliedAt.toDate(), "PPP") : "Evaluation date"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-12 text-center border rounded-md border-dashed">
                            <p className="text-muted-foreground">No specific correction rules were captured for this result.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="rubric" className="mt-6">
                    {examContext ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Grading Rules */}
                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Exam Parameters</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Grading Scale</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {examContext.gradingScale?.map((scale, i) => (
                                                <Badge key={i} variant="secondary">
                                                    {scale.score}% Score = {scale.mark}% Marks
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* NEW: Input Metrics Display */}
                                    {examContext.inputMetrics && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Input Sources Used</h4>
                                            <div className="flex flex-col gap-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={examContext.inputMetrics.hasQuestionPaper ? "text-green-600 font-bold" : "text-muted-foreground"}>
                                                        {examContext.inputMetrics.hasQuestionPaper ? "✅" : "❌"} Question Paper
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={examContext.inputMetrics.hasMarkingScheme ? "text-green-600 font-bold" : "text-muted-foreground"}>
                                                        {examContext.inputMetrics.hasMarkingScheme ? "✅" : "❌"} Marking Scheme
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={examContext.inputMetrics.hasModules ? "text-green-600 font-bold" : "text-muted-foreground"}>
                                                        {examContext.inputMetrics.hasModules ? "✅" : "❌"} Modules
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={examContext.inputMetrics.hasTeacherRules ? "text-green-600 font-bold" : "text-muted-foreground"}>
                                                        {examContext.inputMetrics.hasTeacherRules ? "✅" : "❌"} Manual Rules
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {examContext.teacherRules && examContext.teacherRules.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2">Context Rules</h4>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                {examContext.teacherRules.map((rule, i) => (
                                                    <li key={i}>{rule}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Questions Accordion */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Full Rubric Key</CardTitle>
                                    <CardDescription>This is the standard rubric used for evaluation.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[600px] pr-4">
                                        <Accordion type="single" collapsible className="w-full">
                                            {examContext.questions?.map((q) => (
                                                <AccordionItem key={q.id} value={q.id}>
                                                    <AccordionTrigger className="hover:no-underline">
                                                        <div className="flex w-full justify-between pr-4 items-center">
                                                            <span className="font-semibold text-left">Q{q.id}: {q.text?.substring(0, 50)}...</span>
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
                    ) : (
                        <div className="p-12 text-center border rounded-md border-dashed">
                            <p className="text-muted-foreground">Rubric data not available for this exam.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
