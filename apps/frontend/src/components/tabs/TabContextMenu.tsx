import React, { useEffect, useRef } from 'react';
import {
  X,
  Copy,
  RefreshCw,
  CheckSquare,
} from 'lucide-react';

interface TabContextMenuProps {
  x: number;
  y: number;
  tabId: string;
  onClose: () => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseRight: () => void;
  onRefresh?: () => void;
  onDuplicate?: () => void;
}

const TabContextMenu: React.FC<TabContextMenuProps> = ({
  x,
  y,
  tabId,
  onClose,
  onCloseTab,
  onCloseOthers,
  onCloseRight,
  onRefresh,
  onDuplicate,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu goes off-screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      let adjustedX = x;
      let adjustedY = y;

      // Check right boundary
      if (rect.right > window.innerWidth) {
        adjustedX = window.innerWidth - rect.width - 10;
      }

      // Check bottom boundary
      if (rect.bottom > window.innerHeight) {
        adjustedY = window.innerHeight - rect.height - 10;
      }

      if (adjustedX !== x || adjustedY !== y) {
        menuRef.current.style.left = `${adjustedX}px`;
        menuRef.current.style.top = `${adjustedY}px`;
      }
    }
  }, [x, y]);

  const menuItems = [
    {
      icon: RefreshCw,
      label: 'Reload',
      onClick: onRefresh,
      show: !!onRefresh,
    },
    {
      icon: Copy,
      label: 'Duplicate',
      onClick: onDuplicate,
      show: !!onDuplicate,
    },
    {
      icon: X,
      label: 'Close Tab',
      onClick: onCloseTab,
      show: true,
      className: 'text-red-600 dark:text-red-400',
    },
    {
      icon: CheckSquare,
      label: 'Close Others',
      onClick: onCloseOthers,
      show: true,
    },
    {
      icon: X,
      label: 'Close Tabs to the Right',
      onClick: onCloseRight,
      show: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 9999,
      }}
      className={`
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700 rounded-md
        shadow-xl overflow-hidden
      `}
    >
      {menuItems
        .filter((item) => item.show)
        .map((item, index) => {
          const Icon = item.icon;
          const isLast = index === menuItems.filter((i) => i.show).length - 1;

          return (
            <button
              key={item.label}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className={`
                w-full text-left px-4 py-2 text-sm transition-colors
                hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-3 whitespace-nowrap
                text-gray-700 dark:text-gray-300
                ${!isLast ? 'border-b border-gray-200 dark:border-gray-700' : ''}
                ${item.className || ''}
              `}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
    </div>
  );
};

export default TabContextMenu;
