const DAY = 86400000;
const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (date, count) => new Date(date.getTime() + count * DAY);
const daysBetween = (from, to = new Date()) => Math.floor((new Date(dateKey(to)) - new Date(from)) / DAY);
const uid = () => Math.random().toString(36).slice(2, 9);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));

const embeddedRows = [
["Cleanse Dishwasher","Kitchen",5,1,3,2,60,"Kitchen Essentials"],
["Clean Storage Bins (Kitchen)","Kitchen",30,3,3,2,60,"Deep Clean - Kitchen"],
["Clean Storage","Storage",60,5,4,2,120,"Deep Clean - Storage"],
["Clean Oven","Kitchen",60,5,3,2,60,"Deep Clean - Kitchen"],
["Clean Highchair","Diningroom",10,2,4,1,14,"Baby Essentials"],
["Scrub Floor (Diningroom)","Diningroom",30,4,3,2,14,"Kitchen Essentials"],
["Wash Table Cloth","Diningroom",10,1,3,1,14,"Quick & Easy"],
["Vaccumm Floor (Front)","Front",10,1,2,2,14,"Quick & Easy"],
["Clean Bathroom (Guest)","Bathroom",45,4,5,5,14,"Bathroom Essentials"],
["Clean Bathroom (Main)","Bathroom",45,4,5,5,14,"Bathroom Essentials"],
["Clean Trash Bins (Kitchen)","Kitchen",10,2,3,2,14,"Quick & Easy"],
["Clean Maurice Box","Bathroom",5,1,4,4,1,"Quick & Easy"],
["Drain Sinks","Bedroom",10,1,1,1,30,"Quick & Easy"],
["Clean Microwave","Kitchen",15,2,4,3,30,"Kitchen Essentials"],
["Clean Fridge","Kitchen",45,5,4,4,30,"Deep Clean - Kitchen"],
["Dust Bookshelves (Livingroom)","Livingroom",30,3,3,3,30,"Living Room Essentials"],
["Dust Office","Office",25,2,3,3,30,"Office Essentials"],
["Vaccum Blue Chairs","Livingroom",10,1,2,2,30,"Living Room Essentials"],
["Dust Bookshelves (Office)","Office",20,2,3,2,30,"Office Essentials"],
["Scrub Kitchen Floor","Kitchen",30,4,3,2,30,"Deep Clean - Kitchen"],
["Polish Utensils","Kitchen",60,5,4,4,30,"Deep Clean - Kitchen"],
["Dust Bookshelves (Bedroom)","Bedroom",15,2,3,2,30,"Bedroom Essentials"],
["Dust Bedside Tables","Bedroom",15,1,3,3,30,"Bedroom Essentials"],
["Clean Mirror (Bedroom)","Bedroom",10,1,1,1,30,"Quick & Easy"],
["Clean Mirror (Front)","Front",10,1,1,1,30,"Quick & Easy"],
["Deep Clean Oven & Fridge","Kitchen",20,3,2,4,30,"Deep Clean - Kitchen"],
["Clean Trash Bins (Bathrooms)","Bathroom",10,2,3,2,30,"Quick & Easy"],
["Clean Windows (Balcony)","Balcony",45,5,2,1,90,"Deep Clean - Household"],
["Clean Windows (Bedroom)","Bedroom",15,4,2,1,90,"Deep Clean - Bedroom"],
["Clean Windows (Office)","Office",10,3,2,1,90,"Deep Clean - Household"],
["Vaccum Floor (Bedroom)","Bedroom",15,1,5,3,7,"Bedroom Essentials"],
["Vacumm Floor (Babyroom)","Babyroom",15,1,5,3,7,"Baby Essentials"],
["Clean Car","Car",20,3,4,5,7,"Car Essentials"],
["Clean Disk Rack","Kitchen",10,1,1,2,7,"Quick & Easy"],
["Clean Espresso Machine","Kitchen",10,1,1,2,7,"Quick & Easy"],
["Clean Sport Gear","Closet",15,1,2,1,7,"Quick & Easy"],
["Clean Frog Mat","Bathroom",10,1,2,1,7,"Quick & Easy"],
["Laundry (Cloth)","Kitchen",60,3,5,5,4,"Kitchen Essentials"],
["Laundry (Vi)","Babyroom",60,3,5,5,4,"Baby Essentials"],
["Laundry (Sheets)","Bedroom",60,3,4,5,7,"Bedroom Essentials"],
["Laundry (Normal)","Bathroom",90,4,5,5,4,"Deep Clean - Household"]
];

