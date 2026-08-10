import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import type { RefObject } from "react";
import {
  Check,
  ChevronDown,
  Expand,
  Minimize2,
  Pause,
  Play,
} from "lucide-react";

import { Button } from "@trail/review/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@trail/review/ui/dropdown-menu";
import { formatElapsedTime } from "@trail/review/lib/time";
import { cn } from "@trail/review/lib/utils";

const SPEEDS = [0.5, 1, 2, 4];
const SEEK_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

interface ReplayHeaderControlsProps {
  duration: number;
  speed: number;
  isFullscreen: boolean;
  portalContainer: RefObject<HTMLElement | null>;
  onSpeedChange: (speed: number) => void;
  onToggleFullscreen: () => void;
}

export function ReplayHeaderControls({
  duration,
  speed,
  isFullscreen,
  portalContainer,
  onSpeedChange,
  onToggleFullscreen,
}: ReplayHeaderControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        {formatElapsedTime(duration)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-9 min-w-16 rounded-sm px-3"
              aria-label="Replay speed"
            >
              {speed}x
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </Button>
          }
        />
        <DropdownMenuContent
          className="min-w-28 rounded-sm"
          portalContainer={portalContainer}
        >
          {SPEEDS.map((option) => (
            <DropdownMenuItem key={option} onClick={() => onSpeedChange(option)}>
              <Check
                className={cn("size-4", speed !== option && "opacity-0")}
                aria-hidden="true"
              />
              {option}x
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon-lg"
        className="rounded-sm text-muted-foreground hover:text-foreground"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 aria-hidden="true" />
        ) : (
          <Expand aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

interface ReplayTransportControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSeekStart: () => void;
  onSeek: (time: number) => void;
  onSeekEnd: () => void;
}

export function ReplayTransportControls({
  currentTime,
  duration,
  isPlaying,
  onTogglePlayback,
  onSeekStart,
  onSeek,
  onSeekEnd,
}: ReplayTransportControlsProps) {
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const handlePointerDown = (_event: PointerEvent<HTMLInputElement>) =>
    onSeekStart();
  const handlePointerUp = (_event: PointerEvent<HTMLInputElement>) => onSeekEnd();
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (SEEK_KEYS.has(event.key)) onSeekStart();
  };
  const handleKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if (SEEK_KEYS.has(event.key)) onSeekEnd();
  };

  return (
    <div className="flex items-center gap-3 border-t border-border bg-card px-3 py-3 sm:gap-4 sm:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-sm text-foreground"
        onClick={onTogglePlayback}
        aria-label={isPlaying ? "Pause replay" : "Play replay"}
      >
        {isPlaying ? (
          <Pause className="size-4 fill-current" aria-hidden="true" />
        ) : (
          <Play className="size-4 fill-current" aria-hidden="true" />
        )}
      </Button>
      <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {formatElapsedTime(currentTime)}
      </span>
      <input
        type="range"
        className="replay-scrubber min-w-0 flex-1"
        min={0}
        max={Math.max(1, duration)}
        step={100}
        value={currentTime}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        style={{ "--replay-progress": `${progress}%` } as CSSProperties}
        aria-label="Replay position"
        aria-valuetext={`${formatElapsedTime(currentTime)} of ${formatElapsedTime(duration)}`}
      />
      <span className="w-11 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {formatElapsedTime(duration)}
      </span>
    </div>
  );
}
