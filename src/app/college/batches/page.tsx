import StructurePage from '../structure-page';
export default async function Batches({searchParams}:{searchParams:Promise<{college_id?:string}>}) {return <StructurePage kind="batch" collegeId={(await searchParams).college_id}/>;}
