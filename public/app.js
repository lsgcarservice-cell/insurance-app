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