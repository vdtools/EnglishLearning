
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';

interface ChapterStub {
  id: string;
}

interface CompletionScreenProps {
  path: string;
  chapterId: string;
  nextChapter: ChapterStub | null;
  onRetry: () => void;
}

export default function CompletionScreen({ path, chapterId, nextChapter, onRetry }: CompletionScreenProps) {
  // Determine the correct syllabus path for the link
  const getSyllabusPath = (currentPath: string) => {
    switch (currentPath) {
      case 'beginnerJourney':
        return '/journey';
      case 'grammarsDeepDive':
        return '/grammar';
      case 'vocabulary': // The old path ID for grammar fundamentals
        return '/grammar-fundamentals';
      default:
        return `/${currentPath}`;
    }
  };
  const syllabusPath = getSyllabusPath(path);


  return (
    <div className="mt-12">
        <Card>
             <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
                    <h2 className="text-2xl font-bold">Lesson Already Completed</h2>
                    <p className="text-muted-foreground">You can review the content, retry the quiz, or move on to the next lesson.</p>
                </div>
            </CardContent>
            <CardFooter className="w-full flex-col items-center justify-center gap-4">
                 <Button onClick={onRetry} className="w-full max-w-xs">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Quiz
                </Button>
                {nextChapter && (
                    <Button asChild className="w-full max-w-xs">
                        <Link href={`/learn/${path}/${nextChapter.id}`}>
                            Next Lesson <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
                 <Button asChild variant="secondary" className="w-full max-w-xs bg-black text-white hover:bg-black/80">
                    <Link href={syllabusPath}>
                      Back to Syllabus
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
