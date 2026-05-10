import React, { useRef, useEffect } from 'react';
import { MoreVertical, X } from 'lucide-react';

interface TabActionsProps {
  onCloseAll: () => void;
  onCloseOthers: () => void;
}

const TabActions: React.FC<TabActionsProps> = ({ onCloseAll, onCloseOthers }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center w-8 h-8 mx-1
          rounded hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors
          ${isOpen ? 'bg-gray-100 dark:bg-gray-800' : ''}
        `}
        title="Tab actions"
      >
        <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full right-0 mt-1 bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700 rounded-md
            shadow-lg z-50 min-w-[160px]
          `}
        >
          <button
            onClick={() => {
              onCloseOthers();
              setIsOpen(false);
            }}
            className={`
              w-full text-left px-3 py-2 text-sm transition-colors
              hover:bg-gray-100 dark:hover:bg-gray-700
              text-gray-700 dark:text-gray-300
              flex items-center gap-2
            `}
          >
            <X size={14} />
            Close Others
          </button>

          <button
            onClick={() => {
              onCloseAll();
              setIsOpen(false);
            }}
            className={`
              w-full text-left px-3 py-2 text-sm transition-colors
              hover:bg-gray-100 dark:hover:bg-gray-700
              text-gray-700 dark:text-gray-300
              flex items-center gap-2 border-t border-gray-200 dark:border-gray-700
            `}
          >
            <X size={14} />
            Close All
          </button>
        </div>
      )}
    </div>
  );
};

export default TabActions;
