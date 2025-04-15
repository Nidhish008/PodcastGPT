
import { Message } from "@/services/geminiService";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { MessageSquare, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isAi = message.role === "assistant";
  
  // Process the content to ensure proper formatting
  const processedContent = message.content
    .replace(/\\n/g, '\n') // Replace literal '\n' strings with actual newlines
    .trim();
  
  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        isAi ? "bg-secondary/50" : "bg-muted/50"
      )}
    >
      <Avatar className={cn("h-8 w-8", isAi ? "bg-podcast-primary" : "bg-secondary")}>
        {isAi ? (
          <MessageSquare className="h-4 w-4 text-white" />
        ) : (
          <User className="h-4 w-4 text-white" />
        )}
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="text-sm font-medium">
          {isAi ? "PodcastGPT" : "You"}
        </div>
        <div className="prose prose-invert max-w-none text-sm">
          <ReactMarkdown className="whitespace-pre-wrap">
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
