
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { getLearningPathWithProgress } from '@/app/admin/actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Chapter {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'locked';
}

export default function BeginnerJourneyPage() {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const path = 'beginnerJourney'; // Define the path for this page

  useEffect(() => {
    async function loadChapters() {
      if (user?.uid) {
        setLoading(true);
        setError(null);
        try {
          const fetchedChapters: any[] = await getLearningPathWithProgress(user.uid, path);
          
          if (Array.isArray(fetchedChapters)) {
            // Validate and map the data to ensure it matches the Chapter interface
            const validatedChapters = fetchedChapters.map(chapter => ({
              id: chapter.id || '',
              title: chapter.title || 'Untitled Chapter',
              description: chapter.description || 'No description available.',
              status: chapter.status || 'locked',
            })).filter(chapter => chapter.id && chapter.title); // Ensure basic data is present

            setChapters(validatedChapters);
          } else {
            throw new Error("Received invalid data from the server.");
          }

        } catch (err: any) {
          console.error('Failed to load learning path:', err);
          setError(err.message || 'Could not load the learning path. Please try again later.');
        } finally {
          setLoading(false);
        }
      }
    }

    loadChapters();
  }, [user]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Beginner's Journey</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Start your language learning adventure from scratch. Master the basics step-by-step.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      ) : error ? (
        <p className="text-center text-destructive">{error}</p>
      ) : chapters.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <Card 
              key={chapter.id} 
              className={`flex flex-col transition-all hover:shadow-lg ${chapter.status === 'locked' ? 'bg-muted/50' : 'bg-card'}`}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                    {chapter.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    )}
                    <CardTitle className="text-xl">{chapter.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3">{chapter.description}</p>
              </CardContent>
              <CardContent>
                 <Button 
                    asChild 
                    disabled={chapter.status === 'locked'} 
                    className={`w-full ${chapter.status === 'completed' ? 'bg-slate-100 text-black hover:bg-slate-200' : ''}`}
                    variant={chapter.status === 'completed' ? undefined : 'default'}
                  >
                  <Link href={`/learn/${path}/${chapter.id}`}>
                    {chapter.status === 'completed' ? 'Review Chapter' : 'Start Chapter'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
         <p className="text-center text-muted-foreground">No chapters available for this journey yet.</p>
      )}
    </div>
  );
}
