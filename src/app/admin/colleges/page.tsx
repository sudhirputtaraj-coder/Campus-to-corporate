import Directory from '../directory';
export default async function CollegesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  return <Directory kind="college" params={await searchParams} />;
}
