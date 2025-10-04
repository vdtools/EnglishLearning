
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getVideos, getUserStats, markVideoAsComplete } from '@/app/admin/actions';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, PlayCircle, Youtube, X } from 'lucide-react';
import { toast } from 'sonner';

interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
}

interface UserStats {
    completedVideos: string[];
}

export default function VideoLibraryPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ completedVideos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (user?.uid) {
        setLoading(true);
        try {
          const [fetchedVideos, fetchedStats] = await Promise.all([
            getVideos(),
            getUserStats(user.uid)
          ]);
          setVideos(fetchedVideos as Video[]);
          setUserStats(fetchedStats as UserStats);
          setError(null);
        } catch (err) {
          console.error('Failed to load video library data:', err);
          setError('Could not load videos. Please try again later.');
        } finally {
          setLoading(false);
        }
      }
    }

    loadData();
  }, [user]);
  
  const handleMarkComplete = async (videoId: string) => {
    if (!user?.uid) return;

    const result = await markVideoAsComplete(user.uid, videoId);

    if (result.success) {
      toast.success(result.message);
      // Refresh user stats to update the UI
      const fetchedStats = await getUserStats(user.uid);
      setUserStats(fetchedStats as UserStats);
    } else {
      toast.error(result.message);
    }
  };

  function getYouTubeVideoId(url: string) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1);
        }
        if (urlObj.hostname.includes('youtube.com')) {
            const videoId = urlObj.searchParams.get('v');
            if(videoId) return videoId;
        }
        return null;
    } catch(e) {
        return null;
    }
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Video Library</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Watch videos to supplement your learning and earn extra points.
        </p>
      </div>

      {loading ? (
        <div className="text-center">
          <p>Loading videos...</p>
        </div>
      ) : error ? (
        <p className="text-center text-destructive">{error}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            const isCompleted = userStats.completedVideos.includes(video.id);
            const videoId = getYouTubeVideoId(video.youtubeUrl);
            const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/480x360.png?text=Video';

            return (
                <Card key={video.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
                    <div className="relative">
                        <button onClick={() => videoId && setPlayingVideoId(videoId)} className="w-full">
                            <img src={thumbnailUrl} alt={video.title} className="aspect-video w-full object-cover" />
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                                <Youtube className="h-16 w-16 text-white" />
                            </div>
                        </button>
                    </div>
                    <CardHeader>
                        <CardTitle className="text-lg">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                         <CardDescription className="line-clamp-2">Watch this video to learn more about this topic and earn points.</CardDescription>
                    </CardContent>
                    <CardFooter>
                         <Button 
                            className={`w-full ${isCompleted ? 'bg-slate-100 text-black hover:bg-slate-200' : ''}`}
                            disabled={isCompleted}
                            onClick={() => handleMarkComplete(video.id)}
                            variant={isCompleted ? undefined : 'default'}
                         >
                            {isCompleted ? (
                                <>
                                 <CheckCircle className="mr-2 h-4 w-4" />
                                 Completed
                                </>
                            ) : (
                                <>
                                 <PlayCircle className="mr-2 h-4 w-4" />
                                 Mark as Complete (+20 Points)
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )
          })}
        </div>
      )}

      {playingVideoId && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => setPlayingVideoId(null)}
        >
            <div 
                className="relative w-full max-w-3xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the video
            >
                <div className="relative aspect-video overflow-hidden rounded-lg shadow-2xl">
                    <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute -top-2 -right-14 rounded-full text-white/70 h-10 w-10 transition-all hover:text-white hover:bg-white/20"
                    onClick={() => setPlayingVideoId(null)}
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
