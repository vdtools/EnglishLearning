'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';
import { saveSyllabusChapter } from '@/app/admin/actions';

// Raw type from Firestore for quiz
interface RawQuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

// Full chapter data for editing
interface ChapterToEdit {
    id: string;
    title: string;
    description: string;
    content: string;
    quiz: RawQuizQuestion[];
}

// Local state for questions in the editor
interface EditorQuizQuestion {
  id: number;
  question: string;
  options: string; // Comma-separated string for the input
  correctAnswer: string;
}

interface ChapterEditorProps {
  path: string;
  chapterToEdit: ChapterToEdit | null;
  onChapterSaved: () => void;
  onCancel: () => void;
}

export default function ChapterEditor({ path, chapterToEdit, onChapterSaved, onCancel }: ChapterEditorProps) {
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [questions, setQuestions] = useState<EditorQuizQuestion[]>([]);
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    if (chapterToEdit) {
      // If we are editing, populate the form
      setChapterId(chapterToEdit.id);
      setTitle(chapterToEdit.title);
      setDescription(chapterToEdit.description);
      setContent(chapterToEdit.content);
      // Convert quiz from array of strings to comma-separated string for the inputs
      setQuestions(chapterToEdit.quiz.map((q, index) => ({
        id: Date.now() + index, // Ensure unique IDs
        question: q.question,
        options: q.options.join(', '),
        correctAnswer: q.correctAnswer,
      })));
    } else {
      // If creating new, clear the form
      clearForm();
    }
  }, [chapterToEdit]);


  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        question: '',
        options: '',
        correctAnswer: '',
      },
    ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };
  
  const handleQuestionChange = (id: number, field: keyof Omit<EditorQuizQuestion, 'id'>, value: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const clearForm = () => {
    setChapterId('');
    setTitle('');
    setDescription('');
    setContent('');
    setQuestions([]);
  }

  const handleCancel = () => {
    clearForm();
    onCancel();
  }

  const handleSave = async () => {
    setStatus({ loading: true, error: '', success: '' });
    
    if (!path || !chapterId || !title) {
        setStatus({ loading: false, error: 'Path, Chapter ID, and Title are required.', success: '' });
        return;
    }

    const chapterData = {
        path,
        chapterId,
        title,
        description,
        content,
        // Convert comma-separated string back to array for questions before saving
        questions: questions.map(({id, ...rest}) => rest), 
    };

    try {
        const result = await saveSyllabusChapter(chapterData);
        if (result.success) {
            setStatus({ loading: false, error: '', success: result.message });
            if (!chapterToEdit) { // Only clear form if it was a new chapter
                clearForm();
            }
            onChapterSaved();
            setTimeout(() => setStatus({loading: false, error: '', success: ''}), 3000);
        } else {
            setStatus({ loading: false, error: result.message, success: '' });
        }
    } catch (error) {
        console.error("Save chapter failed:", error);
        setStatus({ loading: false, error: 'An unexpected error occurred.', success: '' });
    }
  }


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{chapterToEdit ? 'Edit Chapter' : 'Create New Chapter'}</CardTitle>
        <CardDescription>
          Fill in the details for a chapter in the <span className="font-bold text-primary">{path}</span> path.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="chapter-id">Chapter ID</Label>
            <Input
              id="chapter-id"
              placeholder="e.g., bj-1"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              disabled={status.loading || !!chapterToEdit} // Disable ID editing
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Chapter Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={status.loading}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="A brief summary of the chapter."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={status.loading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            placeholder="Main chapter content in Markdown format."
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={status.loading}
          />
        </div>
        <div>
          <h3 className="mb-4 text-lg font-medium">Mastery Quiz</h3>
          <div className="grid gap-6">
            {questions.map((q, index) => (
              <Card key={q.id} className="bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                   <CardTitle className="text-base">Question {index + 1}</CardTitle>
                   <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} disabled={status.loading}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor={`q-text-${q.id}`}>Question Text</Label>
                        <Input id={`q-text-${q.id}`} placeholder="What is...?" value={q.question} onChange={e => handleQuestionChange(q.id, 'question', e.target.value)} disabled={status.loading} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor={`q-options-${q.id}`}>Options (comma-separated)</Label>
                        <Input id={`q-options-${q.id}`} placeholder="Option A, Option B, Option C, Option D" value={q.options} onChange={e => handleQuestionChange(q.id, 'options', e.target.value)} disabled={status.loading} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor={`q-answer-${q.id}`}>Correct Answer</Label>
                        <Input id={`q-answer-${q.id}`} placeholder="The exact text of the correct option" value={q.correctAnswer} onChange={e => handleQuestionChange(q.id, 'correctAnswer', e.target.value)} disabled={status.loading} />
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={addQuestion}
            disabled={status.loading}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
        {status.error && <p className="text-sm text-destructive">{status.error}</p>}
        {status.success && <p className="text-sm text-green-600">{status.success}</p>}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={status.loading}>Cancel</Button>
        <Button onClick={handleSave} disabled={status.loading}>
            {status.loading ? 'Saving...' : 'Save Chapter'}
        </Button>
      </CardFooter>
    </Card>
  );
}
