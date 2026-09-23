import json, re, uuid
from pathlib import Path
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
import sys
source=Path(sys.argv[1]); root=Path(sys.argv[2])
doc=Document(source)
blocks=[]
for child in doc.element.body:
 if child.tag.endswith('}p'):
  p=Paragraph(child,doc)
  if p.text.strip(): blocks.append({'type':'paragraph','style':p.style.name if p.style else '', 'text':p.text.strip()})
 elif child.tag.endswith('}tbl'):
  t=Table(child,doc)
  blocks.append({'type':'table','rows':[[c.text.strip() for c in r.cells] for r in t.rows]})
def md(items):
 out=[]
 for b in items:
  if b['type']=='table':
   def row(cells): return '| '+' | '.join(c.replace('\\','\\\\').replace('|','\\|').replace('\n',' / ') for c in cells)+' |'
   out += [row(b['rows'][0]),row(['---']*len(b['rows'][0]))]+[row(r) for r in b['rows'][1:]]+['']
  else:
   t=b['text']; s=b['style']
   prefix='## ' if s.startswith('Heading') or (t.isupper() and len(t)<80) else '- ' if s=='List Paragraph' else ''
   out += [prefix+t,'']
 return '\n'.join(out).strip()
ns=uuid.UUID('c8396a32-6b69-43b8-9ec8-eaacdc28b9b3')
def ident(key): return str(uuid.uuid5(ns,key))
starts=[i for i,b in enumerate(blocks) if b['type']=='paragraph' and b['text'].startswith('Module ')]
skills=[i for i,b in enumerate(blocks) if b['type']=='paragraph' and re.match(r'Skill \d:',b['text'])]
end=next(i for i,b in enumerate(blocks) if b.get('text')=='Your eight-week readiness plan')
course={'id':ident('course'), 'title':'Corporate Readiness Handbook', 'description':'25 practical modules covering communication, professionalism, critical thinking, problem solving, teamwork, time management and adaptability. Includes workplace examples, activities, grammar exercises and an eight-week study plan. Checkpoints are self-study practice, not graded skill assessments.', 'modules':[]}
used=[]
def lesson(key,title,indices,minutes=0):
 used.extend(indices)
 return {'id':ident('lesson:'+key),'title':title,'duration_minutes':minutes,'content':md([blocks[i] for i in indices])}
