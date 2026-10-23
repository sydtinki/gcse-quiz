(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let adminPassword = ''; // kept in memory only, never stored

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    });
    let data = {};
    try { data = await res.json(); } catch (_) { /* ignore */ }
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  async function unlock(e) {
    e.preventDefault();
    adminPassword = $('admin-password').value;
    $('unlock-error').textContent = '';
    try {
      await loadUsers();
      $('unlock-section').hidden = true;
      $('panel').hidden = false;
    } catch (err) {
      adminPassword = '';
      $('unlock-error').textContent = err.message;
    }
  }

  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  function actionButton(label, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn small';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  async function loadUsers() {
    const data = await api('/api/admin/users');
    const body = document.querySelector('#users-table tbody');
    body.replaceChildren();
    $('users-error').textContent = '';

    if (!data.users.length) {
      const tr = document.createElement('tr');
      const td = cell('No accounts yet.');
      td.colSpan = 5;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    data.users.forEach((u) => {
      const tr = document.createElement('tr');
      tr.append(
        cell(u.username),
        cell(String(u.created_year)),
        cell(u.expired ? 'Expired' : 'Valid'),
        cell(u.device_in_use ? 'In use' : 'Free')
      );

      const actions = document.createElement('td');
      actions.className = 'row-actions';
      if (u.device_in_use) {
        actions.appendChild(actionButton('Reset device', () => act('/api/admin/reset-device', u.id)));
      }
      actions.appendChild(actionButton('Delete', () => {
        if (confirm(`Delete the account "${u.username}" and its results? This cannot be undone.`)) {
          act('/api/admin/delete-user', u.id);
        }
      }));
      tr.appendChild(actions);
      body.appendChild(tr);
    });
  }

  async function act(path, id) {
    try {
      await api(path, { method: 'POST', body: JSON.stringify({ id }) });
      await loadUsers();
    } catch (err) {
      $('users-error').textContent = err.message;
    }
  }

  async function createUsers(e) {
    e.preventDefault();
    const msg = $('create-msg');
    const list = $('create-problems');
    msg.textContent = '';
    list.replaceChildren();
    try {
      const data = await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ lines: $('lines').value }),
      });
      msg.textContent = `Created ${data.created} account(s) for ${data.year}.`;
      data.problems.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        list.appendChild(li);
      });
      if (!data.problems.length) $('lines').value = '';
      await loadUsers();
    } catch (err) {
      msg.textContent = err.message;
    }
  }

  $('unlock-form').addEventListener('submit', unlock);
  $('create-form').addEventListener('submit', createUsers);
})();