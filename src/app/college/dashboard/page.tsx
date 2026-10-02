import { CollegePerformance } from '@/components/college-performance';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  return <CollegePerformance mode="dashboard" params={await searchParams}/>;
}
