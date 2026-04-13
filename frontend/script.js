const BASE_URL="http://localhost:5000";

let selectedSubject=null;


// SIGNUP
async function signup(){

const name=document.getElementById("name").value;
const email=document.getElementById("email").value;
const password=document.getElementById("password").value;

const response=await fetch(`${BASE_URL}/signup`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name,email,password})
});

const data=await response.json();

alert(data.message);

if(data.success){
window.location.href="login.html";
}

}


// LOGIN
async function login(){

const email=document.getElementById("email").value;
const password=document.getElementById("password").value;

const response=await fetch(`${BASE_URL}/login`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({email,password})
});

const data=await response.json();

alert(data.message);

if(data.success){

localStorage.setItem("token",data.token);
localStorage.setItem("userId",data.userId);

window.location.href="dashboard.html";

}

}


// LOAD DASHBOARD
async function loadDashboard(){

const token=localStorage.getItem("token");

if(!token){

window.location.href="login.html";
return;

}

const response=await fetch(`${BASE_URL}/dashboard-stats`,{
headers:{authorization:token}
});

const data=await response.json();

if(data.success){

document.getElementById("subjectsCount").innerText=data.stats.totalSubjects;
document.getElementById("tasksCount").innerText=data.stats.totalTasks;
document.getElementById("completedCount").innerText=data.stats.completedTasks;
document.getElementById("pendingCount").innerText=data.stats.pendingTasks;

const percent=Math.round(
(data.stats.completedTasks/(data.stats.totalTasks||1))*100
);

document.getElementById("progressBar").style.width=percent+"%";

document.getElementById("progressPercent").innerText=
percent+"%";

}

}

loadDashboard();


// LOGOUT
function logout(){

localStorage.clear();
window.location.href="login.html";

}


// SUBJECT MODAL OPEN
document.querySelector(".floating-btn")
?.addEventListener("click",()=>{

document.getElementById("subjectModal").style.display="flex";

});


// OPEN TASK MODAL
function openTaskModal(subjectId){

selectedSubject=subjectId;

document.getElementById("taskModal").style.display="flex";

}


// ADD SUBJECT
async function addSubject(){

const subjectName=document.getElementById("subjectName").value;

if(!subjectName)return;

const token=localStorage.getItem("token");

const response=await fetch(`${BASE_URL}/add-subject`,{
method:"POST",
headers:{
"Content-Type":"application/json",
authorization:token
},
body:JSON.stringify({subject_name:subjectName})
});

const data=await response.json();

showToast(data.message);

document.getElementById("subjectModal").style.display="none";

loadSubjects();
loadDashboard();

}


// SAVE TASK
async function saveTask(){

const taskName=document.getElementById("taskName").value;

if(!taskName)return;

const deadline=document.getElementById("taskDeadline").value;

const token=localStorage.getItem("token");

await fetch(`${BASE_URL}/add-task`,{
method:"POST",
headers:{
"Content-Type":"application/json",
authorization:token
},
body:JSON.stringify({
subject_id:selectedSubject,
task_name:taskName,
deadline:deadline
})
});

showToast("Task added");

document.getElementById("taskModal").style.display="none";

loadSubjects();
loadDashboard();

}


// LOAD SUBJECTS + EMPTY STATE
async function loadSubjects(){

const token=localStorage.getItem("token");

const response=await fetch(`${BASE_URL}/subjects`,{
headers:{authorization:token}
});

const data=await response.json();

const container=document.getElementById("subjectsList");

container.innerHTML="";


if(data.subjects.length===0){

container.innerHTML=`
<div style="
opacity:.6;
font-size:18px;
margin-top:20px;
">
No subjects yet. Click + to add one.
</div>
`;

return;

}


for(const subject of data.subjects){

const taskResponse=await fetch(
`${BASE_URL}/tasks-by-subject/${subject.id}`,
{headers:{authorization:token}}
);

const taskData=await taskResponse.json();

let taskHTML="";

taskData.tasks.forEach(task=>{

const today=new Date();
const deadline=new Date(task.deadline);

let color="green";

if(deadline-today<86400000)color="red";
else if(deadline-today<259200000)color="yellow";

taskHTML+=`

<div class="task-item">

<div class="task-left">

<input type="checkbox"
${task.status==="completed"?"checked":""}
onchange="toggleTask(${task.id},this.checked)">

<span class="task-name
${task.status==="completed"?"completed":""}">

${task.task_name}

</span>

</div>

<span class="deadline ${color}">
${task.deadline}
</span>

<button class="task-delete"
onclick="deleteTask(${task.id})">
✕
</button>

</div>

`;

});


container.innerHTML+=`

<div class="subject-card">

<div>

<strong>${subject.subject_name}</strong>

<br><br>

<button class="add-task-btn"
onclick="openTaskModal(${subject.id})">
Add Task
</button>

<div class="task-container">

${taskHTML}

</div>

</div>

<button class="delete-btn"
onclick="deleteSubject(${subject.id})">
✕
</button>

</div>

`;

}

}

loadSubjects();


// TOGGLE TASK STATUS
async function toggleTask(id,status){

const token=localStorage.getItem("token");

await fetch(`${BASE_URL}/update-task/${id}`,{
method:"PUT",
headers:{
"Content-Type":"application/json",
authorization:token
},
body:JSON.stringify({
status:status?"completed":"pending"
})
});

loadSubjects();
loadDashboard();

}


// DELETE TASK
async function deleteTask(id){

const token=localStorage.getItem("token");

await fetch(`${BASE_URL}/delete-task/${id}`,{
method:"DELETE",
headers:{authorization:token}
});

showToast("Task deleted");

loadSubjects();
loadDashboard();

}


// DELETE SUBJECT
async function deleteSubject(id){

const token=localStorage.getItem("token");

await fetch(`${BASE_URL}/delete-subject/${id}`,{
method:"DELETE",
headers:{authorization:token}
});

showToast("Subject deleted");

loadSubjects();
loadDashboard();

}


// TOAST
function showToast(message){

let toast=document.createElement("div");

toast.className="toast";

toast.innerText=message;

document.body.appendChild(toast);

setTimeout(()=>toast.classList.add("show"),100);

setTimeout(()=>toast.remove(),2500);

}


// CLOSE MODALS
function closeSubjectModal(){
document.getElementById("subjectModal").style.display="none";
}

function closeTaskModal(){
document.getElementById("taskModal").style.display="none";
}


// CLICK OUTSIDE CLOSE
window.onclick=function(e){

if(e.target.id==="subjectModal")
closeSubjectModal();

if(e.target.id==="taskModal")
closeTaskModal();

};