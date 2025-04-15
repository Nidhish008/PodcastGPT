
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { setApiKey, hasApiKey, getApiKey } from "@/services/geminiService";
import { Loader2 } from "lucide-react";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

export const ApiKeyModal = ({ open, onClose }: ApiKeyModalProps) => {
  const [apiKey, setApiKeyState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyExists, setKeyExists] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      const exists = await hasApiKey();
      setKeyExists(exists);
      
      if (exists) {
        const key = await getApiKey();
        setApiKeyState(key);
      }
      
      setLoading(false);
    };
    
    checkApiKey();
  }, [open]);

  const handleSubmit = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }

    setIsSubmitting(true);
    try {
      setApiKey(apiKey);
      toast.success("API key saved successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to save API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-podcast-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Gemini API Key</span>
          </DialogTitle>
          <DialogDescription>
            {keyExists 
              ? "A Gemini API key has been loaded from the database."
              : "You'll need an API key from Google AI Studio to use the Gemini 2.0 Flash model. Your key is stored locally in your browser."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!keyExists && (
            <p className="text-sm text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-podcast-accent hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          )}
          <div className="space-y-2">
            <Input
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              type="password"
              className="bg-secondary/50"
              disabled={keyExists}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Close
            </Button>
            {!keyExists && (
              <Button 
                onClick={handleSubmit} 
                disabled={!apiKey.trim() || isSubmitting}
                className="bg-podcast-primary hover:bg-podcast-secondary"
              >
                Save API Key
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