const freshTasks = () => embeddedRows.map((row, index) => ({
  id: `xlsx-${index + 1}`,
  name: row[0], room: row[1], minutes: row[2], effort: row[3],
  priority: row[4], overdueWeight: row[5], intervalDays: row[6],
  bundle: row[7], lastCompleted: null, completedDates: [], skipCount: 0
}));

const STORE = "la-maison-41-v2";
let state;
try {
  state = JSON.parse(localStorage.getItem(STORE));
  if (!state || state.tasks?.length !== 41) throw new Error();
} catch {
  state = { tasks: freshTasks(), recommendationIds: [], selectedMinutes: 30, calendarMode: "week" };
}
let tab = "home";
const save = () => localStorage.setItem(STORE, JSON.stringify(state));
const totalScore = task => task.effort + task.priority + task.overdueWeight;
const daysSince = task => task.lastCompleted ? Math.max(0, daysBetween(task.lastCompleted)) : task.intervalDays;
const intervalRatio = task => daysSince(task) / Math.max(1, task.intervalDays);
const isDue = task => intervalRatio(task) >= 1;
const isDoneToday = task => task.completedDates.includes(dateKey());
const daysUntilDue = task => Math.max(0, task.intervalDays - daysSince(task));
const isDueSoon = task => !isDue(task) && daysUntilDue(task) <= 7;
const overduePenalty = task => {
  const overdueRatio = Math.max(0, intervalRatio(task) - 1);
  return overdueRatio * task.overdueWeight * 24;
};
const dynamicRank = task =>
  totalScore(task) * 10 +
  Math.min(intervalRatio(task), 1) * task.overdueWeight * 6 +
  overduePenalty(task) +
  task.skipCount * 2;
const statusText = task => isDoneToday(task) ? "Done" : isDue(task) ? "Due" : isDueSoon(task) ? "Due soon" : "—";

function optimizeTasks(limit) {
  const candidates = state.tasks.filter(t => !isDoneToday(t) && t.minutes <= limit)
    .sort((a,b) => dynamicRank(b) - dynamicRank(a));
  if (!candidates.length) return [];
  const due = candidates.filter(isDue);
  const pool = due.length ? due : candidates;
  const anchor = pool[0];
  const chosen = [anchor];
  let remaining = limit - anchor.minutes;
  const rest = candidates.filter(t => t.id !== anchor.id).sort((a,b) => {
    const aGroup = a.room === anchor.room || a.bundle === anchor.bundle ? 1 : 0;
    const bGroup = b.room === anchor.room || b.bundle === anchor.bundle ? 1 : 0;
    return bGroup - aGroup || dynamicRank(b) - dynamicRank(a);
  });
  for (const task of rest) {
    if (task.minutes <= remaining) {
      chosen.push(task);
      remaining -= task.minutes;
    }
    if (remaining < 5 || chosen.length === 6) break;
  }
  return chosen;
}

function buildCalendar(days = 28) {
  const start = new Date(`${dateKey()}T12:00:00`);
  const schedule = Array.from({length:days}, (_,i) => ({ date:addDays(start,i), key:dateKey(addDays(start,i)), items:[], minutes:0 }));
  const occurrences = [];
  for (const task of state.tasks) {
    const firstDue = task.lastCompleted
      ? Math.max(0, task.intervalDays - daysSince(task))
      : (Number(task.id.split("-")[1]) * 3) % Math.min(task.intervalDays, 28);
    for (let offset = firstDue; offset < days; offset += task.intervalDays) occurrences.push({task, ideal:offset});
  }
  occurrences.sort((a,b) => a.ideal - b.ideal || dynamicRank(b.task) - dynamicRank(a.task));
  for (const occurrence of occurrences) {
    let best = null;
    for (let drift = 0; drift <= 4; drift++) {
      for (const idx of [occurrence.ideal + drift, occurrence.ideal - drift]) {
        if (idx < 0 || idx >= days) continue;
        const day = schedule[idx];
        const sameGroup = day.items.some(item => item.task.room === occurrence.task.room || item.task.bundle === occurrence.task.bundle);
        const projected = day.minutes + occurrence.task.minutes;
        const penalty = Math.abs(idx - occurrence.ideal) * 8 + Math.abs(60 - projected) - (sameGroup ? 18 : 0) + (projected > 90 ? 100 : 0);
        if (!best || penalty < best.penalty) best = {day, penalty};
      }
    }
    if (best) {
      best.day.items.push({task:occurrence.task, occurrenceKey:`${occurrence.task.id}:${best.day.key}`});
      best.day.minutes += occurrence.task.minutes;
    }
  }
  return schedule;
}

