'use client';

import { useEffect, useState } from 'react';
import { getSyllabusChapters, deleteSyllabusChapter } from '@/app/admin/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FilePenLine, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Chapter {
  id: string;
  title: string;
  description: string;
  content: string;
  quiz: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
  }>;
}

interface ChapterListProps {
    path: string;
    onEditChapter: (chapter: Chapter) => void;
}

export default function ChapterList({ path, onEditChapter }: ChapterListProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChapters() {
      if (!path) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedChapters = await getSyllabusChapters(path);
        setChapters(fetchedChapters as Chapter[]);
        setError(null);
      } catch (err) {
        console.error(`Failed to fetch chapters for path ${path}:`, err);
        setError('Could not load chapters. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchChapters();
  }, [path]);

  const handleDelete = async (chapterId: string) => {
    // Confirmation is removed for a popup-free experience.
    // Consider adding a custom modal for confirmation in the future.
    setDeletingId(chapterId);
    setError(null);
    try {
      const result = await deleteSyllabusChapter(path, chapterId);
      if (result.success) {
        toast.success('Chapter deleted successfully!');
        setChapters((prevChapters) => prevChapters.filter((c) => c.id !== chapterId));
      } else {
        toast.error('Failed to delete chapter', { description: result.message });
        setError(result.message || 'Failed to delete the chapter.');
      }
    } catch (err) {
      console.error('Error deleting chapter:', err);
      const errorMessage = 'An unexpected error occurred.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Existing Chapters</CardTitle>
        <CardDescription>
          List of chapters currently in the <span className="font-bold text-primary">{path}</span> path.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p>Loading chapters...</p>}
        {error && <p className="text-destructive">{error}</p>}
        {!loading && !error && chapters.length === 0 && (
          <p className="text-muted-foreground">No chapters found for this path.</p>
        )}
        {!loading && chapters.length > 0 && (
          <div className="space-y-4">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between rounded-md border p-4"
              >
                <div>
                  <h4 className="font-semibold">{chapter.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    ID: {chapter.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditChapter(chapter)}>
                    <FilePenLine className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(chapter.id)}
                    disabled={deletingId === chapter.id}
                  >
                    {deletingId === chapter.id ? 'Deleting...' : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
