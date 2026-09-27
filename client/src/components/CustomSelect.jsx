import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'md',
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' ? opt : { value: opt, label: opt }
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.98] ${
          isOpen
            ? 'bg-card-subtle border-brand-500 text-primary ring-1 ring-brand-500/30'
            : 'bg-card hover:bg-card-subtle border-theme text-primary'
        } ${size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2'} ${buttonClassName}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-brand-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-50 mt-1 min-w-[170px] max-h-60 overflow-y-auto rounded-xl bg-surface border border-theme p-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                  isSelected
                    ? 'bg-brand-500/15 text-brand-400 font-semibold'
                    : 'text-secondary hover:bg-card-subtle hover:text-primary font-medium'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
