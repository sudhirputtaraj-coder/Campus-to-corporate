-- Imported from Campus_to_Corporate_Readiness_Handbook.docx. Run the complete file.

-- Reruns preserve administrator edits, progress, inactive content and existing enrolment status.

BEGIN;

DO $$ BEGIN

  IF (SELECT count(*) FROM public.skills WHERE code IN ('COMM','PROF','CRT','PROB','TEAM','TIME','ADAPT')) <> 7 THEN

    RAISE EXCEPTION 'The seven foundation skills are required before importing the handbook.';

  END IF;

END $$;

INSERT INTO public.courses(id,title,description,category,duration_minutes,level,status) VALUES ('5ad4db9e-9dfe-5478-870c-21ac5871fa5d', 'Corporate Readiness Handbook', '25 practical modules covering communication, professionalism, critical thinking, problem solving, teamwork, time management and adaptability. Includes workplace examples, activities, grammar exercises and an eight-week study plan. Checkpoints are self-study practice, not graded skill assessments.', 'Corporate Readiness', 1860, 'BEGINNER', 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('50ead0b9-acd0-5513-896c-3dee2c433128', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '1.1: Business Email and Written Communication', 'Write emails and chat messages that are clear, short and easy to act on.', 1, (SELECT id FROM public.skills WHERE code='COMM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('b12cecfd-c4f9-5546-b316-2e7b12a29be8', '50ead0b9-acd0-5513-896c-3dee2c433128', 'Start here: how to use this handbook', '## CAMPUS TO CORPORATE

Corporate Readiness Handbook

Six essential skills and 25 practical modules for final-year degree students

Communication  |  Professionalism  |  Critical Thinking and Problem Solving  |  Teamwork  |  Time Management  |  Adaptability

## Welcome: how to use this handbook

You are about to move from college to a corporate workplace. Your degree shows what you know. Employers also want to see how you communicate, behave, think, cooperate, manage time and adapt. This handbook covers six skills that recruiters and managers ask for most, and it turns each one into short, practical modules you can complete on your own.

## How every module is organized

- Objective: what you will be able to do after the module.

- What you need to know: the key ideas explained in plain language.

- Workplace example: a realistic situation that shows the idea in action.

- Try it yourself: a short practical activity. This is where the real learning happens.

- Common mistakes: what freshers often get wrong.

- Checkpoint questions: two questions to test yourself before moving on.

- Modules 1.5 (Basic Grammar) and 2.2 (Workplace Etiquette) are organized differently: each has several sub-topics with tables of points or examples, do and don''t guidance, activities and an answer key.

## Tips for getting the most from it

- Do the practice activity in every module. Reading alone will not build the skill.

- Study one or two modules a week, following the eight-week plan at the end of this handbook.

- Keep a small notebook or file with your practice work. It becomes material for your interviews.

- Ask a friend, senior or trainer to give you honest feedback on your practice.

## The six skills at a glance

Each skill is linked to the platform''s employability skill codes, so your progress here can be connected to your assessments. Critical Thinking (CRT) and Problem Solving (PROB) are taught together because they are used together at work.

| Code | Skill | Modules |
| --- | --- | --- |
| COMM | Communication | 1.1  Business Email and Written Communication / 1.2  Speaking Clearly: The PREP Method / 1.3  Active Listening and Asking Good Questions / 1.4  Self-Introduction and Interview Communication / 1.5  Basic Grammar for Workplace English /         1.5.1  Parts of Speech /         1.5.2  Articles: A, An and The /         1.5.3  Tenses /         1.5.4  Subject-Verb Agreement Rules |
| PROF | Professionalism and Workplace Etiquette | 2.1  Corporate Culture and Your First 90 Days / 2.2  Workplace Etiquette /         2.2.1  Why Corporate Readiness Matters (WIIFM) /         2.2.2  Attire, Grooming and Personal Hygiene /         2.2.3  Attitude and Public Behaviour /         2.2.4  Punctuality and Discipline /         2.2.5  Workplace Communication /         2.2.6  Mobile Phone Etiquette /         2.2.7  Floor Etiquette /         2.2.8  Debrief, Feedback and Workplace Conduct / 2.3  Ownership, Accountability and Integrity / 2.4  Receiving Feedback and Working With Your Manager |
| CRT / PROB | Critical Thinking and Problem Solving | 3.1  Thinking Critically: Facts, Assumptions and Bias / 3.2  Structured Problem Solving: From Problem to Solution / 3.3  Working With Data and Numbers / 3.4  Making Decisions and Solving Case Problems |
| TEAM | Teamwork and Collaboration | 4.1  How Teams Work: Roles, Stages and Agile Basics / 4.2  Collaborating Day to Day: Handoffs, Shared Work and Remote Teams / 4.3  Handling Conflict and Difficult Conversations / 4.4  Working in Diverse and Cross-Cultural Teams |
| TIME | Time Management and Productivity | 5.1  Prioritization: Urgent Versus Important / 5.2  Planning Your Day and Week / 5.3  Focus and Digital Discipline / 5.4  Managing Deadlines, Workload and Work-Life Balance |
| ADAPT | Adaptability and Learning Agility | 6.1  Growth Mindset and Embracing Change / 6.2  Learning Agility: Learn Anything in 14 Days / 6.3  Resilience: Handling Setbacks, Rejection and Pressure / 6.4  Technology and AI Fluency at Work |', 0, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('d9cfc60d-57fc-5704-9736-0b807a1e5f5d', '50ead0b9-acd0-5513-896c-3dee2c433128', 'Business Email and Written Communication', '## Skill 1: Communication

Skill code: COMM

Communication is the skill recruiters mention most often. In a corporate job you will spend more time writing emails, joining calls and explaining your work than doing almost anything else. People who communicate clearly get noticed, are trusted with bigger work and grow faster.

By the end of this skill you will be able to:

- Write clear, polite emails and chat messages that get a quick response

- Explain an idea in under a minute using a simple structure

- Listen carefully and ask questions that show you understand

- Introduce yourself and answer interview questions with confidence

## Module 1.1: Business Email and Written Communication

Suggested time: 60 minutes

Objective:  Write emails and chat messages that are clear, short and easy to act on.

## WHAT YOU NEED TO KNOW

- Decide the purpose first: do you want information, a decision or an action? Say so in the first two lines.

- Use a specific subject line. "Query" is weak. "Approval needed by Friday: laptop for new joiner" is strong.

- Follow a simple structure: greeting, one line of context, the request, the deadline, thanks. Keep paragraphs to two or three lines and use bullets for lists.

- Keep the tone polite but direct. Avoid slang, ALL CAPITALS and too many exclamation marks. Read the email once before sending.

- Use CC for people who need to know, not for everyone. Think twice before using Reply-All.

- Chat tools such as Teams or Slack are for short messages. Write the full question in one message instead of sending "Hi" and waiting.

Workplace example:  A trainee writes: "Sir, please send the file." The manager has three files pending and does not know which one is meant. Better version: "Hi Rahul, could you please share the Q2 attendance report (Excel) by 4 pm today? I need it for tomorrow''s review. Thanks, Ananya."

Try it yourself:  Write an email to your manager asking for two days of leave next week for a family function, and mention how your pending work will be covered. Keep it under 100 words with a clear subject line.

## COMMON MISTAKES

- Vague subject lines and missing deadlines

- Long paragraphs that hide the actual request

- Forgetting the attachment, or writing while angry

## CHECKPOINT QUESTIONS

- What three things should the first two lines of a good email make clear?

- Why is sending only "Hi" on chat and waiting for a reply a poor habit?', 60, 2, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('c87651f5-a7bf-58b6-80e5-54b5de95dd8d', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '1.2: Speaking Clearly: The PREP Method', 'Explain your ideas in a short, structured way in meetings, calls and interviews.', 2, (SELECT id FROM public.skills WHERE code='COMM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('03b54985-849d-5567-a17f-fa8dcb336298', 'c87651f5-a7bf-58b6-80e5-54b5de95dd8d', 'Speaking Clearly: The PREP Method', '## Module 1.2: Speaking Clearly: The PREP Method

Suggested time: 60 minutes

Objective:  Explain your ideas in a short, structured way in meetings, calls and interviews.

## WHAT YOU NEED TO KNOW

- Most people ramble because they start speaking before they know their main point. Pause for three seconds and choose your point first.

- PREP gives your answer a shape: Point (your answer), Reason (why), Example (proof) and Point again (repeat the takeaway).

- Speak slightly slower than normal, pause between ideas and reduce filler words such as "um", "like" and "basically". A short silence sounds confident, not weak.

- On video calls, look at the camera, keep your audio clear and avoid reading from a script.

- Indian English is completely acceptable in the workplace. Clarity matters more than accent, so keep sentences short and pronounce key words carefully.

Workplace example:  Question: "Do you prefer working alone or in a team?" PREP answer: "I prefer working in a team (Point), because ideas get better when people challenge them (Reason). In our four-member final-year project, our first design failed review until a teammate spotted a flaw in the database structure (Example). So I value teamwork, while staying comfortable working independently (Point)."

Try it yourself:  Record yourself on your phone answering "Why should we hire you?" using PREP in 60 seconds. Listen back, count your filler words, and repeat the exercise three times.

## COMMON MISTAKES

- Starting with too much background before the answer

- Answering a different question from the one asked

- Speaking too fast when nervous

## CHECKPOINT QUESTIONS

- What does each letter in PREP stand for?

- Why is it useful to decide your main point before you start speaking?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('3e433259-c55c-5c67-a224-477273a989e5', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '1.3: Active Listening and Asking Good Questions', 'Understand instructions correctly the first time and ask questions that show you are thinking.', 3, (SELECT id FROM public.skills WHERE code='COMM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('49738492-5c45-53c4-820f-e04cc2d8dbf1', '3e433259-c55c-5c67-a224-477273a989e5', 'Active Listening and Asking Good Questions', '## Module 1.3: Active Listening and Asking Good Questions

Suggested time: 45 minutes

Objective:  Understand instructions correctly the first time and ask questions that show you are thinking.

## WHAT YOU NEED TO KNOW

- Listening is not waiting for your turn to speak. Give full attention: close extra tabs, keep your phone away and note key points.

- Show you are listening with short responses and by paraphrasing: "So you need the report before the client call, correct?"

- Repeat back every instruction: the task, the deadline and the format. This one habit prevents most rework in the first year of a job.

- Ask three kinds of questions: clarifying ("Which client is this for?"), probing ("What does a good result look like?") and checking ("Have I understood this correctly?").

- Before asking a colleague, spend ten minutes trying yourself. Then say what you tried: "I checked the shared folder and the last report, but I could not find the template."

- In virtual meetings, use the chat for questions and summarize action items at the end.

Workplace example:  A manager says quickly, "Prepare the tracker." The trainee asks: "Which data should it cover, in what format, and by when?" and then confirms the answer by email. The first version is accepted without changes.

Try it yourself:  In your next lecture or online session, write down five key points and one clarifying question. Afterwards, explain the session to a friend in three sentences.

## COMMON MISTAKES

- Interrupting or finishing other people''s sentences

- Pretending to understand and guessing later

- Asking questions that were already answered in the email

## CHECKPOINT QUESTIONS

- What three details should you always repeat back when you receive a task?

- What should you do before asking a colleague for help?', 45, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('0793217a-8b16-5c97-a3e7-1de5a52704bc', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '1.4: Self-Introduction and Interview Communication', 'Present yourself with confidence and answer common interview questions in a structured way.', 4, (SELECT id FROM public.skills WHERE code='COMM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('1c89ad5d-8d9b-5483-8294-694a7066c750', '0793217a-8b16-5c97-a3e7-1de5a52704bc', 'Self-Introduction and Interview Communication', '## Module 1.4: Self-Introduction and Interview Communication

Suggested time: 75 minutes

Objective:  Present yourself with confidence and answer common interview questions in a structured way.

## WHAT YOU NEED TO KNOW

- "Tell me about yourself" is a 60 to 90 second pitch, not your life story. Use Present (degree, college, strengths), Past (a project, internship or achievement) and Future (what you want to do and why this role).

- For behavioural questions, use STAR: Situation, Task, Action and Result. Focus on what you did, and include numbers where possible.

- Prepare five stories from college life: a team project, a deadline you almost missed, a disagreement, a failure, and a time you learnt something quickly. Each story can answer many different questions.

- Research the company: what it does, its recent news and the role. Prepare two thoughtful questions to ask the interviewer.

- Be honest. If you do not know something, say: "I have not worked on this yet, but this is how I would learn it."

- For video interviews, keep light in front of you, a stable internet connection, a tidy background and look at the camera.

Workplace example:  Question: "Tell me about a challenge." STAR answer: "Three days before our final-year project demo, the application crashed (Situation). I was responsible for the database (Task). I checked the logs, found duplicate entries, corrected the query and added a test (Action). The demo ran without errors and our project received the highest grade in the batch (Result)."

Try it yourself:  Write your self-introduction using Present, Past, Future. Time it to about 75 seconds and practise until it sounds natural. Then write two STAR stories from your own experience.

## COMMON MISTAKES

- Reciting a memorized paragraph like a poem

- Saying "we" throughout so the interviewer never learns what you did

- Criticizing a former teacher, team or company

## CHECKPOINT QUESTIONS

- What do the three parts of a self-introduction (Present, Past, Future) cover?

- What does each letter of STAR stand for?', 75, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('83008e59-4f1a-5c88-bbb8-226a507e9e40', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '1.5: Basic Grammar for Workplace English', 'Use the basic rules of English grammar correctly in emails, meetings and interviews.', 5, (SELECT id FROM public.skills WHERE code='COMM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('dd31dcda-d8f7-5d61-b0ed-f4bbb398b5a6', '83008e59-4f1a-5c88-bbb8-226a507e9e40', 'Introduction: Basic Grammar for Workplace English', '## Module 1.5: Basic Grammar for Workplace English

Suggested time: 3 to 4 hours (four sub-topics)

Objective:  Use the basic rules of English grammar correctly in emails, meetings and interviews.

Good grammar does not mean fancy English. It means your message is clear, correct and professional. Managers and recruiters notice repeated errors in emails, resumes and interviews, and they often read them as carelessness. This module covers the four areas that cause the most errors: parts of speech, articles, tenses and subject-verb agreement. Each sub-topic has a table of examples, key points and a "fix these" table showing common mistakes with the correct form. Some of these mistakes are common in Indian English but can confuse international readers, so they are worth correcting early.', 0, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('44c05728-dc32-55a5-8552-bd73a0729d26', '83008e59-4f1a-5c88-bbb8-226a507e9e40', '1.5.1  Parts of Speech', '## 1.5.1  Parts of Speech

Every word in a sentence does a job. The job a word does is called its part of speech. Knowing the eight parts of speech helps you build complete sentences and spot your own mistakes.

| Part of speech | What it does | Examples in workplace sentences |
| --- | --- | --- |
| Noun | Names a person, place, thing or idea | The manager approved the budget. (manager, budget) / Teamwork improves results. (teamwork, results) |
| Pronoun | Takes the place of a noun | Ananya finished the report. She sent it to the client. (she, it) |
| Verb | Shows an action or a state | We submitted the proposal. (action) / The client is happy. (state) |
| Adjective | Describes a noun or pronoun | She wrote a clear and short email. (clear, short) |
| Adverb | Describes a verb, an adjective or another adverb | Please reply quickly. (quickly) / The report is very detailed. (very) |
| Preposition | Shows place, time, direction or relationship | The meeting is at 3 pm on Monday in Room 4. (at, on, in) |
| Conjunction | Joins words, phrases or sentences | I finished the report, but I need one more day to review it. (but) / We will start because everyone has arrived. (because) |
| Interjection | Shows sudden feeling; used mostly in informal speech | Oops, I attached the wrong file. (oops) / Great, that works! (great) |

## KEY POINTS

- Every complete sentence needs at least a subject (a noun or pronoun) and a verb.

- The same word can be different parts of speech depending on its job. "Send the report" uses report as a noun. "Please report the issue" uses report as a verb.

- Adjectives describe nouns and adverbs describe verbs. Compare "a quick reply" (adjective) with "reply quickly" (adverb). Likewise, "good" is an adjective (a good job) and "well" is an adverb (she did the job well).

- Prepositions must be chosen carefully. Common workplace ones: at 3 pm, on Monday, in March, by Friday (deadline), for two hours, since 2024, responsible for, interested in, depend on.

- Keep interjections for casual conversation. Avoid them in formal emails and reports.

## FIX THESE COMMON ERRORS

| Instead of | Write |
| --- | --- |
| Please discuss about the plan. | Please discuss the plan. |
| Please revert back by Friday. | Please reply by Friday. |
| We need to cope up with the workload. | We need to cope with the workload. |
| Kindly do the needful. | Please send the signed form by 5 pm. (say exactly what you need) |
| He explained me the process. | He explained the process to me. |
| She speaks English good. | She speaks English well. |
| Can we prepone the meeting? | Can we move the meeting earlier? |

Try it yourself:  Write a five-line update about your final-year project. Then label at least one noun, verb, adjective, adverb and preposition in three of your sentences.

## CHECKPOINT QUESTIONS

- What is the difference between an adjective and an adverb? Give one example of each.

- What part of speech is the word "report" in the sentence "Please report the issue"?

- Which preposition completes the sentence: "Please send the file ___ Friday" when Friday is the deadline?

Answers:  1) An adjective describes a noun (a clear email); an adverb describes a verb, adjective or adverb (write clearly). 2) A verb. 3) by.', 60, 2, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('252669be-82e1-5798-9d92-14075decae01', '83008e59-4f1a-5c88-bbb8-226a507e9e40', '1.5.2  Articles: A, An and The', '## 1.5.2  Articles: A, An and The

Articles are small words placed before nouns, but they cause many errors, especially for students whose first language has no articles. There are three: a, an and the. There is also a fourth option: using no article at all.

| Article | When to use it | Examples |
| --- | --- | --- |
| a | Before a singular countable noun that starts with a consonant sound, when you mean any one or are mentioning it for the first time | I have a meeting at 3 pm. / She is a trainer. / He joined a university in Mysuru. |
| an | Before a singular countable noun that starts with a vowel sound | Please send me an email. / Wait for an hour. / She is an MBA graduate. |
| the | When both speaker and listener know which one, when it was already mentioned, when there is only one, and with superlatives and ordinals | Send me the report you prepared. / I received a complaint. The complaint was about delivery. / This is the best option. Start with the first step. |
| no article | Before plural or uncountable nouns used in a general sense, names of people, cities, most countries, languages, subjects, meals and many fixed phrases | Managers need communication skills. / I studied economics in India. / Let us discuss this by phone. / She is at work. |

## KEY POINTS

- Choose a or an by the sound, not the spelling. Say "a university" (starts with a "yu" sound), "an hour" (the h is silent), "an MBA" (starts with "em"), "an IT company" (starts with "eye") and "a one-day workshop" (starts with a "w" sound).

- The first time you mention something, use a or an. The next time, use the: "I need a laptop. The laptop must have 16 GB of RAM."

- Uncountable nouns never take a or an and have no plural form. Common ones: information, advice, feedback, equipment, news, furniture, knowledge, work. Say "some advice" or "a piece of advice".

- Use the with a few countries whose names are plural or contain a word like Kingdom, States or Emirates: the UK, the USA, the UAE, the Netherlands. Do not use the with India, Japan or Germany.

- Fixed phrases without an article: by bus, by email, at home, at work, in college, at night, on time. Compare with phrases that need the: go to the office, in the morning, on the phone.

## FIX THESE COMMON ERRORS

| Instead of | Write |
| --- | --- |
| I have a good news. | I have good news. (or: I have a piece of good news.) |
| She gave me an advice. | She gave me some advice. |
| He is engineer. | He is an engineer. |
| I go to office by the bus. | I go to the office by bus. |
| I am a MBA student. | I am an MBA student. |
| She works in a IT company. | She works in an IT company. |
| I received informations from HR. | I received information from HR. |

Try it yourself:  Write six sentences about your day. Use a, an, the and no article at least once each. Read them aloud and check the article before every noun.

## CHECKPOINT QUESTIONS

- Which article goes before each: ___ hour, ___ university, ___ MBA?

- Why can you not say "an advice"? What can you say instead?

Answers:  1) an hour, a university, an MBA. 2) Advice is uncountable, so it cannot take a or an. Say "some advice" or "a piece of advice".', 60, 3, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('ad30bbf6-b866-53e7-905f-8e90b317a847', '83008e59-4f1a-5c88-bbb8-226a507e9e40', '1.5.3  Tenses', '## 1.5.3  Tenses

A tense tells the reader when something happens: in the past, present or future. English has twelve tenses, but most workplace communication uses only a handful of them regularly. The table shows all twelve with workplace examples so you can recognise them.

| Tense | When to use it | Example |
| --- | --- | --- |
| Simple present | Habits, facts, routines and schedules | The team meets every Monday. |
| Present continuous | Happening now, or a fixed plan for the near future | I am preparing the report. / We are meeting the client on Friday. |
| Present perfect | A finished action with a result now, or an experience, when the time is not stated | I have sent the file. / She has worked here for two years. |
| Present perfect continuous | An action that began in the past and is still going on, stressing how long | I have been working on this since morning. |
| Simple past | A finished action at a stated time in the past | I sent the report yesterday. |
| Past continuous | An action in progress at a moment in the past, or interrupted | I was presenting when the power went off. |
| Past perfect | An action completed before another past action | The client had left before I arrived. |
| Past perfect continuous | How long something had been happening before a past moment | We had been waiting for an hour when the manager joined. |
| Simple future | Decisions made now, promises and predictions | I will send the file by 5 pm. |
| Future continuous | An action in progress at a future time | This time tomorrow, I will be presenting to the client. |
| Future perfect | An action that will be completed before a future time | By Friday, we will have finished the testing. |
| Future perfect continuous | How long something will have been going on by a future time | By June, I will have been working here for two years. |

## KEY POINTS

- Keep the tense consistent within a paragraph unless the time really changes.

- Use the simple past when you state a finished time (yesterday, last week, in 2025). Use the present perfect when the time is not stated or still matters: "I sent it yesterday" but "I have sent it."

- Use for with a length of time (for two years) and since with a starting point (since 2024).

- Some verbs describe states, not actions, and are normally not used in the continuous form: know, understand, like, want, need, believe, have (meaning own). Say "I know", not "I am knowing".

- For plans, "going to" shows an intention already decided ("I am going to start next week"), while "will" is for a decision made at the moment of speaking ("I will do it now").

- After if, when, as soon as and before, use the present tense for future meaning: "If you send it today, I will review it tomorrow."

## FIX THESE COMMON ERRORS

| Instead of | Write |
| --- | --- |
| I am working here since 2024. | I have been working here since 2024. |
| Yesterday I have sent the mail. | Yesterday I sent the mail. |
| I am knowing him. | I know him. |
| I am having a laptop. | I have a laptop. |
| If you will send it today, I will review it. | If you send it today, I will review it. |
| I am here since two hours. | I have been here for two hours. |

Try it yourself:  Write three sentences about your college days (past), three about what you are doing now (present) and three about your job plans (future). Then add one present perfect sentence using for and one using since.

## CHECKPOINT QUESTIONS

- When do you use for and when do you use since?

- Which sentence is correct: "I have finished the report yesterday" or "I finished the report yesterday"? Why?

Answers:  1) Use for with a period of time (for two years) and since with a starting point (since 2024). 2) "I finished the report yesterday", because yesterday is a stated finished time, which needs the simple past.', 60, 4, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('fbf8f1af-7530-55b2-a7f7-0b5a2dc8c4bc', '83008e59-4f1a-5c88-bbb8-226a507e9e40', '1.5.4  Subject-Verb Agreement Rules', '## 1.5.4  Subject-Verb Agreement Rules

The verb in a sentence must agree with its subject in number. A singular subject takes a singular verb and a plural subject takes a plural verb. The trick is to find the true subject first: ask yourself, "Who or what is doing the action or being described?" Ignore the words in between.

| Rule | Correct examples |
| --- | --- |
| 1. In the present tense, singular subjects (he, she, it, a singular noun) take a verb ending in -s or -es. Plural subjects and I, you, we, they take the base form. | The manager approves the leave. / The managers approve the leave. / I work in Mysuru. She works in Bengaluru. |
| 2. Watch the verbs be and have: is/has for singular, are/have for plural, and I takes am/have. | She has a meeting. They have a meeting. / I am ready. You are ready. |
| 3. Words between the subject and the verb do not change the agreement. Ignore phrases with along with, as well as, in addition to, and of. | The manager, along with her team, is attending the workshop. / The list of tasks is long. |
| 4. Two subjects joined by and are plural. Exception: when they name one single thing. | The report and the presentation are ready. / Fish and chips is a popular dish. |
| 5. With or, nor, either...or and neither...nor, the verb agrees with the subject nearest to it. | Either the students or the trainer is responsible. / Neither the trainer nor the students were late. |
| 6. Each, every, either, neither, one, everyone, someone, anyone and nobody are singular. | Everyone has submitted the form. / Each of the candidates was interviewed. |
| 7. Both, few, many and several are plural. With some, all, most and half, look at the noun after of. | Several candidates were shortlisted. / Most of the report is ready. / Most of the reports are ready. |
| 8. Collective nouns (team, committee, staff, company, group) usually take a singular verb in business writing when the group acts as one. | The team is meeting the client today. / The company has announced new openings. |
| 9. "The number of" takes a singular verb. "A number of" takes a plural verb. | The number of applicants is high. / A number of applicants are waiting. |
| 10. Uncountable nouns take a singular verb: information, advice, feedback, equipment, news, furniture, knowledge. | The feedback was positive. / The equipment is new. / The information is correct. |
| 11. Some nouns end in -s but are singular (news, mathematics, economics). Some are always plural (scissors, trousers, jeans). Data is used as singular in most business writing; use one form consistently. | The news is good. / My trousers are new. / The data is ready for analysis. |
| 12. After there or here, the verb agrees with the noun that follows. | There is one issue. / There are three issues. |
| 13. Amounts of money, time and distance are treated as a single unit and take a singular verb. | Ten lakh rupees is a large budget. / Two hours is enough for the session. |

## KEY POINTS

- Find the true subject first. Cross out phrases beginning with of, with, along with and any words inside commas. What remains is your subject.

- Do not be misled by the noun closest to the verb. In "The list of tasks is long", the subject is list, not tasks.

- With does not mean and. "The manager with two trainers is here" is singular, but "The manager and two trainers are here" is plural.

- In a question, the subject comes after the verb, so check carefully: "Where are the files?" and "Where is the file?"

## FIX THESE COMMON ERRORS

| Instead of | Write |
| --- | --- |
| The list of tasks are long. | The list of tasks is long. |
| Everyone have submitted the form. | Everyone has submitted the form. |
| The team are meeting the client. | The team is meeting the client. |
| The informations are correct. | The information is correct. |
| There is three issues. | There are three issues. |
| He don''t know the answer. | He doesn''t know the answer. |
| The number of applicants are high. | The number of applicants is high. |

Try it yourself:  Correct this paragraph: "The team are ready. Each of the members have finished their tasks. There is many issues in the report. The number of clients are increasing. Neither the manager nor the trainers was present."

Answer: The team is ready. Each of the members has finished their tasks. There are many issues in the report. The number of clients is increasing. Neither the manager nor the trainers were present.

## CHECKPOINT QUESTIONS

- What is the first step to check subject-verb agreement in a long sentence?

- Which is correct: "A number of students is absent" or "A number of students are absent"?

- In "Neither the trainer nor the students were late", why is the verb plural?

Answers:  1) Find the true subject and ignore phrases in between. 2) "A number of students are absent". 3) The verb agrees with the nearest subject, students, which is plural.', 60, 5, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('01d3f1cc-efb6-531d-ad4d-89a3e1d64031', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '2.1: Corporate Culture and Your First 90 Days', 'Understand how a company works and plan a strong start to your first job.', 6, (SELECT id FROM public.skills WHERE code='PROF'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('c7bd9f77-3b40-5594-9b2c-2d214a10c1dd', '01d3f1cc-efb6-531d-ad4d-89a3e1d64031', 'Corporate Culture and Your First 90 Days', '## Skill 2: Professionalism and Workplace Etiquette

