import type { AppData, DailyPlan, Task } from './types';

const today = () => new Date().toISOString().slice(0, 10);
export function scoreTask(task: Task, allTasks: Task[], now = new Date()): { score: number; reasons: string[] } {
  let urgency = 15; const reasons: string[] = [];
  if (task.dueDate) {
    const days = Math.ceil((new Date(`${task.dueDate}T23:59:59`).getTime() - now.getTime()) / 86400000);
    urgency = days < 0 ? 100 : days === 0 ? 95 : days === 1 ? 82 : days <= 3 ? 65 : days <= 7 ? 45 : 20;
    if (days < 0) reasons.push('Overdue'); else if (days <= 1) reasons.push('Deadline is close');
  }
  const impact = Math.max(1, Math.min(5, task.impact || 3)) * 20;
  const blockedCount = allTasks.filter(t => t.status !== 'done' && t.dependsOn.includes(task.id)).length;
  const blocker = Math.min(100, blockedCount * 35);
  if (blockedCount) reasons.push(`Unblocks ${blockedCount} task${blockedCount === 1 ? '' : 's'}`);
  const ageDays = Math.max(0, (now.getTime() - new Date(task.createdAt).getTime()) / 86400000);
  const age = Math.min(100, ageDays * 5);
  const priorityBonus = ({ low: 0, normal: 5, high: 12, urgent: 20 } as const)[task.priority];
  const score = Math.round(urgency * .30 + impact * .30 + blocker * .25 + age * .15 + priorityBonus);
  if (impact >= 80) reasons.push('High project impact');
  if (task.priority === 'urgent' || task.priority === 'high') reasons.push(`${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`);
  if (!reasons.length) reasons.push('Good fit for steady progress');
  return { score, reasons };
}
export function recommendTasks(data: AppData, plan: DailyPlan, now = new Date()): { tasks: Task[]; total: number; warnings: string[] } {
  const tasks = data.tasks.filter(t => ['todo', 'in_progress', 'blocked'].includes(t.status) && t.status !== 'blocked' && !t.parentId && (!t.projectId || data.projects.some(p => p.id === t.projectId && p.status === 'active')));
  const ready = tasks.filter(t => t.dependsOn.every(id => data.tasks.some(dep => dep.id === id && dep.status === 'done')));
  const ranked = ready.map(t => ({ task: t, score: scoreTask(t, data.tasks, now).score })).sort((a,b) => b.score-a.score);
  const picked: Task[] = []; let total = 0;
  for (const item of ranked) {
    const estimate = plan.estimates[item.task.id] ?? item.task.estimate ?? 30;
    if (picked.length >= 3) break;
    if (total + estimate <= Math.max(0, plan.availableMinutes - plan.bufferMinutes)) { picked.push(item.task); total += estimate; }
  }
  const warnings: string[] = [];
  const remaining = data.tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today());
  if (remaining.length) warnings.push(`${remaining.length} overdue task${remaining.length === 1 ? '' : 's'} need review.`);
  const blocked = data.tasks.filter(t => t.status !== 'done' && t.dependsOn.some(id => !data.tasks.some(d => d.id === id && d.status === 'done')));
  if (blocked.length) warnings.push(`${blocked.length} task${blocked.length === 1 ? ' is' : 's are'} waiting on dependencies.`);
  if (ranked.length && picked.length === 0) warnings.push('No tasks fit your current time budget. Increase capacity or schedule shorter tasks.');
  return { tasks: picked, total, warnings };
}
