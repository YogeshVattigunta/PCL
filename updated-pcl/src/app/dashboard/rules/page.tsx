"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { RuleTemplate, RuleType } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Copy, Trash2, Eye, Check, Loader2, MousePointer2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RuleBuilder } from "@/components/rule-builder"
import { useSelection } from "@/contexts/selection-context"
import { useRouter } from "next/navigation"

export default function RulesPage() {
    const { user } = useAuth()
    const { selectedSubject, selectedExam } = useSelection()
    const router = useRouter()
    const [rules, setRules] = useState<RuleTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<Partial<RuleTemplate> | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!user) return

        const q = query(
            collection(db, `teachers/${user.uid}/rules`),
            orderBy("createdAt", "desc")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                ruleId: doc.id,
                ...doc.data()
            } as RuleTemplate))

            setRules(data)
            setLoading(false)

            // If empty, initialize defaults
            if (data.length === 0 && !loading) {
                initializeDefaultRules(user.uid)
            }
        })

        return () => unsubscribe()
    }, [user])

    const initializeDefaultRules = async (uid: string) => {
        const defaults: Partial<RuleTemplate>[] = [
            {
                ruleName: "CONCEPT-FOCUSED PROFESSOR",
                mindsetTitle: "The Visionary Professor",
                description: "Focuses on conceptual understanding over memorization.",
                behaviorSummary: "Accepts synonyms and alternate explanations if the core idea is correct. Generous partial marking.",
                ruleType: "MINDSET",
                strictnessLevel: 50,
                isSystemTemplate: true,
                allowSynonyms: true,
                allowAlternateMethods: true,
                penalizeWrongUnits: true,
                requireDiagrams: false,
                allowStepwiseMarking: true,
                penalizeIrrelevantAnswers: false,
                additionalRules: "Focus on conceptual equivalence. 90% concept = 100% marks. 50% concept = 60% marks.",
                gradingScale: [{ score: 90, mark: 100 }, { score: 75, mark: 85 }, { score: 50, mark: 60 }, { score: 0, mark: 0 }]
            },
            {
                ruleName: "STEPWISE METHODICAL PROFESSOR",
                mindsetTitle: "The Logical Examiner",
                description: "Values structured step-by-step working and reasoning.",
                behaviorSummary: "Each step carries weight. Final answer alone is not enough. Logic chain is mandatory.",
                ruleType: "MINDSET",
                strictnessLevel: 70,
                isSystemTemplate: true,
                allowSynonyms: false,
                allowAlternateMethods: true,
                penalizeWrongUnits: true,
                requireDiagrams: true,
                allowStepwiseMarking: true,
                penalizeIrrelevantAnswers: true,
                additionalRules: "Marks distributed per step. Final answer without steps = max 50%. Minor arithmetic errors allowed.",
                gradingScale: [{ score: 95, mark: 100 }, { score: 80, mark: 80 }, { score: 50, mark: 40 }, { score: 0, mark: 0 }]
            },
            {
                ruleName: "STRICT EXAMINER",
                mindsetTitle: "The Disciplined Grader",
                description: "High discipline grading with exact keyword matching.",
                behaviorSummary: "Zero tolerance for missing units or incorrect terminology. Strict adherence to scheme.",
                ruleType: "MINDSET",
                strictnessLevel: 90,
                isSystemTemplate: true,
                allowSynonyms: false,
                allowAlternateMethods: false,
                penalizeWrongUnits: true,
                requireDiagrams: true,
                allowStepwiseMarking: false,
                penalizeIrrelevantAnswers: true,
                additionalRules: "Exact keyword match required. Penalize incomplete definitions. No generosity.",
                gradingScale: [{ score: 90, mark: 90 }, { score: 75, mark: 70 }, { score: 50, mark: 40 }, { score: 0, mark: 0 }]
            },
            {
                ruleName: "LENIENT SUPPORTIVE TEACHER",
                mindsetTitle: "The Encouraging Mentor",
                description: "Encourages effort and rewards the right direction.",
                behaviorSummary: "Generous partial marking. Ignores minor spelling or formatting issues. Focus on attempt.",
                ruleType: "MINDSET",
                strictnessLevel: 30,
                isSystemTemplate: true,
                allowSynonyms: true,
                allowAlternateMethods: true,
                penalizeWrongUnits: false,
                requireDiagrams: false,
                allowStepwiseMarking: true,
                penalizeIrrelevantAnswers: false,
                additionalRules: "85% correct = full marks. Ignore formatting. Award marks for effort and logically sound attempts.",
                gradingScale: [{ score: 85, mark: 100 }, { score: 60, mark: 80 }, { score: 30, mark: 40 }, { score: 0, mark: 0 }]
            },
            {
                ruleName: "APPLICATION-ORIENTED PROFESSOR",
                mindsetTitle: "The Real-World Expert",
                description: "Values practical application and problem-solving skills.",
                behaviorSummary: "Rewards correct approach and analytical reasoning over rote memorization.",
                ruleType: "MINDSET",
                strictnessLevel: 60,
                isSystemTemplate: true,
                allowSynonyms: true,
                allowAlternateMethods: true,
                penalizeWrongUnits: true,
                requireDiagrams: true,
                allowStepwiseMarking: true,
                penalizeIrrelevantAnswers: true,
                additionalRules: "Accept alternate real-world reasoning. Reward correct method even if final calc is slightly off.",
                gradingScale: [{ score: 90, mark: 100 }, { score: 70, mark: 80 }, { score: 50, mark: 50 }, { score: 0, mark: 0 }]
            }
        ]

        for (const item of defaults) {
            const ruleId = crypto.randomUUID()
            await setDoc(doc(db, `teachers/${uid}/rules`, ruleId), {
                ...item,
                ruleId,
                ruleVersion: 1,
                createdBy: uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                ruleJson: "{}",
                ruleText: "System Template",
                subjectCode: "GENERAL",
                penalties: [],
                allowances: []
            })
        }
        toast.success("Initialized default templates")
    }

    const handleSaveRule = async (data: Partial<RuleTemplate>) => {
        if (!user) return
        setIsSaving(true)
        try {
            const ruleId = editingRule?.ruleId || crypto.randomUUID()
            const isEditing = !!editingRule?.ruleId

            await setDoc(doc(db, `teachers/${user.uid}/rules`, ruleId), {
                ...data,
                ruleId,
                createdBy: user.uid,
                updatedAt: serverTimestamp(),
                createdAt: isEditing ? editingRule?.createdAt : serverTimestamp(),
                ruleJson: editingRule?.ruleJson || "{}",
                ruleText: editingRule?.ruleText || "Manual Rule",
            }, { merge: true })

            toast.success(isEditing ? "Rule updated (v" + (data.ruleVersion) + ")" : "Rule created")
            setIsDialogOpen(false)
            setEditingRule(null)
        } catch (error) {
            console.error(error)
            toast.error("Failed to save rule")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (ruleId: string) => {
        if (!user || !confirm("Are you sure you want to delete this rule?")) return
        try {
            await deleteDoc(doc(db, `teachers/${user.uid}/rules`, ruleId))
            toast.success("Rule deleted")
        } catch (error) {
            console.error(error)
            toast.error("Failed to delete rule")
        }
    }

    const handleEdit = (rule: RuleTemplate) => {
        setEditingRule(rule)
        setIsDialogOpen(true)
    }

    const handleDuplicate = (rule: RuleTemplate) => {
        const { ruleId, createdAt, updatedAt, ...rest } = rule
        setEditingRule({
            ...rest,
            ruleName: `${rule.ruleName} (Copy)`,
            ruleVersion: 1,
            isSystemTemplate: false
        })
        setIsDialogOpen(true)
    }

    const handleCreateNew = () => {
        setEditingRule(null)
        setIsDialogOpen(true)
    }

    const handleSelectForRule = async (rule: RuleTemplate) => {
        if (!user || !selectedSubject || !selectedExam) {
            toast.error("No active exam selected")
            return
        }

        try {
            const metaRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/metadata`, "rubric")
            // Note: Keeping metadata field as 'rubric' for now to avoid breaking existing queries, 
            // but structure inside is RuleSnapshot
            await setDoc(metaRef, {
                ruleId: rule.ruleId,
                ruleVersion: rule.ruleVersion,
                ruleType: rule.ruleType,
                mindsetTitle: rule.mindsetTitle,
                description: rule.description,
                behaviorSummary: rule.behaviorSummary,
                strictnessLevel: rule.strictnessLevel,
                allowSynonyms: rule.allowSynonyms,
                allowAlternateMethods: rule.allowAlternateMethods,
                penalizeWrongUnits: rule.penalizeWrongUnits,
                requireDiagrams: rule.requireDiagrams,
                allowStepwiseMarking: rule.allowStepwiseMarking,
                penalizeIrrelevantAnswers: rule.penalizeIrrelevantAnswers,
                ruleJson: rule.ruleJson,
                ruleText: rule.ruleText || rule.additionalRules,
                appliedAt: serverTimestamp(),
                appliedBy: user.email || "Teacher"
            })

            toast.success(`Applied ${rule.ruleName} to ${selectedExam}`)
            router.push("/dashboard/setup")
        } catch (error) {
            console.error(error)
            toast.error("Failed to apply rule")
        }
    }

    const getTypeColor = (type: RuleType) => {
        switch (type) {
            case "STRICT": return "bg-red-500 hover:bg-red-600"
            case "BALANCED": return "bg-blue-500 hover:bg-blue-600"
            case "LENIENT": return "bg-green-500 hover:bg-green-600"
            default: return "bg-slate-500 hover:bg-slate-600"
        }
    }

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Correction Rules</h2>
                    <p className="text-muted-foreground">Create and manage reusable grading templates for your exams.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#5C5CFF] hover:bg-[#4a4aff] text-white" onClick={handleCreateNew}>
                            <Plus className="mr-2 h-4 w-4" /> Create Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingRule?.ruleId ? "Edit Rule" : "Create New Rule"}</DialogTitle>
                            <DialogDescription>
                                Configure evaluation rules and grading strictness.
                            </DialogDescription>
                        </DialogHeader>
                        <RuleBuilder
                            initialData={editingRule || undefined}
                            onSave={handleSaveRule}
                            onCancel={() => setIsDialogOpen(false)}
                            isSaving={isSaving}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {selectedExam && (
                <Badge variant="secondary" className="px-4 py-2 gap-2 text-sm">
                    <MousePointer2 className="h-4 w-4" />
                    Selecting rule for: <span className="font-bold text-[#5C5CFF]">{selectedSubject} &gt; {selectedExam}</span>
                </Badge>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {rules.map((rule) => (
                    <Card key={rule.ruleId} className="hover:border-[#5C5CFF]/50 transition-all duration-300 group border-l-4 border-l-[#5C5CFF]">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-1">
                                        {rule.ruleType === "MINDSET" ? "System Mindset" : rule.ruleType}
                                    </Badge>
                                    <CardTitle className="text-xl font-bold group-hover:text-[#5C5CFF] transition-colors leading-tight">
                                        {rule.mindsetTitle || rule.ruleName}
                                    </CardTitle>
                                </div>
                            </div>
                            <CardDescription className="line-clamp-1">
                                v{rule.ruleVersion} • {rule.subjectCode}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-4 space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-tighter">Mindset Description</p>
                                <p className="text-sm line-clamp-2">{rule.description || rule.ruleName}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-muted-foreground uppercase tracking-tighter">Strictness</span>
                                    <span>{rule.strictnessLevel}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#5C5CFF] transition-all duration-500"
                                        style={{ width: `${rule.strictnessLevel}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                                <p className="text-[11px] font-bold text-[#5C5CFF] uppercase mb-1">Grading Behavior</p>
                                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic">
                                    {rule.behaviorSummary || rule.additionalRules}
                                </p>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-2 pt-4 border-t border-border/50">
                            {selectedExam && (
                                <Button
                                    className="w-full bg-[#5C5CFF] hover:bg-[#4a4aff] text-white gap-2"
                                    onClick={() => handleSelectForRule(rule)}
                                >
                                    <Check className="h-4 w-4" /> Select for Exam
                                </Button>
                            )}
                            <div className="flex gap-2 w-full">
                                <Button variant="ghost" size="sm" className="flex-1" title="View">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    title="Edit"
                                    onClick={() => handleEdit(rule)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    title="Duplicate"
                                    onClick={() => handleDuplicate(rule)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                {!rule.isSystemTemplate && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        title="Delete"
                                        onClick={() => handleDelete(rule.ruleId)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
