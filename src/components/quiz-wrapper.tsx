
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { updateUserProgress } from '@/app/admin/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizWrapperProps {
  quiz: QuizQuestion[];
  path: string;
  chapterId: string;
  onQuizComplete: () => void;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';

export default function QuizWrapper({ quiz, path, chapterId, onQuizComplete }: QuizWrapperProps) {
  const [questionSet, setQuestionSet] = useState<QuizQuestion[]>(quiz);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [incorrectlyAnswered, setIncorrectlyAnswered] = useState<QuizQuestion[]>([]);
  
  const { user } = useAuth();
  const router = useRouter();
  
  const currentQuestion = questionSet[currentQuestionIndex];
  
  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;

    if (selectedAnswer === currentQuestion.correctAnswer) {
      setAnswerStatus('correct');
    } else {
      setAnswerStatus('incorrect');
      if (!incorrectlyAnswered.find(q => q.question === currentQuestion.question)) {
        setIncorrectlyAnswered(prev => [...prev, currentQuestion]);
      }
    }
  };

  const handleNextAction = () => {
    const isLastQuestion = currentQuestionIndex === questionSet.length - 1;

    if (isLastQuestion) {
      if (incorrectlyAnswered.length > 0) {
        toast.info(`You got ${incorrectlyAnswered.length} question(s) wrong. Let's try them again!`);
        setQuestionSet(incorrectlyAnswered);
        setIncorrectlyAnswered([]);
        setCurrentQuestionIndex(0);
        setAnswerStatus('unanswered');
        setSelectedAnswer(null);
      } else {
        handleFinishQuiz();
      }
    } else {
      setAnswerStatus('unanswered');
      setSelectedAnswer(null);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleFinishQuiz = async () => {
    if (user) {
        try {
            await updateUserProgress(user.uid, path, chapterId);
            toast.success("Quiz Complete!", {
              description: `You've mastered this chapter. Your progress has been saved!`,
            });
            onQuizComplete(); // Notify parent component
            router.refresh(); 
        } catch (error) {
            console.error("FATAL: Client-side error calling updateUserProgress:", error);
            toast.error("There was an error saving your progress. Please try again.");
        }
    } else {
      toast.error("You must be logged in to save your progress.");
    }
  };
  
  const getOptionLabelClass = (option: string) => {
    if (answerStatus === 'unanswered' || !currentQuestion) return '';
    if (option === currentQuestion.correctAnswer) return 'text-green-600 font-bold';
    if (option === selectedAnswer && option !== currentQuestion.correctAnswer) return 'text-destructive font-bold';
    return '';
  }
  
  if (!currentQuestion) {
    return null; // Should not happen if quiz array is not empty
  }

  return (
    <div className="mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Mastery Quiz</CardTitle>
            <CardDescription>
              Question {currentQuestionIndex + 1} of {questionSet.length}
            </CardDescription>
        </CardHeader>
        <CardContent>
        <p className="mb-6 text-lg font-semibold">{currentQuestion.question}</p>
        <RadioGroup
            value={selectedAnswer || ''}
            onValueChange={setSelectedAnswer}
            disabled={answerStatus !== 'unanswered'}
        >
            {currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, index) => (
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
        <CardFooter className="justify-end">
            {answerStatus === 'unanswered' ? (
                <Button onClick={handleCheckAnswer} disabled={!selectedAnswer}>
                    Check
                </Button>
            ) : (
                <Button onClick={handleNextAction}>
                    {currentQuestionIndex === questionSet.length - 1 && incorrectlyAnswered.length === 0 ? 'Finish Quiz' : 'Next Question'}
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