Skill code: PROF

Professionalism is how you show up: on time, prepared, respectful and reliable. Companies can teach technical skills in a few weeks, but attitude is much harder to change. Many freshers lose good opportunities because of avoidable behaviour, not because of lack of ability.

By the end of this skill you will be able to:

- Understand how a corporate workplace differs from college

- Follow workplace etiquette: dress and grooming, public behaviour, punctuality, phone use and floor security

- Take ownership, keep commitments and handle mistakes maturely

- Receive feedback well and work effectively with your manager

## Module 2.1: Corporate Culture and Your First 90 Days

Suggested time: 60 minutes

Objective:  Understand how a company works and plan a strong start to your first job.

## WHAT YOU NEED TO KNOW

- In college you are responsible for yourself. In a company you are responsible to a team, a manager and often a client.

- Learn the structure quickly: your reporting manager, team lead, HR contact, mentor or buddy, and the client if there is one. Know who to approach for what.

- Think of the first 90 days in three stages: days 1 to 30 learn (people, tools, processes), days 31 to 60 contribute (small tasks done well), days 61 to 90 own (deliver independently and suggest improvements).

- Read the onboarding material carefully: code of conduct, attendance and leave rules, timesheets and information security. These are not formalities.

- Build relationships early. Learn names, introduce yourself and thank people who help you.