for seq,start in enumerate(starts,1):
 title=blocks[start]['text']; code=re.search(r'Module (\d\.\d):',title)[1]
 stop=starts[seq] if seq<len(starts) else end
 next_skill=next((i for i in skills if start<i<stop),None)
 if next_skill is not None: stop=next_skill
 indices=list(range(start,stop))
 time=blocks[start+1]['text']
 minutes=240 if '3 to 4 hours' in time else int(re.search(r'\d+',time)[0])
 skill={'1':'COMM','2':'PROF','3':'CRT' if code in ['3.1','3.3'] else 'PROB','4':'TEAM','5':'TIME','6':'ADAPT'}[code[0]]
 obj=next((blocks[i]['text'] for i in indices if blocks[i].get('text','').startswith('Objective:')),'')
 m={'id':ident('module:'+code),'number':code,'title':title.removeprefix('Module '),'skill_code':skill,'description':obj.removeprefix('Objective:').strip(),'sequence':seq,'lessons':[]}
 if seq==1:
  m['lessons'].append(lesson('welcome','Start here: how to use this handbook',list(range(0,skills[0]))))
 intro=[]
 if code.endswith('.1'):
  sk=skills[int(code[0])-1]; intro=list(range(sk,start))
 sub=[i for i in indices if blocks[i].get('style')=='Heading 3']
 if sub:
  m['lessons'].append(lesson(code+':intro','Introduction: '+title.split(': ',1)[1],intro+list(range(start,sub[0]))))
  for j,s in enumerate(sub):
   t=sub[j+1] if j+1<len(sub) else stop
   m['lessons'].append(lesson(code+':'+str(j+1),blocks[s]['text'],list(range(s,t)),minutes//len(sub)))
 else:
  m['lessons'].append(lesson(code,title.split(': ',1)[1],intro+indices,minutes))
 if seq==len(starts): m['lessons'].append(lesson('plan','Your eight-week plan and readiness checklist',list(range(end,len(blocks)))) )
 for j,l in enumerate(m['lessons'],1): l['sequence']=j
 course['modules'].append(m)
assert sorted(used)==list(range(len(blocks))), 'Every source block must occur exactly once'
assert len(course['modules'])==25
course['duration_minutes']=sum(l['duration_minutes'] for m in course['modules'] for l in m['lessons'])
course['source']={'filename':source.name,'paragraphs':sum(b['type']=='paragraph' for b in blocks),'tables':sum(b['type']=='table' for b in blocks)}
(root/'content').mkdir(exist_ok=True)
(root/'content/corporate-readiness-handbook.json').write_text(json.dumps(course,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def q(s): return "'"+str(s).replace("'","''")+"'"
lines=['-- Imported from Campus_to_Corporate_Readiness_Handbook.docx. Run the complete file.', '-- Reruns preserve administrator edits, progress, inactive content and existing enrolment status.', 'BEGIN;', 'DO $$ BEGIN', "  IF (SELECT count(*) FROM public.skills WHERE code IN ('COMM','PROF','CRT','PROB','TEAM','TIME','ADAPT')) <> 7 THEN", "    RAISE EXCEPTION 'The seven foundation skills are required before importing the handbook.';", '  END IF;', 'END $$;', 'INSERT INTO public.courses(id,title,description,category,duration_minutes,level,status) VALUES ('+', '.join([q(course['id']),q(course['title']),q(course['description']),q('Corporate Readiness'),str(course['duration_minutes']),q('BEGINNER'),q('ACTIVE')])+') ON CONFLICT (id) DO NOTHING;']
for m in course['modules']:
 lines.append('INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('+', '.join([q(m['id']),q(course['id']),q(m['title']),q(m['description']),str(m['sequence']), '(SELECT id FROM public.skills WHERE code='+q(m['skill_code'])+')',q('ACTIVE')])+') ON CONFLICT (id) DO NOTHING;')
 for l in m['lessons']:
  lines.append('INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('+', '.join([q(l['id']),q(m['id']),q(l['title']),q(l['content']),str(l['duration_minutes']),str(l['sequence']),q('ACTIVE')])+') ON CONFLICT (id) DO NOTHING;')
lines+=['''-- Make this programme course available to active colleges, including future batch assignments.
INSERT INTO public.college_courses(college_id,course_id)
SELECT co.id,c.id FROM public.colleges co CROSS JOIN public.courses c
WHERE co.status='ACTIVE' AND c.status='ACTIVE' AND c.id=COURSE_ID
ON CONFLICT (college_id,course_id) DO NOTHING;
-- Current active college students and individuals with a matching, unexpired paid entitlement.
-- Later college students use the existing college/batch enrolment screens;
-- new individual purchases already enrol students in all active programme courses.
INSERT INTO public.enrollments(student_id,course_id,batch_id)
SELECT s.id,c.id,s.batch_id FROM public.students s
JOIN public.profiles p ON p.user_id=s.user_id
CROSS JOIN public.courses c
WHERE c.id=COURSE_ID AND c.status='ACTIVE'
  AND s.status='ACTIVE' AND p.status='ACTIVE' AND p.role='STUDENT'
  AND ((s.account_type='COLLEGE' AND EXISTS (
    SELECT 1 FROM public.colleges co WHERE co.id=s.college_id AND co.status='ACTIVE'
  )) OR (s.account_type='INDIVIDUAL' AND EXISTS (
    SELECT 1 FROM public.programme_purchases pp
    JOIN public.programme_settings ps ON ps.id=pp.programme_id
    WHERE pp.student_id=s.id AND pp.programme_id='corporate-readiness'
      AND pp.status='PAID' AND pp.payment_mode=ps.payment_mode
      AND pp.activated_at<=now() AND pp.expires_at>now()
  )))
ON CONFLICT (student_id,course_id) DO NOTHING;
COMMIT;
'''.replace('COURSE_ID',q(course['id']))]
(root/'supabase/migrations/018_readiness_handbook.sql').write_text('\n\n'.join(lines),encoding='utf-8')
print(json.dumps({'course':course['id'],'modules':25,'lessons':sum(len(m['lessons']) for m in course['modules']),'minutes':course['duration_minutes'],'source':course['source']}))
