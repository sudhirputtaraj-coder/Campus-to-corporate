import StructurePage from '../structure-page';
export default async function Departments({searchParams}:{searchParams:Promise<{college_id?:string}>}) {return <StructurePage kind="department" collegeId={(await searchParams).college_id}/>;}