Workplace example:  Two new joiners finish induction. One waits to be told what to do. The other asks their manager at the end of week one: "What are the top three things I should learn this month?" and keeps a weekly learning log. Within two months the second joiner is trusted with real tasks.

Try it yourself:  Choose a job you would like to get. Draft a one-page 30-60-90 day plan describing what you will learn, contribute and own in each stage.

## COMMON MISTAKES

- Staying silent and waiting for instructions

- Being late or casual in the first week

- Comparing salary or role with peers instead of focusing on learning

## CHECKPOINT QUESTIONS

- Name the three stages of the first 90 days.

- Who are the four or five key people a new joiner should identify in week one?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '2.2: Workplace Etiquette', 'Understand and follow the everyday etiquette expected in a corporate workplace, from how you dress and behave to how you use your phone and protect the floor.', 7, (SELECT id FROM public.skills WHERE code='PROF'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('742b72f1-adf3-5cab-9d1b-a0857dd9676c', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', 'Introduction: Workplace Etiquette', '## Module 2.2: Workplace Etiquette

Suggested time: 3 to 4 hours (eight sub-topics)

Objective:  Understand and follow the everyday etiquette expected in a corporate workplace, from how you dress and behave to how you use your phone and protect the floor.

Etiquette means the unwritten rules of good behaviour at work. Nobody hands you a rulebook on day one, yet colleagues and managers notice quickly whether you follow them. This module follows the Corporate Readiness session step by step: why it matters, attire and grooming, attitude and public behaviour, punctuality and discipline, workplace communication, mobile phone etiquette, floor etiquette, and the closing debrief. Each sub-topic has a table of points, do and don''t guidance, and an activity you can try on your own.', 0, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('db70daf6-6da0-5c2e-95bc-5ffa7fe9767f', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.1  Why Corporate Readiness Matters (WIIFM)', '## 2.2.1  Why Corporate Readiness Matters (WIIFM)

WIIFM stands for "What is in it for me?" It is the question every learner asks before investing time, so we answer it first. Corporate readiness is not about following rules for their own sake. It is about how you present yourself, how quickly you settle into a company and how others judge you from the very first day.

| Benefit | What it means for you |
| --- | --- |
| Enhanced professional presence | People form an impression of you within seconds. How you dress, speak and behave makes managers, colleagues and clients take you seriously. |
| Faster adjustment to corporate life | You learn the unwritten rules early, so you feel comfortable sooner and avoid embarrassing mistakes in the first weeks. |
| Better performance from Day 1 | When you handle basics such as timing, communication and conduct without effort, you can put your energy into learning the job and delivering results. |
| Career growth | Reliable, well-mannered people are trusted with responsibility, chosen for good projects and considered for promotion. |

## KEY POINTS

- First impressions form quickly and are hard to change later.

- Etiquette is a skill you can learn and practise. It is not a matter of personality or background.

- Managers often notice your conduct long before they see the full quality of your technical work.

Try it yourself:  For each of the four benefits, write one way it could help you in your first three months at work. Then decide which benefit matters most to you and explain why in two lines.

## CHECKPOINT QUESTIONS

- What does WIIFM stand for?

- Name the four benefits of corporate readiness.

Answers:  1) What is in it for me? 2) Enhanced professional presence, faster adjustment to corporate life, better performance from Day 1, and career growth.', 30, 2, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('90df724b-fa9a-5a10-b5fd-3ba4cd8464cc', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.2  Attire, Grooming and Personal Hygiene', '## 2.2.2  Attire, Grooming and Personal Hygiene

Imagine two equally talented people. One arrives neatly dressed and well groomed. The other arrives in creased, casual clothes with untidy hair. Most people would trust the first person with a client meeting, even before hearing a word. Your appearance is the first message you send at work. Five areas matter: attire, hair style, grooming and personal hygiene, nails and perfume.

| Area | What looks professional |
| --- | --- |
| Attire | Clean, ironed and well-fitting clothes that follow the company dress code. Wear formal clothes for interviews, client meetings and on days the policy requires them. Choose closed, clean, comfortable shoes. Avoid torn, faded, very tight, revealing or slogan-heavy clothing. If you are unsure, choose neat and simple. |
| Hair style | Clean, combed and neatly styled. Long hair should be tied back or tidy. Keep a beard trimmed or shave regularly. Avoid extreme styles or colours and hair that keeps falling over your face. |
| Grooming and personal hygiene | Bathe daily, wear clean clothes, brush your teeth and use deodorant. Keep shirt collars, cuffs and shoes clean. Good hygiene matters even more in a shared, close-seating workplace. |
| Nails | Keep them short, clean and trimmed. Do not bite them. Your hands are visible when you type, shake hands and present, so avoid very long, chipped or loud nail styles in a formal setting. |
| Perfume | Use a light fragrance or none at all. A strong scent can bother colleagues in a shared space, and some people are sensitive to it. A good rule: others should notice it only when standing very close. |

## KEY POINTS

