import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RewatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  movieId: string | null;
}

export default function RewatchModal({ isOpen, onClose, userId, movieId }: RewatchModalProps) {
  const [rewatchDate, setRewatchDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addRewatchMutation = useMutation({
    mutationFn: async () => {
      if (!movieId) throw new Error('No movie selected');
      
      await apiRequest("POST", "/api/rewatches", {
        userId,
        movieId,
        watchedAt: new Date(rewatchDate).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats", userId] });
      toast({ title: "Rewatch logged successfully!" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to log rewatch", variant: "destructive" });
    }
  });

  const handleConfirm = () => {
    addRewatchMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Rewatch</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="rewatch-date" className="text-sm font-medium text-gray-700">
              Select rewatch date:
            </Label>
            <Input
              id="rewatch-date"
              type="date"
              value={rewatchDate}
              onChange={(e) => setRewatchDate(e.target.value)}
              className="mt-1"
              data-testid="input-rewatch-date"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-rewatch"
          >
            Cancel
          </Button>
          <Button 
            className="bg-primary hover:bg-blue-700"
            onClick={handleConfirm}
            disabled={addRewatchMutation.isPending}
            data-testid="button-confirm-rewatch"
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
