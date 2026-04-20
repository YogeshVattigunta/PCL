"use server";

// import mammoth from "mammoth";

export async function extractTextFromFile(fileBuffer: Buffer, fileType: string, fileName: string): Promise<string> {
    try {
        if (fileType === "application/pdf") {
            // Delegated to Gemini in file-actions.ts
            return "[PDF_CONTENT_PENDING_GEMINI_PROCESSING]";
        }
        else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") { // DOCX
            // const result = await mammoth.extractRawText({ buffer: fileBuffer });
            // return result.value;
            return "[DOCX_CONTENT_PENDING_GEMINI_PROCESSING]"; // Fallback to Gemini for now or mocked
        }
        else if (
            fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || // PPTX
            fileName.endsWith(".pptx")
        ) {
            // Delegated to Gemini in file-actions.ts
            return "[PPTX_CONTENT_PENDING_GEMINI_PROCESSING]";
        }
        else if (fileType === "text/plain") {
            return fileBuffer.toString("utf-8");
        }

        return "";
    } catch (error) {
        console.error("Error extracting text:", error);
        throw new Error(`Failed to extract text from ${fileName}`);
    }
}
