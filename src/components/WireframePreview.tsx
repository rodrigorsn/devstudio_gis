import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, Code } from 'lucide-react';

interface WireframePreviewProps {
  html: string;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export const WireframePreview: React.FC<WireframePreviewProps> = ({
  html,
  onRegenerate,
  isGenerating = false,
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showCode, setShowCode] = useState(false);

  if (!html || !html.trim()) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center text-slate-500">
        <Monitor className="mb-2 h-10 w-10 text-slate-600" />
        <p className="text-sm font-medium text-slate-400">Nenhum wireframe gerado ainda para esta feature.</p>
        <p className="mt-1 text-xs text-slate-500">
          Ao gerar as telas, um protótipo wireframe em escala de cinza será compilado aqui.
        </p>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="mt-4 flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Gerando wireframe...' : 'Gerar Wireframe'}
          </button>
        )}
      </div>
    );
  }

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  return (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
      {/* Wireframe toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-300 mr-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Wireframe Interativo (Lo-Fi)
          </span>
          <div className="flex rounded bg-slate-800 p-0.5">
            <button
              onClick={() => setViewport('desktop')}
              title="Desktop (100%)"
              className={`rounded p-1 text-xs transition ${
                viewport === 'desktop' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              title="Tablet (768px)"
              className={`rounded p-1 text-xs transition ${
                viewport === 'tablet' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              title="Mobile (375px)"
              className={`rounded p-1 text-xs transition ${
                viewport === 'mobile' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <Code className="h-3 w-3" />
            {showCode ? 'Ver Render' : 'HTML'}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Recriando...' : 'Recriar'}
            </button>
          )}
        </div>
      </div>

      {/* Frame content */}
      <div className="flex-1 bg-slate-900/50 p-3 overflow-auto flex justify-center">
        {showCode ? (
          <pre className="w-full overflow-auto rounded bg-slate-950 p-3 font-mono text-xs text-slate-300">
            {html}
          </pre>
        ) : (
          <div className={`${getViewportWidth()} transition-all duration-200 shadow-xl rounded-md overflow-hidden border border-slate-700 bg-white min-h-[420px]`}>
            <iframe
              title="Wireframe Sandbox"
              sandbox="allow-scripts"
              srcDoc={html}
              className="w-full h-full min-h-[460px] border-0 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
