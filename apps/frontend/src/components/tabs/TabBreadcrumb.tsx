import React, { useEffect, useState } from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface TabBreadcrumbProps {
  items: BreadcrumbItem[];
  activeTabId?: string;
  onNavigate?: (path: string) => void;
  showHome?: boolean;
}

const TabBreadcrumb: React.FC<TabBreadcrumbProps> = ({
  items,
  activeTabId,
  onNavigate,
  showHome = true,
}) => {
  const [displayItems, setDisplayItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    // Limit breadcrumb items to prevent overflow
    const maxItems = 5;
    if (items.length > maxItems) {
      setDisplayItems([items[0], { label: '...' }, ...items.slice(-maxItems + 2)]);
    } else {
      setDisplayItems(items);
    }
  }, [items]);

  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path && onNavigate) {
      onNavigate(item.path);
    }
  };

  return (
    <nav
      className="flex items-center gap-1 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 
        border-b border-gray-200 dark:border-gray-700 overflow-x-auto"
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <button
            className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded
              text-gray-600 dark:text-gray-400 transition-colors"
            onClick={() => onNavigate?.('/')}
            title="Home"
          >
            <Home size={16} />
          </button>
          {displayItems.length > 0 && (
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          )}
        </>
      )}

      {displayItems.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 && (
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          )}
          
          {item.label === '...' ? (
            <span className="text-gray-400 flex-shrink-0 px-1">...</span>
          ) : (
            <button
              onClick={() => handleItemClick(item)}
              className={`
                px-2 py-1 rounded transition-colors whitespace-nowrap flex-shrink-0
                ${
                  index === displayItems.length - 1
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
              disabled={item.label === '...'}
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

/**
 * Hook to sync breadcrumb with router
 * @example
 * const breadcrumbs = useTabBreadcrumb(location.pathname);
 * return <TabBreadcrumb items={breadcrumbs} />;
 */
export const useTabBreadcrumb = (pathname: string): BreadcrumbItem[] => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = segments.map((segment, index) => {
      const path = '/' + segments.slice(0, index + 1).join('/');
      return {
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        path,
      };
    });

    setBreadcrumbs(items);
  }, [pathname]);

  return breadcrumbs;
};

export default TabBreadcrumb;
