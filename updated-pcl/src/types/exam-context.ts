export interface GradingScaleRow {
    correctnessThreshold: number; // e.g., 90 (for 90%)
    marksPercentage: number;      // e.g., 100 (award 100% of marks)
}

export interface TeacherRule {
    id: string;
    text: string;
    isActive: boolean;
}

export interface ExamContextData {
    questionPaperText: string;
    markingSchemeText: string;
    modulesText: string;
    gradingScale: GradingScaleRow[];
    teacherRules: TeacherRule[];
    visualInsights?: string; // Analysis of diagrams/images
}

// Default Grading Scale
export const DEFAULT_GRADING_SCALE: GradingScaleRow[] = [
    { correctnessThreshold: 90, marksPercentage: 100 },
    { correctnessThreshold: 75, marksPercentage: 80 },
    { correctnessThreshold: 50, marksPercentage: 50 },
    { correctnessThreshold: 30, marksPercentage: 0 },
];

export const DEFAULT_TEACHER_RULES: TeacherRule[] = [
    { id: '1', text: 'Award full marks if final numerical answer matches even if steps vary.', isActive: false },
    { id: '2', text: 'Penalize wrong units (deduct 1 mark).', isActive: false },
    { id: '3', text: 'Diagrams are mandatory for 5+ mark questions.', isActive: false },
];
