
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiKeys, generateAiResponse, getAiPrompts } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Bot, CheckCircle2, XCircle, Loader2, RefreshCw, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';


interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
}

const grammarTopics = [
  'Present Tense',
  'Past Tense',
  'Nouns',
  'Pronouns',
  'Adjectives',
  'Adverbs',
  'Prepositions',
];

const CACHE_REFETCH_THRESHOLD = 5;
const CACHE_FETCH_COUNT = 20;

function GrammarQuiz() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(grammarTopics[0]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [status, setStatus] = useState({ loading: false, error: '' });
  const [prompts, setPrompts] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (user?.uid) {
        try {
          const [keys, fetchedPrompts] = await Promise.all([
            getApiKeys(user.uid),
            getAiPrompts()
          ]);

          if (keys?.geminiGym) {
            setApiKey(keys.geminiGym);
          } else {
            setStatus({ loading: false, error: 'Gemini API key for Grammar Gym is not set in Settings.' });
          }
          if(fetchedPrompts) {
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

  const fetchAndCacheQuestions = async (topic: string) => {
    if (!apiKey || !prompts) {
      setStatus({ loading: false, error: 'Cannot fetch questions: API Key or prompts are missing.' });
      return;
    }
    console.log(`Fetching ${CACHE_FETCH_COUNT} new questions for topic: ${topic}`);

    const prompt = prompts.grammarGym
        .replace('{count}', CACHE_FETCH_COUNT.toString())
        .replace('{topic}', topic);

    try {
      const result = await generateAiResponse({
        provider: 'gemini',
        apiKey,
        prompt,
        model: 'gemini-flash-lite-latest',
      });

      if (result.success && result.response) {
        const cleanedResponse = result.response.replace(/```json|```/g, '').trim();
        const newQuestions = JSON.parse(cleanedResponse);
        const cacheKey = `quizCache_${topic}`;
        localStorage.setItem(cacheKey, JSON.stringify(newQuestions));
        console.log(`Successfully cached ${newQuestions.length} new questions.`);
        return newQuestions;
      } else {
        console.error('Failed to fetch new questions from AI:', result.error);
      }
    } catch (e) {
      console.error('Error fetching or parsing new questions:', e);
    }
    return [];
  };

  const getQuizQuestion = async (topic: string) => {
    setStatus({ loading: true, error: '' });
    setAnswerStatus('unanswered');
    setSelectedAnswer(null);

    const cacheKey = `quizCache_${topic}`;
    let cachedQuestions: QuizQuestion[] = [];
    const cachedItem = localStorage.getItem(cacheKey);

    if (cachedItem) {
      try {
        cachedQuestions = JSON.parse(cachedItem);
      } catch (e) {
        console.error('Failed to parse cached questions:', e);
        localStorage.removeItem(cacheKey);
      }
    }

    if (cachedQuestions.length <= CACHE_REFETCH_THRESHOLD) {
      fetchAndCacheQuestions(topic);
    }

    if (cachedQuestions.length > 0) {
      const nextQuestion = cachedQuestions.shift()!;
      setCurrentQuestion(nextQuestion);
      localStorage.setItem(cacheKey, JSON.stringify(cachedQuestions));
    } else {
      const newQuestions = await fetchAndCacheQuestions(topic);
      if (newQuestions.length > 0) {
        const nextQuestion = newQuestions.shift()!;
        setCurrentQuestion(nextQuestion);
        localStorage.setItem(cacheKey, JSON.stringify(newQuestions));
      } else {
        setStatus({ loading: false, error: 'Failed to generate a new quiz. Please try again.' });
        setCurrentQuestion(null);
      }
    }
    setStatus(prev => ({ ...prev, loading: false }));
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setAnswerStatus('correct');
    } else {
      setAnswerStatus('incorrect');
    }
  };

  const handleGenerateClick = () => {
    getQuizQuestion(selectedTopic);
  };

  const getOptionLabelClass = (option: string) => {
    if (answerStatus === 'unanswered' || !currentQuestion) return '';
    if (option === currentQuestion.correctAnswer) return 'text-green-600 font-bold';
    if (option === selectedAnswer && option !== currentQuestion.correctAnswer) return 'text-destructive font-bold';
    return '';
  };

  return (
     <Card className="mx-auto max-w-2xl">
        <CardHeader>
            <CardTitle>Practice Quiz</CardTitle>
            <CardDescription>
              Select a grammar topic and get a new question instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="topic-select">Grammar Topic</Label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger id="topic-select">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {grammarTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateClick} disabled={status.loading || !apiKey}>
              {status.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : 'Generate New Question'}
            </Button>
            {status.error && (
              <div className="flex w-full items-center text-sm text-destructive">
                <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" />
                <p>{status.error}</p>
              </div>
            )}
          </CardContent>

          {currentQuestion && (
            <>
              <CardContent>
                <h3 className="mb-4 font-semibold">{currentQuestion.questionText}</h3>
                <RadioGroup
                  value={selectedAnswer || ''}
                  onValueChange={setSelectedAnswer}
                  disabled={answerStatus !== 'unanswered'}
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 rounded-md border p-4 transition-colors has-[:checked]:bg-accent">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className={`flex-1 cursor-pointer ${getOptionLabelClass(option)}`}>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                 {answerStatus === 'correct' && (
                    <div className="mt-4 flex items-center rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
                        <CheckCircle2 className="mr-3 h-5 w-5" />
                        <p className="font-semibold">Correct! Well done.</p>
                    </div>
                )}
                {answerStatus === 'incorrect' && currentQuestion && (
                    <div className="mt-4 flex items-center rounded-md border border-red-200 bg-red-50 p-4 text-destructive">
                        <XCircle className="mr-3 h-5 w-5" />
                        <p className="font-semibold">Not quite. The correct answer is: {currentQuestion.correctAnswer}</p>
                    </div>
                )}
              </CardContent>
              <CardFooter>
                 {answerStatus === 'unanswered' ? (
                    <Button onClick={handleCheckAnswer} disabled={!selectedAnswer}>Check Answer</Button>
                ) : (
                    <Button onClick={handleGenerateClick} disabled={status.loading || !apiKey}>Next Question</Button>
                )}
              </CardFooter>
            </>
          )}

          {!currentQuestion && !status.loading && !status.error && (
             <CardContent>
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-8 text-center">
                    <Bot className="mb-4 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Your quiz will appear here</h3>
                    <p className="text-sm text-muted-foreground">Select a topic and click "Generate New Question" to start.</p>
                </div>
            </CardContent>
          )}
    </Card>
  );
}

