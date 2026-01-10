'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function SessionTimeoutModal({ open, onRefresh, onLogout, isRefreshing }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <DialogTitle>Session Expired</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your session has timed out. You can try to refresh your session to continue, or logout and login again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={onLogout}
            disabled={isRefreshing}
          >
            Logout
          </Button>
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

