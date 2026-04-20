"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSelection } from "@/contexts/selection-context"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { doc, setDoc, serverTimestamp, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore"
import { ref, uploadString, uploadBytes } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { Loader2, Wand2, Save, Upload, FileText, CheckCircle2, ChevronRight, FileSpreadsheet, Ruler, MousePointer2 } from "lucide-react"
import { RuleTemplate, RuleSnapshot } from "@/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

import { normalizeExamContext } from "@/actions/gemini-actions"
// import { extractTextFromFile } from "@/lib/file-processing"
// NOTE: extractTextFromFile is a server action/utility, but we need to call it from client.
// Actually, we can't call server util directly if it's not an action.
// Let's assume we implement a server action wrapper or better:
// Upload file to server -> process -> return text.
// For simplicity in this "hybrid" app, we'll read file on client (Text) or send to server action (Binary).
// However, sending large binaries to server actions has limits.
// Better approach:
// 1. Text files: Read on client.
// 2. Images: Read as base64 on client -> send to Gemini Action.
// 3. PDF/DOCX: Send to a new Server Action `processExamFile`.

import { processExamFile } from "@/actions/file-actions"

export default function ExamSetupPage() {
    const { user } = useAuth()
    const { selectedExam, selectedSubject } = useSelection()

    // State for each section
    const [questionPaperText, setQuestionPaperText] = useState("")
    const [markingSchemeText, setMarkingSchemeText] = useState("")
    const [modulesText, setModulesText] = useState("")
    const [visualInsights, setVisualInsights] = useState("")
    const [teacherRules, setTeacherRules] = useState("")
    const [gradingScale, setGradingScale] = useState('[{"score": 90, "mark": 100}, {"score": 75, "mark": 80}, {"score": 50, "mark": 50}, {"score": 30, "mark": 0}]')

    const [finalJson, setFinalJson] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [activeTab, setActiveTab] = useState("qp")
    const [appliedRule, setAppliedRule] = useState<RuleSnapshot | null>(null)
    const router = useRouter()

    // Load existing rule if available
    useEffect(() => {
        const loadExistingRule = async () => {
            if (!user || !selectedSubject || !selectedExam) return

            try {
                // 1. Check for Applied Rule in Exam Metadata
                const metaRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/metadata`, "rubric")
                const metaSnap = await getDoc(metaRef)
                if (metaSnap.exists()) {
                    setAppliedRule(metaSnap.data() as RuleSnapshot)
                }

                // 2. Check if generic exam context already exists
                const contextRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/rubric`, "main")
                const docSnap = await getDoc(contextRef)

                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setFinalJson(JSON.stringify(data, null, 2))
                }
            } catch (error) {
                console.error("Error loading rule:", error)
            }
        }

        loadExistingRule()
    }, [user, selectedSubject, selectedExam])

    const handleChangeRule = () => {
        router.push("/dashboard/rules")
    }

    // Helper to handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetSetter: React.Dispatch<React.SetStateAction<string>>, contextInfo: string) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            // Call Server Action
            const result = await processExamFile(formData)

            if (result.success) {
                targetSetter(prev => prev + "\n\n" + result.text)
                if (result.visuals) {
                    setVisualInsights(prev => prev + "\n\n" + `[Visuals from ${file.name}]:\n` + result.visuals)
                }
                toast.success(`Processed ${file.name}`)
            } else {
                toast.error(`Failed to process ${file.name}: ${result.error}`)
            }
        } catch (err) {
            console.error(err)
            toast.error("Upload failed")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleNormalize = async () => {
        if (!questionPaperText && !markingSchemeText) {
            toast.warning("Please add Question Paper or Marking Scheme first.")
            return
        }
        setIsProcessing(true)
        try {
            const result = await normalizeExamContext({
                questionPaper: questionPaperText,
                markingScheme: markingSchemeText,
                modules: modulesText,
                teacherRules,
                gradingScale,
                visualInsights
            })

            if (result.success && result.data) {
                // Parse the Gemini output, inject metrics, and reserialize
                try {
                    const parsedData = JSON.parse(result.data)
                    parsedData.inputMetrics = {
                        hasQuestionPaper: !!questionPaperText.trim(),
                        hasMarkingScheme: !!markingSchemeText.trim(),
                        hasModules: !!modulesText.trim(),
                        hasTeacherRules: !!teacherRules.trim(),
                    }
                    setFinalJson(JSON.stringify(parsedData, null, 2))
                    toast.success("Exam Context Normalized Successfully!")
                } catch (parseError) {
                    console.error("Failed to parse or inject metrics:", parseError)
                    setFinalJson(result.data) // Fallback to raw output if injection fails
                    toast.success("Exam Context Normalized (Metrics Injection Failed)")
                }
            } else {
                toast.error("Normalization failed.")
            }
        } catch (error) {
            console.error(error)
            toast.error("An error occurred during normalization.")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSave = async () => {
        if (!finalJson || !user || !selectedExam || !selectedSubject) {
            toast.error("Missing output or selection.")
            return
        }

        setIsProcessing(true)
        try {
            // Save JSON to Storage
            const storageRef = ref(storage, `ASEAS/${selectedSubject}/${selectedExam}/rubric.json`)
            await uploadString(storageRef, finalJson) // Keeping as string for file storage

            // Also save text version if needed
            const storageRefText = ref(storage, `ASEAS/${selectedSubject}/${selectedExam}/exam_context.txt`)
            await uploadString(storageRefText, finalJson)

            // Parse to object for Firestore
            const contextObj = JSON.parse(finalJson);

            // Save Metadata & Full Context to Firestore
            const contextRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/rubric`, "main")
            await setDoc(contextRef, {
                ...contextObj,
                lastUpdated: serverTimestamp(),
                updatedBy: user.email,
                generatedBy: "ASEAS BRAIN"
            }, { merge: true })

            toast.success("Exam Context Saved & Ready for Grading!")
        } catch (error) {
            console.error(error)
            toast.error("Failed to save.")
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Advanced Exam Setup</h2>
                    <p className="text-muted-foreground">
                        {selectedSubject && selectedExam ? `${selectedSubject} > ${selectedExam}` : "Select Subject & Exam"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleNormalize} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Convert & Normalize
                    </Button>
                    <Button onClick={handleSave} disabled={isProcessing || !finalJson} variant="secondary">
                        <Save className="mr-2 h-4 w-4" />
                        Save Context
                    </Button>
                </div>
            </div>

            {/* Rules Selection Section */}
            <Card className="border-l-4 border-l-[#5C5CFF]">
                <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Ruler className="h-5 w-5 text-[#5C5CFF]" />
                            Correction Rules
                        </CardTitle>
                        <CardDescription>
                            These rules modify grading strictness and behavior.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleChangeRule}>
                        {appliedRule ? "Change Rule" : "Select Rule"}
                    </Button>
                </CardHeader>
                {appliedRule ? (
                    <CardContent className="py-2 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-[#5C5CFF]">{appliedRule.ruleType}</Badge>
                            <span className="font-semibold text-primary">
                                {appliedRule.mindsetTitle || "Correction Rule v" + (appliedRule.ruleVersion || 1)}
                            </span>
                        </div>
                        <div className="h-4 w-[1px] bg-border" />
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Strictness:</span>
                            <span className="font-bold">{appliedRule.strictnessLevel}%</span>
                        </div>
                        <div className="h-4 w-[1px] bg-border" />
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Applied:</span>
                            <span>{appliedRule.appliedAt ? format(appliedRule.appliedAt.toDate(), "PPP") : "Just now"}</span>
                        </div>
                    </CardContent>
                ) : (
                    <CardContent className="py-2">
                        <p className="text-sm text-muted-foreground italic">No rule selected</p>
                    </CardContent>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left: Inputs */}
                <Card className="flex flex-col h-full min-h-0">
                    <CardHeader className="py-3">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="qp">Q.Paper</TabsTrigger>
                                <TabsTrigger value="scheme">Scheme</TabsTrigger>
                                <TabsTrigger value="modules">Modules</TabsTrigger>
                                <TabsTrigger value="policy">Rules</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4">
                        {activeTab === "qp" && (
                            <div className="space-y-4">
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="file"
                                        accept=".pdf,.docx,.txt,.pptx,.png,.jpg,.jpeg"
                                        onChange={(e) => handleFileUpload(e, setQuestionPaperText, "QP")}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        Supports PDF, IMG, DOCX
                                    </span>
                                </div>
                                <Textarea
                                    className="min-h-[300px] font-mono"
                                    placeholder="Extracted Question Paper text..."
                                    value={questionPaperText}
                                    onChange={(e) => setQuestionPaperText(e.target.value)}
                                />
                            </div>
                        )}

                        {activeTab === "scheme" && (
                            <div className="space-y-4">
                                <Input
                                    type="file"
                                    accept=".pdf,.docx,.txt,.pptx,.png,.jpg,.jpeg"
                                    onChange={(e) => handleFileUpload(e, setMarkingSchemeText, "Scheme")}
                                />
                                <Textarea
                                    className="min-h-[300px] font-mono"
                                    placeholder="Extracted Marking Scheme text..."
                                    value={markingSchemeText}
                                    onChange={(e) => setMarkingSchemeText(e.target.value)}
                                />
                            </div>
                        )}

                        {activeTab === "modules" && (
                            <div className="space-y-4">
                                <Input
                                    type="file"
                                    accept=".pdf,.docx,.txt,.pptx"
                                    onChange={(e) => handleFileUpload(e, setModulesText, "Modules")}
                                />
                                <Textarea
                                    className="min-h-[300px] font-mono"
                                    placeholder="Extracted Modules/Syllabus..."
                                    value={modulesText}
                                    onChange={(e) => setModulesText(e.target.value)}
                                />
                            </div>
                        )}

                        {activeTab === "policy" && (
                            <div className="space-y-4">
                                <Label>Teacher Rules (Free Text)</Label>
                                <Textarea
                                    className="min-h-[150px]"
                                    placeholder="e.g. Penalize wrong units, Diagrams mandatory..."
                                    value={teacherRules}
                                    onChange={(e) => setTeacherRules(e.target.value)}
                                />
                                <Label>Grading Scale (JSON)</Label>
                                <Textarea
                                    className="min-h-[100px] font-mono"
                                    value={gradingScale}
                                    onChange={(e) => setGradingScale(e.target.value)}
                                />
                                <Label>Visual Insights (Auto-Generated)</Label>
                                <Textarea
                                    className="min-h-[100px] font-mono text-xs"
                                    value={visualInsights}
                                    readOnly
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Output */}
                <Card className="flex flex-col h-full min-h-0">
                    <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>Final Exam Context (JSON)</span>
                        </CardTitle>
                        {finalJson && (() => {
                            try {
                                const parsed = JSON.parse(finalJson)
                                const metrics = parsed.inputMetrics
                                if (metrics) {
                                    return (
                                        <div className="flex flex-wrap gap-2 mt-2 p-2 bg-secondary/20 rounded-md text-xs">
                                            <span className="font-semibold text-muted-foreground mr-1">Input Sources:</span>
                                            <Badge variant={metrics.hasQuestionPaper ? "default" : "outline"} className={metrics.hasQuestionPaper ? "bg-green-600" : ""}>
                                                {metrics.hasQuestionPaper ? "✅" : "❌"} Q.Paper
                                            </Badge>
                                            <Badge variant={metrics.hasMarkingScheme ? "default" : "outline"} className={metrics.hasMarkingScheme ? "bg-green-600" : ""}>
                                                {metrics.hasMarkingScheme ? "✅" : "❌"} Scheme
                                            </Badge>
                                            <Badge variant={metrics.hasModules ? "default" : "outline"} className={metrics.hasModules ? "bg-green-600" : ""}>
                                                {metrics.hasModules ? "✅" : "❌"} Modules
                                            </Badge>
                                            <Badge variant={metrics.hasTeacherRules ? "default" : "outline"} className={metrics.hasTeacherRules ? "bg-green-600" : ""}>
                                                {metrics.hasTeacherRules ? "✅" : "❌"} Rules
                                            </Badge>
                                        </div>
                                    )
                                }
                            } catch (e) {
                                // Ignore parse errors while typing manually
                            }
                            return null;
                        })()}
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                        <Textarea
                            className="h-full font-mono text-xs resize-none"
                            placeholder="Final normalized JSON will appear here..."
                            value={finalJson}
                            onChange={(e) => setFinalJson(e.target.value)}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
