"use client"

import * as React from "react"
import { Check, ChevronsUpDown, RefreshCw, FileStack } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useSelection } from "@/contexts/selection-context"

export function ExamSelector() {
    const { selectedExam, setSelectedExam, exams, loadingExams, refreshExams, selectedSubject } = useSelection()
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                    disabled={!selectedSubject}
                >
                    <div className="flex items-center overflow-hidden">
                        <FileStack className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">
                            {!selectedSubject ? "Select Subject First" : loadingExams ? "Loading..." : selectedExam || "Select Exam..."}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search exam..." />
                    <CommandList>
                        <CommandEmpty>No exams found.</CommandEmpty>
                        <CommandGroup heading="Available Exams">
                            {exams.map((exam) => (
                                <CommandItem
                                    key={exam}
                                    value={exam}
                                    onSelect={(currentValue) => {
                                        setSelectedExam(currentValue === selectedExam ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedExam === exam ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {exam}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                            <CommandItem onSelect={() => refreshExams()}>
                                <RefreshCw className={cn("mr-2 h-4 w-4", loadingExams && "animate-spin")} />
                                Refresh list
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
