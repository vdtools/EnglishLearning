
'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Clapperboard,
  Bot,
  Dumbbell,
  Bookmark,
  Settings,
  Shield,
  Home,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: "Beginner's Journey", icon: GraduationCap, href: '/journey' },
  { name: 'Grammar Fundamentals', icon: Bookmark, href: '/grammar-fundamentals' },
  { name: 'Grammar Deep Dive', icon: BookOpen, href: '/grammar' },
  { name: 'Video Library', icon: Clapperboard, href: '/videos' },
  { name: 'AI Practice Zone', icon: Bot, href: '/practice' },
  { name: 'Grammar Gym', icon: Dumbbell, href: '/gym' },
  { name: 'Settings', icon: Settings, href: '/settings' },
  { name: 'Admin Panel', icon: Shield, href: '/admin' },
];

interface SidebarProps {
  onClose?: () => void; // Optional close handler for mobile
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The AuthProvider will handle the redirect automatically.
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="flex h-full w-64 flex-col justify-between border-r bg-secondary p-4">
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <Home className="mr-3 h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold text-primary">LinguaLeap</h2>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
              <X className="h-6 w-6" />
            </Button>
          )}
        </div>
        <nav className="flex flex-col space-y-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-secondary-foreground/80 hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
      {user && (
        <div className="flex flex-col items-start space-y-4 border-t pt-4">
          <span className="truncate text-sm text-muted-foreground" title={user.email!}>
            {user.email}
          </span>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
}
