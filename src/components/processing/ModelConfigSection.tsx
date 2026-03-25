'use client';

interface OllamaModelInfo {
  name: string;
  displayName: string;
  supportsImages: boolean;
}

interface ModelConfigSectionProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  isOllamaAvailable?: boolean;
  availableModels?: OllamaModelInfo[];
}

export function ModelConfigSection({
  selectedModel,
  onModelChange,
  isOllamaAvailable = false,
  availableModels = []
}: ModelConfigSectionProps) {
  return (
    <div className="bg-unkey-gray-900 border border-unkey-gray-700 rounded-unkey-lg shadow-unkey-card p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Model Configuration</h2>
      
      {/* Ollama Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-white">Ollama</h3>
          {isOllamaAvailable ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              ● Available
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              ● Unavailable
            </span>
          )}
        </div>

        {!isOllamaAvailable && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-unkey-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-yellow-300 mb-2">
                  Ollama server is not running. Start it with:
                </p>
                <code className="block bg-black/20 px-3 py-2 rounded text-sm text-yellow-200 font-mono">
                  ollama serve
                </code>
              </div>
            </div>
          </div>
        )}

        {isOllamaAvailable && availableModels.length > 0 && onModelChange && (
          <div>
            <label htmlFor="ollamaModel" className="block text-sm font-medium text-unkey-gray-200 mb-2">
              Select Model
            </label>
            <select
              id="ollamaModel"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full px-3 py-2 bg-unkey-gray-800 border border-unkey-gray-700 rounded-unkey-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {availableModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.displayName}
                  {model.supportsImages && ' 🖼️'}
                </option>
              ))}
            </select>
            {selectedModel && availableModels.find(m => m.name === selectedModel)?.supportsImages && (
              <p className="text-xs text-purple-400 mt-2">
                ✨ This model supports multimodal inputs (text + images)
              </p>
            )}
          </div>
        )}

        {isOllamaAvailable && availableModels.length === 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-unkey-lg p-4">
            <p className="text-sm text-blue-300">
              No models found. Pull a model with:
            </p>
            <code className="block bg-black/20 px-3 py-2 rounded text-sm text-blue-200 font-mono mt-2">
              ollama pull llama3.2
            </code>
          </div>
        )}
      </div>

      {/* Future: OpenAI, Anthropic, etc. sections will go here */}
    </div>
  );
}

// Made with Bob