const PRONUNCIATION_CACHE_KEY = 'pronunciationCache';
const PRONUNCIATION_REFETCH_THRESHOLD = 2;
const PRONUNCIATION_FETCH_COUNT = 10;

type Feedback = {
  level: 'good' | 'average' | 'poor';
  message: string;
};


function PronunciationPractice() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [currentSentence, setCurrentSentence] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });
  const [prompts, setPrompts] = useState<any>(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Function to initialize speech recognition
  const setupSpeechRecognition = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        if (recognitionRef.current) return; // Already initialized

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            const spokenText = event.results[0][0].transcript;
            setTranscript(spokenText);
            checkPronunciation(spokenText);
            setIsRecording(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                setFeedback({ level: 'poor', message: "I didn't hear anything. Please try again." });
            } else if (event.error === 'not-allowed') {
                 setStatus(prev => ({...prev, error: 'Microphone permission was denied. Please enable it in your browser settings.'}));
                 setHasPermission(false);
            } else {
                setStatus(prev => ({...prev, error: 'An error occurred during speech recognition.'}));
            }
            setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
            if(isRecording) { // If it ends unexpectedly, ensure UI updates
                setIsRecording(false);
            }
        };
    } else {
        setStatus({ loading: false, error: 'Speech recognition is not supported in this browser.' });
    }
  };


  useEffect(() => {
    async function fetchData() {
      if (user?.uid) {
        try {
          const [keys, fetchedPrompts] = await Promise.all([
            getApiKeys(user.uid),
            getAiPrompts()
          ]);
          
          if (keys?.geminiSentences) {
            setApiKey(keys.geminiSentences);
          } else {
            setStatus({ loading: false, error: 'Gemini API key for Sentences is not set in Settings.' });
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

  const fetchAndCacheSentences = async () => {
    if (!apiKey || !prompts) {
        setStatus({ loading: false, error: 'API Key or prompts are not available.' });
        return [];
    }
    console.log(`Fetching ${PRONUNCIATION_FETCH_COUNT} new sentences.`);
    
    const prompt = prompts.pronunciationLab.replace('{count}', PRONUNCIATION_FETCH_COUNT.toString());
    
    try {
      const result = await generateAiResponse({
        provider: 'gemini',
        apiKey,
        prompt,
        model: 'gemini-flash-lite-latest',
      });
      
      if (result.success && result.response) {
        const cleanedResponse = result.response.replace(/```json|```/g, '').trim();
        const newSentences = JSON.parse(cleanedResponse);
        localStorage.setItem(PRONUNCIATION_CACHE_KEY, JSON.stringify(newSentences));
        console.log(`Successfully cached ${newSentences.length} new sentences.`);
        return newSentences;
      } else {
        console.error('Failed to fetch new sentences from AI:', result.error);
        setStatus({ loading: false, error: result.error || 'Failed to generate sentences.' });
      }
    } catch (e) {
      console.error('Error fetching or parsing new sentences:', e);
      setStatus({ loading: false, error: 'An error occurred while generating sentences.' });
    }
    return [];
  };

  const getNextSentence = async () => {
    setStatus({ loading: true, error: '' });
    setCurrentSentence('');
    setTranscript('');
    setFeedback(null);
    
    let cachedSentences: string[] = [];
    const cachedItem = localStorage.getItem(PRONUNCIATION_CACHE_KEY);

    if (cachedItem) {
      try {
        cachedSentences = JSON.parse(cachedItem);
      } catch (e) {
        console.error('Failed to parse cached sentences:', e);
        localStorage.removeItem(PRONUNCIATION_CACHE_KEY);
      }
    }
    
    if (cachedSentences.length <= PRONUNCIATION_REFETCH_THRESHOLD) {
      fetchAndCacheSentences();
    }

    if (cachedSentences.length > 0) {
      const nextSentence = cachedSentences.shift()!;
      setCurrentSentence(nextSentence);
      localStorage.setItem(PRONUNCIATION_CACHE_KEY, JSON.stringify(cachedSentences));
    } else {
      const newSentences = await fetchAndCacheSentences();
      if (newSentences.length > 0) {
        const nextSentence = newSentences.shift()!;
        setCurrentSentence(nextSentence);
        localStorage.setItem(PRONUNCIATION_CACHE_KEY, JSON.stringify(newSentences));
      } else {
        setStatus({ loading: false, error: 'Failed to generate a new sentence. Please try again.' });
      }
    }
    setStatus(prev => ({ ...prev, loading: false }));
  };

  const toggleRecording = async () => {
    setupSpeechRecognition(); // Ensure it's initialized
    if (!recognitionRef.current) return;

    if (isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
        return;
    }
    
    // Request permission only if not already granted
    if (!hasPermission) {
        try {
            // This will prompt the user for permission
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
            // After permission is granted, start recording
            setTranscript('');
            setFeedback(null);
            recognitionRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone permission denied:", err);
            setStatus({ loading: false, error: 'Microphone permission denied. Please enable it in your browser settings.' });
            setHasPermission(false);
            return;
        }
    } else {
        // If permission is already granted
        setTranscript('');
        setFeedback(null);
        recognitionRef.current.start();
        setIsRecording(true);
    }
  };
  
  const checkPronunciation = (spokenText: string) => {
    const original = currentSentence.toLowerCase().replace(/[^\w\s]/g, '');
    const spoken = spokenText.toLowerCase().replace(/[^\w\s]/g, '');

    if (original === spoken) {
        setFeedback({ level: 'good', message: "Excellent! That's a perfect match." });
    } else {
        const originalWords = original.split(' ');
        const spokenWords = spoken.split(' ');
        const correctWords = originalWords.filter(word => spokenWords.includes(word)).length;
        const accuracy = correctWords / originalWords.length;

        if (accuracy > 0.7) {
            setFeedback({ level: 'average', message: "Almost there! Good attempt." });
        } else {
            setFeedback({ level: 'poor', message: "Let's try that again. Focus on each word." });
        }
    }
  };


  const getFeedbackCardClass = (level: Feedback['level']) => {
    switch (level) {
      case 'good':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'average':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'poor':
        return 'border-red-200 bg-red-50 text-red-800';
    }
  };


  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Pronunciation Practice</CardTitle>
        <CardDescription>
          Generate a sentence, record yourself, and get instant feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[250px] flex flex-col items-center justify-center gap-4">
        {status.loading ? (
          <div className="flex items-center justify-center rounded-md bg-muted/50 p-4 w-full">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            <p className="text-muted-foreground">Generating sentence...</p>
          </div>
        ) : currentSentence ? (
          <>
            <div className="text-center rounded-md border p-4 text-lg font-medium w-full">
                <p>"{currentSentence}"</p>
            </div>
            
            <Button 
                onClick={toggleRecording} 
                className={cn("w-full max-w-xs", isRecording && 'bg-red-600 hover:bg-red-700')}
            >
                {isRecording ? (
                    <>
                        <MicOff className="mr-2 h-4 w-4" />
                        Stop Recording
                    </>
                ) : (
                    <>
                        <Mic className="mr-2 h-4 w-4" />
                        Start Recording
                    </>
                )}
            </Button>
            {isRecording && <p className="text-sm text-muted-foreground animate-pulse">Listening...</p>}
            
            {feedback && (
                 <div className={cn("rounded-md border p-4 w-full", getFeedbackCardClass(feedback.level))}>
                    <p className="font-semibold">{feedback.message}</p>
                    {transcript && <p className="text-sm mt-1">You said: "{transcript}"</p>}
                </div>
            )}

          </>
        ) : !status.error && (
          <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-8 text-center w-full">
            <Bot className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">Your sentence will appear here</h3>
            <p className="text-sm text-muted-foreground">Click the button to get a new sentence for practice.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <Button onClick={getNextSentence} disabled={status.loading || !apiKey}>
          {status.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Sentence
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


export default function GrammarGymPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Grammar Gym</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Sharpen your skills with quizzes and pronunciation practice.
        </p>
      </header>

      <main>
        <Tabs defaultValue="quiz">
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
              <TabsTrigger value="quiz">Grammar Quiz</TabsTrigger>
              <TabsTrigger value="pronunciation">Pronunciation</TabsTrigger>
            </TabsList>
            <TabsContent value="quiz" className="mt-6">
                <GrammarQuiz />
            </TabsContent>
            <TabsContent value="pronunciation" className="mt-6">
                <PronunciationPractice />
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
