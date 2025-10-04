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

export default function GrammarToolAssistant() {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [explanation, setExplanation] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    async function fetchKey() {
      if (user?.uid) {
        try {
          const keys = await getApiKeys(user.uid);
          if (keys?.openrouterCreative) {
            setApiKey(keys.openrouterCreative);
          } else {
            setStatus({ loading: false, error: 'OpenRouter API key for Creative is not set in Settings.' });
            return;
          }
        } catch (e) {
            setStatus({ loading: false, error: 'Failed to fetch API keys.' });
        }
      }
    }
    fetchKey();
  }, [user]);

  const handleGetExplanation = async () => {
    if (!question.trim()) {
        setStatus({ loading: false, error: "Please enter a grammar question."});
        return;
    }
     if (!apiKey) {
        setStatus({ loading: false, error: 'API Key not found. Please set it in Settings.' });
        return;
    }

    setStatus({ loading: true, error: '' });
    setExplanation('');

    try {
        const prompt = `You are a friendly and helpful English grammar expert. Provide a clear, simple, and accurate explanation for the user's question with examples. User's question: "${question}"`;

        const result = await generateAiResponse({
            provider: 'openrouter',
            apiKey: apiKey,
            prompt: prompt,
            model: 'deepseek/deepseek-chat-v3.1:free',
        });

        if (result.success && result.response) {
            setExplanation(result.response);
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
        <CardTitle>Grammar Tool Assistant</CardTitle>
        <CardDescription>
          Ask the AI to explain a complex grammar rule with simple examples.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Textarea
          placeholder="e.g., 'What is the difference between affect and effect?'"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={status.loading || !apiKey}
          rows={3}
        />
        
        {explanation && !status.loading && (
             <div className="rounded-md border border-blue-200 bg-blue-50/50 p-4">
                <h4 className="mb-2 flex items-center text-sm font-semibold text-blue-800">
                   <Sparkles className="mr-2 h-4 w-4" /> AI Explanation
                </h4>
                <p className="whitespace-pre-wrap text-blue-900">{explanation}</p>
            </div>
        )}

        {status.loading && (
             <div className="flex items-center justify-center rounded-md border bg-muted/50 p-4">
                <Bot className="mr-3 h-5 w-5 animate-spin" />
                <p className="text-muted-foreground">Thinking...</p>
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
         <Button onClick={handleGetExplanation} disabled={status.loading || !apiKey || !question}>
          {status.loading ? 'Getting Answer...' : 'Get Answer'}
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
