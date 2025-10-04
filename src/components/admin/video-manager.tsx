'use client';

import { useState, useEffect, useTransition } from 'react';
import { addVideo, getVideos, deleteVideo } from '@/app/admin/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
}

export default function VideoManager() {
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: '',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();


  const fetchVideos = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    try {
      const fetchedVideos = await getVideos();
      setVideos(fetchedVideos as Video[]);
    } catch (err) {
      setStatus(prev => ({ ...prev, error: 'Failed to load videos.' }));
    } finally {
        setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
        setStatus({ loading: true, error: '', success: '' });
        const result = await addVideo({ title, youtubeUrl });
        if (result.success) {
            setStatus({ loading: false, error: '', success: result.message });
            setTitle('');
            setYoutubeUrl('');
            fetchVideos(); // Refresh the list
        } else {
            setStatus({ loading: false, success: '', error: result.message });
        }
    });
  };

  const handleDeleteVideo = async (videoId: string) => {
    // Confirmation removed for a popup-free experience
    setDeletingId(videoId);
    const result = await deleteVideo(videoId);
    if (result.success) {
      toast.success('Video deleted successfully.');
      setVideos(prevVideos => prevVideos.filter(v => v.id !== videoId));
    } else {
      toast.error('Failed to delete video', { description: result.message });
    }
    setDeletingId(null);
  };
  

  return (
    <div className="space-y-8">
      <Card>
        <form onSubmit={handleAddVideo}>
            <CardHeader>
                <CardTitle>Add New Video</CardTitle>
                <CardDescription>
                    Add a new video lesson to your library.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="video-title">Video Title</Label>
                    <Input
                        id="video-title"
                        placeholder="e.g., Mastering Spanish Subjunctive"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isPending}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="youtube-url">YouTube URL</Label>
                    <Input
                        id="youtube-url"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        disabled={isPending}
                        required
                    />
                </div>
                 {status.error && <p className="text-sm text-destructive">{status.error}</p>}
                {status.success && <p className="text-sm text-green-600">{status.success}</p>}
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Adding...' : 'Add Video'}
                </Button>
            </CardFooter>
        </form>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Video Library</CardTitle>
            <CardDescription>
                List of all videos currently in the library.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {status.loading && <p>Loading videos...</p>}
            {!status.loading && videos.length === 0 && (
                <p className="text-muted-foreground">No videos found. Add one to get started!</p>
            )}
            {!status.loading && videos.length > 0 && (
                <div className="space-y-4">
                    {videos.map((video) => (
                    <div key={video.id} className="flex items-center justify-between rounded-md border p-4">
                        <div>
                            <h4 className="font-semibold">{video.title}</h4>
                            <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground underline hover:text-primary">
                                {video.youtubeUrl}
                            </a>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteVideo(video.id)}
                            disabled={deletingId === video.id}
                        >
                             {deletingId === video.id ? 'Deleting...' : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </>
                             )}
                        </Button>
                    </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