function completeTask(id, completionDate = dateKey()) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const exists = task.completedDates.includes(completionDate);
  task.completedDates = exists ? task.completedDates.filter(d => d !== completionDate) : [...task.completedDates, completionDate];
  if (!exists) {
    task.lastCompleted = completionDate;
    task.skipCount = 0;
    toast(`${task.name} completed`);
  } else {
    task.lastCompleted = task.completedDates.sort().at(-1) || null;
  }
  save(); render();
}

function calendarCard(item, dayKey) {
  const task = item.task;
  const done = task.completedDates.includes(dayKey);
  return `<article class="calendar-task ${done ? "done" : ""}">
    <button class="round-check" data-complete="${task.id}" data-date="${dayKey}" aria-label="${done ? "Mark not done" : "Complete"} ${escapeHtml(task.name)}">${done ? "✓" : ""}</button>
    <div><strong>${escapeHtml(task.name)}</strong><span>${task.minutes} min · Effort ${task.effort} · Score ${totalScore(task)}</span></div>
    <span class="status ${done ? "done" : ""}">${done ? "Done" : "Not done"}</span>
  </article>`;
}

function renderHome() {
  const selected = state.selectedMinutes;
  const preview = optimizeTasks(selected);
  const dueCount = state.tasks.filter(isDue).length;
  return `<div class="page home-page">
    <header class="hero"><span class="kicker">${new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</span>
      <h1>Home</h1>
      <div class="summary-strip"><span><b>${dueCount}</b> Due</span><span><b>${state.tasks.filter(isDoneToday).length}</b> Done today</span><span><b>${state.tasks.length}</b> Total</span></div>
    </header>
    <section class="panel time-panel"><div class="panel-title"><div><span>Available time</span><strong>${selected < 60 ? `${selected} minutes` : `${selected/60} ${selected===60?"hour":"hours"}`}</strong></div><b>${preview.reduce((n,t)=>n+t.minutes,0)} min planned</b></div>
      <div class="home-time-grid">${[5,15,30,45,60,120].map(n => `<button data-time="${n}" class="${selected===n?"active":""}"><strong>${n < 60 ? n : n/60}</strong><small>${n < 60 ? "min" : n===60 ? "hour" : "hours"}</small></button>`).join("")}</div>
      <button class="primary" id="make-plan"><span>Generate tasks</span><b>→</b></button>
    </section>
    <section class="home-preview"><div><span class="kicker">Preview</span><h2>${preview.length === 1 ? "Suggested task" : "Suggested tasks"}</h2></div>
      <div class="preview-stack">${preview.slice(0,3).map(t=>`<div><span>${escapeHtml(t.room)}</span><strong>${escapeHtml(t.name)}</strong><small>${t.minutes} min · score ${totalScore(t)}</small></div>`).join("")}</div>
    </section>
  </div>`;
}

function taskRow(task, context = "today") {
  return `<article class="task-row ${isDoneToday(task) ? "completed" : ""}">
    <button class="round-check" data-complete="${task.id}" data-date="${dateKey()}" aria-label="Complete ${escapeHtml(task.name)}">${isDoneToday(task) ? "✓" : ""}</button>
    <div class="task-main"><strong>${escapeHtml(task.name)}</strong><span>${escapeHtml(task.room)} · ${escapeHtml(task.bundle)}</span>
      <div class="chips"><i>${task.minutes} min</i><i>Effort ${task.effort}</i><i>Score ${totalScore(task)}</i></div>
    </div>
    ${context==="plan" ? `<button class="skip" data-skip="${task.id}">Skip</button>` : `<span class="status">${statusText(task)}</span>`}
  </article>`;
}

function renderTasks() {
  const planned = state.recommendationIds.map(id => state.tasks.find(t => t.id === id)).filter(Boolean);
  const plannedIds = new Set(planned.map(task => task.id));
  const todaySchedule = buildCalendar(7)[0];
  const todayTasks = todaySchedule.items.map(x => x.task).filter(task => !plannedIds.has(task.id));
  return `<div class="page">
    <header class="page-head"><span class="kicker">Tasks</span><h1>Tasks</h1></header>
    <section class="task-section plan-section"><div class="section-label"><div><h2>Generated tasks</h2></div><span>${planned.reduce((n,t)=>n+t.minutes,0)} min</span></div>
      <div class="list-card">${planned.length ? planned.map(t=>taskRow(t,"plan")).join("") : `<div class="empty-state"><strong>No personal plan yet</strong><p>Choose your available time on Home to generate one.</p><button data-go="home">Go to Home</button></div>`}</div>
    </section>
    <section class="task-section today-section"><div class="section-label"><div><h2>Today</h2></div><span>${todaySchedule.minutes} min</span></div>
      <div class="list-card">${todayTasks.length ? todayTasks.map(t=>taskRow(t)).join("") : `<div class="empty-state"><strong>A clear day</strong><p>Nothing is scheduled for today.</p></div>`}</div>
    </section>
  </div>`;
}

