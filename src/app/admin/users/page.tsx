import Directory from '../directory';
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  return <Directory kind="user" params={await searchParams} />;
}
