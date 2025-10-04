
'use client';

import { HierarchicalChapter } from './nested-chapter-manager';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface NestedChapterNodeProps {
  node: HierarchicalChapter;
  path: number[]; // e.g., [0, 1, 2] for syllabus[0].children[1].children[2]
  fullSyllabus: HierarchicalChapter[];
  onSyllabusChange: (newSyllabus: HierarchicalChapter[]) => void;
}

// Helper to update a deeply nested node
const updateSyllabus = (syllabus: HierarchicalChapter[], path: number[], newNodeData: Partial<HierarchicalChapter>): HierarchicalChapter[] => {
  const newSyllabus = JSON.parse(JSON.stringify(syllabus));
  let currentNodeRef: any = newSyllabus;

  path.forEach((index, i) => {
    if (i < path.length - 1) {
      currentNodeRef = currentNodeRef[index].children;
    } else {
      currentNodeRef[index] = { ...currentNodeRef[index], ...newNodeData };
    }
  });

  return newSyllabus;
};


// Helper to add a child node
const addChildToSyllabus = (syllabus: HierarchicalChapter[], path: number[], newChild: HierarchicalChapter): HierarchicalChapter[] => {
    const newSyllabus = JSON.parse(JSON.stringify(syllabus));
    let parentNode: any = newSyllabus;

    path.forEach((index, i) => {
      if(i === path.length -1) {
        if(!parentNode[index].children) {
          parentNode[index].children = [];
        }
        parentNode[index].children.push(newChild);
      } else {
        parentNode = parentNode[index].children;
      }
    });

    return newSyllabus;
};

// Helper to delete a node
const deleteNodeFromSyllabus = (syllabus: HierarchicalChapter[], path: number[]): HierarchicalChapter[] => {
     const newSyllabus = JSON.parse(JSON.stringify(syllabus));
     let parentNode: any = newSyllabus;

    if (path.length === 1) { // Top-level node
        newSyllabus.splice(path[0], 1);
        return newSyllabus;
    }

    for (let i = 0; i < path.length - 1; i++) {
        parentNode = parentNode[i].children;
    }
    const lastIndex = path[path.length - 1];
    parentNode.splice(lastIndex, 1);
    return newSyllabus;
}


