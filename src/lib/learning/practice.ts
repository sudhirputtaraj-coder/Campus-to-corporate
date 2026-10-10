export type PracticeQuestion = { question: string; answer: string };
export function practiceChoice(question: PracticeQuestion) {
  const matches = [...question.question.matchAll(/(?:^|\s)([a-h])\)\s+/g)];
  if (matches.length < 2 || matches.some((m, i) => m[1] !== String.fromCharCode(97 + i))) return null;
  const options = matches.map((m, i) => ({ key: m[1], text: question.question.slice(m.index! + m[0].length, matches[i + 1]?.index ?? question.question.length).trim() }));
  const answer = question.answer.trim().match(/^([a-h])\)\s*([^\n]+)/);
  if (!answer || !options.some(o => o.key === answer[1] && o.text === answer[2].trim()) || options.some(o => !o.text)) return null;
  return { prompt: question.question.slice(0, matches[0].index).trim(), options, correct: answer[1] };
}
export type PracticeResponse = { value: string; checked: boolean; selfCorrect?: boolean };
export function practiceScore(questions: PracticeQuestion[], responses: PracticeResponse[]) {
  let automatic = 0, correct = 0, reviewed = 0, selfCorrect = 0, complete = 0;
  questions.forEach((question, i) => {
    const choice = practiceChoice(question), response = responses[i];
    if (choice) { automatic++; if (response?.checked) { complete++; if (response.value === choice.correct) correct++; } }
    else if (response?.checked && typeof response.selfCorrect === 'boolean') { reviewed++; complete++; if (response.selfCorrect) selfCorrect++; }
  });
  return { automatic, correct, reviewed, selfCorrect, complete };
}
