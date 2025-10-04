export default function Home() {
  // The AuthProvider will automatically redirect the user to either the login page
  // or the dashboard, so this page will not be visible for long.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
    </div>
  );
}
