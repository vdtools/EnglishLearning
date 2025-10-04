
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiKeys, generateAiResponse } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles, Bot, AlertTriangle } from 'lucide-react';

export default function SentenceImprover() {
  const { user } = useAuth();
  const [sentence, setSentence] = useState('');
  const [improvedSentence, setImprovedSentence] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    async function fetchKey() {
      if (user?.uid) {
        setStatus({ loading: true, error: '' });
        try {
          const keys = await getApiKeys(user.uid);
          if (keys?.openrouterWriting) {
            setApiKey(keys.openrouterWriting);
          } else {
            setStatus({ loading: false, error: 'OpenRouter API key for Writing is not set in Settings.' });
            return;
          }
        } catch (e) {
            setStatus({ loading: false, error: 'Failed to fetch API keys.' });
        }
        setStatus({ loading: false, error: '' });
      }
    }
    fetchKey();
  }, [user]);

  const handleImproveSentence = async () => {
    if (!sentence.trim()) {
        setStatus({ loading: false, error: "Please enter a sentence to improve."});
        return;
    }
     if (!apiKey) {
        setStatus({ loading: false, error: 'API Key not found. Please set it in Settings.' });
        return;
    }

    setStatus({ loading: true, error: '' });
    setImprovedSentence('');

    try {
        const prompt = `You are an English language expert. Your task is to correct any grammatical errors and improve the user's sentence to make it sound more natural. Provide a brief explanation of the changes you made.\n\nUser's sentence: "${sentence}"`;

        const result = await generateAiResponse({
            provider: 'openrouter',
            apiKey: apiKey,
            prompt: prompt,
            model: 'deepseek/deepseek-chat-v3.1:free',
        });

        if (result.success && result.response) {
            setImprovedSentence(result.response);
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
        <CardTitle>Sentence Improver</CardTitle>
        <CardDescription>
          Enter a sentence and get AI-powered suggestions to make it better.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Textarea
          placeholder="Type your sentence here..."
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          disabled={status.loading || !apiKey}
          rows={3}
        />
        
        <div className="min-h-[150px]">
          {improvedSentence && !status.loading && (
               <div className="rounded-md border border-green-200 bg-green-50/50 p-4">
                  <h4 className="mb-2 flex items-center text-sm font-semibold text-green-800">
                     <Sparkles className="mr-2 h-4 w-4" /> AI Suggestion
                  </h4>
                  <p className="whitespace-pre-wrap text-green-900">{improvedSentence}</p>
              </div>
          )}

          {!improvedSentence && !status.loading && (
              <div className="flex h-full flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-8 text-center">
                  <Bot className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Your improved sentence will appear here.</p>
              </div>
          )}
        </div>

      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
         <Button onClick={handleImproveSentence} disabled={status.loading || !apiKey || !sentence}>
          {status.loading ? 'Improving...' : 'Improve Sentence'}
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
