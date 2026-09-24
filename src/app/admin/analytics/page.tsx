import { AnalyticsPage } from '@/components/analytics-page';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {return <AnalyticsPage platform={true} params={await searchParams}/>;}
