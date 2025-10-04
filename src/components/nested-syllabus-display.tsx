
'use client';

import Link from 'next/link';
import { HierarchicalChapter } from '@/app/grammar/page';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Lock,
  PlayCircle,
  CheckCircle2,
  FileText,
  Folder,
  LibraryBig,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Helper to determine if a parent node is in progress
const isParentInProgress = (node: HierarchicalChapter): boolean => {
    if (node.status === 'in_progress') return true;
    if (node.children) {
        return node.children.some(isParentInProgress);
    }
    return false;
};


interface LessonNodeProps {
  node: HierarchicalChapter;
  path: string;
}

const LessonNode = ({ node, path }: LessonNodeProps) => {
    const isLocked = node.status === 'locked';

    const handleLockedClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation
        toast.info('This lesson is locked.', {
        description: 'Please complete the previous lessons to unlock this one.',
        });
    };

    const getButtonText = () => {
        if (node.status === 'completed') return 'Review';
        if (node.status === 'in_progress') return 'Start Lesson';
        return 'Locked';
    };

    const getStatusIcon = () => {
        switch (node.status) {
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'in_progress':
                return <PlayCircle className="h-5 w-5 text-blue-500" />;
            case 'locked':
            default:
                return <Lock className="h-5 w-5 text-gray-400" />;
        }
    };

    return (
        <div className={cn(
            "flex items-center space-x-4 rounded-md p-3 transition-colors",
            node.status === 'in_progress' && "bg-accent/50"
        )}>
            {getStatusIcon()}
            <div className="flex-grow">
                <h4 className={cn("font-medium", isLocked && 'text-muted-foreground')}>
                    {node.title}
                </h4>
            </div>
            <Button
                asChild
                size="sm"
                variant={isLocked ? 'secondary' : (node.status === 'completed' ? 'outline' : 'default')}
                disabled={isLocked}
                onClick={isLocked ? handleLockedClick : undefined}
                className={cn(isLocked && 'cursor-not-allowed')}
            >
                <Link href={isLocked ? '#' : `/learn/${path}/${node.id}`}>
                    {getButtonText()}
                </Link>
            </Button>
        </div>
    );
};


interface SectionNodeProps {
  node: HierarchicalChapter;
  path: string;
  defaultOpen?: string;
}

const SectionNode = ({ node, path, defaultOpen }: SectionNodeProps) => {
    return (
        <Accordion type="single" collapsible className="w-full" defaultValue={defaultOpen}>
            <AccordionItem value={node.id} className="border-b-0">
                <AccordionTrigger className="py-2 px-3 rounded-md hover:bg-muted/50 hover:no-underline">
                     <div className="flex items-center space-x-3">
                        <Folder className="h-5 w-5 text-secondary-foreground/80" />
                        <h3 className="text-lg font-semibold text-muted-foreground text-left">{node.title}</h3>
                        {node.status === 'completed' && (
                            <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
                        )}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pl-6 space-y-2">
                    {node.children?.map(lesson => (
                        <LessonNode key={lesson.id} node={lesson} path={path} />
                    ))}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};


interface NestedSyllabusDisplayProps {
  chapters: HierarchicalChapter[];
  path: string;
}

export default function NestedSyllabusDisplay({ chapters, path }: NestedSyllabusDisplayProps) {
  if (!chapters || chapters.length === 0) {
    return <p className="text-center text-muted-foreground">No syllabus content available for this path.</p>;
  }

  // Find the top-level part that is in progress to open it by default
  const defaultOpenPart = chapters.find(isParentInProgress)?.id;

  return (
    <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={defaultOpenPart}>
        {chapters.map(part => {
             const defaultOpenSection = part.children?.find(isParentInProgress)?.id;
             return (
                <AccordionItem key={part.id} value={part.id} className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline bg-muted/30">
                        <div className="flex items-center space-x-4">
                            <LibraryBig className="h-6 w-6 text-primary" />
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-left">{part.title}</h2>
                                    {part.status === 'completed' && (
                                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground text-left">{part.description}</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 md:p-6 space-y-4">
                        {part.children?.map(section => (
                            <SectionNode key={section.id} node={section} path={path} defaultOpen={defaultOpenSection} />
                        ))}
                    </AccordionContent>
                </AccordionItem>
            );
        })}
    </Accordion>
  );
}
