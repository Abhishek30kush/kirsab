import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

export const QuantitySelector = ({
  quantity = 1,
  onIncrement,
  onDecrement,
  onDelete,
  min = 1,
  max = 20,
  size = 'md', // 'sm' | 'md' | 'lg'
  unitLabel = '',
}) => {
  const isSm = size === 'sm';

  return (
    <div className={`inline-flex items-center justify-between bg-brand-soft border border-brand-dark/20 rounded-xl overflow-hidden ${isSm ? 'p-0.5' : 'p-1'}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (quantity <= min && onDelete) {
            onDelete();
          } else {
            onDecrement();
          }
        }}
        aria-label="मात्रा कम करें"
        className={`flex items-center justify-center rounded-lg bg-white text-brand-dark hover:bg-brand-dark hover:text-white transition-colors duration-150 active:scale-95 shadow-sm ${
          isSm ? 'w-7 h-7' : 'w-8 h-8'
        }`}
      >
        {quantity <= 1 && onDelete ? (
          <Trash2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-600`} />
        ) : (
          <Minus className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        )}
      </button>

      <div className={`flex flex-col items-center justify-center ${isSm ? 'px-2 min-w-[2.2rem]' : 'px-3 min-w-[2.75rem]'}`}>
        <span className={`font-bold text-brand-charcoal select-none ${isSm ? 'text-xs leading-none' : 'text-sm'}`}>
          {quantity}
        </span>
        {unitLabel && (
          <span className="text-[10px] text-brand-muted select-none leading-none mt-0.5">
            {unitLabel}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={quantity >= max}
        onClick={(e) => {
          e.stopPropagation();
          onIncrement();
        }}
        aria-label="मात्रा बढ़ाएं"
        className={`flex items-center justify-center rounded-lg bg-white text-brand-dark hover:bg-brand-dark hover:text-white transition-colors duration-150 active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
          isSm ? 'w-7 h-7' : 'w-8 h-8'
        }`}
      >
        <Plus className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      </button>
    </div>
  );
};
