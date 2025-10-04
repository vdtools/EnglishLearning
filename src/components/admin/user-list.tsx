'use client';

import { useEffect, useState } from 'react';
import { getAllUsersWithProgress } from '@/app/admin/actions';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UserWithProgress {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  points: number;
  level: number;
  dailyStreak: number;
}

export default function UserList() {
  const [users, setUsers] = useState<UserWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const fetchedUsers = await getAllUsersWithProgress();
        setUsers(fetchedUsers);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Could not load user data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View user progress and data.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p>Loading user data...</p>}
        {error && <p className="text-destructive">{error}</p>}
        {!loading && (
          <Table>
            <TableCaption>A list of all registered users and their progress.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Level</TableHead>
                <TableHead className="text-right">Daily Streak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.email || 'N/A'}</TableCell>
                  <TableCell className="text-right">{user.points}</TableCell>
                  <TableCell className="text-right">{user.level}</TableCell>
                  <TableCell className="text-right">{user.dailyStreak}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
