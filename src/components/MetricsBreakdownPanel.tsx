'use client';

import { useState } from 'react';
import { DetailedMetricsBreakdown } from '@/types/rag-comparison';
import { TimingBreakdownView } from './breakdown/TimingBreakdownView';
import { TokenBreakdownView } from './breakdown/TokenBreakdownView';
import { CostBreakdownView } from './breakdown/CostBreakdownView';
import { ContextWindowBreakdownView } from './breakdown/ContextWindowBreakdownView';
import { useMetricsTab } from '@/contexts/MetricsTabContext';

interface MetricsBreakdownPanelProps {
  breakdown: DetailedMetricsBreakdown;
  pipelineType: 'rag' | 'direct';
}

type TabType = 'timing' | 'tokens' | 'cost' | 'context';

export function MetricsBreakdownPanel({ breakdown, pipelineType }: MetricsBreakdownPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeTab, setActiveTab } = useMetricsTab();

  const isRAG = pipelineType === 'rag';

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'timing', label: 'Timing', icon: '⏱️' },
    { id: 'tokens', label: 'Tokens', icon: '🔢' },
    { id: 'cost', label: 'Cost', icon: '💰' },
    { id: 'context', label: 'Context Window', icon: '📊' },
  ];

  return (
    <div className="bg-unkey-gray-900 rounded-unkey-lg shadow-unkey-card border border-unkey-gray-700 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-unkey-gray-850 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="metrics-breakdown-content"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-unkey-gray-400 transition-transform duration-300 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <h3 className="text-lg font-bold text-white">
            Detailed Metrics Breakdown
          </h3>
        </div>
        <span className="text-sm text-unkey-gray-400">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div id="metrics-breakdown-content" className="border-t border-unkey-gray-700">
          {/* Metadata Notice */}
          {breakdown.metadata.notes && breakdown.metadata.notes.length > 0 && (
            <div className="px-6 py-3 bg-blue/10 border-b border-blue/20">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Important Notes
                  </h4>
                  <ul className="text-xs text-unkey-gray-300 space-y-1">
                    {breakdown.metadata.notes.map((note, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="px-6 pt-4">
            <div className="flex gap-2 border-b border-unkey-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-unkey-teal-400 border-b-2 border-unkey-teal-500'
                      : 'text-unkey-gray-400 hover:text-unkey-gray-200'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                >
                  <span className="flex items-center gap-2">
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-6">
            {activeTab === 'timing' && (
              <div role="tabpanel" id="timing-panel" aria-labelledby="timing-tab">
                <TimingBreakdownView
                  timing={breakdown.timing}
                  isRAG={isRAG}
                  isEstimated={breakdown.metadata.generationTimeEstimated}
                />
              </div>
            )}

            {activeTab === 'tokens' && (
              <div role="tabpanel" id="tokens-panel" aria-labelledby="tokens-tab">
                <TokenBreakdownView
                  tokens={breakdown.tokens}
                  isRAG={isRAG}
                />
              </div>
            )}

            {activeTab === 'cost' && (
              <div role="tabpanel" id="cost-panel" aria-labelledby="cost-tab">
                <CostBreakdownView
                  cost={breakdown.cost}
                  tokens={{
                    totalInput: breakdown.tokens.totalInput,
                    output: breakdown.tokens.output,
                  }}
                  isRAG={isRAG}
                  modelId={breakdown.metadata.model}
                />
              </div>
            )}

            {activeTab === 'context' && (
              <div role="tabpanel" id="context-panel" aria-labelledby="context-tab">
                <ContextWindowBreakdownView
                  contextWindow={breakdown.contextWindow}
                  tokens={breakdown.tokens}
                />
              </div>
            )}
          </div>

          {/* Footer with Metadata */}
          <div className="px-6 py-3 bg-unkey-gray-850 border-t border-unkey-gray-700">
            <div className="flex items-center justify-between text-xs text-unkey-gray-400">
              <span>
                Model: <span className="font-semibold text-unkey-gray-200">{breakdown.metadata.model}</span>
              </span>
              <span>
                Calculated: {new Date(breakdown.metadata.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob