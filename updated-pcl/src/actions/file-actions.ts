"use server";

import { extractTextFromFile } from "@/lib/file-processing";
import { analyzeDocument } from "@/actions/gemini-actions";

export async function processExamFile(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) return { success: false, error: "No file provided" };

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileType = file.type;
        const fileName = file.name;

        // Gemini Multimodal Processing (Images, PDF, PPTX)
        // Gemini 1.5 Pro supports PDF and can handle visual slides if converted to images or supported format.
        // For PPTX, standard text extraction is okay, but user requested Vision for slides.
        // We treat PPTX as binary/document for Gemini.
        if (fileType.startsWith("image/") || fileType === "application/pdf" || fileName.endsWith(".pptx") || fileType.includes("presentation")) {
            const base64 = buffer.toString("base64");
            // Setup mime type for PPTX if not correct
            const mime = fileName.endsWith(".pptx") ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : fileType;

            // Note: Gemini API support for direct PPTX might be limited compared to PDF. 
            // If it fails, we might need to rely on text extraction or assume user uploads PDF of slides.
            // But let's try sending it. If Gemini rejects, we fall back to text?
            // Actually, we'll try Gemini first.
            const result = await analyzeDocument(base64, mime);
            if (result.success) {
                return { success: true, text: result.data || "", visuals: result.data || "" };
            } else {
                // Fallback? No, just error for now to keep it simple as per "Advanced" instructions.
                return { success: false, error: result.error };
            }
        }

        // Other Document Processing (DOCX, PPTX, TXT)
        // Note: For advanced PDF/PPTX with diagrams, we might want to convert pages to images and send to Gemini Vision.
        // For this version, we will extract text + separate visualization extraction if needed.
        // Currently extractTextFromFile handles text extraction.

        const extractedText = await extractTextFromFile(buffer, fileType, fileName);
        return { success: true, text: extractedText };

    } catch (error: any) {
        console.error("File processing error:", error);
        return { success: false, error: error.message };
    }
}
