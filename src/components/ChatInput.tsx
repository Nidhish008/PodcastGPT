
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isProcessing: boolean;
  placeholder?: string;
}

export const ChatInput = ({
  onSubmit,
  isProcessing,
  placeholder = "Ask me anything about podcast research or scriptwriting..."
}: ChatInputProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative border rounded-lg focus-within:ring-1 focus-within:ring-podcast-primary">
        <Textarea
          className="min-h-24 resize-none border-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground text-foreground"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
        />
        <div className="absolute right-4 bottom-4">
          <Button 
            size="icon" 
            type="submit" 
            disabled={isProcessing || !input.trim()}
            className="bg-podcast-primary hover:bg-podcast-secondary"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
