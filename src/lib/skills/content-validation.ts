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
  if (kind === 'skill') return { values: { name: title, description: description || null, status } };
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
  return { values: { title, sequence, status, content: content || null, video_url: video_url || null, resource_url: resource_url || null, duration_minutes } };
}
