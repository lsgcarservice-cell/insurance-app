let token = localStorage.getItem('ins_token');
let dataCache = [];

if(!token) location.href='/';

function logout(){
  localStorage.clear();
  location.href='/';
}

async function loadCustomers(){
  const res = await fetch('/api/customers',{
    headers:{Authorization:'Bearer '+token}
  });
  dataCache = await res.json();
  render(dataCache);
}

function render(data){
  list.innerHTML = data.map(c=>`
    <tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.car}</td>
      <td><button class="btn btn-del" onclick="del(${c.id})">ลบ</button></td>
    </tr>
  `).join('');
}

function search(q){
  const f = dataCache.filter(c=>c.name.toLowerCase().includes(q.toLowerCase()));
  render(f);
}

async function add(){
  await fetch('/api/customers',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      Authorization:'Bearer '+token
    },
    body:JSON.stringify({
      name:name.value,
      phone:phone.value,
      car:car.value
    })
  });

  modal.style.display='none';
  loadCustomers();
}

async function del(id){
  await fetch('/api/customers/'+id,{
    method:'DELETE',
    headers:{Authorization:'Bearer '+token}
  });
  loadCustomers();
}

function showDashboard(){
  title.innerText='Dashboard';
  dashboard.style.display='';
  customers.style.display='none';
  loadStats();
}

function showCustomers(){
  title.innerText='Customers';
  dashboard.style.display='none';
  customers.style.display='';
  loadCustomers();
}

async function loadStats(){
  const res = await fetch('/api/reports/summary',{
    headers:{Authorization:'Bearer '+token}
  });
  const d = await res.json();

  c1.innerText=d.customers;
  c2.innerText=d.policies;
  c3.innerText=d.revenue;

  new Chart(chart,{
    type:'bar',
    data:{
      labels:['Customers','Policies','Revenue'],
      datasets:[{data:[d.customers,d.policies,d.revenue]}]
    }
  });
}

window.onclick=e=>{
  if(e.target==modal) modal.style.display='none';
};

showDashboard();