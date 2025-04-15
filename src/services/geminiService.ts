import { toast } from "sonner";
import { getDefaultApiKey } from "./conversationService";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  role: 'user' | 'assistant';  // Explicitly define allowable role values
  content: string;
  timestamp: Date;
}

let GEMINI_API_KEY: string = '';

// In a real app, this would be stored in Supabase
let conversationHistory: Message[] = [];

export const setApiKey = (key: string) => {
  GEMINI_API_KEY = key;
  localStorage.setItem('gemini_api_key', key);
};

export const getApiKey = async (): Promise<string> => {
  if (!GEMINI_API_KEY) {
    // Try to get API key from database first
    const dbKey = await getDefaultApiKey();
    if (dbKey) {
      GEMINI_API_KEY = dbKey;
      return GEMINI_API_KEY;
    }
    
    // Fall back to localStorage if not in database
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      GEMINI_API_KEY = storedKey;
    }
  }
  return GEMINI_API_KEY;
};

export const hasApiKey = async (): Promise<boolean> => {
  const key = await getApiKey();
  return !!key;
};

export const addMessageToHistory = (message: Message): void => {
  conversationHistory.push(message);
  // In a real app with Supabase, this would be saved to the database
  localStorage.setItem('conversation_history', JSON.stringify(conversationHistory));
};

export const loadConversationHistory = (): Message[] => {
  if (conversationHistory.length === 0) {
    const storedHistory = localStorage.getItem('conversation_history');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        conversationHistory = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (error) {
        console.error("Failed to parse conversation history:", error);
      }
    }
  }
  return conversationHistory;
};

export const clearConversationHistory = (): void => {
  conversationHistory = [];
  localStorage.removeItem('conversation_history');
};

// Function to get user's past interactions and preferences across all conversations
export const getUserLongTermMemory = async (): Promise<string> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";
    
    // Fetch recent messages across all conversations (limited to most relevant)
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select(`
        content, 
        role,
        conversations!inner(title)
      `)
      .eq("role", "user")
      .order("timestamp", { ascending: false })
      .limit(50);
    
    if (messagesError) {
      console.error("Error fetching long-term memory:", messagesError);
      return "";
    }
    
    // Process the data to extract important information
    if (!messagesData || messagesData.length === 0) return "";
    
    // Create a summary of past interests and topics
    const userQueries = messagesData
      .filter((msg: any) => msg.role === 'user')
      .map((msg: any) => msg.content);
    
    // Extract key topics using a simple frequency analysis
    const topics = extractKeyTopics(userQueries);
    
    // Format the long-term memory summary
    return `Based on past conversations, the user has shown interest in these podcast topics: ${topics.join(', ')}. They have asked about ${userQueries.length} different podcast-related questions in the past.`;
  } catch (error) {
    console.error("Error processing long-term memory:", error);
    return "";
  }
};

// Simple topic extraction function (in a real app, you'd use more sophisticated NLP)
const extractKeyTopics = (queries: string[]): string[] => {
  const allText = queries.join(' ').toLowerCase();
  
  // List of common podcast categories to check against
  const podcastCategories = [
    "true crime", "comedy", "business", "news", "politics", 
    "health", "science", "technology", "education", "sports",
    "music", "arts", "fiction", "history", "interview"
  ];
  
  // Find which categories appear in the user's queries
  return podcastCategories.filter(category => 
    allText.includes(category)
  );
};

