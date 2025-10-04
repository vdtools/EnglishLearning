'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { getUserStats } from '@/app/admin/actions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Gem,
  BarChart,
  Flame,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Bookmark,
  Clapperboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserStats {
  points: number;
  level: number;
  dailyStreak: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({ points: 0, level: 1, dailyStreak: 0 });
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchUserStats() {
      if (user?.uid) {
        setLoading(true);
        try {
          const userStats = await getUserStats(user.uid);
          setStats(userStats);
        } catch (error) {
          console.error("Failed to fetch user stats:", error);
          // Keep default stats on error
        } finally {
          setLoading(false);
        }
      }
    }

    fetchUserStats();
  }, [user]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome back, {user?.displayName || 'Learner'}!
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Ready to continue your language adventure?
        </p>
      </header>

      <main>
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Gem className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.points}</div>
              <p className="text-xs text-muted-foreground">
                Keep learning to earn more!
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Level</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.level}</div>
              <p className="text-xs text-muted-foreground">
                Level up every 100 points
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.dailyStreak}</div>
              <p className="text-xs text-muted-foreground">
                Complete a lesson every day
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Learning Path Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Beginner's Journey</CardTitle>
              <CardDescription>
                Start from scratch and build a strong foundation. The perfect
                place for new learners.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/journey">
                  Start Learning <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Bookmark className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Grammar Fundamentals</CardTitle>
              <CardDescription>
                Strengthen your core grammar skills with these fundamental lessons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/grammar-fundamentals">
                  Explore Fundamentals <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Grammar Deep Dive</CardTitle>
              <CardDescription>
                Master the tricky rules of grammar with focused lessons and
                quizzes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/grammar">
                  Explore Grammar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clapperboard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Video Library</CardTitle>
              <CardDescription>
                 Watch videos to supplement your learning and earn extra points.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/videos">
                  Watch Videos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
