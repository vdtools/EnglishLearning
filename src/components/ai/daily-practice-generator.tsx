
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiKeys, generateAiResponse } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles, Bot, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

const TOPIC_CACHE_KEY = 'daily_practice_topics';
const TOPIC_FETCH_COUNT = 20;

export default function DailyPracticeGenerator() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    async function fetchKey() {
      if (user?.uid) {
        try {
          const keys = await getApiKeys(user.uid);
          if (keys?.openrouterWriting) {
            setApiKey(keys.openrouterWriting);
          } else {
            setStatus({ loading: false, error: 'OpenRouter API key for Writing is not set in Settings.' });
          }
        } catch (e) {
            setStatus({ loading: false, error: 'Failed to fetch API keys.' });
        }
      }
    }
    fetchKey();
  }, [user]);

  const handleGetNextTopic = async () => {
    setStatus({ loading: false, error: '' });

    if (!apiKey) {
      setStatus({ loading: false, error: 'API Key not found. Please set it in Settings.' });
      return;
    }

    const cachedData = localStorage.getItem(TOPIC_CACHE_KEY);
    let cachedTopics: string[] = [];

    if (cachedData) {
      try {
        cachedTopics = JSON.parse(cachedData);
        if (!Array.isArray(cachedTopics)) { // Ensure it's an array
            cachedTopics = [];
        }
      } catch (e) {
        console.error('Failed to parse cached topics:', e);
        cachedTopics = [];
      }
    }

    if (cachedTopics.length > 0) {
      const nextTopic = cachedTopics.shift()!;
      setTopic(nextTopic);
      localStorage.setItem(TOPIC_CACHE_KEY, JSON.stringify(cachedTopics));
    } else {
      setStatus({ loading: true, error: '' });
      setTopic('');
      
      try {
        const prompt = `You are a creative writing coach. Generate ${TOPIC_FETCH_COUNT} engaging writing prompts for an English learner. Return the result as a valid JSON array of strings. Do not include any text outside of the JSON array.`;

        const result = await generateAiResponse({
            provider: 'openrouter',
            apiKey: apiKey,
            prompt: prompt,
            model: 'deepseek/deepseek-chat-v3.1:free',
        });

        if (result.success && result.response) {
            const cleanedResponse = result.response.replace(/```json|```/g, '').trim();
            const newTopics = JSON.parse(cleanedResponse);
            
            if(Array.isArray(newTopics) && newTopics.length > 0) {
                const firstTopic = newTopics.shift()!;
                setTopic(firstTopic);
                localStorage.setItem(TOPIC_CACHE_KEY, JSON.stringify(newTopics));
            } else {
                throw new Error("AI did not return a valid array of topics.");
            }
        } else {
            setStatus({ loading: false, error: result.error || 'Failed to get a response from the AI.' });
        }
      } catch (e: any) {
        setStatus({ loading: false, error: `An unexpected error occurred: ${e.message}` });
      } finally {
        setStatus(prev => ({ ...prev, loading: false }));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Practice Generator</CardTitle>
        <CardDescription>
          Get a unique, AI-generated prompt to practice your writing. Fetches new prompts when the local cache is empty.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topic && !status.loading && (
          <div className="rounded-md border border-blue-200 bg-blue-50/50 p-4">
            <h4 className="mb-2 flex items-center text-sm font-semibold text-blue-800">
              <Sparkles className="mr-2 h-4 w-4" /> Writing Prompt
            </h4>
            <p className="text-blue-900">{topic}</p>
          </div>
        )}
        {status.loading && (
          <div className="flex min-h-[76px] items-center justify-center rounded-md border bg-muted/50 p-4">
            <Bot className="mr-3 h-5 w-5 animate-spin" />
            <p className="text-muted-foreground">Fetching new topics...</p>
          </div>
        )}
         {!topic && !status.loading && !status.error && (
             <div className="flex min-h-[76px] flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">Click the button to get your first writing prompt.</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <Button onClick={handleGetNextTopic} disabled={status.loading || !apiKey}>
          {status.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
             <RefreshCw className="mr-2 h-4 w-4" />
             Get Next Topic
            </>
          )}
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
