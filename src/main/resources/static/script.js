const STORAGE_KEY = "studyflow-assignments-v1";
const $ = (id) => document.getElementById(id);
const form = $("assignmentForm");
const list = $("assignmentList");
let assignments = loadAssignments();
let currentFilter = "all";
let toastTimer;

function loadAssignments() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
function saveAssignments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDate(date) {
  if (!date) return "No due date";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {day:"numeric", month:"short", year:"numeric"});
}
function isOverdue(task) {
  return !task.completed && task.deadline < todayISO();
}
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}
function updateStats() {
  const total = assignments.length;
  const completed = assignments.filter(t => t.completed).length;
  const pending = total - completed;
  const overdue = assignments.filter(isOverdue).length;
  $("totalCount").textContent = total;
  $("pendingCount").textContent = pending;
  $("completedCount").textContent = completed;
  $("overdueCount").textContent = overdue;
  const percent = total ? Math.round(completed / total * 100) : 0;
  $("progressPercent").textContent = `${percent}%`;
  $("progressBar").style.width = `${percent}%`;
  $("progressText").textContent = total ? `${completed} of ${total} assignments completed. Keep going!` : "Complete a task to start your progress streak.";
}
function updateSubjects() {
  const select = $("subjectFilter");
  const selected = select.value;
  const subjects = [...new Set(assignments.map(t => t.subject.trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  select.innerHTML = '<option value="all">All subjects</option>' + subjects.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
  if (subjects.includes(selected)) select.value = selected;
}
function visibleAssignments() {
  const query = $("searchInput").value.trim().toLowerCase();
  const subject = $("subjectFilter").value;
  let result = assignments.filter(task => {
    const matchesFilter = currentFilter === "all" ||
      (currentFilter === "pending" && !task.completed) ||
      (currentFilter === "completed" && task.completed);
    const matchesSubject = subject === "all" || task.subject === subject;
    const matchesQuery = `${task.title} ${task.subject} ${task.notes || ""}`.toLowerCase().includes(query);
    return matchesFilter && matchesSubject && matchesQuery;
  });
  const sort = $("sortFilter").value;
  if (sort === "priority") {
    const rank = {High:0, Medium:1, Low:2};
    result.sort((a,b) => rank[a.priority] - rank[b.priority] || a.deadline.localeCompare(b.deadline));
  } else if (sort === "newest") {
    result.sort((a,b) => b.createdAt - a.createdAt);
  } else {
    result.sort((a,b) => Number(a.completed) - Number(b.completed) || a.deadline.localeCompare(b.deadline));
  }
  return result;
}
function render() {
  updateStats();
  updateSubjects();
  const visible = visibleAssignments();
  list.innerHTML = visible.map(task => {
    const overdue = isOverdue(task);
    return `<article class="assignment-card">
      <button class="check-btn ${task.completed ? "done" : ""}" data-action="toggle" data-id="${task.id}" aria-label="${task.completed ? "Mark as pending" : "Mark as completed"}">${task.completed ? "✓" : "✓"}</button>
      <div class="task-main">
        <div class="task-title ${task.completed ? "done-text" : ""}">${escapeHTML(task.title)}</div>
        <div class="task-meta"><span class="subject-tag">${escapeHTML(task.subject)}</span><span class="priority ${escapeHTML(task.priority)}">${escapeHTML(task.priority)} priority</span><span class="due ${overdue ? "overdue" : ""}">${overdue ? "⚠ Overdue · " : "◷ Due "}${escapeHTML(formatDate(task.deadline))}</span></div>
        ${task.notes ? `<div class="task-meta" style="margin-top:8px">${escapeHTML(task.notes)}</div>` : ""}
      </div>
      <div class="task-actions"><button class="icon-btn" data-action="edit" data-id="${task.id}" aria-label="Edit assignment">✎</button><button class="icon-btn" data-action="delete" data-id="${task.id}" aria-label="Delete assignment">×</button></div>
    </article>`;
  }).join("");
  $("emptyState").classList.toggle("show", visible.length === 0);
  list.style.display = visible.length ? "grid" : "none";
  $("listHeading").textContent = currentFilter === "all" ? "Your assignments" : currentFilter === "pending" ? "Pending assignments" : "Completed assignments";
}
function resetForm() {
  form.reset();
  $("editId").value = "";
  $("priorityInput").value = "Medium";
  $("formHeading").textContent = "Quick add";
  $("saveBtn").innerHTML = 'Add assignment <span>→</span>';
  $("cancelEditBtn").classList.add("hidden");
  $("deadlineInput").min = todayISO();
}
function beginEdit(id) {
  const task = assignments.find(t => t.id === id);
  if (!task) return;
  $("editId").value = task.id;
  $("titleInput").value = task.title;
  $("subjectInput").value = task.subject;
  $("deadlineInput").value = task.deadline;
  $("priorityInput").value = task.priority;
  $("notesInput").value = task.notes || "";
  $("formHeading").textContent = "Edit assignment";
  $("saveBtn").innerHTML = 'Save changes <span>→</span>';
  $("cancelEditBtn").classList.remove("hidden");
  $("formPanel").scrollIntoView({behavior:"smooth", block:"start"});
  $("titleInput").focus({preventScroll:true});
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("titleInput").value.trim();
  const subject = $("subjectInput").value.trim();
  const deadline = $("deadlineInput").value;
  if (!title || !subject || !deadline) {
    showToast("Please fill in the title, subject, and due date.");
    return;
  }
  const editId = $("editId").value;
  if (editId) {
    const index = assignments.findIndex(t => t.id === editId);
    if (index !== -1) assignments[index] = {...assignments[index], title, subject, deadline, priority:$("priorityInput").value, notes:$("notesInput").value.trim()};
    showToast("Assignment updated successfully.");
  } else {
    assignments.push({id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, title, subject, deadline, priority:$("priorityInput").value, notes:$("notesInput").value.trim(), completed:false, createdAt:Date.now()});
    showToast("Assignment added. You've got this!");
  }
  saveAssignments();
  resetForm();
  render();
});
list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const {action, id} = button.dataset;
  const task = assignments.find(t => t.id === id);
  if (!task) return;
  if (action === "toggle") {
    task.completed = !task.completed;
    showToast(task.completed ? "Great work! Assignment completed." : "Assignment moved back to pending.");
  } else if (action === "edit") {
    beginEdit(id);
    return;
  } else if (action === "delete") {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    assignments = assignments.filter(t => t.id !== id);
    showToast("Assignment deleted.");
  }
  saveAssignments();
  render();
});
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
  render();
}));
$("searchInput").addEventListener("input", render);
$("subjectFilter").addEventListener("change", render);
$("sortFilter").addEventListener("change", render);
$("addAssignmentBtn").addEventListener("click", () => $("titleInput").focus());
$("emptyAddBtn").addEventListener("click", () => $("titleInput").focus());
$("cancelEditBtn").addEventListener("click", resetForm);
$("todayLabel").textContent = new Date().toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"});
$("deadlineInput").min = todayISO();
render();
