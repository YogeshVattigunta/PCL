"use client"

import * as React from "react"
import { Check, ChevronsUpDown, RefreshCw, BookOpen } from "lucide-react"
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

export function SubjectSelector() {
    const { selectedSubject, setSelectedSubject, subjects, loadingSubjects, refreshSubjects } = useSelection()
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                >
                    <div className="flex items-center overflow-hidden">
                        <BookOpen className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">
                            {loadingSubjects ? "Loading..." : selectedSubject || "Select Subject..."}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search subject..." />
                    <CommandList>
                        <CommandEmpty>No subjects found.</CommandEmpty>
                        <CommandGroup heading="Available Subjects">
                            {subjects.map((subject) => (
                                <CommandItem
                                    key={subject}
                                    value={subject}
                                    onSelect={(currentValue) => {
                                        setSelectedSubject(currentValue === selectedSubject ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedSubject === subject ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {subject}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                            <CommandItem onSelect={() => refreshSubjects()}>
                                <RefreshCw className={cn("mr-2 h-4 w-4", loadingSubjects && "animate-spin")} />
                                Refresh list
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
