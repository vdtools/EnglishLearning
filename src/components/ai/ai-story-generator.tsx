
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiKeys, generateAiResponse } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles, Bot, AlertTriangle, BookText } from 'lucide-react';

export default function AIStoryGenerator() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [story, setStory] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    async function fetchKey() {
      if (user?.uid) {
        try {
          const keys = await getApiKeys(user.uid);
          // Use the key designated for Grammar Gym as requested
          if (keys?.geminiGym) {
            setApiKey(keys.geminiGym);
          } else {
            setStatus({ loading: false, error: 'Gemini API key for Grammar Gym is not set in Settings.' });
            return;
          }
        } catch (e) {
            setStatus({ loading: false, error: 'Failed to fetch API keys.' });
        }
      }
    }
    fetchKey();
  }, [user]);

  const handleWriteStory = async () => {
    if (!topic.trim()) {
        setStatus({ loading: false, error: "Please enter a topic for the story."});
        return;
    }
     if (!apiKey) {
        setStatus({ loading: false, error: 'API Key not found. Please set it in Settings.' });
        return;
    }

    setStatus({ loading: true, error: '' });
    setStory('');

    try {
        const prompt = `You are a creative storyteller. Write a short, simple story (about 150 words) for an English learner based on the following topic: "${topic}"`;

        const result = await generateAiResponse({
            provider: 'gemini',
            apiKey: apiKey,
            prompt: prompt,
            model: 'gemini-1.5-flash-latest',
        });

        if (result.success && result.response) {
            setStory(result.response);
        } else {
            setStatus({ loading: false, error: result.error || 'Failed to get a response from the AI.' });
        }

    } catch (e: any) {
        setStatus({ loading: false, error: `An unexpected error occurred: ${e.message}` });
    } finally {
        setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Story Generator</CardTitle>
        <CardDescription>
          Give the AI a topic and it will write a short story for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Input
          placeholder="e.g., 'A lost dog in a big city'"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={status.loading || !apiKey}
        />
        
        {story && !status.loading && (
             <div className="rounded-md border border-purple-200 bg-purple-50/50 p-4">
                <h4 className="mb-2 flex items-center text-sm font-semibold text-purple-800">
                   <BookText className="mr-2 h-4 w-4" /> Your Story
                </h4>
                <p className="whitespace-pre-wrap text-sm text-purple-900">{story}</p>
            </div>
        )}

        {status.loading && (
             <div className="flex min-h-[150px] items-center justify-center rounded-md border bg-muted/50 p-4">
                <Bot className="mr-3 h-5 w-5 animate-spin" />
                <p className="text-muted-foreground">Writing your story...</p>
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
         <Button onClick={handleWriteStory} disabled={status.loading || !apiKey || !topic}>
          {status.loading ? 'Writing...' : 'Write Story'}
        </Button>
        {status.error && (
            <div className="flex w-full items-center text-sm text-destructive">
                <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" />
                <p>{status.error}</p>
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
