
import React from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface PodcastThemeSelectorProps {
  onThemeSelect: (theme: string) => void;
}

export const PodcastThemeSelector = ({ onThemeSelect }: PodcastThemeSelectorProps) => {
  const [selectedTheme, setSelectedTheme] = React.useState<string>("");
  
  const podcastThemes = [
    "True Crime",
    "Comedy",
    "News & Politics",
    "Business & Entrepreneurship",
    "Science & Technology",
    "Health & Wellness",
    "Arts & Entertainment",
    "Sports",
    "Education",
    "History",
    "Fiction & Storytelling"
  ];

  const handleResearch = () => {
    if (selectedTheme) {
      onThemeSelect(selectedTheme);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:flex-grow">
          <label className="block text-sm font-medium mb-2">
            Select a podcast theme to research
          </label>
          <Select 
            value={selectedTheme} 
            onValueChange={setSelectedTheme}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a podcast theme" />
            </SelectTrigger>
            <SelectContent>
              {podcastThemes.map((theme) => (
                <SelectItem key={theme} value={theme}>
                  {theme}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleResearch} 
          disabled={!selectedTheme}
          className="bg-podcast-primary hover:bg-podcast-secondary"
        >
          <Search className="mr-2 h-4 w-4" />
          Research Theme
        </Button>
      </div>
    </Card>
  );
};
