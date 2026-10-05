import { redirect } from 'next/navigation';
export default async function SkillModules({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect('/student/learning?skill=' + encodeURIComponent(id));
}