- On your first day, dress one level smarter than you think necessary. You can adjust after you see what others wear.

- Wear your ID card visibly if the company requires it (see Floor Etiquette).

- Keep a small kit in your bag: a comb, tissues, a spare pen and mints. It helps you stay fresh through the day.

## DO''S AND DON''TS

| Don''t | Do |
| --- | --- |
| Wear wrinkled, stained or torn clothes. | Wear clean, ironed clothes that fit well. |
| Wear slippers or flip-flops to the office. | Wear closed, clean formal or smart shoes. |
| Come with uncombed hair or an untrimmed beard. | Keep your hair and beard neat and tidy. |
| Bite your nails or keep them long and dirty. | Keep nails short, clean and trimmed. |
| Spray heavy perfume. | Use deodorant and a light fragrance. |
| Ignore body odour or bad breath. | Bathe daily and keep your breath fresh. |

Try it yourself:  Do''s and Don''ts activity: choose one full outfit for an office day and check it against the table above, item by item. Then ask a friend to rate your overall look out of 10 and to suggest one improvement.

## CHECKPOINT QUESTIONS

- Name the five areas of appearance covered in this topic.

- Why should perfume be used lightly at work?

Answers:  1) Attire, hair style, grooming and personal hygiene, nails, and perfume. 2) Strong fragrance can bother colleagues in a shared space, and some people are sensitive to it.', 30, 3, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('d00a923d-c202-5bbe-b8e0-4adf9a9ac987', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.3  Attitude and Public Behaviour', '## 2.2.3  Attitude and Public Behaviour

Your behaviour in shared places such as the cafeteria, lift, restroom and corridor shows your attitude. Colleagues, senior leaders and visitors see you in these places and judge your character by small habits. This topic covers eight everyday situations.

| Situation | Expected behaviour |
| --- | --- |
| Dining etiquette | In a group, wait until everyone is served or the senior person begins. Sit upright, chew with your mouth closed and do not talk with food in your mouth. Take only what you can finish, keep your phone away, say thank you, and clear your tray and table. Avoid strong-smelling food at your desk. |
| Restroom courtesy | Leave it as you would like to find it: flush, wipe surfaces, use the bins and wash your hands. Do not waste water, make phone calls or leave litter. Wait your turn, and report broken items to the facilities team. |
| Birthday celebration | Celebrate in a common area or during a break, with your manager''s approval. Keep noise low, invite everyone in the team, and respect food preferences and restrictions. Never pressure anyone to join or contribute money. Keep it clean and dignified, avoid messy or embarrassing pranks, and clean up afterwards. |
| Elevator manners | Let people exit before you enter. Hold the door for someone approaching. Stand to one side, keep your voice low and avoid discussing confidential matters. Let visitors, seniors, elderly people and persons with disabilities enter first. If the lift is full, wait for the next one. |
| Body language | Sit and stand straight. Do not slouch, put your feet on furniture or cross your arms defensively. Make natural eye contact, smile, and give a firm handshake where appropriate. Avoid fidgeting, pointing, eye-rolling or looking at your phone while someone speaks. Your body should support your words. |
| Personal space and gossip | Keep about an arm''s length distance and never touch someone without their comfort. Do not read others'' screens or papers. Do not gossip about colleagues or managers, or spread rumours. Walk away from gossip. If you have an issue with someone, speak to that person or your manager. |
| Queue discipline | Wait for your turn in the cafeteria, at security checks, for shuttles and at counters. Do not push ahead or hold a place for a large group of friends. Patience shows respect. |
| Additional responsibilities | Take on extra tasks willingly when the team needs help, such as covering for a colleague or supporting an event. Ask about priorities and deadlines, and do the extra work well. If you are overloaded, say so politely with facts instead of saying "not my job". |

## KEY POINTS

- Behave the same way whether or not a senior person is watching.

- Small courtesies such as please, thank you, sorry and a friendly greeting cost nothing and are remembered.

- Treat everyone respectfully, including housekeeping, security, drivers and cafeteria staff.

## DO''S AND DON''TS

| Don''t | Do |
| --- | --- |
| Enter the lift before others have stepped out. | Let people exit first, then enter. |
| Push ahead in a queue. | Wait patiently for your turn. |
| Discuss a colleague''s personal life in the corridor. | Speak to the person concerned or to your manager about real issues. |
| Slouch, cross your arms and look at your phone while someone talks. | Sit upright, keep an open posture and look at the speaker. |
| Leave the restroom or pantry untidy. | Leave shared spaces clean for the next person. |
| Say "that is not my job" when asked for help. | Ask how you can help and clarify priorities. |

Try it yourself:  Activity: choose any three of the eight situations. For each, write one thing a person with a good attitude would do and one thing a person with a poor attitude would do. Then act out one situation with a friend and ask what they noticed.

## CHECKPOINT QUESTIONS

- Name any five of the eight situations covered under attitude and public behaviour.

- Why is gossip risky at work? What should you do instead?

Answers:  1) Any five of: dining etiquette, restroom courtesy, birthday celebration, elevator manners, body language, personal space and gossip, queue discipline, additional responsibilities. 2) It spreads rumours, damages trust and can harm your reputation. Instead, speak to the person concerned or your manager about the real issue.', 30, 4, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('b8ca4882-a254-5335-b187-a0bbe1f1253d', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.4  Punctuality and Discipline', '## 2.2.4  Punctuality and Discipline

Punctuality is respect for other people''s time. In a company, one person who is late can delay a whole team, a client call or a shift. Discipline means doing the right thing even when nobody is checking. Three areas are covered: office timings, break timings and meetings.

| Area | What to do |
| --- | --- |
| Office timings | Reach on time, or 10 to 15 minutes early, so you can settle in, log in and be ready to work at the exact start time. Follow your shift timings carefully. If you will be late, inform your manager before the start time, not after. Mark your own attendance and never ask a colleague to do it for you. Plan for traffic and commute, and apply for planned leave in advance. |
| Break timings | Take breaks at the scheduled time and for the allowed duration, and return on time. Inform your team lead if you need to step away at any other time, and hand over any pending items first. Use break time for meals and personal calls instead of working hours. |
| Meetings | Be five minutes early. Read the agenda and bring notes. Keep your phone away and your microphone muted when you are not speaking. Do not multitask or interrupt. Share action items afterwards. If you will be late, inform the organiser in advance. |

## KEY POINTS

- "On time" means ready to work, not just arrived at the building.

- Tell your manager early about any absence, delay or change. Surprises are what damage trust.

- Discipline also covers meeting deadlines, following schedules and completing timesheets honestly.

Workplace example:  A fresher joins a client call from a noisy cafe with the camera off and keeps unmuting to reply. The client asks the manager whether the team is serious. A better approach: a quiet room, headphones, muted microphone when not speaking, and the camera on if the team expects it.

Try it yourself:  For one week, reach your college or class venue 10 minutes early. Note how it changes your mood, your preparation and how others treat you.

## CHECKPOINT QUESTIONS

- What are the three areas covered under punctuality and discipline?

- If you know you will be late for work, when should you inform your manager?

Answers:  1) Office timings, break timings and meetings. 2) Before your start time, not after.', 30, 5, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('0182251f-bbac-510b-9528-4ab70cec8d39', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.5  Workplace Communication', '## 2.2.5  Workplace Communication

Good etiquette shows most clearly in how you communicate. This topic covers six areas: interpersonal communication, tone and language usage, group dynamics, email etiquette, feedback and expressing grievance. It also covers virtual meetings and office chat, where many freshers make avoidable mistakes.

| Area | What good etiquette looks like |
| --- | --- |
| Interpersonal communication | Greet colleagues, use their names, listen fully and ask before assuming. Be clear and polite, and keep personal topics out of work conversations. Adjust your style to suit seniors, peers and clients. See Skill 1 (Communication) for detailed practice. |
| Tone and language usage | Tone is how you sound and language is what you say. Stay calm and respectful even under pressure. Avoid slang, abusive words, sarcasm and jokes about regions or communities. Do not write in ALL CAPITALS. Use please and thank you. In writing, tone is easily misread, so read your message once before sending. |
| Group dynamics | Understand each person''s role. Let others speak, share your ideas without dominating, and encourage quieter members. Disagree politely, give credit to others and follow the team lead''s decisions once made. See Skill 4 (Teamwork). |
| Email etiquette | Use a clear subject line, greeting, short body and polite closing. Check attachments and recipients. Use CC and BCC carefully and think before using Reply-All. Reply within a reasonable time, ideally within one working day. Proofread, never write in anger, and use official email only for official matters. |
| Feedback | When giving feedback, do it privately, be specific and kind, and talk about behaviour, not personality. When receiving it, listen fully, thank the person, ask for examples and act on it. See Module 2.4. |
| Expressing grievance | Raise concerns through the proper channel: first your immediate manager, then HR or the company''s escalation process. Be calm, factual and specific, and keep a written record. Do not air complaints in public groups, social media or gossip. The aim is a solution. For serious matters such as harassment, discrimination or safety, go directly to HR or the Internal Committee. |
| Virtual meetings and office chat | Use a tidy background, good lighting and headphones. Do not eat on camera or type loudly. Treat office chat as a permanent written record, and never write anything you would not say in front of your manager. Remember that screenshots travel. |

## KEY POINTS

- Tone matters as much as the words. The same sentence can sound helpful or rude.

- A grievance raised calmly and in the right order is far more likely to be solved than one raised loudly in public.

- When in doubt about a message, ask: would I be comfortable if my manager read this?

Try it yourself:  Rewrite this rude message in a polite, professional tone: "Why haven''t you sent the file yet? I told you yesterday!"

Sample answer: "Hi Ravi, could you please share the file by 4 pm today? I need it for tomorrow''s review. Let me know if anything is blocking you."

## CHECKPOINT QUESTIONS

- Name the six areas of workplace communication covered in this topic.

- Whom should you approach first with a work grievance? When should you go directly to HR?

Answers:  1) Interpersonal communication, tone and language usage, group dynamics, email etiquette, feedback, and expressing grievance. 2) Your immediate manager first. Go directly to HR or the Internal Committee for serious matters such as harassment, discrimination or safety.', 30, 6, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('2ebb76ad-4cdb-5470-b528-c91fc2cf7c2d', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.6  Mobile Phone Etiquette', '## 2.2.6  Mobile Phone Etiquette

A phone is one of the biggest sources of distraction and of security risk in a workplace. Five points cover most situations: ringtone, silent mode, personal calls, respecting privacy and phone-free environments.

| Point | What to do |
| --- | --- |
| Ringtone | Keep a simple, low-volume and professional ringtone. Loud songs, film dialogues and long caller tunes disturb others and look unprofessional at work. |
| Silent mode | Keep your phone on silent or vibrate in the office, in meetings, in training sessions and on client calls. Check messages during breaks. If you are expecting an urgent call, inform your team lead and step out to take it. |
| Personal calls | Keep them short and rare. Step away from your workstation to a suitable area, use your break time, and do not use speakerphone in an open workspace. Do not discuss private matters loudly. |
| Respect privacy | Do not photograph or record people, screens, documents or the office without permission. Do not read others'' messages or screens. Do not post pictures of colleagues, clients or the workplace on social media. Keep client and company information off personal chats. |
| Phone-free environments | Some areas do not allow mobile phones, such as secure client floors, meetings, training rooms and interviews. Follow the signs and the policy, and keep your phone in your locker or bag when required. These rules protect client data and are not optional. |

## KEY POINTS

- In a meeting, keep your phone silent and face down, and use it only if you have told the organiser about an urgent need.

