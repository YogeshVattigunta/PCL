"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSelection } from "@/contexts/selection-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { writeBatch, doc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Upload, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"

export function BulkUploadForm({ onUploadComplete }: { onUploadComplete?: () => void }) {
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const { user } = useAuth()
    const { selectedExam, selectedSubject } = useSelection()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!file || !user || !selectedExam || !selectedSubject) return

        setLoading(true)
        const reader = new FileReader()

        reader.onload = async (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: "binary" })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

                // Extract USNs (assuming first column is USN)
                const usns = jsonData
                    .flat()
                    .map((cell) => String(cell).toUpperCase().trim())
                    .filter((usn) => usn.length > 0 && usn !== "USN")

                // Batch write to Firestore (max 500 per batch)
                const batches = []
                let batch = writeBatch(db)
                let count = 0

                for (const usn of usns) {
                    const studentRef = doc(db, `teachers/${user.uid}/subjects/${selectedSubject}/exams/${selectedExam}/students`, usn)
                    batch.set(studentRef, {
                        usn,
                        subjectCode: selectedSubject,
                        examName: selectedExam,
                        addedAt: serverTimestamp(),
                        status: "unknown",
                        pdfCount: 0,
                    }, { merge: true })

                    count++
                    if (count === 490) { // Safety margin
                        batches.push(batch.commit())
                        batch = writeBatch(db)
                        count = 0
                    }
                }

                if (count > 0) {
                    batches.push(batch.commit())
                }

                await Promise.all(batches)
                toast.success(`Successfully processed ${usns.length} USNs for ${selectedExam}.`)
                setFile(null)
                if (onUploadComplete) onUploadComplete()
            } catch (error) {
                console.error(error)
                toast.error("Failed to process file.")
            } finally {
                setLoading(false)
            }
        }

        reader.readAsBinaryString(file)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Bulk Upload ({selectedExam || "Select Exam"})</CardTitle>
                <CardDescription>Upload CSV/Excel for {selectedSubject} &gt; {selectedExam}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 items-end">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="file">Excel/CSV File</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            onChange={handleFileChange}
                            disabled={!selectedSubject || !selectedExam}
                        />
                    </div>
                    <Button onClick={handleUpload} disabled={!file || loading || !selectedExam || !selectedSubject} variant="secondary">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Upload</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
