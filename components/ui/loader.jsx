'use client';

import { PackageSearch, Loader2 } from 'lucide-react';

/**
 * Branded loader used across admin screens.
 * Combines stacked boxes + scanner beam to reinforce inventory/POS concept.
 */
export default function Loader({
  message = 'Syncing your inventory workspace...',
  size = 'lg',
}) {
  const wrapperSize = size === 'sm' ? 'w-32 h-32' : 'w-48 h-48';
  const boxSize = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className={`relative ${wrapperSize}`}>
        {/* Stacked boxes */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${boxSize} border-2 border-primary rounded-md bg-primary/10 animate-bounce`}
          style={{ animationDelay: '100ms' }}
        />
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-[70%] ${boxSize} border-2 border-primary rounded-md bg-primary/5 animate-bounce`}
          style={{ animationDelay: '200ms' }}
        />
        <div
          className={`absolute bottom-8 left-1/2 translate-x-[10%] ${boxSize} border-2 border-primary rounded-md bg-primary/5 animate-bounce`}
          style={{ animationDelay: '300ms' }}
        />

        {/* Scanner arc */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-full h-full rounded-full border border-dashed border-primary/40 animate-spin"
            style={{ animationDuration: '6s' }}
          />
        </div>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center text-primary">
          <PackageSearch className="h-10 w-10 animate-pulse" />
        </div>

        {/* Moving beam */}
        <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" />
      </div>

      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

