
import { useState, useEffect } from 'react';
import { getUserConversations, Conversation, deleteConversation } from '@/services/conversationService';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { toast } from "sonner";

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onConversationDeleted?: () => void;
  refreshTrigger?: number; // Added to trigger refresh when a new conversation is created
}

export const ConversationSidebar = ({ 
  currentConversationId, 
  onSelectConversation, 
  onNewChat,
  onConversationDeleted,
  refreshTrigger = 0 // Default to 0
}: ConversationSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const conversationList = await getUserConversations();
      console.log("Loaded conversations:", conversationList.length);
      setConversations(conversationList);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  // Load conversations when component mounts or refreshTrigger changes
  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]); // Refresh when triggerRefresh changes

  const handleDeleteConversation = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const success = await deleteConversation(id);
      if (success) {
        toast.success("Conversation deleted");
        setConversations(prev => prev.filter(conv => conv.id !== id));
        
        // If the deleted conversation is the current one, notify parent
        if (id === currentConversationId && onConversationDeleted) {
          onConversationDeleted();
        }
      } else {
        toast.error("Failed to delete conversation");
      }
    } catch (error) {
      toast.error("An error occurred while deleting");
      console.error("Error deleting conversation:", error);
    }
  };

  return (
    <div className="w-64 border-r border-border/40 bg-background/95 h-full flex flex-col">
      <div className="p-4">
        <Button 
          variant="outline" 
          className="w-full justify-start bg-muted/50 hover:bg-muted"
          onClick={onNewChat}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-podcast-primary"></div>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => (
              <div 
                key={conversation.id}
                className="group relative"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal px-3 py-2 h-auto",
                    currentConversationId === conversation.id && "bg-muted"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start truncate pr-6">
                    <span className="truncate">{conversation.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(conversation.updated_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 transition-opacity"
                  onClick={(event) => handleDeleteConversation(conversation.id, event)}
                  title="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-muted-foreground p-4">
              No conversations yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
