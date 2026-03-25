'use client';

import { TabNavigationProps, TabId } from '@/types/tabs';

/**
 * TabNavigation - Renders tab buttons with icons, badges, and states
 * 
 * Features:
 * - Visual active state
 * - Disabled state for locked tabs
 * - Badge notifications
 * - Keyboard accessible
 * - Responsive design
 */
export function TabNavigation({ tabState, onTabChange }: TabNavigationProps) {
  const { activeTab, tabs } = tabState;

  const handleTabClick = (tabId: TabId, enabled: boolean) => {
    if (enabled) {
      onTabChange(tabId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: TabId, enabled: boolean) => {
    if (enabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onTabChange(tabId);
    }
  };

  const getBadgeStyles = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-unkey-teal/20 text-unkey-teal border-unkey-teal/30';
    }
  };

  return (
    <div className="border-b border-unkey-gray-800 bg-unkey-gray-900/50 backdrop-blur-sm">
      <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-2" role="tablist" aria-label="Main navigation tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDisabled = !tab.enabled;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : 0}
                onClick={() => handleTabClick(tab.id, tab.enabled)}
                onKeyDown={(e) => handleKeyDown(e, tab.id, tab.enabled)}
                disabled={isDisabled}
                className={`
                  relative px-6 py-4 font-medium text-sm transition-all duration-200
                  flex items-center gap-2
                  ${
                    isActive
                      ? 'text-white border-b-2 border-unkey-teal'
                      : isDisabled
                      ? 'text-unkey-gray-600 cursor-not-allowed'
                      : 'text-unkey-gray-400 hover:text-unkey-gray-200 hover:bg-unkey-gray-800/50'
                  }
                  ${!isDisabled && !isActive ? 'focus:outline-none focus:ring-2 focus:ring-unkey-teal/50 focus:ring-inset' : ''}
                `}
              >
                {/* Icon */}
                <span className="text-lg" aria-hidden="true">
                  {tab.icon}
                </span>

                {/* Label */}
                <span>{tab.label}</span>

                {/* Badge */}
                {tab.badge && !isDisabled && (
                  <span
                    className={`
                      ml-2 px-2 py-0.5 rounded-full text-xs font-medium border
                      ${getBadgeStyles(tab.badgeVariant)}
                    `}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Active indicator glow */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-unkey-teal to-unkey-cyan"
                    aria-hidden="true"
                  />
                )}

                {/* Disabled lock icon */}
                {isDisabled && (
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// Made with Bob