- If a phone rings at a bad time, silence it immediately and apologize briefly. Do not answer and walk out while speaking.

Try it yourself:  Activity: thumbs up or thumbs down. Cover the answer column and decide for each statement whether it is good phone etiquette (thumbs up) or poor phone etiquette (thumbs down). Then check your answers and explain the reason.

## THUMBS UP OR THUMBS DOWN?

| Statement | Answer |
| --- | --- |
| Using a loud film song as your ringtone in the office. | Thumbs down. It disturbs others. |
| Stepping away from the work area to take a personal call. | Thumbs up. It keeps the floor quiet. |
| Taking a photo of your team''s screen to share in a group chat. | Thumbs down. It breaks privacy and may expose client data. |
| Switching your phone to silent before a training session. | Thumbs up. It respects everyone''s focus. |
| Answering a call on speaker at your workstation. | Thumbs down. Others must listen to your private call. |
| Leaving your phone in your locker when the floor is phone-free. | Thumbs up. It follows policy and protects data. |

## CHECKPOINT QUESTIONS

- Name the five points of mobile phone etiquette covered here.

- Why do some areas of a company not allow phones?

Answers:  1) Ringtone, silent mode, personal calls, respect privacy and phone-free environments. 2) To protect client data and confidential information, and to keep people focused.', 30, 7, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('a95c5ae7-c66d-5d7d-9db6-ffcfe8b3fb80', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.7  Floor Etiquette', '## 2.2.7  Floor Etiquette

The floor is where the work happens. Floor etiquette covers the habits that keep it productive, secure and comfortable for everyone. Five topics are covered: UPL (unplanned leave), tailgating, being nosy, your workstation and your ID card.

| Topic | What you need to know |
| --- | --- |
| UPL (unplanned leave) | UPL is leave taken without prior approval or notice. It leaves the team short-staffed and can affect client commitments and shifts. Plan leave in advance and apply through the official process. In a genuine emergency, inform your manager as early as possible in the way your company requires, and follow up formally. Repeated unplanned leave is usually treated as a discipline issue. |
| Tailgating attacks | Tailgating means following an authorized person through a secure door without swiping your own card. Unauthorized people use it to enter a building and steal data or equipment. Always swipe your own card and never hold the door for someone you do not know or who has no ID. Politely direct visitors to reception, and report suspicious people to security. Being polite does not mean letting strangers in. |
| Being nosy | Do not peek at colleagues'' screens, papers or phone messages, and do not eavesdrop on private conversations. Do not ask about salaries, appraisal ratings or personal matters. If you see confidential information by accident, do not share it. Keep questions focused on work. |
| Workstation | Keep your desk clean and organized. Lock your screen every time you step away and lock confidential papers. Avoid clutter and messy food at the desk. Do not change equipment settings, take others'' equipment or move furniture. Keep noise low, log off at the end of the day and report faults. |
| ID card | Wear it visibly at all times on the premises. Never lend, share or leave it unattended, and never use someone else''s. Report a lost card immediately. Do not photograph or copy it. Swipe your own card every time you enter. |

## KEY POINTS

- Security is everyone''s job. If you see something unusual, report it to security or your manager.

- Rules on the floor protect client data, your colleagues and your own job.

Try it yourself:  Activity: true or false. Cover the answer column, decide whether each statement is true or false, and explain your reason aloud. Then check the answers.

## TRUE OR FALSE?

| Statement | Answer and reason |
| --- | --- |
| It is polite to hold a secure door open for a colleague who forgot to swipe their card. | False. Every person must swipe their own card. Direct them to reception or security. |
| You should lock your computer screen whenever you leave your workstation. | True. It protects data from people passing by. |
| It is fine to lend your ID card to a friend for five minutes. | False. ID cards are personal and must never be shared. |
| Taking a day off without telling anyone is acceptable if it is only for one day. | False. Unplanned leave affects the team. Inform your manager as early as possible. |
| Glancing at a colleague''s screen out of curiosity is harmless. | False. It invades privacy and may expose confidential information. |
| You should wear your ID card visibly on the floor. | True. It shows you are authorized to be there. |

## CHECKPOINT QUESTIONS

- What is tailgating and why is it dangerous?

- What should you do before leaving your workstation?

Answers:  1) Following an authorized person through a secure door without swiping your own card. It lets unauthorized people enter and steal data or equipment. 2) Lock your screen and secure confidential papers.', 30, 8, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('de25c601-0570-5dbc-91a3-6dbfaf6a0ada', '0be34cb4-0f34-5184-b8fa-8c5dc64964ae', '2.2.8  Debrief, Feedback and Workplace Conduct', '## 2.2.8  Debrief, Feedback and Workplace Conduct

The Corporate Readiness session ends with a debrief: a short look back at what you learnt, and feedback on how you did in the activities. Three habits tie the whole module together: carrying out assigned tasks when required, following organizational policies and rules, and maintaining good floor etiquette and workplace conduct.

| Habit | What it means in practice |
| --- | --- |
| Perform assigned tasks when required | Accept and complete tasks given to you, even outside your usual role, when the business needs it. Confirm the deadline and expected output, and report back when done. |
| Follow organizational policies and rules | Read the code of conduct and the policies on attendance, dress, IT and information security, and leave. Ask HR when something is unclear. Rules protect people, clients and the company, and "I did not know" is not a defence. |
| Floor etiquette and workplace conduct | Everything in this module: how you look, behave, communicate, use your phone and protect the floor. Good conduct applies at company events, in transport and on social media, not only at your desk. |
| Debrief and feedback | After each activity or week, ask: what did I do well, what will I change, and what is one action I will take next? Ask a trainer, mentor or friend for one specific piece of feedback. |

## KEY POINTS

- Habits form through repetition. Choose one or two behaviours to practise each week.

- Feedback is a gift. Thank the person and act on it, even when it is uncomfortable.

Try it yourself:  Etiquette self-audit: score yourself from 1 to 5 on each of the eight sub-topics in this module (2.2.1 to 2.2.8). Pick your two lowest scores, write one action for each, and review your progress after one week.

## CHECKPOINT QUESTIONS

- Which three habits does the debrief emphasize?

- What three questions can you ask yourself in a debrief?

Answers:  1) Performing assigned tasks when required, following organizational policies and rules, and maintaining floor etiquette and workplace conduct. 2) What did I do well? What will I change? What is one action I will take next?', 30, 9, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('9b4ab333-7603-541f-beb2-57ef45d99d02', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '2.3: Ownership, Accountability and Integrity', 'Become someone others can rely on, including when things go wrong.', 8, (SELECT id FROM public.skills WHERE code='PROF'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('adf5905b-e42a-527b-8831-41b4912b0e55', '9b4ab333-7603-541f-beb2-57ef45d99d02', 'Ownership, Accountability and Integrity', '## Module 2.3: Ownership, Accountability and Integrity

Suggested time: 60 minutes

Objective:  Become someone others can rely on, including when things go wrong.

## WHAT YOU NEED TO KNOW

- Ownership means: "This task is mine until it is finished and the person who asked is satisfied."

- Commit carefully. Say yes only when you can deliver. If you are going to miss a deadline, say so early, with the reason and a new date. Bad news does not improve with age.

- Own your mistakes. Use a simple format: what happened, what was the impact, what have I done to fix it, and how will I prevent it next time.

- Integrity means never copying work, falsifying attendance, timesheets or reports, or claiming someone else''s work. Plagiarism in college becomes misconduct at work.

- Protect confidential information. Client data, passwords and internal documents must not be shared through personal email or WhatsApp. Lock your screen when you step away.

- Be careful on social media. Never post client details, internal screenshots or negative comments about your employer.

Workplace example:  After sending a report, an analyst notices a wrong figure. Weak response: hope nobody notices. Strong response: within the hour, send the corrected file with a short note: "I found an error in row 14 of the earlier version. The corrected file is attached. I have added a check to prevent this in future."

Try it yourself:  Write a four-line message to your manager reporting a mistake in a task, using the four-part format (what happened, impact, fix, prevention).

## COMMON MISTAKES

- Hiding a mistake or blaming others

- Saying yes to everything and then missing deadlines

- Sharing internal information casually

## CHECKPOINT QUESTIONS

- What four points should be included when you report a mistake?

