import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RatingStars from "./rating-stars";

interface EditWatchedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  watchedItem: {
    id: string;
    rating: number | null;
    notes: string | null;
    finishedAt: string;
    movie: {
      title: string;
    };
  } | null;
}

export default function EditWatchedModal({ isOpen, onClose, userId, watchedItem }: EditWatchedModalProps) {
  const [rating, setRating] = useState(watchedItem?.rating || 0);
  const [notes, setNotes] = useState(watchedItem?.notes || "");
  const [finishedDate, setFinishedDate] = useState(
    watchedItem?.finishedAt ? new Date(watchedItem.finishedAt).toISOString().split('T')[0] : ""
  );
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateWatchedMutation = useMutation({
    mutationFn: async () => {
      if (!watchedItem) throw new Error('No item selected');
      
      await apiRequest("PATCH", `/api/watched/${watchedItem.id}`, {
        rating: rating || null,
        notes: notes || null,
        finishedAt: new Date(finishedDate).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watched", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Updated successfully!" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  });

  const handleConfirm = () => {
    if (!finishedDate) {
      toast({ title: "Please select a finish date", variant: "destructive" });
      return;
    }
    updateWatchedMutation.mutate();
  };

  // Reset form when item changes
  React.useEffect(() => {
    if (watchedItem) {
      setRating(watchedItem.rating || 0);
      setNotes(watchedItem.notes || "");
      setFinishedDate(watchedItem.finishedAt ? new Date(watchedItem.finishedAt).toISOString().split('T')[0] : "");
    }
  }, [watchedItem]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit: {watchedItem?.movie.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="finished-date" className="text-sm font-medium text-gray-700">
              When did you finish watching this?
            </Label>
            <Input
              id="finished-date"
              type="date"
              value={finishedDate}
              onChange={(e) => setFinishedDate(e.target.value)}
              className="mt-1"
              data-testid="input-finished-date"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Your Rating:
            </Label>
            <RatingStars 
              rating={rating}
              onRatingChange={setRating}
              size="md"
            />
          </div>
          
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your thoughts about this movie/show..."
              className="mt-1"
              data-testid="textarea-notes"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button 
            className="bg-primary hover:bg-blue-700"
            onClick={handleConfirm}
            disabled={updateWatchedMutation.isPending}
            data-testid="button-save-edit"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}