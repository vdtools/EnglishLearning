
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiKeys, generateAiResponse, getAiPrompts } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles, Bot, AlertTriangle, RefreshCw, Loader2, BookOpen } from 'lucide-react';

interface VocabularyWord {
    word: string;
    pronunciation: string;
    hindiMeaning: string;
}

const VOCAB_CACHE_KEY = 'ai_vocabulary_words';
const VOCAB_FETCH_COUNT = 20;

export default function AIVocabularyBuilder() {
  const { user } = useAuth();
  const [word, setWord] = useState<VocabularyWord | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [prompts, setPrompts] = useState<any>(null);
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    async function fetchData() {
      if (user?.uid) {
        try {
          const [keys, fetchedPrompts] = await Promise.all([
            getApiKeys(user.uid),
            getAiPrompts()
          ]);
          
          if (keys?.geminiQuiz) {
            setApiKey(keys.geminiQuiz);
          } else {
            setStatus({ loading: false, error: 'Gemini API Key (Quizzes) is not set in Settings.' });
          }

          if (fetchedPrompts) {
            setPrompts(fetchedPrompts);
          } else {
             setStatus({ loading: false, error: 'Could not load AI prompts.' });
          }
        } catch (e) {
          setStatus({ loading: false, error: 'Failed to fetch API keys or prompts.' });
        }
      }
    }
    fetchData();
  }, [user]);

  const handleGetNextWord = async () => {
    setStatus({ loading: false, error: '' });

    if (!apiKey || !prompts) {
      setStatus({ loading: false, error: 'API Key or prompts are not ready.' });
      return;
    }

    const cachedData = localStorage.getItem(VOCAB_CACHE_KEY);
    let cachedWords: VocabularyWord[] = [];

    if (cachedData) {
      try {
        cachedWords = JSON.parse(cachedData);
        if (!Array.isArray(cachedWords)) {
            cachedWords = [];
        }
      } catch (e) {
        console.error('Failed to parse cached words:', e);
        cachedWords = [];
      }
    }

    if (cachedWords.length > 0) {
      const nextWord = cachedWords.shift()!;
      setWord(nextWord);
      localStorage.setItem(VOCAB_CACHE_KEY, JSON.stringify(cachedWords));
    } else {
      setStatus({ loading: true, error: '' });
      setWord(null);
      
      try {
        if (!prompts.aiVocabulary) {
          throw new Error("Vocabulary prompt not loaded yet. Please wait a moment and try again.");
        }
        const prompt = prompts.aiVocabulary.replace('{count}', VOCAB_FETCH_COUNT.toString());

        const result = await generateAiResponse({
            provider: 'gemini',
            apiKey: apiKey,
            prompt: prompt,
            model: 'gemini-flash-lite-latest',
        });

        if (result.success && result.response) {
            const cleanedResponse = result.response.replace(/```json|```/g, '').trim();
            const newWords: VocabularyWord[] = JSON.parse(cleanedResponse);
            
            if(Array.isArray(newWords) && newWords.length > 0) {
                const firstWord = newWords.shift()!;
                setWord(firstWord);
                localStorage.setItem(VOCAB_CACHE_KEY, JSON.stringify(newWords));
            } else {
                throw new Error("AI did not return a valid array of words.");
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
        <CardTitle>AI Vocabulary Builder</CardTitle>
        <CardDescription>
          Learn a new word with its pronunciation and meaning in Hindi.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[150px] flex items-center justify-center">
        {word && !status.loading ? (
          <div className="w-full text-center space-y-2">
            <h3 className="text-3xl font-bold">{word.word}</h3>
            <p className="text-muted-foreground text-lg">({word.pronunciation})</p>
            <p className="text-primary font-semibold text-xl">{word.hindiMeaning}</p>
          </div>
        ) : status.loading ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Fetching new words...</p>
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-8 text-center w-full">
                <BookOpen className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click the button to learn a new word.</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <Button onClick={handleGetNextWord} disabled={status.loading || !apiKey}>
          {status.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
             <RefreshCw className="mr-2 h-4 w-4" />
             Get New Word
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
