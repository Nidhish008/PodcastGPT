import { useState, useRef, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { TypingIndicator } from "@/components/TypingIndicator";
import { PodcastThemeSelector } from "@/components/PodcastThemeSelector";
import { v4 as uuidv4 } from "uuid";
import { Message, hasApiKey, generateStreamingResponse } from "@/services/geminiService";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Mic } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserMenu } from "@/components/UserMenu";
import { Navigate } from "react-router-dom";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { 
  createConversation, 
  getConversationMessages, 
  saveMessage,
  updateConversationTitle,
  getUserInterests
} from "@/services/conversationService";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [refreshSidebarTrigger, setRefreshSidebarTrigger] = useState(0);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const { user, loading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      const hasKey = await hasApiKey();
      if (!hasKey) {
        setApiKeyModalOpen(true);
      }
    };

    if (user) {
      checkApiKey();
      initConversation();
      loadUserInterests();
    }
  }, [user]);
  
  const loadUserInterests = async () => {
    if (user) {
      const interests = await getUserInterests();
      setUserInterests(interests);
      console.log("Loaded user interests:", interests);
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-podcast-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }

  const initConversation = async () => {
    if (!conversationId) {
      setMessages([]);
      setRefreshSidebarTrigger(prev => prev + 1);
    }
  };

  const loadConversation = async (id: string) => {
    if (isProcessing) return;
    
    setConversationId(id);
    const conversationMessages = await getConversationMessages(id);
    setMessages(conversationMessages);
    scrollToBottom();
  };

  const handleConversationDeleted = () => {
    setConversationId(null);
    setMessages([]);
    initConversation();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateConversationTitleWithFirstMessage = async (id: string, content: string) => {
    const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
    await updateConversationTitle(id, title);
    setRefreshSidebarTrigger(prev => prev + 1);
  };

  const handleSubmit = async (content: string) => {
    if (isProcessing) return;
    
    const hasKey = await hasApiKey();
    if (!hasKey) {
      setApiKeyModalOpen(true);
      return;
    }

    try {
      if (!conversationId) {
        const newConversationId = await createConversation();
        if (!newConversationId) {
          toast.error("Failed to create conversation");
          return;
        }
        setConversationId(newConversationId);
      }
      
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      if (conversationId) {
        await saveMessage(conversationId, userMessage);
        
        if (messages.length === 0) {
          await updateConversationTitleWithFirstMessage(conversationId, content);
        }
      }
      
      setIsProcessing(true);
      setIsTyping(true);
      
      const responseId = uuidv4();
      setCurrentResponseId(responseId);
      
      const aiMessage: Message = {
        id: responseId,
        role: "assistant",
        content: "",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      let fullResponse = "";
      await generateStreamingResponse(content, (chunk) => {
        fullResponse += chunk;
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === responseId 
              ? { ...msg, content: fullResponse } 
              : msg
          )
        );
      });
      
      const finalAiMessage: Message = {
        ...aiMessage,
        content: fullResponse
      };
      
      if (conversationId) {
        await saveMessage(conversationId, finalAiMessage);
      }
      
      setCurrentResponseId(null);
      
      loadUserInterests();
      
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to generate response. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const handleNewChat = async () => {
    if (isProcessing) return;
    
    if (messages.length === 0) {
      setConversationId(null);
      setMessages([]);
      return;
    }
    
    setConversationId(null);
    setMessages([]);
    setRefreshSidebarTrigger(prev => prev + 1);
    toast.success("Started a new chat");
  };

  const handleThemeSelect = (theme: string) => {
    handleSubmit(`I want to research about ${theme} podcasts. Please provide key information, trends, popular formats, and audience demographics.`);
  };

  const renderUserInterests = () => {
    if (userInterests.length === 0) return null;
    
    return (
      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Based on your past conversations, you're interested in:</h3>
        <div className="flex flex-wrap gap-2">
          {userInterests.map((interest, index) => (
            <Button 
              key={index} 
              variant="outline" 
              size="sm"
              className="text-xs bg-background hover:bg-muted"
              onClick={() => handleSubmit(`Tell me more about ${interest} podcasts`)}
            >
              {interest}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block h-full">
        <ConversationSidebar 
          currentConversationId={conversationId}
          onSelectConversation={loadConversation}
          onNewChat={handleNewChat}
          onConversationDeleted={handleConversationDeleted}
          refreshTrigger={refreshSidebarTrigger}
        />
      </div>
      
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-podcast-primary" />
              <h1 className="text-xl md:text-2xl font-bold gradient-text">PodcastGPT</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-muted-foreground md:hidden"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground hidden md:flex"
                onClick={handleNewChat}
                disabled={isProcessing}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
              <UserMenu />
            </div>
          </div>
        </header>
        
        {isMobileSidebarOpen && (
          <div className="md:hidden absolute inset-y-0 left-0 z-50 w-64 bg-background border-r border-border/40">
            <div className="flex justify-end p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                ✕
              </Button>
            </div>
            <ConversationSidebar 
              currentConversationId={conversationId}
              onSelectConversation={(id) => {
                loadConversation(id);
                setIsMobileSidebarOpen(false);
              }}
              onNewChat={() => {
                handleNewChat();
                setIsMobileSidebarOpen(false);
              }}
              onConversationDeleted={handleConversationDeleted}
              refreshTrigger={refreshSidebarTrigger}
            />
          </div>
        )}
        
        {messages.length === 0 && (
          <div className="p-4">
            {userInterests.length > 0 && renderUserInterests()}
            <PodcastThemeSelector onThemeSelect={handleThemeSelect} />
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isTyping && currentResponseId === null && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border/40">
              <div className="max-w-4xl mx-auto">
                <ChatInput 
                  onSubmit={handleSubmit} 
                  isProcessing={isProcessing} 
                  placeholder="Ask about podcast research or scriptwriting..." 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ApiKeyModal 
        open={apiKeyModalOpen} 
        onClose={() => setApiKeyModalOpen(false)}
      />
    </div>
  );
};

export default Index;
