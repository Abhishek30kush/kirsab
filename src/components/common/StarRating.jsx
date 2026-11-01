import React, { useState } from 'react';
import { Star } from 'lucide-react';

const RATING_LABELS = {
  1: { en: 'Poor', hi: 'खराब' },
  2: { en: 'Fair', hi: 'औसत' },
  3: { en: 'Good', hi: 'अच्छा' },
  4: { en: 'Very Good', hi: 'बहुत अच्छा' },
  5: { en: 'Excellent', hi: 'उत्कृष्ट' },
};

/**
 * Versatile StarRating component
 * - interactive mode (for review forms)
 * - read-only display mode (for cards and summaries)
 */
export const StarRating = ({
  rating = 0,
  onChange = null,
  maxStars = 5,
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  showLabel = false,
  showCount = false,
  totalReviews = null,
  isHindi = false,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const isInteractive = typeof onChange === 'function';
  const effectiveRating = isInteractive && hoverRating > 0 ? hoverRating : Number(rating) || 0;

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const starSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5" role={isInteractive ? 'radiogroup' : 'img'} aria-label={`Rating: ${effectiveRating} out of ${maxStars}`}>
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.round(effectiveRating);
          const isPartiallyFilled = !isFilled && starValue - 0.5 <= effectiveRating;

          return (
            <button
              key={index}
              type="button"
              disabled={!isInteractive}
              onClick={() => isInteractive && onChange(starValue)}
              onMouseEnter={() => isInteractive && setHoverRating(starValue)}
              onMouseLeave={() => isInteractive && setHoverRating(0)}
              className={`transition-transform focus:outline-none ${
                isInteractive ? 'cursor-pointer hover:scale-115 active:scale-95' : 'cursor-default'
              }`}
              aria-label={`${starValue} Stars`}
            >
              <Star
                className={`${starSize} transition-colors ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                    : isPartiallyFilled
                    ? 'text-amber-400 fill-amber-400/50'
                    : 'text-gray-300 fill-transparent hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showLabel && effectiveRating > 0 && (
        <span className="text-xs font-bold text-brand-charcoal ml-1">
          {isHindi
            ? RATING_LABELS[Math.round(effectiveRating)]?.hi || `${effectiveRating} स्टार`
            : RATING_LABELS[Math.round(effectiveRating)]?.en || `${effectiveRating} Stars`}
        </span>
      )}

      {showCount && (
        <span className="text-xs text-brand-muted font-medium ml-1">
          ({totalReviews !== null ? totalReviews : effectiveRating.toFixed(1)})
        </span>
      )}
    </div>
  );
};

