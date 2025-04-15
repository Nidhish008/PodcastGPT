
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export const TypingIndicator = ({ className }: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-center space-x-2 p-4 rounded-lg bg-secondary/50", className)}>
      <div className="flex items-center space-x-1">
        <span className="text-sm text-muted-foreground">PodcastGPT is thinking</span>
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};
