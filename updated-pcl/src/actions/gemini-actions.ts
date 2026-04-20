"use server";

// mock-gemini-actions.ts - Sanitized version for event submission.
// This file demonstrates the architecture of the AI evaluation system without exposing proprietary logic or API keys.

export interface ExtractionInput {
    text: string;
    images?: string[]; // Base64 strings
}

/**
 * 1. Vision/Multimodal: Extraction Logic (Sanitized)
 * In the real application, this uses Gemini 1.5 Flash to extract OCR text and visual insights.
 */
export async function analyzeDocument(base64Data: string, mimeType: string) {
    console.log("Mock Analyze Document called with mimeType:", mimeType);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return { 
        success: true, 
        data: "Extracted Sample Text: This is a placeholder for OCR text extracted from the document. Analysis reveals structured data and diagrams related to the subject." 
    };
}

/**
 * 2. Normalization: Rubric Generation (Sanitized)
 * Merges mixed-modality inputs into a structured JSON rubric.
 */
export async function normalizeExamContext(inputs: {
    questionPaper: string;
    markingScheme: string;
    modules: string;
    teacherRules: string;
    gradingScale: string;
    visualInsights: string;
}) {
    console.log("Mock Normalization called");
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockRubric = {
        subjectCode: "CS101",
        subjectName: "Introduction to Computer Science",
        examName: "Semester Final",
        totalMarks: 50,
        modules: ["Module 1", "Module 2"],
        questions: [
            {
                id: "1a",
                text: "Explain the concept of abstraction in OOP.",
                maxMarks: 5,
                answerKey: {
                    parts: [
                        { point: "Definition of abstraction", marks: 2 },
                        { point: "Real-world example", marks: 3 }
                    ]
                }
            }
        ]
    };

    return { success: true, data: JSON.stringify(mockRubric) };
}

/**
 * 3. Evaluation: Student Script Processing (Sanitized)
 * The core engine that performs deterministic grading against the rubric.
 */
export async function evaluateStudentScript(
    studentPdfUrl: string,
    examContext: any,
    ruleSnapshot: any
) {
    console.log("Mock Evaluation called for:", studentPdfUrl);
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    const mockResult = {
        usn: "1RV21CS001",
        subjectCode: examContext.subjectCode || "CS101",
        examName: examContext.examName || "Final Exam",
        totalMarks: examContext.totalMarks || 50,
        obtainedMarks: 42,
        questionWiseMarks: [
            {
                question: "1a",
                maxMarks: 5,
                obtained: 4.5,
                correctPoints: ["Definition matches", "Example is clear"],
                missingPoints: ["Technical keyword 'Encapsulation' comparison missing"],
                wrongPoints: [],
                remarks: "Excellent understanding shown."
            }
        ],
        overallFeedback: "Great performance across all modules.",
        strengths: ["Conceptual clarity", "Structured presentation"],
        improvements: ["Focus on technical terminology"],
        finalVerdict: "Excellent"
    };

    return { success: true, data: mockResult };
}
