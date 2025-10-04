'use client';

import { useEffect, useState, useTransition } from 'react';
import { getAiPrompts, updateAiPrompt } from '@/app/admin/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Prompts {
  [key: string]: string;
}

interface Status {
  isSaving: boolean;
  success: string;
  error: string;
}

export default function PromptEditor() {
  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [editablePrompts, setEditablePrompts] = useState<Prompts>({});
  const [statuses, setStatuses] = useState<{ [key: string]: Status }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();


  useEffect(() => {
    async function fetchPrompts() {
      setIsLoading(true);
      const fetchedPrompts = await getAiPrompts();
      if (fetchedPrompts) {
        setPrompts(fetchedPrompts);
        setEditablePrompts(fetchedPrompts);
        // Initialize statuses for each prompt
        const initialStatuses: { [key: string]: Status } = {};
        Object.keys(fetchedPrompts).forEach(key => {
            initialStatuses[key] = { isSaving: false, success: '', error: '' };
        });
        setStatuses(initialStatuses);
      }
      setIsLoading(false);
    }
    fetchPrompts();
  }, []);

  const handlePromptChange = (promptName: string, value: string) => {
    setEditablePrompts(prev => ({ ...prev, [promptName]: value }));
  };
  
  const handleSave = (promptName: string) => {
    startTransition(async () => {
        setStatuses(prev => ({...prev, [promptName]: { isSaving: true, success: '', error: '' }}));
        const newPromptText = editablePrompts[promptName];
        const result = await updateAiPrompt(promptName, newPromptText);

        if (result.success) {
            setStatuses(prev => ({...prev, [promptName]: { isSaving: false, success: 'Prompt saved!', error: '' }}));
             setTimeout(() => {
                setStatuses(prev => ({...prev, [promptName]: { isSaving: false, success: '', error: '' }}));
            }, 3000);
        } else {
             setStatuses(prev => ({...prev, [promptName]: { isSaving: false, success: '', error: result.message }}));
        }
    });
  }

  if (isLoading) {
    return <p>Loading prompts...</p>;
  }

  if (!prompts) {
    return <p>Could not load prompts.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Object.entries(prompts).map(([promptName, promptText]) => (
        <Card key={promptName}>
          <CardHeader>
            <CardTitle className="capitalize">{promptName.replace(/([A-Z])/g, ' $1')}</CardTitle>
            <CardDescription>The system prompt used by the AI for this feature.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor={promptName} className="sr-only">{promptName}</Label>
            <Textarea
              id={promptName}
              value={editablePrompts[promptName] || ''}
              onChange={(e) => handlePromptChange(promptName, e.target.value)}
              rows={8}
              disabled={isPending}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-end gap-4">
             {statuses[promptName]?.error && <p className="mr-auto text-sm text-destructive">{statuses[promptName].error}</p>}
            {statuses[promptName]?.success && <p className="mr-auto text-sm text-green-600">{statuses[promptName].success}</p>}
            <Button onClick={() => handleSave(promptName)} disabled={isPending}>
                {statuses[promptName]?.isSaving ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : 'Save Prompt'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
