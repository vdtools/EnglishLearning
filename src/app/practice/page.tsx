
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import SentenceImprover from '@/components/ai/sentence-improver';
import DailyPracticeGenerator from '@/components/ai/daily-practice-generator';
import GrammarToolAssistant from '@/components/ai/grammar-tool-assistant';
import AIStoryGenerator from '@/components/ai/ai-story-generator';
import AIVocabularyBuilder from '@/components/ai/ai-vocabulary-builder';

export default function AIPracticePage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">AI Practice Zone</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Hone your language skills with AI-powered tools and creative challenges.
        </p>
      </header>

      <Tabs defaultValue="writing">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="writing">Writing Assistant</TabsTrigger>
          <TabsTrigger value="creative">Creative Corner</TabsTrigger>
        </TabsList>

        {/* Writing Assistant Tab */}
        <TabsContent value="writing" className="mt-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <DailyPracticeGenerator />
            <AIVocabularyBuilder />
          </div>
        </TabsContent>

        {/* Creative Corner Tab */}
        <TabsContent value="creative" className="mt-6">
           <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <GrammarToolAssistant />
            <SentenceImprover />
            <AIStoryGenerator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
