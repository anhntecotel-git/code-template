import React, { useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tab } from './AppTabs';

interface TabDropdownProps {
  visibleTabs: Tab[];
  allTabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
}

const TabDropdown: React.FC<TabDropdownProps> = ({
  visibleTabs,
  allTabs,
  activeTabId,
  onTabSelect,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const hiddenTabs = allTabs.filter(
    (tab) => !visibleTabs.find((vt) => vt.id === tab.id)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (hiddenTabs.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-2 py-2 text-sm
          border-b-2 border-transparent hover:bg-gray-100
          dark:hover:bg-gray-800 transition-colors
        `}
      >
        <ChevronDown size={16} />
        <span className="text-xs bg-gray-300 dark:bg-gray-600 px-1.5 py-0.5 rounded">
          +{hiddenTabs.length}
        </span>
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full left-0 mt-0 bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700 rounded-md
            shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto
          `}
        >
          {hiddenTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabSelect(tab.id);
                setIsOpen(false);
              }}
              className={`
                w-full text-left px-3 py-2 text-sm transition-colors
                hover:bg-gray-100 dark:hover:bg-gray-700
                ${
                  tab.id === activeTabId
                    ? 'bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2 truncate">
                {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
                <span className="truncate">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TabDropdown;
