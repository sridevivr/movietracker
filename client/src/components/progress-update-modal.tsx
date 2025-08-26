import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProgressUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (progress: string) => void;
  currentProgress?: string;
  movie: {
    title: string;
    type: 'movie' | 'tv';
    totalSeasons?: number;
    totalEpisodes?: number;
  };
  isLoading?: boolean;
}

export default function ProgressUpdateModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentProgress = "", 
  movie,
  isLoading = false
}: ProgressUpdateModalProps) {
  const [progressType, setProgressType] = useState<'episode' | 'notes'>('episode');
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("1");
  const [notes, setNotes] = useState("");

  // Parse current progress on open
  React.useEffect(() => {
    if (isOpen && currentProgress) {
      // Try to parse existing progress format like "S2 E5" or "Season 2, Episode 5"
      const episodeMatch = currentProgress.match(/S(\d+)\s*E(\d+)/i) || 
                           currentProgress.match(/Season\s*(\d+).*Episode\s*(\d+)/i);
      
      if (episodeMatch && movie.type === 'tv') {
        setSeason(episodeMatch[1]);
        setEpisode(episodeMatch[2]);
        setProgressType('episode');
      } else {
        setNotes(currentProgress);
        setProgressType('notes');
      }
    } else {
      // Reset to defaults
      setSeason("1");
      setEpisode("1");
      setNotes("");
      setProgressType(movie.type === 'tv' ? 'episode' : 'notes');
    }
  }, [isOpen, currentProgress, movie.type]);

  const handleSave = () => {
    let progress = "";
    
    if (movie.type === 'tv' && progressType === 'episode') {
      progress = `S${season} E${episode}`;
    } else {
      progress = notes.trim();
    }
    
    onSave(progress);
  };

  const generateSeasonOptions = () => {
    const seasons = movie.totalSeasons || 10; // Default to 10 seasons if unknown
    return Array.from({ length: seasons }, (_, i) => i + 1);
  };

  const generateEpisodeOptions = () => {
    // Estimate episodes per season (common range is 6-24, use 24 as max)
    const episodesPerSeason = movie.totalEpisodes && movie.totalSeasons 
      ? Math.ceil(movie.totalEpisodes / movie.totalSeasons)
      : 24;
    return Array.from({ length: episodesPerSeason }, (_, i) => i + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>
            Update your viewing progress for "{movie.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {movie.type === 'tv' && (
            <div className="space-y-2">
              <Label>Progress Type</Label>
              <Select value={progressType} onValueChange={(value: 'episode' | 'notes') => setProgressType(value)}>
                <SelectTrigger data-testid="select-progress-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="episode">Current Episode</SelectItem>
                  <SelectItem value="notes">Progress Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {movie.type === 'tv' && progressType === 'episode' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger data-testid="select-season">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateSeasonOptions().map(s => (
                      <SelectItem key={s} value={s.toString()}>Season {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="episode">Episode</Label>
                <Select value={episode} onValueChange={setEpisode}>
                  <SelectTrigger data-testid="select-episode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateEpisodeOptions().map(e => (
                      <SelectItem key={e} value={e.toString()}>Episode {e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="notes">
                {movie.type === 'movie' ? 'Progress Notes' : 'Notes'}
              </Label>
              <Textarea
                id="notes"
                placeholder={movie.type === 'movie' 
                  ? "e.g., Halfway through, paused at action scene, 75% complete..."
                  : "e.g., Just finished Season 2, on episode 3 of Season 3..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="textarea-progress-notes"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-progress"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            data-testid="button-save-progress"
          >
            {isLoading ? "Saving..." : "Save Progress"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}