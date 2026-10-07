import { redirect } from 'next/navigation';
export default async function CollegeCoursesPage({ searchParams }: { searchParams: Promise<{ college_id?: string }> }) {
  const { college_id } = await searchParams;
  redirect('/college/programs' + (college_id ? '?college_id=' + encodeURIComponent(college_id) : ''));
}
