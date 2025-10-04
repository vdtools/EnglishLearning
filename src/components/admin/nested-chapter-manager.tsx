
'use client';

import { useState, useEffect, useTransition } from 'react';
import { getSyllabus, saveSyllabusChapter } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Plus, Save } from 'lucide-react';
import NestedChapterNode from './nested-chapter-node';
import { toast } from 'sonner';

export interface HierarchicalChapter {
  id: string;
  title: string;
  description: string;
  children?: HierarchicalChapter[];
  content?: string;
  quiz?: any[];
}

interface NestedChapterManagerProps {
  path: string;
}

export default function NestedChapterManager({ path }: NestedChapterManagerProps) {
  const [syllabus, setSyllabus] = useState<HierarchicalChapter[]>([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchSyllabus = async () => {
      setStatus({ loading: true, error: '' });
      const data = await getSyllabus(path);
      if (data && data.chapters) {
        setSyllabus(data.chapters);
      } else {
        setSyllabus([]);
      }
      setStatus({ loading: false, error: '' });
    };
    fetchSyllabus();
  }, [path]);

  const handleSyllabusChange = (updatedSyllabus: HierarchicalChapter[]) => {
    setSyllabus(updatedSyllabus);
  };
  
  const addTopLevelPart = () => {
      const newPart: HierarchicalChapter = {
        id: `gdd-part${syllabus.length + 1}`,
        title: `Part ${syllabus.length + 1}: New Part`,
        description: 'A new high-level part of the syllabus.',
        children: [],
      };
      setSyllabus([...syllabus, newPart]);
  }

  const handleSave = () => {
    startTransition(async () => {
        const payload = {
            path: path,
            chapters: syllabus,
        };
        const result = await saveSyllabusChapter(payload);
        if (result.success) {
            toast.success('Syllabus saved successfully!');
        } else {
            toast.error('Error saving syllabus', { description: result.message });
        }
    });
  }

  if (status.loading) {
    return <p>Loading syllabus...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nested Syllabus Editor</CardTitle>
        <CardDescription>
          Manage the entire nested structure for the <span className="font-bold text-primary">{path}</span> path.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {syllabus.map((part, index) => (
          <NestedChapterNode
            key={part.id}
            node={part}
            path={[index]}
            fullSyllabus={syllabus}
            onSyllabusChange={handleSyllabusChange}
          />
        ))}
         <Button variant="outline" onClick={addTopLevelPart}>
            <Plus className="mr-2 h-4 w-4" /> Add Part
        </Button>
      </CardContent>
      <CardFooter className="flex justify-end border-t pt-6">
        <Button onClick={handleSave} disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Entire Syllabus'}
        </Button>
      </CardFooter>
    </Card>
  );
}

    