import * as React from 'react';
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const HomeScreen = React.lazy(() => import('../features/rooms/HomeScreen'));
const RoomScreen = React.lazy(() => import('../features/rooms/RoomScreen'));

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-6 p-8 text-center bg-background text-foreground">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">Page not found</p>
      </div>
      <Link to="/">
        <Button variant="default" size="md">
          Go home
        </Button>
      </Link>
    </div>
  );
}

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-background">
      <div
        className="h-10 w-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }}
      />
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <React.Suspense fallback={<SuspenseFallback />}>{element}</React.Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(<HomeScreen />),
  },
  {
    path: '/room/:roomId',
    element: withSuspense(<RoomScreen />),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
