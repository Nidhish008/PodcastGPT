
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { Message } from "@/services/geminiService";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Create a new conversation
export const createConversation = async (title = "New Conversation"): Promise<string | null> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to create a conversation");
      return null;
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({ 
        title, 
        user_id: user.id  // Add the user_id from the authenticated user
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
    
    console.log("Created conversation with ID:", data.id);
    return data.id;
  } catch (error: any) {
    console.error("Error creating conversation:", error);
    toast.error("Failed to create conversation");
    return null;
  }
};

// Get all conversations for the current user
export const getUserConversations = async (): Promise<Conversation[]> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to view conversations");
      return [];
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
    
    console.log("Retrieved conversations count:", data?.length || 0);
    return data || [];
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    toast.error("Failed to load conversations");
    return [];
  }
};

// Get a single conversation by ID
export const getConversation = async (id: string): Promise<Conversation | null> => {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error("Error fetching conversation:", error);
    toast.error("Failed to load conversation");
    return null;
  }
};

// Update conversation title
export const updateConversationTitle = async (id: string, title: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    console.log("Updated conversation title:", id, title);
    return true;
  } catch (error: any) {
    console.error("Error updating conversation:", error);
    toast.error("Failed to update conversation");
    return false;
  }
};

// Delete a conversation
export const deleteConversation = async (id: string): Promise<boolean> => {
  try {
    // First, delete all messages associated with this conversation
    const { error: messagesError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", id);

    if (messagesError) throw messagesError;

    // Then delete the conversation itself
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) throw error;
    console.log("Deleted conversation:", id);
    return true;
  } catch (error: any) {
    console.error("Error deleting conversation:", error);
    toast.error("Failed to delete conversation");
    return false;
  }
};

// Save a message to a conversation
export const saveMessage = async (conversationId: string, message: Message): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString()
      });

    if (error) throw error;
    
    // Update the conversation's updated_at timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
      
    return true;
  } catch (error: any) {
    console.error("Error saving message:", error);
    return false;
  }
};

// Get all messages for a conversation
export const getConversationMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: true });

    if (error) throw error;
    
    return data.map(msg => ({
      id: msg.id,
      role: msg.role as "user" | "assistant", // Cast the role to the correct type
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    toast.error("Failed to load messages");
    return [];
  }
};

// Get the default Gemini API key
export const getDefaultApiKey = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("default_api_keys")
      .select("api_key")
      .eq("service_name", "gemini")
      .single();

    if (error) throw error;
    return data.api_key;
  } catch (error: any) {
    console.error("Error fetching Gemini API key:", error);
    return null;
  }
};

// Function to get common topics across all user conversations
export const getUserInterests = async (): Promise<string[]> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // Get all user messages
    const { data, error } = await supabase
      .from("messages")
      .select(`
        content, 
        conversation_id,
        conversations!inner(user_id)
      `)
      .eq("role", "user")
      .eq("conversations.user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(100);
    
    if (error) {
      console.error("Error fetching user interests:", error);
      return [];
    }
    
    if (!data || data.length === 0) return [];
    
    // Extract common topics from messages
    const allText = data.map((msg: any) => msg.content).join(' ').toLowerCase();
    
    // List of common podcast topics to check against
    const podcastTopics = [
      "true crime", "comedy", "business", "news", "politics", 
      "health", "science", "technology", "education", "sports",
      "music", "arts", "fiction", "history", "interview"
    ];
    
    // Return topics found in user messages
    return podcastTopics.filter(topic => allText.includes(topic));
  } catch (error) {
    console.error("Error processing user interests:", error);
    return [];
  }
};
