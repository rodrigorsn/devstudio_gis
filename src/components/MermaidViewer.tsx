import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidViewerProps {
  chart: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: 13,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      er: {
        useMaxWidth: true,
      },
    });

    let isMounted = true;
    const renderDiagram = async () => {
      if (!chart.trim()) {
        setSvg('');
        setError(null);
        return;
      }

      try {
        const id = 'mermaid-' + Math.random().toString(36).substring(2, 9);
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim());
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Mermaid render error:', err);
          setError(err?.message || 'Erro ao renderizar diagrama Mermaid');
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <div className="my-4 rounded-lg border border-slate-700 bg-slate-950/80 p-3 shadow-inner">
      <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          Diagrama Mermaid
        </span>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="rounded px-2 py-0.5 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          {showRaw ? 'Ver Diagrama' : 'Ver Código'}
        </button>
      </div>

      {showRaw ? (
        <pre className="overflow-x-auto rounded bg-slate-900 p-3 font-mono text-xs text-emerald-300">
          {chart}
        </pre>
      ) : error ? (
        <div className="rounded bg-amber-950/40 border border-amber-800/60 p-3 text-xs text-amber-300">
          <p className="font-semibold mb-1">Aviso: Não foi possível renderizar o diagrama visual.</p>
          <pre className="overflow-x-auto rounded bg-slate-900 p-2 font-mono text-[11px] text-slate-300">
            {chart}
          </pre>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="overflow-x-auto py-2 text-center [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:bg-transparent"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
};
