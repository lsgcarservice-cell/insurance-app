const token = localStorage.getItem('token');

async function login() {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      username: u.value,
      password: p.value
    })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error);

  localStorage.setItem('token', data.token);
  location.href = '/dashboard.html';
}

async function load() {
  const res = await fetch('/api/customers', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json();

  list.innerHTML = data.map(c =>
    `<li>${c.name} - ${c.car}
      <button onclick="del(${c.id})">ลบ</button>
    </li>`
  ).join('');
}

async function add() {
  await fetch('/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      name: name.value,
      phone: phone.value,
      car: car.value
    })
  });

  load();
}

async function del(id) {
  await fetch('/api/customers/' + id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  });
  load();
}

if (location.pathname.includes('dashboard')) load();
function showDashboard() {
  dashboard.style.display = '';
  customers.style.display = 'none';
  loadDashboard();
}

function showCustomers() {
  dashboard.style.display = 'none';
  customers.style.display = '';
  load();
}

function openModal() {
  modal.style.display = 'block';
}

function logout() {
  localStorage.removeItem('token');
  location.href = '/';
}

// ===== Dashboard =====
async function loadDashboard() {
  const res = await fetch('/api/reports/summary', {
    headers: { Authorization: 'Bearer ' + token }
  });

  const d = await res.json();

  c_total.innerText = d.customers;
  c_policy.innerText = d.policies;
  c_money.innerText = d.revenue;
}

// ปิด modal เมื่อคลิกพื้นหลัง
window.onclick = function(e) {
  if (e.target == modal) modal.style.display = "none";
}
let customersData = [];

function showDashboard() {
  pageTitle.innerText = "Dashboard";
  dashboard.style.display = '';
  customers.style.display = 'none';
  loadDashboard();
}

function showCustomers() {
  pageTitle.innerText = "Customers";
  dashboard.style.display = 'none';
  customers.style.display = '';
  load();
}

async function load() {
  const res = await fetch('/api/customers', {
    headers:{Authorization:'Bearer '+token}
  });
  customersData = await res.json();
  render(customersData);
}

function render(data) {
  list.innerHTML = data.map(c=>`
    <tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.car}</td>
      <td><button class="btn btn-del" onclick="del(${c.id})">ลบ</button></td>
    </tr>
  `).join('');
}

function search(q) {
  const f = customersData.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase())
  );
  render(f);
}

async function loadDashboard() {
  const res = await fetch('/api/reports/summary',{
    headers:{Authorization:'Bearer '+token}
  });
  const d = await res.json();

  c1.innerText = d.customers;
  c2.innerText = d.policies;
  c3.innerText = d.revenue;

  new Chart(document.getElementById('chart'), {
    type: 'bar',
    data: {
      labels: ['Customers','Policies','Revenue'],
      datasets: [{
        data: [d.customers, d.policies, d.revenue]
      }]
    }
  });
}

function logout(){
  localStorage.clear();
  location.href='/';
}

window.onclick = e=>{
  if(e.target==modal) modal.style.display='none';
};

if(location.pathname.includes('dashboard')) showDashboard();