- Why is it better to warn early about a missed deadline?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('d325f69a-affd-59df-b0be-90fce8148aea', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '2.4: Receiving Feedback and Working With Your Manager', 'Use feedback to improve and keep your manager informed without being asked.', 9, (SELECT id FROM public.skills WHERE code='PROF'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('116989eb-d12c-5869-8d09-2ee866276d71', 'd325f69a-affd-59df-b0be-90fce8148aea', 'Receiving Feedback and Working With Your Manager', '## Module 2.4: Receiving Feedback and Working With Your Manager

Suggested time: 60 minutes

Objective:  Use feedback to improve and keep your manager informed without being asked.

## WHAT YOU NEED TO KNOW

- Feedback is information, not an attack. Listen fully, thank the person, ask for an example and then decide what to change.

- Ask forward-looking questions: "What is one thing I could do better next time?"

- Learn how your manager likes to receive updates (email, chat or a weekly call). Give short updates before being asked: done, in progress, blocked.

- Escalate wisely. If you are stuck after a genuine attempt, ask for help. If something can affect a deadline or a client, inform your manager early with the facts and a suggested option.

- When you disagree, do it privately and with evidence: "I see it differently because of this data." Once a decision is made, commit to it.

- Ask about performance reviews, goals and how success is measured in your role.

Workplace example:  A manager says the presentation had too many slides. A defensive reply: "But I had to include everything." A professional reply: "Thank you. Which slides would you remove? I will send a shorter version by tomorrow."

Try it yourself:  Ask a friend or mentor to give you honest feedback on one piece of your work. Practise listening without explaining or defending, and write down two actions you will take.

## COMMON MISTAKES

- Becoming defensive or going silent after feedback

- Only speaking to the manager when there is a problem

- Surprising the manager with bad news at the last minute

## CHECKPOINT QUESTIONS

- What is a good three-part format for a regular update to your manager?

- How should you disagree with a decision respectfully?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('aec5c470-f2ec-57ac-9b83-300cbb6a70f0', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '3.1: Thinking Critically: Facts, Assumptions and Bias', 'Question information carefully before accepting it or acting on it.', 10, (SELECT id FROM public.skills WHERE code='CRT'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('b363119e-70a6-54b3-bd84-2bfef82d97a0', 'aec5c470-f2ec-57ac-9b83-300cbb6a70f0', 'Thinking Critically: Facts, Assumptions and Bias', '## Skill 3: Critical Thinking and Problem Solving

Skill code: CRT / PROB

Employers hire people to solve problems. Freshers are not expected to know everything, but they are expected to think logically, break problems into parts and suggest sensible options. This skill also helps you clear aptitude tests, case rounds and situational judgement tests during placements.

By the end of this skill you will be able to:

- Separate facts from opinions and spot common thinking traps

- Solve problems using a clear, repeatable structure

- Read and use basic data confidently

- Make and explain decisions with limited information

## Module 3.1: Thinking Critically: Facts, Assumptions and Bias

Suggested time: 60 minutes

Objective:  Question information carefully before accepting it or acting on it.

## WHAT YOU NEED TO KNOW

- A fact can be checked. An opinion is a personal view. An assumption is something you accept without proof. Keep asking: "How do we know this?"

- Common thinking traps: confirmation bias (noticing only evidence that supports what you already believe), anchoring (the first number you hear sticks), bandwagon thinking (everyone believes it, so it must be true) and confusing correlation with causation.

- Check every source: who created it, what evidence is given, how recent it is and who benefits if you believe it.

- Use five questions: What is the claim? What is the evidence? What is missing? What else could explain this? What would change my mind?

- Apply the same care to social media forwards and AI-generated answers. Verify before you use them.

Workplace example:  "Sales rose after our new advertisement, so the advertisement worked." Other possible reasons: festival season, a discount offer, or a competitor being out of stock. A critical thinker looks for those before taking credit.

Try it yourself:  Choose a news headline that includes a statistic. Answer the five questions in writing and decide how confident you are in the claim.

## COMMON MISTAKES

- Accepting the first explanation that sounds reasonable

- Believing a claim because a senior or famous person made it

- Treating an assumption as a fact

## CHECKPOINT QUESTIONS

- What is the difference between correlation and causation? Give one example.

- Name two questions you can ask to test any claim.', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('6c5e8133-e1fc-5b51-a267-5c6b1ec52023', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '3.2: Structured Problem Solving: From Problem to Solution', 'Use a five-step method to solve everyday work problems.', 11, (SELECT id FROM public.skills WHERE code='PROB'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('e5111f8f-37b8-5ca6-afe8-eae981096a4f', '6c5e8133-e1fc-5b51-a267-5c6b1ec52023', 'Structured Problem Solving: From Problem to Solution', '## Module 3.2: Structured Problem Solving: From Problem to Solution

Suggested time: 75 minutes

Objective:  Use a five-step method to solve everyday work problems.

## WHAT YOU NEED TO KNOW

- Step 1, Define: state the problem in one sentence covering the current situation, the desired situation and the gap. Many failures come from solving the wrong problem.

- Step 2, Break it down: use an issue tree. Split the problem into three or four non-overlapping parts. For example, low sales can mean fewer customers, a smaller order value or less frequent purchases.

- Step 3, Find the root cause: ask "Why?" repeatedly (the 5 Whys) until you reach something you can actually fix.

- Step 4, Generate options: list at least three, including the option of doing nothing.

- Step 5, Choose, act and review: judge options on impact, cost, time and risk. After acting, check whether the problem is really solved.

Workplace example:  A support team closes tickets late. Why? Tickets wait after 6 pm. Why? No one is assigned in the evening. Why? There is no shift handover. Root cause: no handover process. Solution: a simple handover checklist between shifts.

Try it yourself:  Pick a real problem, such as low attendance in 8 am classes at your college. Apply all five steps on one page and present your recommendation in five lines.

## COMMON MISTAKES

- Jumping to a solution before defining the problem

- Fixing symptoms instead of root causes

- Considering only one option

## CHECKPOINT QUESTIONS

- What are the five steps of the method?

- Why is it useful to include "do nothing" as an option?', 75, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('23171bfb-fa4a-5102-bd98-c42efe4c9b73', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '3.3: Working With Data and Numbers', 'Read numbers, charts and simple spreadsheets confidently and turn them into insights.', 12, (SELECT id FROM public.skills WHERE code='CRT'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('780d54b8-535b-5b22-bd11-b43e338eaf93', '23171bfb-fa4a-5102-bd98-c42efe4c9b73', 'Working With Data and Numbers', '## Module 3.3: Working With Data and Numbers

Suggested time: 75 minutes

Objective:  Read numbers, charts and simple spreadsheets confidently and turn them into insights.

## WHAT YOU NEED TO KNOW

- You do not need to be a data scientist. You do need to be comfortable with percentages, averages, ratios, growth rates and trends.

- Percentage change = (New value minus Old value) divided by Old value, times 100. Also learn the difference between percent and percentage points: attendance rising from 60% to 75% is a 15 percentage point rise, but a 25% increase.

- Averages can hide the story. A class average of 70 could mean everyone scored around 70, or half scored 40 and half scored 100. Look at the highest, the lowest and the spread.

- When reading a chart, check the axis, the scale, the time period and what is being compared.

- Excel skills every fresher should have: sort, filter, SUM, AVERAGE, IF, COUNTIF, VLOOKUP or XLOOKUP, pivot tables and simple charts.

- Always finish with "so what?": the insight and the recommended action, not only the numbers.

Workplace example:  A monthly report shows that support tickets rose from 400 to 500. That is a 25% increase. Filtering by category shows that 80 of the extra 100 tickets came from one product. The insight: check that product''s latest release.

Try it yourself:  Take a small dataset such as your semester marks or a month of personal expenses. Build a pivot table and one chart in Excel or Google Sheets, then write three plain-English insights.

## COMMON MISTAKES

- Confusing percentages with percentage points

- Not checking data for duplicates and errors before analysis

- Presenting many numbers with no conclusion

## CHECKPOINT QUESTIONS

- Attendance rises from 60% to 75%. What is the change in percentage points, and what is the percentage increase?

- Why can an average be misleading?', 75, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('6ae244f7-c0c2-5482-86c0-2b19d454862a', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '3.4: Making Decisions and Solving Case Problems', 'Choose between options, justify the choice and communicate it clearly.', 13, (SELECT id FROM public.skills WHERE code='PROB'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('0324ddb3-ac18-51f8-a562-12d38fdca9e0', '6ae244f7-c0c2-5482-86c0-2b19d454862a', 'Making Decisions and Solving Case Problems', '## Module 3.4: Making Decisions and Solving Case Problems

Suggested time: 60 minutes

Objective:  Choose between options, justify the choice and communicate it clearly.

## WHAT YOU NEED TO KNOW

- Most work decisions are made with incomplete information. Ask: is this decision easy to reverse? If yes, decide quickly. If not, take more care.

- A decision matrix helps you compare options. List the options, list the criteria (cost, time, quality, risk), give each criterion a weight and score every option. Use it to explain your thinking, not to hide behind numbers.

- For case questions and situational judgement tests: read carefully, list the facts, identify the main constraint, choose, and justify.

- Add an ethics filter: is it legal, does it follow company policy, is it fair, and would I be comfortable if it became public?

- Communicate the decision as recommendation first, then reasons, then risks and next steps.

Workplace example:  You must choose a training venue for 100 freshers. Venue A is cheap but far, Venue B is central but costly, Venue C has a small hall. Scoring them on cost, distance and capacity shows that B is best, provided the budget can be extended. You present this with the risk clearly stated.

Try it yourself:  Build a decision matrix for a real choice you face, such as choosing between two job offers or two courses. Write a five-line recommendation starting with your choice.

## COMMON MISTAKES

- Waiting for perfect information and never deciding

- Ignoring a hard constraint such as budget or deadline

- Deciding on gut feeling and being unable to explain it

## CHECKPOINT QUESTIONS

- When should you decide quickly and when should you take more time?

- In what order should you present a recommendation?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('738ac13c-a812-5c47-9926-785c1cba0f71', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '4.1: How Teams Work: Roles, Stages and Agile Basics', 'Understand what makes a team effective and how typical corporate teams are organized.', 14, (SELECT id FROM public.skills WHERE code='TEAM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('0cfed556-6fba-5236-8e8e-75e885b2400d', '738ac13c-a812-5c47-9926-785c1cba0f71', 'How Teams Work: Roles, Stages and Agile Basics', '## Skill 4: Teamwork and Collaboration

Skill code: TEAM

Almost no corporate work is done alone. Projects move through developers, testers, analysts, managers and clients. Recruiters look for people who cooperate, share credit and handle disagreements without damaging relationships.

By the end of this skill you will be able to:

- Understand team roles and how corporate teams operate

- Hand over work, share files and collaborate remotely

- Resolve conflict calmly and respectfully

- Work confidently in diverse and cross-cultural teams

## Module 4.1: How Teams Work: Roles, Stages and Agile Basics

Suggested time: 60 minutes

Objective:  Understand what makes a team effective and how typical corporate teams are organized.

## WHAT YOU NEED TO KNOW

- A team is a group with a shared goal, different roles and mutual dependence. Your success depends on other people''s work, and theirs depends on yours.

- Teams go through stages: forming (getting to know each other), storming (disagreements), norming (agreeing how to work) and performing (working smoothly). Some conflict in the storming stage is normal.

- Common roles in a technology or business team: developer or analyst, tester, team lead, delivery or project manager, business analyst and the client. Knowing who does what saves time.

- Many teams use Agile routines: short work cycles called sprints, a daily stand-up (what I did yesterday, what I will do today, what is blocking me), a task backlog and a retrospective at the end.

- A good team member is reliable, shares progress honestly, helps others and gives credit publicly.

Workplace example:  In a daily stand-up, a fresher says: "Yesterday I completed the login page. Today I will start on password reset. I am blocked because I do not have access to the test server." The lead fixes access in ten minutes and the work continues.

Try it yourself:  List the roles in your final-year project team and what each person actually did. Then write a three-line stand-up update for what you worked on yesterday.

## COMMON MISTAKES

- Working silently and revealing problems too late

- Taking credit for shared work

- Not knowing who is responsible for what

## CHECKPOINT QUESTIONS

- What are the three parts of a stand-up update?

- Why is disagreement in the early stages of a team not always a bad sign?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('94065639-39db-5e64-b344-8c3df63ba9b8', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '4.2: Collaborating Day to Day: Handoffs, Shared Work and Remote Teams', 'Share work, files and responsibilities clearly, including across locations and time zones.', 15, (SELECT id FROM public.skills WHERE code='TEAM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('0ad40268-2233-5296-855a-e2ed61f262dc', '94065639-39db-5e64-b344-8c3df63ba9b8', 'Collaborating Day to Day: Handoffs, Shared Work and Remote Teams', '## Module 4.2: Collaborating Day to Day: Handoffs, Shared Work and Remote Teams

Suggested time: 60 minutes

Objective:  Share work, files and responsibilities clearly, including across locations and time zones.

## WHAT YOU NEED TO KNOW

- A good handoff answers five questions: what is done, what remains, where are the files, what is the deadline and whom should I contact. Use a checklist.

- Name and store files sensibly. "Report_final_final2" is a trap. Use shared drives, add dates or version numbers, and use comments or track changes rather than sending many copies. Technology students should learn basic Git.

- In hybrid and remote teams, write things down. Decisions taken in a call should be confirmed by a short message.

- When working with clients in the UK or the US, remember time zone differences. Plan overlap hours and avoid last-minute requests.

- Offer help when you finish early, and ask for help early when you are stuck.

- Give credit publicly and share what you learn with the team.

Workplace example:  A team member goes on leave. Her handoff note lists completed tasks, the folder link, pending items with deadlines and the colleague to contact. The work continues without a single message to her.

Try it yourself:  Write a handoff note for a group assignment, as if you were leaving the project tomorrow. Make sure it answers all five questions.

## COMMON MISTAKES

- Verbal handoffs with nothing in writing

- Working on outdated versions of a file

- Assuming that everyone in the call remembers the decisions

## CHECKPOINT QUESTIONS

- What five questions should a good handoff note answer?

- How can you make sure decisions from a call are not forgotten?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('4831ed2e-0086-52d2-8e5a-5c6b3ef1dbf9', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '4.3: Handling Conflict and Difficult Conversations', 'Resolve disagreements calmly and protect working relationships.', 16, (SELECT id FROM public.skills WHERE code='TEAM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('bc3cf4c4-3027-5b7c-b8c0-f705cf7a53ad', '4831ed2e-0086-52d2-8e5a-5c6b3ef1dbf9', 'Handling Conflict and Difficult Conversations', '## Module 4.3: Handling Conflict and Difficult Conversations

Suggested time: 75 minutes

Objective:  Resolve disagreements calmly and protect working relationships.

## WHAT YOU NEED TO KNOW

- Conflict is normal. Unresolved conflict is costly. It appears as disagreement about tasks (what to do), process (how to do it) or personal behaviour.

- Separate the person from the problem. Focus on facts and their impact, not on character.

- Use the SBI method: Situation, Behaviour, Impact. For example: "In yesterday''s call (Situation), the design was changed without informing me (Behaviour). I had to redo two days of work (Impact). Can we agree to share changes in the team chat?"

- A good approach: cool down first, talk privately, listen before speaking, find the common goal and agree on next steps. Involve a lead or manager only after trying to resolve it directly.

- If a teammate is not contributing, ask what is happening, offer help, set clear expectations together and then involve the lead if nothing changes.

- With upset clients or customers, listen fully, acknowledge the problem, and tell them what you will do next and by when.

Workplace example:  Two teammates argue over who should present to the client. Instead of taking sides, the lead asks each what the client needs to see. They agree that one presents the solution and the other explains the data.

Try it yourself:  Think of a disagreement from a college group project. Rewrite what you would say now using the SBI method. Practise it aloud with a friend.

## COMMON MISTAKES

- Avoiding the conversation until it becomes a big problem

- Discussing the conflict with everyone except the person involved

- Attacking the person instead of the behaviour

## CHECKPOINT QUESTIONS

- What does SBI stand for?

- When is it appropriate to involve a manager in a conflict?', 75, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('134615a1-b357-536b-ace4-011dd4655bac', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '4.4: Working in Diverse and Cross-Cultural Teams', 'Work respectfully with people from different backgrounds, regions and cultures.', 17, (SELECT id FROM public.skills WHERE code='TEAM'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('818befe8-6217-51f0-83a7-667a4aca6904', '134615a1-b357-536b-ace4-011dd4655bac', 'Working in Diverse and Cross-Cultural Teams', '## Module 4.4: Working in Diverse and Cross-Cultural Teams

Suggested time: 60 minutes

Objective:  Work respectfully with people from different backgrounds, regions and cultures.

## WHAT YOU NEED TO KNOW

- Indian workplaces bring together people of different languages, regions, faiths, ages and backgrounds. Global clients add further cultural differences.

- Inclusive behaviour: avoid stereotypes and jokes about region, religion, gender, caste, appearance or accent. Use a common language in mixed meetings and invite quieter members to speak.

- Communication styles differ. Many clients in the US expect direct, confident updates. Some cultures value more formal or indirect language. Do not say "yes" when you mean "I will try". Say no politely and clearly.

- Know the workplace conduct rules. In India, the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013, requires employers to have an Internal Committee. Learn your company''s policy and respect personal boundaries.

- Be aware of holidays, festivals and working hours in other countries when planning meetings and deadlines.

Workplace example:  A client in the UK asks, "Can this be ready by Friday?" A junior colleague says, "Yes," without checking. It is not ready. A better reply: "I need to check two dependencies. I will confirm by tomorrow noon."

Try it yourself:  Write down three assumptions you have about people from a region or background different from yours. Test each one by asking yourself how it might be wrong. Then list three inclusive habits you will follow.

## COMMON MISTAKES

- Making jokes that exclude or offend colleagues

- Speaking in a local language in a mixed meeting so that others are left out

- Agreeing to everything to avoid saying no

## CHECKPOINT QUESTIONS

- Why is a polite, clear "no" better than an unclear "yes"?

- What is the purpose of the Internal Committee under the 2013 Act?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('c3e985ae-256e-5185-844b-1573fe858732', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '5.1: Prioritization: Urgent Versus Important', 'Choose the right tasks to work on first.', 18, (SELECT id FROM public.skills WHERE code='TIME'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('b43ab102-8487-5da8-b23e-8cbde5cbf5fa', 'c3e985ae-256e-5185-844b-1573fe858732', 'Prioritization: Urgent Versus Important', '## Skill 5: Time Management and Productivity

Skill code: TIME

College deadlines are measured in weeks and semesters. Corporate deadlines are measured in hours and days, and often involve turnaround times and client commitments. Students who manage their time well deliver consistently, stay calmer and build a reputation for reliability.

By the end of this skill you will be able to:

- Decide what to do first when everything feels urgent

- Plan your day and week realistically

- Focus deeply and control digital distractions

- Handle deadlines, heavy workload and stress in a healthy way

## Module 5.1: Prioritization: Urgent Versus Important

Suggested time: 45 minutes

Objective:  Choose the right tasks to work on first.

## WHAT YOU NEED TO KNOW

- Not everything urgent is important, and not everything important is urgent. The Eisenhower matrix sorts tasks into four groups: urgent and important (do now), important but not urgent (schedule), urgent but not important (delegate or shorten) and neither (drop).

- The MoSCoW method sorts work into Must have, Should have, Could have and Will not have this time.

- Ask: "What happens if this is not done today?" and "Who is waiting for this?"

- When two people give you conflicting priorities, do not guess. Show both tasks to your manager and ask which comes first.

- The 80/20 idea: a small number of tasks usually produces most of the value. Identify them and protect time for them.

Workplace example:  A trainee has four tasks: reply to a client query (urgent, important), prepare next week''s presentation (important, not urgent), sort old email (neither), and answer a colleague''s routine request (urgent, less important). They do the first now, schedule the second, answer the fourth quickly and ignore the third.

Try it yourself:  Write down everything on your to-do list for this week. Place each item into the four Eisenhower boxes. Choose your top three for tomorrow.

## COMMON MISTAKES

- Doing easy tasks first and leaving the important one until the last minute

- Treating every request as urgent

- Guessing priorities instead of asking

## CHECKPOINT QUESTIONS

- What are the four boxes of the Eisenhower matrix?

- What should you do when two managers give you conflicting priorities?', 45, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('700cfe92-7b16-5d31-9bd4-acd974141144', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '5.2: Planning Your Day and Week', 'Build a simple planning routine that you can follow every day.', 19, (SELECT id FROM public.skills WHERE code='TIME'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('0de1ccc5-4ff2-5df5-9b03-efc1bfe5587c', '700cfe92-7b16-5d31-9bd4-acd974141144', 'Planning Your Day and Week', '## Module 5.2: Planning Your Day and Week

Suggested time: 60 minutes

Objective:  Build a simple planning routine that you can follow every day.

## WHAT YOU NEED TO KNOW

- Plan the week on Monday and the day the evening before. Choose your top three tasks for each day.

- Use time blocking: put tasks into your calendar as appointments with yourself, including breaks.

- Estimate honestly. People usually underestimate how long tasks take. Add 25 to 50 percent buffer, especially for new tasks.

- Break big tasks into steps that take under two hours each. Progress is easier to see and start.

- End each day with a five-minute review: what did I finish, what moved, what should I do first tomorrow?

- Free tools such as Google Calendar, Outlook, Google Tasks or Trello are enough. Consistency matters more than the tool.

Workplace example:  Instead of writing "Prepare report" on the to-do list, a fresher writes: collect data (60 minutes), clean it (45 minutes), build charts (60 minutes), write summary (30 minutes), review (30 minutes). The report is finished a day early.

Try it yourself:  Plan next week using a calendar. Block time for your top tasks, add buffers and include breaks. At the end of the week, compare your plan with what actually happened.

## COMMON MISTAKES

- Planning every minute with no buffer

- Keeping tasks only in your head

- Never reviewing whether your estimates were right

## CHECKPOINT QUESTIONS

- Why should you add a buffer to your time estimates?

- What is time blocking?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('25c7fcd2-db07-575e-a4bf-1d652a3197a8', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '5.3: Focus and Digital Discipline', 'Do focused, high-quality work despite constant notifications.', 20, (SELECT id FROM public.skills WHERE code='TIME'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('a6f91a17-798a-50c5-84d7-88d622eec075', '25c7fcd2-db07-575e-a4bf-1d652a3197a8', 'Focus and Digital Discipline', '## Module 5.3: Focus and Digital Discipline

Suggested time: 45 minutes

Objective:  Do focused, high-quality work despite constant notifications.

## WHAT YOU NEED TO KNOW

- Each interruption costs time because it takes a while to regain your focus. Frequent switching between tasks makes work slower and more error-prone.

- Try the Pomodoro method: work for 25 minutes without interruption, then take a 5-minute break. After four rounds take a longer break.

- Protect one or two deep-work blocks each day for your hardest task. Switch off notifications and keep your phone away.

- Check email and messages at set times instead of continuously, unless your role needs immediate replies.

- Look after your energy. Sleep, water, short walks and breaks improve concentration. Schedule difficult tasks at the time of day when you are at your best.

- Keep meetings short and purposeful. Ask whether your presence is needed and whether an email would do.

Workplace example:  A developer turns off notifications between 10 am and 12 pm, finishes a complex module in two hours and then replies to all pending messages together. Colleagues know she is reachable after noon.

Try it yourself:  For two days, try three 25-minute focus sessions with your phone in another room. Note what distracted you and how much you finished.

## COMMON MISTAKES

- Keeping every notification switched on all day

- Working long hours with no breaks and falling in quality

- Attending every meeting without a clear reason

## CHECKPOINT QUESTIONS

- How does the Pomodoro method work?

- Why is constant task-switching a problem?', 45, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('1304fc7f-70fb-5cf6-873c-1c41d1084245', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '5.4: Managing Deadlines, Workload and Work-Life Balance', 'Handle heavy workloads and tight deadlines without burning out.', 21, (SELECT id FROM public.skills WHERE code='TIME'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('707cda77-d081-5158-bc9b-9e5ade551c6c', '1304fc7f-70fb-5cf6-873c-1c41d1084245', 'Managing Deadlines, Workload and Work-Life Balance', '## Module 5.4: Managing Deadlines, Workload and Work-Life Balance

Suggested time: 60 minutes

Objective:  Handle heavy workloads and tight deadlines without burning out.

## WHAT YOU NEED TO KNOW

- Plan backwards from the deadline. Set checkpoints along the way so you know early if you are falling behind.

- Learn corporate terms: TAT (turnaround time) and SLA (service level agreement) are commitments to a client or another team, often measured in hours.

- Say "yes, but" instead of a flat yes or no. For example: "I can do this by Friday if the other report moves to Monday. Which is more important?"

- Raise a warning early. As soon as you see a risk to a deadline, tell your manager with the reason and your suggested solution.

- Set healthy boundaries. Long working hours may be needed sometimes, but constant overload leads to burnout and poor work. Talk about a sustainable workload.

- If stress becomes heavy, talk to a trusted colleague, mentor or your company''s employee assistance programme, if available.

Workplace example:  An analyst has three reports due on Friday. On Tuesday she sees that one depends on data that has not arrived. She informs her manager immediately, who arranges the data and moves one deadline. The team delivers everything on time.

Try it yourself:  Take an upcoming big assignment or exam. Plan backwards from the deadline with checkpoints. Write the "yes, but" reply you would give if someone added another task at the last minute.

## COMMON MISTAKES

- Waiting until the last day to admit you are behind

- Accepting every request and quietly delivering poor quality

- Ignoring rest, sleep and health during busy periods

## CHECKPOINT QUESTIONS

- What do TAT and SLA mean?

- What is a "yes, but" response and why is it useful?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('fcd52636-517c-557c-9626-58bfd6600064', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '6.1: Growth Mindset and Embracing Change', 'Respond to change and unfamiliar tasks with curiosity instead of fear.', 22, (SELECT id FROM public.skills WHERE code='ADAPT'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('a0a0e013-907a-5906-9a7a-d4dadc80e969', 'fcd52636-517c-557c-9626-58bfd6600064', 'Growth Mindset and Embracing Change', '## Skill 6: Adaptability and Learning Agility

Skill code: ADAPT

Tools, projects, managers and even business models change quickly. Companies want people who can learn fast, stay steady under change and recover from setbacks. Adaptable freshers grow faster than those who only depend on what they learnt in college.

By the end of this skill you will be able to:

- Approach change and feedback with a growth mindset

- Learn a new tool or domain quickly

- Recover from setbacks, rejection and pressure

- Use technology and AI tools responsibly at work

## Module 6.1: Growth Mindset and Embracing Change

Suggested time: 45 minutes

Objective:  Respond to change and unfamiliar tasks with curiosity instead of fear.

## WHAT YOU NEED TO KNOW

- A fixed mindset says, "I am not good at this." A growth mindset says, "I am not good at this yet." Ability grows through practice and feedback.

- Change usually brings a pattern of feelings: worry, resistance, acceptance and then confidence. Knowing this makes it easier to move through.

- When something changes, ask: what has changed, what has not, what do I need to learn, and who can help?

- Volunteer for unfamiliar tasks in a safe way. Growth happens outside the comfort zone.

- Stay flexible on how work is done while staying firm on quality, ethics and deadlines.

Workplace example:  A project''s client suddenly changes the technology from Java to Python in week three. One team member complains. Another says, "Which parts of the design still apply, and which do I need to learn first?" and starts a two-week learning plan.

Try it yourself:  Write down three tasks you avoided because you felt you were "not good" at them. Rewrite each thought using the word "yet" and choose one small action you can take this week.

## COMMON MISTAKES

- Resisting change without understanding why it is happening

- Saying "this is not my job" to every new task

- Waiting to feel ready before trying

## CHECKPOINT QUESTIONS

- What is the difference between a fixed and a growth mindset?

- What four questions can you ask when something changes at work?', 45, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('0d5a5c5a-ffbc-5eae-84d8-2ec422f2626e', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '6.2: Learning Agility: Learn Anything in 14 Days', 'Learn a new tool, subject or process quickly and effectively.', 23, (SELECT id FROM public.skills WHERE code='ADAPT'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('f8cd2847-fbc5-5af7-ada5-20f502e2d809', '0d5a5c5a-ffbc-5eae-84d8-2ec422f2626e', 'Learning Agility: Learn Anything in 14 Days', '## Module 6.2: Learning Agility: Learn Anything in 14 Days

Suggested time: 60 minutes

Objective:  Learn a new tool, subject or process quickly and effectively.

## WHAT YOU NEED TO KNOW

- Start with the goal: what exactly do I need to be able to do in 14 days? Learn only what supports that goal first.

- Get the big picture in the first two days from a short overview video or documentation, then break the topic into small skills.

- Learn by doing. Build a mini project, solve sample problems or recreate a real task. Reading alone is not enough.

- Use a mix of resources: official documentation, one good course, one experienced person to ask and a practice exercise.

- Teach what you learn to someone else or write a one-page summary. Explaining exposes gaps.

- Keep a learning log and review it weekly. Short daily sessions beat one long weekend session.

Workplace example:  A fresher is asked to learn Power BI in two weeks. Days 1 to 2: overview and install. Days 3 to 7: follow one tutorial and rebuild it with different data. Days 8 to 12: build a dashboard for a real team report. Days 13 to 14: present it to the team and get feedback.

Try it yourself:  Choose one skill you want to learn, such as a tool or subject. Write a 14-day plan with a clear end goal, daily 45-minute tasks and a mini project. Start the first day now.

## COMMON MISTAKES

- Watching endless tutorials without practising

- Trying to learn everything before starting

- Never asking experienced colleagues for tips

## CHECKPOINT QUESTIONS

- Why is learning by doing more effective than only reading or watching?

- What is one way to find gaps in your understanding?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('80d58ab7-6c20-5772-a316-5e540875f413', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '6.3: Resilience: Handling Setbacks, Rejection and Pressure', 'Recover from disappointment and stay effective under pressure.', 24, (SELECT id FROM public.skills WHERE code='ADAPT'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('5b12d2ea-76a7-544a-a348-a2f4bd1349a4', '80d58ab7-6c20-5772-a316-5e540875f413', 'Resilience: Handling Setbacks, Rejection and Pressure', '## Module 6.3: Resilience: Handling Setbacks, Rejection and Pressure

Suggested time: 60 minutes

Objective:  Recover from disappointment and stay effective under pressure.

## WHAT YOU NEED TO KNOW

- Everyone faces setbacks: rejection in placements, poor feedback, failed tests or a project that goes wrong. What matters is how quickly you learn from them and move forward.

- Separate the event from your identity. "I did not clear this round" is different from "I am not good enough."

- After a setback, ask three questions: what happened, what can I learn, and what will I do differently next time?

- Under pressure, slow your breathing, break the task into the next small step and focus on what you can control.

- Build a support system of friends, mentors and family. Talk to someone if the pressure feels too heavy. Asking for help is a strength.

- Look after the basics: sleep, food, exercise and time away from screens. They protect your ability to cope.

Workplace example:  A student is rejected after the final interview round of a company. He asks the recruiter for feedback, learns that his explanation of his project was unclear, practises PREP answers for two weeks and clears the next company''s interview.

Try it yourself:  Think of a recent disappointment. Write the three questions (what happened, what can I learn, what will I do differently) and answer each in two lines.

## COMMON MISTAKES

- Treating one rejection as proof that you are not capable

- Hiding stress instead of talking to someone

- Repeating the same approach and expecting a different result

## CHECKPOINT QUESTIONS

- What three questions can you ask after a setback?

- Why is it useful to separate an event from your identity?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules(id,course_id,title,description,sequence,skill_id,status) VALUES ('312c3f46-6e94-5201-b65b-7a056bb3f4ab', '5ad4db9e-9dfe-5478-870c-21ac5871fa5d', '6.4: Technology and AI Fluency at Work', 'Use everyday workplace tools and AI assistants effectively, safely and honestly.', 25, (SELECT id FROM public.skills WHERE code='ADAPT'), 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('95d8a3d9-381d-5488-802b-830b122cb8e0', '312c3f46-6e94-5201-b65b-7a056bb3f4ab', 'Technology and AI Fluency at Work', '## Module 6.4: Technology and AI Fluency at Work

Suggested time: 60 minutes

Objective:  Use everyday workplace tools and AI assistants effectively, safely and honestly.

## WHAT YOU NEED TO KNOW

- Be comfortable with the standard toolkit: email and calendar, video conferencing, spreadsheets, presentation software, shared documents and a team chat tool. Learn the shortcuts and features, not just the basics.

- AI assistants can help you draft, summarise, brainstorm, explain and check your work. Treat them as an assistant, not as a final authority.

- Give clear instructions: state the task, the context, the audience and the format you want. Then review and improve the result.

- Always verify facts, numbers and references. AI can sound confident and still be wrong.

- Never paste confidential company or client data into public AI tools. Follow your company''s AI and data policy.

- Be honest about how you use AI. Your work should still reflect your own understanding, and you should be able to explain anything you submit.

Workplace example:  A trainee asks an AI tool: "Summarise this meeting note into five bullet points for a manager, keeping the action items and owners." She checks the summary against the original, corrects one date and sends it. She did not paste any client name or figure.

Try it yourself:  Choose a task such as summarising an article. Write a clear prompt with task, context, audience and format. Compare the answer with the source and list two things you had to correct or improve.

## COMMON MISTAKES

- Copying AI output without checking it

- Sharing confidential information with public tools

- Depending on AI so much that you cannot explain your own work

## CHECKPOINT QUESTIONS

- What four things should a good AI prompt include?

- Why should you never paste client data into a public AI tool?', 60, 1, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons(id,module_id,title,content,duration_minutes,sequence,status) VALUES ('7bc2d1eb-e702-5b68-ae50-70ccbc599273', '312c3f46-6e94-5201-b65b-7a056bb3f4ab', 'Your eight-week plan and readiness checklist', '## Your eight-week readiness plan

You can finish this handbook in about eight weeks with 4 to 6 hours of study each week. Adjust the pace to your timetable, but keep a regular rhythm.

| When | Focus | What to do |
| --- | --- | --- |
| Week 1 | Professionalism | Modules 2.1 and 2.2. Draft your 30-60-90 day plan. Module 2.2 has eight sub-topics, so study it in two sittings and finish with the etiquette self-audit. |
| Week 2 | Communication (writing, listening, grammar I) | Modules 1.1, 1.3, 1.5.1 and 1.5.2. Write three practice emails, practise repeating back instructions and complete the parts of speech and articles exercises. |
| Week 3 | Communication (speaking, interviews, grammar II) | Modules 1.2, 1.4, 1.5.3 and 1.5.4. Record your PREP answers, finalize your self-introduction and STAR stories, and complete the tenses and agreement exercises. |
| Week 4 | Critical Thinking and Problem Solving (I) | Modules 3.1 and 3.2. Apply the five-step method to one real problem. |
| Week 5 | Critical Thinking and Problem Solving (II) | Modules 3.3 and 3.4. Build one Excel pivot table and one decision matrix. |
| Week 6 | Teamwork and Collaboration | Modules 4.1 to 4.4. Complete the handoff note and the SBI conversation practice. |
| Week 7 | Time Management | Modules 5.1 to 5.4. Follow a weekly plan and daily review for the whole week. |
| Week 8 | Adaptability, then Ownership and Feedback | Modules 6.1 to 6.4, then 2.3 and 2.4. Complete your 14-day learning plan and a full mock interview. |

## Corporate readiness checklist

Before you attend your first interview or join your first job, check that you can honestly say yes to each of these:

- I can write a clear, polite email with a specific subject line and a clear request.

- I can answer "Tell me about yourself" in about 75 seconds and give two STAR stories.

- I repeat back instructions and confirm the task, deadline and format.

- I check my emails for article, tense and subject-verb agreement errors before sending.

- I follow the dress code, keep my phone on silent, wear my ID card and lock my screen when I leave my desk.

- I am on time, prepared and respectful in meetings, chat and video calls.

- I tell my manager early when something may go wrong, and I own my mistakes.

- I can break down a problem, find a root cause and suggest at least three options.

- I can read percentages, averages and charts, and I can use a pivot table in Excel.

- I can hand over work clearly and address a disagreement using the SBI method.

- I plan my week, choose my top three tasks daily and protect focus time.

- I have a plan to learn a new tool in 14 days, and I use AI tools carefully and honestly.

Remember:  Employers do not expect freshers to be perfect. They look for people who are prepared, willing to learn, honest and reliable. Practise a little every day, and these skills will become habits.', 0, 2, 'ACTIVE') ON CONFLICT (id) DO NOTHING;

-- Make this programme course available to active colleges, including future batch assignments.
INSERT INTO public.college_courses(college_id,course_id)
SELECT co.id,c.id FROM public.colleges co CROSS JOIN public.courses c
WHERE co.status='ACTIVE' AND c.status='ACTIVE' AND c.id='5ad4db9e-9dfe-5478-870c-21ac5871fa5d'
ON CONFLICT (college_id,course_id) DO NOTHING;
-- Current active college students and individuals with a matching, unexpired paid entitlement.
-- Later college students use the existing college/batch enrolment screens;
-- new individual purchases already enrol students in all active programme courses.
INSERT INTO public.enrollments(student_id,course_id,batch_id)
SELECT s.id,c.id,s.batch_id FROM public.students s
JOIN public.profiles p ON p.user_id=s.user_id
CROSS JOIN public.courses c
WHERE c.id='5ad4db9e-9dfe-5478-870c-21ac5871fa5d' AND c.status='ACTIVE'
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
