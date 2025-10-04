
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getSyllabus, getLearningPathWithProgress } from '@/app/admin/actions';
import NestedSyllabusDisplay from '@/components/nested-syllabus-display';

// Define a more specific type for chapters that can have children
export interface HierarchicalChapter {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'locked';
  children?: HierarchicalChapter[];
  content?: string;
  quiz?: any[];
}


export default function GrammarDeepDivePage() {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<HierarchicalChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const path = 'grammarsDeepDive';

  useEffect(() => {
    async function loadChapters() {
      if (user?.uid) {
        setLoading(true);
        try {
          // STEP 1: Get the flat list of lessons with their calculated statuses from the server.
          // This is now the single source of truth for progress.
          const progressLessons = await getLearningPathWithProgress(user.uid, path);

          // STEP 2: Get the raw, nested structure of the syllabus.
          const syllabusData = await getSyllabus(path);

          if (!syllabusData || !syllabusData.chapters) {
            throw new Error("Syllabus structure not found.");
          }

          // Create a map of lesson IDs to their server-calculated status for easy lookup.
          const progressMap = new Map(progressLessons.map(p => [p.id, p.status]));
          
          // This recursive function builds the hierarchy, applying the correct status from the server-provided map.
          const buildHierarchy = (nodes: any[]): HierarchicalChapter[] => {
            return nodes.map(node => {
              
              const childrenWithStatus = node.children ? buildHierarchy(node.children) : undefined;
              
              let currentStatus: HierarchicalChapter['status'];

              if (childrenWithStatus) { 
                // It's a PARENT node (Part or Section). Its status is derived from its children.
                if (childrenWithStatus.every(child => child.status === 'completed')) {
                  currentStatus = 'completed';
                } else if (childrenWithStatus.some(child => child.status === 'in_progress' || child.status === 'completed')) {
                  currentStatus = 'in_progress';
                } else {
                  currentStatus = 'locked';
                }
              } else { 
                // It's a LEAF node (Lesson). Its status comes directly from the server's progress map.
                currentStatus = progressMap.get(node.id) || 'locked';
              }
              
              return {
                ...node,
                status: currentStatus,
                children: childrenWithStatus,
              };
            });
          };
          
          const hierarchicalChapters = buildHierarchy(syllabusData.chapters);
          setChapters(hierarchicalChapters);
          setError(null);

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
        <h1 className="text-4xl font-bold tracking-tight">Grammar Deep Dive</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Master the tricky rules of grammar with focused, nested lessons and quizzes.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      ) : error ? (
        <p className="text-center text-destructive">{error}</p>
      ) : (
        <NestedSyllabusDisplay chapters={chapters} path={path} />
      )}
    </div>
  );
}
