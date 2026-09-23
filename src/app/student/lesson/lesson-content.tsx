import { parseLessonText } from '@/lib/learning/lesson-text';

export function LessonContent({ content }: { content: string }) {
  return (
    <div className="space-y-5 text-slate-700 leading-relaxed text-sm sm:text-base break-words">
      {parseLessonText(content).map((block, index) => {
        if (block.type === 'heading') return <h2 key={index} className="pt-3 text-lg font-semibold text-slate-900">{block.text}</h2>;
        if (block.type === 'list') return <ul key={index} className="list-disc pl-6 space-y-2">{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>;
        if (block.type === 'table') return (
          <div key={index} className="max-w-full overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} role="region" aria-label="Lesson reference table">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-900"><tr>{block.headers.map((cell, j) => <th key={j} scope="col" className="p-3 font-semibold border-b border-slate-200">{cell}</th>)}</tr></thead>
              <tbody>{block.rows.map((row, j) => <tr key={j} className="even:bg-slate-50">{row.map((cell, k) => <td key={k} className="p-3 align-top border-b border-slate-100">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
        return <p key={index} className="whitespace-pre-wrap">{block.text}</p>;
      })}
    </div>
  );
}
