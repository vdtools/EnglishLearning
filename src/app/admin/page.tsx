
'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PlusCircle, ShieldCheck, LogOut } from 'lucide-react';
import ChapterEditor from '@/components/admin/chapter-editor';
import ChapterList from '@/components/admin/chapter-list';
import NestedChapterManager from '@/components/admin/nested-chapter-manager';
import VideoManager from '@/components/admin/video-manager';
import UserList from '@/components/admin/user-list';
import PromptEditor from '@/components/admin/prompt-editor';

const ADMIN_PIN = '123456'; // Hardcoded PIN for now

// A more complete type for the chapter data
interface Chapter {
    id: string;
    title: string;
    description: string;
    content: string;
    quiz: Array<{
        question: string;
        options: string[];
        correctAnswer: string;
    }>;
}

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [selectedPath, setSelectedPath] = useState('beginnerJourney');
  const [listKey, setListKey] = useState(Date.now());
  const [showEditor, setShowEditor] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  
  useEffect(() => {
    const isAdmin = Cookies.get('admin_verified');
    if (isAdmin === 'true') {
        setIsVerified(true);
    }
  }, []);


  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      Cookies.set('admin_verified', 'true', { expires: 1 }); // Set cookie for 1 day
      setIsVerified(true);
      setError('');
    } else {
      setError('Invalid PIN. Please try again.');
    }
  };

  const handleAdminLogout = () => {
    Cookies.remove('admin_verified');
    setIsVerified(false);
    setPin(''); // Clear the pin input field
  };

  const handlePathChange = (newPath: string) => {
    setSelectedPath(newPath);
    setShowEditor(false); // Hide editor when path changes
    setEditingChapter(null);
    setListKey(Date.now()); // Update the key to force re-render
  };
  
  const handleChapterSaved = () => {
    setListKey(Date.now());
    setShowEditor(false); 
    setEditingChapter(null); // Clear editing state
  }

  const handleCreateNewChapter = () => {
    setEditingChapter(null);
    setShowEditor(true);
  }

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setShowEditor(true);
  }

  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingChapter(null);
  }


  if (!isVerified) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <form onSubmit={handlePinSubmit}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Admin Access</CardTitle>
              <CardDescription>
                Please enter the 6-digit PIN to proceed.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pin" className="sr-only">
                  PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 6-digit PIN"
                  className="text-center tracking-widest"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardContent>
              <Button type="submit" className="w-full">
                Verify
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  const isNestedPath = selectedPath === 'grammarsDeepDive';

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
            Manage your application content.
            </p>
        </div>
        <Button variant="outline" onClick={handleAdminLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Admin Logout
        </Button>
      </div>
      <Tabs defaultValue="syllabus">
        <TabsList className="grid w-full grid-cols-4 md:w-[600px]">
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
        </TabsList>
        <TabsContent value="syllabus" className="mt-4 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Syllabus Path</CardTitle>
              <CardDescription>
                Select the learning path you want to manage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedPath} onValueChange={handlePathChange}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select a path" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginnerJourney">
                    Beginner's Journey
                  </SelectItem>
                  <SelectItem value="vocabulary">
                    Grammar Fundamentals
                  </SelectItem>
                  <SelectItem value="grammarsDeepDive">
                    Grammar Deep Dive
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {isNestedPath ? (
            <NestedChapterManager key={listKey} path={selectedPath} />
          ) : (
            <>
              <ChapterList 
                key={listKey} 
                path={selectedPath}
                onEditChapter={handleEditChapter}
              />

              {showEditor ? (
                <ChapterEditor
                  path={selectedPath}
                  chapterToEdit={editingChapter}
                  onChapterSaved={handleChapterSaved}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <div className="text-center">
                  <Button onClick={handleCreateNewChapter}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Chapter
                  </Button>
                </div>
              )}
            </>
          )}

        </TabsContent>
        <TabsContent value="videos" className="mt-4">
          <VideoManager />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserList />
        </TabsContent>
        <TabsContent value="prompts" className="mt-4">
            <PromptEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
