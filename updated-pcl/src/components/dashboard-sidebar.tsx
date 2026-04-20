"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
    LayoutDashboard,
    Users,
    FileText,
    ListVideo,
    Settings,
    Menu,
    GraduationCap,
    FileCog,
    FileSpreadsheet,
} from "lucide-react"

import { useState } from "react"

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Students",
        href: "/dashboard/students",
        icon: Users,
    },
    {
        title: "Rules",
        href: "/dashboard/rules",
        icon: FileSpreadsheet,
    },
    {
        title: "Evaluation Queue",
        href: "/dashboard/queue",
        icon: ListVideo,
    },
    {
        title: "Exam Setup",
        href: "/dashboard/setup",
        icon: FileCog,
    },
    {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
]

export function DashboardSidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
    return <SidebarBase items={sidebarItems} className={className} />
}

function SidebarBase({ items, className }: { items: typeof sidebarItems, className?: string }) {
    const pathname = usePathname()

    return (
        <div className={cn("pb-12", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="mb-2 px-4 flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold tracking-tight text-primary">
                            ASEAS Teacher
                        </h2>
                    </div>
                    <div className="space-y-1">
                        {items.map((item) => (
                            <Button
                                key={item.href}
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start",
                                    pathname === item.href && "bg-secondary text-primary font-semibold"
                                )}
                                asChild
                            >
                                <Link href={item.href}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function MobileSidebar() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
                <div className="px-7 flex items-center gap-2 mb-8">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight text-primary">
                        ASEAS Teacher
                    </h2>
                </div>
                <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                    <div className="space-y-1 pr-6">
                        {sidebarItems.map((item) => (
                            <Button
                                key={item.href}
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start",
                                    pathname === item.href && "bg-secondary text-primary font-semibold"
                                )}
                                asChild
                                onClick={() => setOpen(false)}
                            >
                                <Link href={item.href}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
