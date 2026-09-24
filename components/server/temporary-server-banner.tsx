"use client";

import React from "react";
import { AlertTriangle, Clock, RefreshCw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerTemporary } from "@/hooks/use-server-temporary";

interface TemporaryServerBannerProps {
  serverId: string;
  channelId?: string;
}

export function TemporaryServerBanner({ serverId, channelId }: TemporaryServerBannerProps) {
  const {
    isTemporary,
    isExpired,
    timeUntilExpiry,
    timeUntilDeletion,
    expiryAction,
    extendLifespan
  } = useServerTemporary(serverId, channelId);

  if (!isTemporary) return null;

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${mins % 60}m`;
    }
    if (hours > 0) {
      return `${hours}h ${mins % 60}m ${secs}s`;
    }
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  if (isExpired) {
    return (
      <div className="w-full bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 text-white px-4 py-2.5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2 z-30 shrink-0 border-b border-rose-400/30 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 text-xs md:text-sm font-bold truncate">
          <AlertTriangle className="w-5 h-5 animate-pulse text-amber-200 shrink-0" />
          <span>
            {expiryAction === "delete" ? (
              <>
                ⚠️ SERVER EXPIRED! Auto-deleting in{" "}
                <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-amber-200 text-sm font-black">
                  {formatSeconds(timeUntilDeletion)}
                </span>
                . All messaging & features are disabled.
              </>
            ) : (
              <>
                🔒 SERVER EXPIRED! Server is locked in Read-Only mode. Messaging is disabled.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => extendLifespan(1)}
            className="bg-white text-rose-700 hover:bg-amber-100 font-extrabold text-xs shadow-md h-8 px-3"
          >
            <Timer className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Extend Server Lifespan (+1 Day)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => extendLifespan(1 / 24)}
            className="border-white/40 text-white hover:bg-white/20 font-bold text-xs h-8 px-2.5"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            +1 Hour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 px-4 py-1.5 flex items-center justify-between gap-2 text-xs font-medium shrink-0">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>
          Temporary Server Active — Expires in{" "}
          <span className="font-mono font-bold">{formatSeconds(timeUntilExpiry)}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => extendLifespan(1)}
        className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0"
      >
        <Timer className="w-3 h-3" /> Extend +1 Day
      </button>
    </div>
  );
}
