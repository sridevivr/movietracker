import { useState } from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number | null;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function RatingStars({ rating, onRatingChange, readonly = false, size = "md" }: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starRating === rating ? 0 : starRating);
    }
  };

  const handleStarHover = (starRating: number) => {
    if (!readonly) {
      setHoverRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(null);
    }
  };

  const displayRating = hoverRating || rating || 0;

  return (
    <div className="flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayRating;
        
        return (
          <Star
            key={i}
            className={`${sizeClasses[size]} ${
              isFilled 
                ? "text-yellow-400 fill-current" 
                : "text-gray-300"
            } ${
              readonly 
                ? "cursor-default" 
                : "cursor-pointer hover:text-yellow-300"
            } transition-colors`}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleStarHover(starValue)}
            data-testid={`star-${starValue}`}
          />
        );
      })}
      {rating && (
        <span className="ml-2 text-sm text-gray-600">
          {rating}/5
        </span>
      )}
    </div>
  );
}