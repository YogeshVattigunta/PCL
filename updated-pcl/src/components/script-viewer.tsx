"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { listAll, ref, getDownloadURL } from "firebase/storage"
import { storage, db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
    FileText,
    ChevronLeft,
    Download,
    ListVideo,
    Loader2,
    Eye,
    CheckCircle2
} from "lucide-react"
// import { Document, Page, pdfjs } from "react-pdf"


// import "react-pdf/dist/Page/AnnotationLayer.css"
// import "react-pdf/dist/Page/TextLayer.css"

// Configure PDF worker
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface StorageFile {
    name: string
    fullPath: string
}

export function ScriptViewer() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth()

    // Get from URL or Context (URL is safer for deep linking)
    const usn = params.usn as string
    const subject = searchParams.get("subject")
    const exam = searchParams.get("exam")

    const [files, setFiles] = useState<StorageFile[]>([])
    const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [loadingFiles, setLoadingFiles] = useState(true)
    const [loadingPdf, setLoadingPdf] = useState(false)
    const [numPages, setNumPages] = useState<number>(0)
    const [scale, setScale] = useState(1.0)
    const [queueing, setQueueing] = useState(false)

    // Fetch file list
    useEffect(() => {
        if (!usn || !subject || !exam) {
            setLoadingFiles(false)
            return
        }

        const fetchFiles = async () => {
            try {
                const listRef = ref(storage, `ASEAS/${subject}/${exam}/${usn}`)
                const res = await listAll(listRef)
                const fileList = res.items.map((item) => ({
                    name: item.name,
                    fullPath: item.fullPath,
                }))
                setFiles(fileList)

                // Update student record (Optional sync)
                if (user) {
                    // We don't necessarily update here on every view, but we can.
                    // It's better to leave it to the explicit check in StudentList or background job.
                }

            } catch (error) {
                console.error(error)
                toast.error("Failed to load scripts.")
            } finally {
                setLoadingFiles(false)
            }
        }

        fetchFiles()
    }, [usn, user, subject, exam])

    // Load PDF when selected
    useEffect(() => {
        if (!selectedFile) {
            setPdfUrl(null)
            return
        }

        const loadPdf = async () => {
            setLoadingPdf(true)
            try {
                const url = await getDownloadURL(ref(storage, selectedFile.fullPath))
                setPdfUrl(url)
            } catch (error) {
                console.error(error)
                toast.error("Failed to load PDF.")
            } finally {
                setLoadingPdf(false)
            }
        }

        loadPdf()
    }, [selectedFile])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
    }

    const addToQueue = async () => {
        if (!selectedFile || !user || !subject || !exam) return
        setQueueing(true)

        try {
            await addDoc(collection(db, `teachers/${user.uid}/evaluation_queue`), {
                usn,
                subjectCode: subject,
                examName: exam,
                filename: selectedFile.name,
                pdfPath: selectedFile.fullPath,
                addedAt: serverTimestamp(),
                status: "pending"
            })
            toast.success("Added to evaluation queue")
        } catch (error) {
            console.error(error)
            toast.error("Failed to add to queue")
        } finally {
            setQueueing(false)
        }
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:flex-row">
            {/* Sidebar / File List */}
            <Card className="flex h-full w-full flex-col md:w-80">
                <div className="p-4 border-b">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
                        <ChevronLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <h3 className="font-semibold">Scripts for {usn}</h3>
                    <p className="text-sm text-muted-foreground">{files.length} documents found</p>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {loadingFiles ? (
                            <div className="space-y-2 p-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : files.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No PDFs found for {subject} &gt; {exam}
                            </div>
                        ) : (
                            files.map((file) => (
                                <Button
                                    key={file.fullPath}
                                    variant={selectedFile?.fullPath === file.fullPath ? "secondary" : "ghost"}
                                    className="w-full justify-start text-left h-auto py-3"
                                    onClick={() => setSelectedFile(file)}
                                >
                                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate w-full text-xs">{file.name}</span>
                                </Button>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </Card>

            {/* Main Preview Area */}
            <div className="flex flex-1 flex-col gap-4 h-full">
                {/* Actions Toolbar */}
                <Card className="p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                            disabled={!pdfUrl}
                        >
                            - Zoom
                        </Button>
                        <div className="text-sm w-12 text-center text-muted-foreground">
                            {Math.round(scale * 100)}%
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => Math.min(2, s + 0.1))}
                            disabled={!pdfUrl}
                        >
                            + Zoom
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild disabled={!pdfUrl}>
                            <a href={pdfUrl || "#"} download target="_blank" rel="noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Download
                            </a>
                        </Button>
                        <Button onClick={addToQueue} disabled={!selectedFile || queueing}>
                            {queueing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListVideo className="mr-2 h-4 w-4" />}
                            Add to Queue
                        </Button>
                    </div>
                </Card>

                {/* PDF Viewer */}
                <Card className="flex-1 overflow-hidden bg-muted/20 relative flex items-center justify-center p-0">
                    {loadingPdf && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {!selectedFile ? (
                        <div className="text-center text-muted-foreground p-8">
                            <Eye className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p>Select a file to preview</p>
                        </div>
                    ) : !pdfUrl ? (
                        <div className="text-center text-destructive p-8">
                            <p>Failed to load PDF URL</p>
                        </div>
                    ) : (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                    )}
                </Card>
            </div>
        </div>
    )
}
