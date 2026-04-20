export interface GradeScale {
    score: number;
    mark: number;
}

export interface QuestionPart {
    point: string;
    marks: number;
    keywords?: string[];
}

export interface AnswerKey {
    parts?: QuestionPart[];
    text?: string; // fallback
}

export interface Question {
    id: string;
    text: string;
    maxMarks: number;
    module?: string;
    answerKey?: AnswerKey;
    visualContext?: string;
    subQuestions?: Question[]; // For 1a, 1b etc.
}

export interface ExamContext {
    subjectCode: string;
    subjectName?: string;
    examName: string;
    totalMarks: number;
    modules: string[];
    gradingScale: GradeScale[];
    teacherRules?: string[]; // "Strict on units", etc.
    questions: Question[];
    inputMetrics?: {
        hasQuestionPaper: boolean;
        hasMarkingScheme: boolean;
        hasModules: boolean;
        hasTeacherRules: boolean;
    };
}

export interface Student {
    usn: string;
    status: "unknown" | "available" | "no_uploads" | "queued" | "processing" | "completed" | "error";
    pdfCount: number;
    addedAt: any; // Firestore Timestamp
    // evaluation data
    obtainedMarks?: number;
    totalMarks?: number;
    feedback?: string;
}

export interface QuestionEvaluation {
    question: string;
    maxMarks: number;
    obtained: number;
    correctPoints: string[];
    missingPoints: string[];
    wrongPoints: string[];
    remarks: string;
}

export type RuleType = "STRICT" | "BALANCED" | "LENIENT" | "CUSTOM" | "MINDSET";

export interface RuleTemplate {
    ruleId: string;
    ruleName: string;
    subjectCode: string;
    ruleType: RuleType;
    mindsetTitle?: string;
    description?: string;
    behaviorSummary?: string;
    strictnessLevel: number; // 0-100
    gradingScale: GradeScale[];
    penalties: string[];
    allowances: string[];
    additionalRules: string;
    ruleJson: string; // The generated JSON structure
    ruleText: string; // Human readable description
    ruleVersion: number;
    createdAt: any;
    updatedAt: any;
    createdBy: string; // teacherUid
    isSystemTemplate?: boolean;
    // Toggles
    allowSynonyms: boolean;
    allowAlternateMethods: boolean;
    penalizeWrongUnits: boolean;
    requireDiagrams: boolean;
    allowStepwiseMarking: boolean;
    penalizeIrrelevantAnswers: boolean;
}

export interface RuleSnapshot {
    ruleId: string;
    ruleVersion: number;
    ruleType: RuleType;
    mindsetTitle?: string;
    description?: string;
    behaviorSummary?: string;
    strictnessLevel?: number;
    allowSynonyms?: boolean;
    allowAlternateMethods?: boolean;
    penalizeWrongUnits?: boolean;
    requireDiagrams?: boolean;
    allowStepwiseMarking?: boolean;
    penalizeIrrelevantAnswers?: boolean;
    ruleJson: string;
    ruleText: string;
    appliedAt: any;
    appliedBy: string;
}

export interface EvaluationResult {
    usn: string;
    teacherUid?: string; // Added for student portal access
    evaluatedAt?: any; // Firestore Timestamp
    subjectCode: string;
    examName: string;
    totalMarks: number;
    obtainedMarks: number;
    questionWiseMarks: QuestionEvaluation[];
    overallFeedback: string;
    strengths: string[];
    improvements: string[];
    finalVerdict: string;
    ruleId?: string;
    ruleVersion?: number;
    ruleSnapshot?: RuleSnapshot;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    role: "teacher" | "student";
    usn?: string; // Only for students
    createdAt: any;
}
