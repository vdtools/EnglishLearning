
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLessonContent, getLearningPathWithProgress } from '@/app/admin/actions';
import QuizWrapper from '@/components/quiz-wrapper';
import CompletionScreen from '@/components/completion-screen';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/context/auth-context';

interface LessonPageProps {
  params: {
    path: string;
    chapterId: string;
  };
}

interface ChapterStub {
  id: string;
}

interface LessonData {
    title: string;
    description: string;
    content: string;
    quiz: any[];
}

export default function LessonPage({ params }: LessonPageProps) {
  const { path, chapterId } = params;
  const { user } = useAuth();

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [nextChapter, setNextChapter] = useState<ChapterStub | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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


  useEffect(() => {
    async function fetchData() {
        setIsLoading(true);
        if (!user?.uid) {
            // Fetch only lesson content if user is not logged in
            const lessonData = await getLessonContent(path, chapterId);
            setLesson(lessonData);
            setIsLoading(false);
            return;
        }

        // Fetch both lesson content and user progress
        const [lessonData, allChaptersWithProgress] = await Promise.all([
            getLessonContent(path, chapterId),
            getLearningPathWithProgress(user.uid, path),
        ]);

        setLesson(lessonData);
        
        if (allChaptersWithProgress.length > 0) {
            const currentChapterStatus = allChaptersWithProgress.find(c => c.id === chapterId)?.status;
            setIsCompleted(currentChapterStatus === 'completed');

            const currentChapterIndex = allChaptersWithProgress.findIndex(c => c.id === chapterId);
            const nextChapterData = currentChapterIndex > -1 && currentChapterIndex < allChaptersWithProgress.length - 1
                ? allChaptersWithProgress[currentChapterIndex + 1]
                : null;
            setNextChapter(nextChapterData);
        }
        setIsLoading(false);
    }
    fetchData();
  }, [user, path, chapterId]);

  const handleQuizCompletion = () => {
    setIsCompleted(true);
  };

  if (isLoading) {
    return (
       <div className="flex h-[80vh] items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="mb-4 h-16 w-16 text-destructive" />
        <h1 className="text-3xl font-bold">Lesson Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The lesson you are looking for does not exist or may have been moved.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
       <div className="mb-8">
        <Button asChild variant="outline">
          <Link href={syllabusPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Syllabus
          </Link>
        </Button>
      </div>

      <header className="mb-8 border-b pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="mt-4 text-lg text-muted-foreground">
            {lesson.description}
          </p>
        )}
      </header>

      <main>
        <Card>
          <CardContent className="p-6">
            <article className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown>
                {lesson.content || ''}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>

        {lesson.quiz && lesson.quiz.length > 0 && (
          isCompleted ? (
             <CompletionScreen 
                path={path}
                chapterId={chapterId}
                nextChapter={nextChapter}
                onRetry={() => setIsCompleted(false)}
             />
          ) : (
             <QuizWrapper 
                quiz={lesson.quiz}
                path={path}
                chapterId={chapterId}
                onQuizComplete={handleQuizCompletion}
             />
          )
        )}
      </main>
    </div>
  );
}