export const generateStreamingResponse = async (
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    toast.error("Please set your Gemini API key first");
    throw new Error("API key not set");
  }

  console.log("Using API key:", apiKey.substring(0, 5) + "...");
  
  // Load history for context
  const history = loadConversationHistory();
  const recentMessages = history.slice(-10); // Use last 10 messages for context

  try {
    // Get the user's long-term memory summary
    const longTermMemory = await getUserLongTermMemory();
    
    // Prepare system message with long-term memory included
    const systemMessage = `You are PodcastGPT, an intelligent AI assistant specialized in podcast research and script writing.
Your expertise includes organizing ideas, structuring podcast episodes, providing researched facts, and helping craft engaging narratives.
Your responses should be clear, well-structured, and ready to use in a podcast script.
When researching topics, provide multiple perspectives and cite reliable sources where possible.

${longTermMemory ? `LONG-TERM MEMORY CONTEXT: ${longTermMemory}` : ''}`;

    // Format the historical context for the API request
    let conversationContext = "";
    if (recentMessages.length > 0) {
      conversationContext = recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join("\n\n");
    }

    const fullPrompt = conversationContext 
      ? `${systemMessage}\n\nConversation history:\n${conversationContext}\n\nUser's new message: ${prompt}`
      : `${systemMessage}\n\nUser: ${prompt}`;

    console.log("Sending request to Gemini API...");
    
    const requestBody = {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    console.log("Request body:", JSON.stringify(requestBody).substring(0, 200) + "...");
    
    // Send the request to the Gemini 2.0 Flash API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Response status:", response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = `API error: ${JSON.stringify(errorData)}`;
        console.error("API error details:", errorData);
      } catch (e) {
        console.error("Could not parse error response:", e);
      }
      toast.error("Failed to get response from Gemini API");
      throw new Error(errorMessage);
    }

    if (!response.body) {
      toast.error("Response body is empty");
      throw new Error("Response body is empty");
    }

    console.log("Starting to process stream...");
    
    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    let fullJsonStr = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Decode the chunk and add it to our buffer
      const chunk = decoder.decode(value, { stream: !done });
      fullJsonStr += chunk;
      
      try {
        // Attempt to find complete JSON objects in the stream
        // The Gemini 2.0 Flash API sends each chunk as a separate JSON object
        // Each chunk is separated by a newline or comma+newline
        const jsonObjects = fullJsonStr.split(/,?\n/).filter(line => line.trim());
        
        for (let i = 0; i < jsonObjects.length; i++) {
          const jsonStr = jsonObjects[i].trim();
          if (!jsonStr) continue;
          
          try {
            // Try to parse each potential JSON object
            const jsonObject = JSON.parse(jsonStr);
            
            // Extract text from the parsed object if it exists
            if (jsonObject.candidates && 
                jsonObject.candidates[0] && 
                jsonObject.candidates[0].content && 
                jsonObject.candidates[0].content.parts && 
                jsonObject.candidates[0].content.parts[0].text) {
              
              const textChunk = jsonObject.candidates[0].content.parts[0].text;
              responseText += textChunk;
              onChunk(textChunk);
              
              // If this was successful, remove this part from our buffer
              const processedLength = jsonStr.length + (i < jsonObjects.length - 1 ? 1 : 0); // +1 for the newline
              fullJsonStr = fullJsonStr.substring(fullJsonStr.indexOf(jsonStr) + processedLength);
            }
          } catch (parseError) {
            // This particular string isn't a complete JSON object yet
            // We'll keep it in the buffer and try again with the next chunk
            console.log("Incomplete JSON:", jsonStr.substring(0, 50) + "...");
          }
        }
      } catch (error) {
        console.error("Error processing JSON:", error);
        // Continue processing - we'll try again with the next chunk
      }
    }

    // After all chunks have been processed, make a final attempt to extract any text from partial responses
    if (!responseText) {
      console.warn("No complete JSON responses were extracted. Attempting to extract text directly...");
      
      // Look for any text content in our buffer
      const textMatches = fullJsonStr.match(/"text"\s*:\s*"([^"]+)"/g);
      if (textMatches) {
        for (const match of textMatches) {
          const text = match.replace(/"text"\s*:\s*"/, '').replace(/"$/, '');
          responseText += text;
          onChunk(text);
        }
      }
    }

    console.log("Stream processing completed. Total text length:", responseText.length);
    
    if (responseText.length === 0) {
      console.warn("No text was extracted from the response");
      toast.error("Received empty response from API");
      
      // Provide a fallback response so the user isn't left with nothing
      const fallbackResponse = "I'm sorry, but I couldn't generate a proper response. Please try again or check your API key.";
      onChunk(fallbackResponse);
    }
  } catch (error) {
    console.error("Error with Gemini API:", error);
    toast.error("Failed to get response: " + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
};
