import type { CollegeAnalyticsSummary } from '@/lib/employability/types';

export function AnalyticsReport({ data, platform }: { data: CollegeAnalyticsSummary; platform: boolean }) {
  const metrics = [
    ['Active students', data.total_students], ['College students', data.college_students],
    ...(platform ? [['Individual students', data.individual_students]] : []),
    ['Students enrolled', data.students_enrolled], ['Course enrolments', data.enrolments],
    ['Completed enrolments', data.completed_enrolments], ['Average course progress', data.average_progress == null ? '—' : `${data.average_progress}%`],
    ['Graded assessment attempts', data.graded_attempts],
    ['Students with final scores', data.scores_available ? data.students_with_score : 'Unavailable'],
    ['Provisional scores', data.scores_available ? data.provisional_students : 'Unavailable'],
    ['Without a final score', data.scores_available ? data.total_students - data.students_with_score : 'Unavailable'],
    ['Average final score', data.average_score ?? '—'],
  ];
  return <>
    <p className="mb-5 text-sm text-slate-600">{platform ? 'All active students, including independent students and students at active colleges.' : 'Active students in the active colleges you administer.'} Learning totals include active and completed enrolments. Average progress is per course enrolment.</p>
    {!data.scores_available && <p role="status" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">Employability scores are unavailable because scoring database setup is incomplete. Learning totals remain available.</p>}
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,value]) => <section key={label} className="rounded-xl border bg-white p-5"><h2 className="text-sm text-slate-600">{label}</h2><p className="mt-2 text-3xl font-bold">{value}</p></section>)}</div>
    <p className="mb-5 text-sm text-slate-600">Score averages use each student’s latest non-provisional measurement, including 0. If the latest result is provisional, an older score is not substituted. Scores indicate preparation, not a guarantee of job suitability.</p>
    {data.latest_measurement && <p className="mb-5 text-sm text-slate-600">Latest final measurement: {new Date(data.latest_measurement).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-5"><h2 className="mb-4 text-lg font-semibold">Readiness distribution</h2>{Object.keys(data.classification_counts).length ? <ul className="space-y-3">{Object.entries(data.classification_counts).map(([label,n])=><li key={label}><div className="flex justify-between gap-4"><span>{label}</span><strong>{n}</strong></div><progress aria-label={label} className="mt-1 w-full accent-green-600" value={n} max={Math.max(1,data.students_with_score)} /></li>)}</ul> : <p>No final classifications available.</p>}</section>
      <section className="rounded-xl border bg-white p-5"><h2 className="mb-4 text-lg font-semibold">Largest skill gaps</h2><p className="mb-3 text-sm text-slate-600">Average gap among students with a positive gap in that skill, using latest final measurements.</p>{data.top_skill_gaps.length ? <ul className="space-y-3">{data.top_skill_gaps.map(g=><li key={g.code} className="flex justify-between gap-4"><span>{g.name} ({g.n} students)</span><strong>{g.avg_gap} points</strong></li>)}</ul> : <p>No measured skill gaps available.</p>}</section>
    </div>
    <AnalyticsTable title="College and individual cohorts" headings={['Cohort','Active students','Final scores','Average score']} rows={data.college_averages.map(c=>[c.name,c.students,data.scores_available ? c.measured : '—',c.average ?? '—'])} />
    <AnalyticsTable title="Department averages" headings={['Department','Average score','Students measured']} rows={data.department_averages.map(d=>[d.department_name,d.avg_score,d.n])} />
    <AnalyticsTable title="Batch averages" headings={['Batch','Average score','Students measured']} rows={data.batch_averages.map(b=>[b.batch_name,b.avg_score,b.n])} />
    <p className="mt-6 text-xs text-slate-500">Report generated: {new Date(data.generated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. Counts are aggregated in the database without a student sample limit.</p>
  </>;
}
function AnalyticsTable({ title, headings, rows }: { title: string; headings: string[]; rows: (string | number)[][] }) {
  return <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{rows.length ? <div className="overflow-x-auto" role="region" aria-label={title} tabIndex={0}><table className="w-full min-w-[30rem] text-left text-sm"><thead><tr>{headings.map(h=><th key={h} scope="col" className="border-b p-3">{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j} className="border-b p-3">{value}</td>)}</tr>)}</tbody></table></div> : <p>No final measurements available for this grouping.</p>}</section>;
}
