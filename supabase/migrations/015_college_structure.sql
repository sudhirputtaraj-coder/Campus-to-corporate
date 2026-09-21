BEGIN;
CREATE OR REPLACE FUNCTION public.fn_manage_college_structure(p_college_id UUID,p_kind TEXT,p_id UUID,p_data JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result_id UUID; dept_id UUID; selected_batch_id UUID; old_dept UUID; item_status TEXT;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND status='ACTIVE'
    AND (role='SUPER_ADMIN' OR (role='COLLEGE_ADMIN' AND public.is_college_admin(p_college_id)))) THEN
    RAISE EXCEPTION 'Active administrator access to this college is required.';
  END IF;
  PERFORM 1 FROM colleges WHERE id=p_college_id AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active college.'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('department','batch','placement') OR p_data IS NULL THEN RAISE EXCEPTION 'Invalid operation.'; END IF;
  dept_id=nullif(p_data->>'department_id','')::UUID;
  IF dept_id IS NOT NULL THEN
    PERFORM 1 FROM departments WHERE id=dept_id AND college_id=p_college_id AND status='ACTIVE' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active department in this college.'; END IF;
  END IF;
  IF p_kind='placement' THEN
    selected_batch_id=nullif(p_data->>'batch_id','')::UUID;
    IF selected_batch_id IS NOT NULL THEN
      SELECT department_id INTO old_dept FROM batches WHERE id=selected_batch_id AND college_id=p_college_id AND status='ACTIVE' FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active batch in this college.'; END IF;
      IF old_dept IS NOT NULL AND old_dept IS DISTINCT FROM dept_id THEN RAISE EXCEPTION 'The batch belongs to a different department.'; END IF;
    END IF;
    UPDATE students SET department_id=dept_id,batch_id=selected_batch_id
      WHERE id=p_id AND college_id=p_college_id AND account_type='COLLEGE' AND status='ACTIVE'
        AND EXISTS(SELECT 1 FROM profiles WHERE user_id=students.user_id AND role='STUDENT' AND status='ACTIVE')
      RETURNING id INTO result_id;
    IF result_id IS NULL THEN RAISE EXCEPTION 'Choose an active student in this college.'; END IF;
  ELSE
    item_status=p_data->>'status';
    IF item_status IS NULL OR item_status NOT IN ('ACTIVE','INACTIVE') OR nullif(btrim(p_data->>'name'),'') IS NULL OR length(p_data->>'name')>200 THEN
      RAISE EXCEPTION 'Enter a name and choose Active or Inactive.';
    END IF;
    IF p_kind='department' THEN
      IF nullif(btrim(p_data->>'code'),'') IS NULL OR (p_data->>'code') !~ '^[A-Za-z0-9_-]{1,40}$' THEN RAISE EXCEPTION 'Enter a valid department code.'; END IF;
      IF p_id IS NULL THEN
        INSERT INTO departments(college_id,name,code,status) VALUES(p_college_id,btrim(p_data->>'name'),upper(p_data->>'code'),item_status::entity_status) RETURNING id INTO result_id;
      ELSE
        UPDATE departments SET name=btrim(p_data->>'name'),code=upper(p_data->>'code'),status=item_status::entity_status WHERE id=p_id AND college_id=p_college_id RETURNING id INTO result_id;
      END IF;
    ELSE
      IF length(coalesce(p_data->>'academic_year',''))>40 THEN RAISE EXCEPTION 'Academic year must be at most 40 characters.'; END IF;
      IF p_id IS NULL THEN
        INSERT INTO batches(college_id,department_id,name,academic_year,status) VALUES(p_college_id,dept_id,btrim(p_data->>'name'),nullif(p_data->>'academic_year',''),item_status::entity_status) RETURNING id INTO result_id;
      ELSE
        SELECT department_id INTO old_dept FROM batches WHERE id=p_id AND college_id=p_college_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found in this college.'; END IF;
        IF old_dept IS DISTINCT FROM dept_id THEN RAISE EXCEPTION 'A batch department cannot be changed after creation. Create a new batch instead.'; END IF;
        UPDATE batches SET name=btrim(p_data->>'name'),academic_year=nullif(p_data->>'academic_year',''),status=item_status::entity_status WHERE id=p_id AND college_id=p_college_id RETURNING id INTO result_id;
      END IF;
    END IF;
    IF result_id IS NULL THEN RAISE EXCEPTION 'Record not found in this college.'; END IF;
  END IF;
  INSERT INTO audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'COLLEGE_STRUCTURE_SAVED',p_kind,result_id,jsonb_build_object('college_id',p_college_id,'details',p_data));
  RETURN result_id;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_manage_college_structure(UUID,TEXT,UUID,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_manage_college_structure(UUID,TEXT,UUID,JSONB) TO authenticated;
COMMIT;
