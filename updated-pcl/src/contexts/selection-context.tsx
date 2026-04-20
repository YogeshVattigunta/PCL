"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { ref, listAll } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

type SelectionContextType = {
    selectedSubject: string
    setSelectedSubject: (subject: string) => void
    selectedExam: string
    setSelectedExam: (exam: string) => void
    subjects: string[]
    exams: string[]
    loadingSubjects: boolean
    loadingExams: boolean
    refreshSubjects: () => Promise<void>
    refreshExams: () => Promise<void>
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined)

export function SelectionProvider({ children }: { children: React.ReactNode }) {
    const [selectedSubject, setSelectedSubject] = useState<string>("")
    const [selectedExam, setSelectedExam] = useState<string>("")
    const [subjects, setSubjects] = useState<string[]>([])
    const [exams, setExams] = useState<string[]>([])
    const [loadingSubjects, setLoadingSubjects] = useState(false)
    const [loadingExams, setLoadingExams] = useState(false)

    const { user, loading: authLoading } = useAuth()

    // Fetch Subjects (Top-level folders in ASEAS/)
    const fetchSubjects = async () => {
        if (!user) return // Don't fetch if not logged in

        setLoadingSubjects(true)
        try {
            const listRef = ref(storage, "ASEAS/")
            const res = await listAll(listRef)
            const subjectList = res.prefixes.map((folder) => folder.name)
            setSubjects(subjectList)
        } catch (error) {
            console.error("Failed to fetch subjects", error)
            // toast.error("Failed to load subjects") // Removing noisy toast on auto-fetch
        } finally {
            setLoadingSubjects(false)
        }
    }

    // Fetch Exams (Folders inside ASEAS/<Subject>/)
    const fetchExams = async () => {
        if (!user || !selectedSubject) {
            setExams([])
            return
        }

        setLoadingExams(true)
        try {
            const listRef = ref(storage, `ASEAS/${selectedSubject}/`)
            const res = await listAll(listRef)
            const examList = res.prefixes.map((folder) => folder.name)
            setExams(examList)
        } catch (error) {
            console.error("Failed to fetch exams", error)
            // toast.error("Failed to load exams")
        } finally {
            setLoadingExams(false)
        }
    }

    // Initial Load & Persistence
    useEffect(() => {
        if (!authLoading && user) {
            fetchSubjects()
        }
    }, [user, authLoading])

    // Load saved selection on mount (only once)
    useEffect(() => {
        const savedSubject = localStorage.getItem("aseas_selected_subject")
        const savedExam = localStorage.getItem("aseas_selected_exam")
        if (savedSubject) setSelectedSubject(savedSubject)
        if (savedExam) setSelectedExam(savedExam)
    }, [])

    // Update localStorage
    useEffect(() => {
        localStorage.setItem("aseas_selected_subject", selectedSubject || "")
    }, [selectedSubject])

    useEffect(() => {
        localStorage.setItem("aseas_selected_exam", selectedExam || "")
    }, [selectedExam])

    // Fetch exams when subject changes
    useEffect(() => {
        fetchExams()
        // Optional: Clear exam if subject changes and old exam is invalid? 
        // For now, let's keep it simple. If the user changes subject, they likely want to select a new exam.
        // But we shouldn't auto-clear unless we know it doesn't exist.
        // Let's just re-fetch exams. If the previously selected exam isn't in the new list, it effectively becomes invalid for *new* actions, 
        // but UI might show it. Ideally, we should check if `selectedExam` is in `exams` after fetch, but `setExams` is async.
        // A safer bet is to NOT clear it automatically to avoid annoyance, or clear it if it's not found (complex to do seamlessly here).
        // Let's rely on the user to pick a valid exam from the new list.
    }, [selectedSubject])


    return (
        <SelectionContext.Provider value={{
            selectedSubject,
            setSelectedSubject,
            selectedExam,
            setSelectedExam,
            subjects,
            exams,
            loadingSubjects,
            loadingExams,
            refreshSubjects: fetchSubjects,
            refreshExams: fetchExams
        }}>
            {children}
        </SelectionContext.Provider>
    )
}

export function useSelection() {
    const context = useContext(SelectionContext)
    if (context === undefined) {
        throw new Error("useSelection must be used within a SelectionProvider")
    }
    return context
}
