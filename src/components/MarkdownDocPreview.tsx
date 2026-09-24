import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidViewer } from './MermaidViewer';

interface MarkdownDocPreviewProps {
  content: string;
}

export const MarkdownDocPreview: React.FC<MarkdownDocPreviewProps> = ({ content }) => {
  if (!content || !content.trim()) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center text-slate-500">
        <svg className="mb-2 h-10 w-10 stroke-current text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm font-medium text-slate-400">Nenhum documento gerado ainda para esta etapa.</p>
        <p className="mt-1 text-xs text-slate-500">Converse com o Gemini no painel central e clique em "Gerar documento".</p>
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-slate max-w-none text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (lang === 'mermaid') {
              return <MermaidViewer chart={codeString} />;
            }

            return (
              <code
                className={`rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-emerald-400 ${
                  className || ''
                }`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="my-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                {children}
              </pre>
            );
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full border-collapse text-left text-xs text-slate-300">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-900/90 text-slate-200 uppercase font-semibold">{children}</thead>;
          },
          th({ children }) {
            return <th className="border-b border-slate-800 px-3 py-2 text-xs">{children}</th>;
          },
          td({ children }) {
            return <td className="border-b border-slate-800/60 px-3 py-2 text-xs">{children}</td>;
          },
          h1({ children }) {
            return (
              <h1 className="mb-4 mt-2 border-b border-slate-800 pb-2 text-xl font-bold tracking-tight text-white">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="mb-2 mt-5 text-base font-semibold tracking-tight text-indigo-300 border-l-2 border-indigo-500 pl-2">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return <h3 className="mb-1 mt-3 text-sm font-semibold text-slate-200">{children}</h3>;
          },
          p({ children }) {
            return <p className="my-2 text-sm leading-relaxed text-slate-300">{children}</p>;
          },
          ul({ children }) {
            return <ul className="my-2 list-disc pl-5 text-sm space-y-1 text-slate-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 list-decimal pl-5 text-sm space-y-1 text-slate-300">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-sm leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 border-l-4 border-emerald-500/70 bg-emerald-950/20 px-3 py-2 text-sm italic text-emerald-200 rounded-r">
                {children}
              </blockquote>
            );
          },
          input({ type, checked, ...props }) {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2 h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
