'use client';

import React from 'react';
import { getFeatureFlagsService } from '@agentmesh/shared/services/feature-flags';

interface MaintenanceModeProps {
  children: React.ReactNode;
}

interface MaintenanceModeState {
  isMaintenanceMode: boolean;
  message: string;
  isLoading: boolean;
}

export function MaintenanceMode({ children }: MaintenanceModeProps) {
  const [state, setState] = React.useState<MaintenanceModeState>({
    isMaintenanceMode: false,
    message: '',
    isLoading: true,
  });

  React.useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const featureFlags = getFeatureFlagsService();
        const isMaintenanceMode = await featureFlags.isMaintenanceMode();
        const message = await featureFlags.getMaintenanceMessage();
        
        setState({
          isMaintenanceMode,
          message,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to check maintenance mode:', error);
        setState({
          isMaintenanceMode: false,
          message: '',
          isLoading: false,
        });
      }
    };

    checkMaintenanceMode();

    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceMode, 30000);
    return () => clearInterval(interval);
  }, []);

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (state.isMaintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="mx-auto h-24 w-24 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="h-12 w-12 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            System Maintenance
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            {state.message}
          </p>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              We're working hard to improve your experience. Please check back soon.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Page
            </button>
          </div>
          
          <div className="mt-8 text-xs text-gray-400">
            <p>Status Page: <a href="/status" className="text-blue-600 hover:text-blue-500">View Status</a></p>
            <p>Support: <a href="mailto:support@agentmesh.com" className="text-blue-600 hover:text-blue-500">support@agentmesh.com</a></p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
