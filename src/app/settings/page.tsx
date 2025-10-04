
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth-context';
import { saveApiKeys, getApiKeys } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const { user } = useAuth();
  
  const [keys, setKeys] = useState({
    geminiQuiz: '',
    geminiSentences: '',
    geminiGym: '',
    openrouterWriting: '',
    openrouterCreative: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchKeys() {
      if (user?.uid) {
        const fetchedKeys = await getApiKeys(user.uid);
        if (fetchedKeys) {
          setKeys({
            geminiQuiz: fetchedKeys.geminiQuiz || '',
            geminiSentences: fetchedKeys.geminiSentences || '',
            geminiGym: fetchedKeys.geminiGym || '',
            openrouterWriting: fetchedKeys.openrouterWriting || '',
            openrouterCreative: fetchedKeys.openrouterCreative || '',
          });
        }
      }
    }
    fetchKeys();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setKeys((prevKeys) => ({ ...prevKeys, [id]: value }));
  };

  const handleSaveKeys = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to save keys.');
      return;
    }
    setLoading(true);
    const result = await saveApiKeys(user.uid, keys);
    if (result.success) {
      toast.success('API keys saved successfully!');
    } else {
      toast.error(result.message || 'An unexpected error occurred while saving keys.');
    }
    setLoading(false);
  };


  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage your application settings, API keys, and appearance.
        </p>
      </header>

      <main className="grid gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <KeyRound className="h-6 w-6" />
              <div>
                <CardTitle>Manage API Keys</CardTitle>
                <CardDescription>
                  Enter your API keys for the AI-powered features. Your keys are stored securely.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
              <Label htmlFor="geminiQuiz">Gemini API Key (Quizzes)</Label>
              <Input
                id="geminiQuiz"
                type="password"
                placeholder="Enter Gemini API key"
                className="md:col-span-2"
                value={keys.geminiQuiz}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
             <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
              <Label htmlFor="geminiGym">Gemini API Key (Grammar Gym)</Label>
              <Input
                id="geminiGym"
                type="password"
                placeholder="Enter Gemini API key"
                className="md:col-span-2"
                value={keys.geminiGym}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
              <Label htmlFor="geminiSentences">
                Gemini API Key (Sentences)
              </Label>
              <Input
                id="geminiSentences"
                type="password"
                placeholder="Enter Gemini API key"
                className="md:col-span-2"
                value={keys.geminiSentences}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
              <Label htmlFor="openrouterWriting">
                OpenRouter API Key (Writing)
              </Label>
              <Input
                id="openrouterWriting"
                type="password"
                placeholder="Enter OpenRouter API key"
                className="md:col-span-2"
                value={keys.openrouterWriting}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
              <Label htmlFor="openrouterCreative">
                OpenRouter API Key (Creative)
              </Label>
              <Input
                id="openrouterCreative"
                type="password"
                placeholder="Enter OpenRouter API key"
                className="md:col-span-2"
                value={keys.openrouterCreative}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6">
            <Button onClick={handleSaveKeys} disabled={loading}>
                {loading ? 'Saving...' : 'Save Keys'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
             <div className="flex items-center gap-4">
                <Palette className="h-6 w-6" />
                <div>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                        Customize the look and feel of the application.
                    </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Button variant="outline" onClick={() => setTheme('light')}>
                Light
              </Button>
              <Button variant="outline" onClick={() => setTheme('dark')}>
                Dark
              </Button>
              <Button variant="outline" onClick={() => setTheme('system')}>
                System
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