export default function NestedChapterNode({ node, path, fullSyllabus, onSyllabusChange }: NestedChapterNodeProps) {

  const level = path.length; // 1 for Part, 2 for Section, 3 for Lesson

  const handleInputChange = (field: keyof Omit<HierarchicalChapter, 'quiz'>, value: string) => {
    const updatedSyllabus = updateSyllabus(fullSyllabus, path, { [field]: value });
    onSyllabusChange(updatedSyllabus);
  };
  
  const handleQuizChange = (quiz: any[]) => {
     const updatedSyllabus = updateSyllabus(fullSyllabus, path, { quiz: quiz });
     onSyllabusChange(updatedSyllabus);
  }

  const addQuizQuestion = () => {
    const currentQuiz = node.quiz || [];
    const newQuestion = {
        question: '',
        options: [],
        correctAnswer: '',
    };
    handleQuizChange([...currentQuiz, newQuestion]);
  }
  
  const removeQuizQuestion = (index: number) => {
    const currentQuiz = [...(node.quiz || [])];
    currentQuiz.splice(index, 1);
    handleQuizChange(currentQuiz);
  }

  const handleQuestionDetailChange = (index: number, field: 'question' | 'correctAnswer', value: string) => {
      const currentQuiz = [...(node.quiz || [])];
      currentQuiz[index] = { ...currentQuiz[index], [field]: value };
      handleQuizChange(currentQuiz);
  }

  const handleOptionsChange = (index: number, value: string) => {
      const currentQuiz = [...(node.quiz || [])];
      currentQuiz[index] = { ...currentQuiz[index], options: value.split(',').map(opt => opt.trim()) };
      handleQuizChange(currentQuiz);
  }
  
  const handleAddChild = () => {
      const parentId = node.id;
      const childCount = node.children ? node.children.length + 1 : 1;
      const newId = `${parentId}.${childCount}`;
      
      const newChild: HierarchicalChapter = {
          id: newId,
          title: `New ${level === 1 ? 'Section' : 'Lesson'}`,
          description: '',
          children: level < 2 ? [] : undefined, // Lessons don't have children
      };
      
      const updatedSyllabus = addChildToSyllabus(fullSyllabus, path, newChild);
      onSyllabusChange(updatedSyllabus);
  }

  const handleDeleteNode = () => {
      const updatedSyllabus = deleteNodeFromSyllabus(fullSyllabus, path);
      onSyllabusChange(updatedSyllabus);
  }

  return (
    <Accordion type="single" collapsible className="w-full rounded-md border">
      <AccordionItem value="item-1" className="border-none">
        <AccordionTrigger className="bg-muted/50 px-4 hover:no-underline">
          <div className="flex w-full items-center justify-between">
            <span className="font-semibold">{`[${level === 1 ? 'Part' : level === 2 ? 'Section' : 'Lesson'}] ${node.title}`}</span>
             <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteNode(); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 space-y-4">
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-1">
                <Label>ID</Label>
                <Input value={node.id} disabled />
            </div>
             <div className="col-span-5">
                <Label>Title</Label>
                <Input value={node.title} onChange={(e) => handleInputChange('title', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={node.description} onChange={(e) => handleInputChange('description', e.target.value)} />
          </div>

          {/* Render content and quiz only for Lessons (level 3) */}
          {level === 3 && (
            <div className='space-y-4 rounded-md border border-dashed p-4'>
                <h4 className="font-bold">Lesson Content</h4>
                <div>
                    <Label>Content (Markdown)</Label>
                    <Textarea value={node.content || ''} onChange={(e) => handleInputChange('content', e.target.value)} rows={8} />
                </div>
                <div>
                    <h3 className="mb-4 text-lg font-medium">Mastery Quiz</h3>
                    <div className="grid gap-6">
                        {(node.quiz || []).map((q, index) => (
                        <Card key={index} className="bg-muted/50">
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-base">Question {index + 1}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => removeQuizQuestion(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor={`q-text-${node.id}-${index}`}>Question Text</Label>
                                    <Input id={`q-text-${node.id}-${index}`} placeholder="What is...?" value={q.question} onChange={e => handleQuestionDetailChange(index, 'question', e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor={`q-options-${node.id}-${index}`}>Options (comma-separated)</Label>
                                    <Input id={`q-options-${node.id}-${index}`} placeholder="Option A, Option B, Option C, Option D" value={(q.options || []).join(', ')} onChange={e => handleOptionsChange(index, e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor={`q-answer-${node.id}-${index}`}>Correct Answer</Label>
                                    <Input id={`q-answer-${node.id}-${index}`} placeholder="The exact text of the correct option" value={q.correctAnswer} onChange={e => handleQuestionDetailChange(index, 'correctAnswer', e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={addQuizQuestion}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Question
                    </Button>
                    </div>
            </div>
          )}

          {/* Render children recursively */}
          {node.children && (
            <div className="pl-6 space-y-4 border-l-2 ml-2">
              {node.children.map((child, index) => (
                <NestedChapterNode
                  key={child.id}
                  node={child}
                  path={[...path, index]}
                  fullSyllabus={fullSyllabus}
                  onSyllabusChange={onSyllabusChange}
                />
              ))}
            </div>
          )}
          
           {/* Add child button (not for lessons) */}
          {level < 3 && (
            <Button variant="outline" size="sm" onClick={handleAddChild}>
              <Plus className="mr-2 h-4 w-4" />
              Add {level === 1 ? 'Section' : 'Lesson'}
            </Button>
          )}

        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
