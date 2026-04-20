"use client"

import { useState } from "react"
import { RuleTemplate, RuleType, GradeScale } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Info, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RuleBuilderProps {
    initialData?: Partial<RuleTemplate>
    onSave: (data: Partial<RuleTemplate>) => Promise<void>
    onCancel: () => void
    isSaving?: boolean
}

export function RuleBuilder({ initialData, onSave, onCancel, isSaving }: RuleBuilderProps) {
    const [name, setName] = useState(initialData?.ruleName || "")
    const [mindsetTitle, setMindsetTitle] = useState(initialData?.mindsetTitle || "")
    const [description, setDescription] = useState(initialData?.description || "")
    const [behaviorSummary, setBehaviorSummary] = useState(initialData?.behaviorSummary || "")
    const [subject, setSubject] = useState(initialData?.subjectCode || "")
    const [type, setType] = useState<RuleType>(initialData?.ruleType || "CUSTOM")
    const [strictness, setStrictness] = useState([initialData?.strictnessLevel || 50])
    const [gradingScale, setGradingScale] = useState<GradeScale[]>(initialData?.gradingScale || [
        { score: 90, mark: 100 },
        { score: 75, mark: 80 },
        { score: 50, mark: 50 },
        { score: 0, mark: 0 }
    ])

    const [toggles, setToggles] = useState({
        allowSynonyms: initialData?.allowSynonyms ?? true,
        allowAlternateMethods: initialData?.allowAlternateMethods ?? true,
        penalizeWrongUnits: initialData?.penalizeWrongUnits ?? true,
        requireDiagrams: initialData?.requireDiagrams ?? false,
        allowStepwiseMarking: initialData?.allowStepwiseMarking ?? true,
        penalizeIrrelevantAnswers: initialData?.penalizeIrrelevantAnswers ?? false,
    })

    const [additionalRules, setAdditionalRules] = useState(initialData?.additionalRules || "")

    const handleAddScale = () => {
        setGradingScale([...gradingScale, { score: 0, mark: 0 }].sort((a, b) => b.score - a.score))
    }

    const handleRemoveScale = (index: number) => {
        setGradingScale(gradingScale.filter((_, i) => i !== index))
    }

    const handleUpdateScale = (index: number, field: keyof GradeScale, value: number) => {
        const newScale = [...gradingScale]
        newScale[index] = { ...newScale[index], [field]: value }
        setGradingScale(newScale)
    }

    const handleSave = () => {
        if (!name) return

        onSave({
            ruleName: name,
            mindsetTitle,
            description,
            behaviorSummary,
            subjectCode: subject || "GENERAL",
            ruleType: type,
            strictnessLevel: strictness[0],
            gradingScale,
            ...toggles,
            additionalRules,
            ruleVersion: (initialData?.ruleVersion || 1) + (initialData?.ruleId ? 1 : 0)
        })
    }

    return (
        <div className="space-y-8 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Rule Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Final Exam Strict" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mindset">Mindset Title (Optional)</Label>
                    <Input id="mindset" value={mindsetTitle} onChange={(e) => setMindsetTitle(e.target.value)} placeholder="e.g., The Logical Examiner" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="desc">Short Description</Label>
                <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Focuses on conceptual understanding..." />
            </div>

            <div className="space-y-2">
                <Label htmlFor="behavior">Grading Behavior Summary</Label>
                <Textarea
                    id="behavior"
                    value={behaviorSummary}
                    onChange={(e) => setBehaviorSummary(e.target.value)}
                    placeholder="Generous partial marking. Ignores minor spelling..."
                    className="h-20"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject Code (Optional)</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., CS101" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base">Strictness Level</Label>
                    <Badge variant="outline" className="font-mono">{strictness[0]}%</Badge>
                </div>
                <Slider
                    value={strictness}
                    onValueChange={setStrictness}
                    max={100}
                    step={5}
                    className="py-2"
                />
                <p className="text-xs text-muted-foreground">Higher strictness means Gemini will be less forgiving of minor errors and missing keywords.</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Label className="text-base">Evaluation Policy</Label>
                    <div className="space-y-4 rounded-lg border p-4 bg-secondary/20">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Allow Synonyms</Label>
                                <p className="text-xs text-muted-foreground">Accept conceptually correct synonyms.</p>
                            </div>
                            <Switch checked={toggles.allowSynonyms} onCheckedChange={(val) => setToggles({ ...toggles, allowSynonyms: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Alternative Methods</Label>
                                <p className="text-xs text-muted-foreground">Accept non-standard solved methods.</p>
                            </div>
                            <Switch checked={toggles.allowAlternateMethods} onCheckedChange={(val) => setToggles({ ...toggles, allowAlternateMethods: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Stepwise Marking</Label>
                                <p className="text-xs text-muted-foreground">Award marks for intermediate steps.</p>
                            </div>
                            <Switch checked={toggles.allowStepwiseMarking} onCheckedChange={(val) => setToggles({ ...toggles, allowStepwiseMarking: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Penalize Wrong Units</Label>
                                <p className="text-xs text-muted-foreground">Deduct marks for missing/wrong units.</p>
                            </div>
                            <Switch checked={toggles.penalizeWrongUnits} onCheckedChange={(val) => setToggles({ ...toggles, penalizeWrongUnits: val })} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-base">Grading Scale</Label>
                    <div className="rounded-lg border bg-secondary/20 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border">
                                    <TableHead className="w-1/2">Correctness %</TableHead>
                                    <TableHead>Award Marks %</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gradingScale.map((scale, i) => (
                                    <TableRow key={i} className="border-border">
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={scale.score}
                                                onChange={(e) => handleUpdateScale(i, 'score', Number(e.target.value))}
                                                className="h-8 bg-background"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={scale.mark}
                                                onChange={(e) => handleUpdateScale(i, 'mark', Number(e.target.value))}
                                                className="h-8 bg-background"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => handleRemoveScale(i)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Button variant="ghost" size="sm" className="w-full rounded-none border-t border-border text-muted-foreground" onClick={handleAddScale}>
                            <Plus className="mr-2 h-4 w-4" /> Add Scale Level
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="rules">Additional Correction Rules</Label>
                <Textarea
                    id="rules"
                    value={additionalRules}
                    onChange={(e) => setAdditionalRules(e.target.value)}
                    placeholder="e.g., 'Do not penalize for handwriting', 'Accept only SI units'"
                    className="min-h-[100px] bg-background"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                <Button
                    className="bg-[#5C5CFF] hover:bg-[#4a4aff] text-white min-w-[120px]"
                    onClick={handleSave}
                    disabled={isSaving || !name}
                >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Rule"}
                </Button>
            </div>
        </div>
    )
}
