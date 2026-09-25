const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
};
const httpsLink = (value: string) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && value.length <= 2048;
  } catch { return false; }
};

export function parseContent(form: FormData, kind: 'skill' | 'module' | 'lesson') {
  const title = text(form, 'title');
  const status = text(form, 'status');
  if (!title || title.length > 200) return { error: 'Enter a name of up to 200 characters.' } as const;
  if (!['ACTIVE', 'INACTIVE'].includes(status)) return { error: 'Choose published or hidden.' } as const;
  const description = text(form, 'description');
  if (description.length > 5000) return { error: 'Keep the description within 5,000 characters.' } as const;
  if (kind === 'skill') {
    const display_order=Number(text(form,'display_order')||999);
    if(!Number.isSafeInteger(display_order)||display_order<1||display_order>100000)return {error:'Enter a skill order between 1 and 100,000.'} as const;
    return { values: { name: title, description: description || null, status, display_order } };
  }
  const sequence = Number(text(form, 'sequence'));
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 100000) return { error: 'Enter a display order between 1 and 100,000.' } as const;
  if (kind === 'module') return { values: { title, description: description || null, sequence, status } };
  const video_url = text(form, 'video_url');
  const resource_url = text(form, 'resource_url');
  if (!httpsLink(video_url) || !httpsLink(resource_url)) return { error: 'Use valid HTTPS links without embedded login details.' } as const;
  const duration_minutes = Number(text(form, 'duration_minutes'));
  if (!Number.isSafeInteger(duration_minutes) || duration_minutes < 0 || duration_minutes > 100000) return { error: 'Enter a valid duration in minutes.' } as const;
  const content = text(form, 'content');
  if (content.length > 100000) return { error: 'Keep each lesson within 100,000 characters.' } as const;
  let practice_questions: {question:string;answer:string}[] = [];
  try {
    const raw=JSON.parse(text(form,'practice_questions')||'[]');
    if(!Array.isArray(raw)||raw.length>50)throw Error();
    practice_questions=raw.map(q=>{
      if(!q||typeof q.question!=='string'||typeof q.answer!=='string'||!q.question.trim()||q.question.trim().length>1000||!q.answer.trim()||q.answer.trim().length>5000)throw Error();
      return {question:q.question.trim(),answer:q.answer.trim()};
    });
  }catch {return {error:'Add up to 50 practice questions per lesson, with a question (1,000 characters) and answer (5,000 characters).'} as const;}
  return { values: { practice_questions, title, sequence, status, content: content || null, video_url: video_url || null, resource_url: resource_url || null, duration_minutes } };
}
