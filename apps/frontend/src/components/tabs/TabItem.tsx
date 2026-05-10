import React from 'react';
import { X } from 'lucide-react';
import { Tab } from './AppTabs';

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const TabItem: React.FC<TabItemProps> = ({
  tab,
  isActive,
  onClick,
  onClose,
  onContextMenu,
}) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(e);
  };

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        flex items-center gap-2 px-3 py-2 cursor-pointer
        border-b-2 whitespace-nowrap transition-all duration-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        ${
          isActive
            ? 'border-blue-500 bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-blue-400'
            : 'border-transparent text-gray-600 dark:text-gray-400'
        }
      `}
      title={tab.label}
    >
      {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
      
      <span className="text-sm font-medium truncate max-w-[200px]">
        {tab.label}
      </span>

      {tab.closeable !== false && (
        <button
          onClick={handleClose}
          className={`
            ml-1 flex-shrink-0 p-0.5 rounded hover:bg-gray-200 
            dark:hover:bg-gray-700 transition-colors
            ${isActive ? 'text-blue-600' : 'text-gray-400'}
          `}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default TabItem;
