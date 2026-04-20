"use client"

import { USNEntryForm } from "@/components/usn-entry-form"
import { BulkUploadForm } from "@/components/bulk-upload-form"
import { StudentList } from "@/components/student-list"
import { Separator } from "@/components/ui/separator"

export default function StudentsPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Student Management</h2>
                <p className="text-muted-foreground">
                    Manage student USNs and track their script uploads.
                </p>
            </div>
            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                <USNEntryForm />
                <BulkUploadForm />
            </div>

            <Separator />

            <StudentList />
        </div>
    )
}