function renderCalendar() {
  const schedule = buildCalendar(7);
  return `<div class="page">
    <header class="page-head calendar-head"><div><span class="kicker">Calendar</span><h1>This week</h1></div></header>
    <div class="calendar-list">${schedule.map((day,index)=>`<section class="calendar-day ${index===0?"today":""}">
      <header><div><span>${index===0?"Today":day.date.toLocaleDateString(undefined,{weekday:"short"})}</span><strong>${day.date.toLocaleDateString(undefined,{month:"short",day:"numeric"})}</strong></div><b class="${day.minutes>90?"heavy":""}">${day.minutes} min</b></header>
      <div>${day.items.length ? day.items.map(item=>calendarCard(item,day.key)).join("") : `<p class="rest-day">Rest day — nothing scheduled.</p>`}</div>
    </section>`).join("")}</div>
  </div>`;
}

function renderLibrary() {
  const done = state.tasks.filter(isDoneToday).length;
  return `<div class="page">
    <header class="page-head library-head"><div><span class="kicker">Library</span><h1>All tasks</h1></div><div class="library-summary"><strong>${done}</strong><span>Done today</span></div></header>
    <div class="library-table"><div class="library-table-head"><span>Task</span><span>Time</span><span>Score</span><span>Status</span></div>
      ${state.tasks.slice().sort((a,b)=>
        Number(isDoneToday(a)) - Number(isDoneToday(b)) ||
        a.room.localeCompare(b.room) ||
        dynamicRank(b) - dynamicRank(a)
      ).map(task=>`<article class="${isDoneToday(task) ? "completed" : ""}">
        <div class="library-task"><button class="library-check" data-complete="${task.id}" data-date="${dateKey()}" aria-label="${isDoneToday(task) ? "Mark not done" : "Complete"} ${escapeHtml(task.name)}">${isDoneToday(task) ? "✓" : ""}</button><div><strong>${escapeHtml(task.name)}</strong><small>${escapeHtml(task.room)} · ${escapeHtml(task.bundle)}</small></div></div>
        <span>${task.minutes}m</span><b>${totalScore(task)}</b><i class="${isDoneToday(task)?"done":isDue(task)?"due":isDueSoon(task)?"soon":""}">${statusText(task)}</i>
      </article>`).join("")}
    </div>
  </div>`;
}

function render() {
  document.getElementById("app").innerHTML = tab==="home" ? renderHome() : tab==="tasks" ? renderTasks() : tab==="calendar" ? renderCalendar() : renderLibrary();
  document.querySelectorAll("[data-tab]").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  wire();
}

function wire() {
  document.querySelectorAll("[data-time]").forEach(button => button.onclick = () => { state.selectedMinutes = +button.dataset.time; save(); render(); });
  document.querySelectorAll("[data-complete]").forEach(button => button.onclick = () => completeTask(button.dataset.complete, button.dataset.date));
  document.querySelectorAll("[data-skip]").forEach(button => button.onclick = () => {
    const task = state.tasks.find(t => t.id === button.dataset.skip);
    if (task) task.skipCount += 1;
    state.recommendationIds = state.recommendationIds.filter(id => id !== button.dataset.skip);
    save(); render(); toast("Task skipped");
  });
  document.querySelectorAll("[data-go]").forEach(button => button.onclick = () => { tab = button.dataset.go; render(); });
  const makePlan = document.getElementById("make-plan");
  if (makePlan) makePlan.onclick = () => {
    state.recommendationIds = optimizeTasks(state.selectedMinutes).map(t => t.id);
    save(); tab = "tasks"; render(); toast("Tasks generated");
  };
}

function toast(message) {
  document.getElementById("toast-root").innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  setTimeout(() => document.getElementById("toast-root").innerHTML = "", 2400);
}

document.querySelectorAll("[data-tab]").forEach(button => button.onclick = () => { tab = button.dataset.tab; render(); window.scrollTo({top:0,behavior:"smooth"}); });
render();
