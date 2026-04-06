import re

with open(r'c:\Users\IT-ROHL\Desktop\Github\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace Zoho WorkDrive Config section with Backend Configuration
zoho_config_pattern = re.compile(
    r'// ═══════════════════════════════════════════════════════\s*// ZOHO WORKDRIVE CONFIG.*?// ═══════════════════════════════════════════════════════\s*// STATE',
    re.DOTALL
)

backend_config = """// ═══════════════════════════════════════════════════════
// BACKEND CONFIGURATION
// ═══════════════════════════════════════════════════════
const API_URL = 'http://localhost:3000/api';

async function loadTicketsFromWorkDrive() {
  if (!currentUser) return;
  setWdLabel('⏳ Connecting to Server…', 'syncing');
  setBtnRefreshSpinning(true);
  try {
    const res = await fetch(`${API_URL}/tickets`);
    if(!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    tickets = Array.isArray(data) ? data : [];
    
    // Also fetch admins if superadmin
    if (currentUser.role === 'superadmin') {
      const resAdmins = await fetch(`${API_URL}/admins`);
      if (resAdmins.ok) {
        hotelAdmins = await resAdmins.json();
        renderAdminUsers();
      }
    }
    
    setWdLabel('✅ Synced · ' + tickets.length + ' ticket' + (tickets.length !== 1 ? 's' : ''), 'synced');
    renderAdminTickets();
    renderTickets();
    updateStats();
  } catch(e) {
    setWdLabel('❌ ' + e.message.slice(0, 80), 'error');
    console.error('Server load error:', e);
  } finally {
    setBtnRefreshSpinning(false);
  }
}

// ═══════════════════════════════════════════════════════
// STATE"""

html = zoho_config_pattern.sub(backend_config, html)

# Replace doLogin
login_pattern = re.compile(
    r'function doLogin\(\) \{.*?(?:return;\s*\n\s+\}\s*)+// Only show error if credentials are wrong — not WorkDrive errors\s*err\.textContent = \'⚠️ Invalid email or password\.\';\s*\}',
    re.DOTALL
)

new_login = """async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-err');
  err.textContent = '⏳ Authenticating...';

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');
    
    currentUser = data.user;
    saveSession(currentUser);
    showScreen('admin');
  } catch(e) {
    err.textContent = '⚠️ ' + e.message;
  }
}"""
html = login_pattern.sub(new_login, html)

# Replace updateTicket
update_pattern = re.compile(
    r'async function updateTicket.*?setTimeout\(\(\)=>{ const el=document\.getElementById\(\'at-\'\+id\); if\(el\) el\.classList\.add\(\'expanded\'\); },50\);\s*\}',
    re.DOTALL
)

new_update = """async function updateTicket(id) {
  const ticket = tickets.find(t=>t.id===id);
  if (!ticket) return;
  if (currentUser.role==='hoteladmin' && ticket.property!==currentUser.hotel) return;

  const btn = document.getElementById('upd-'+id);
  btn.disabled = true; btn.textContent = '⏳ Saving…';

  const newStatus = document.getElementById('ss-'+id).value;
  const noteText = document.getElementById('note-'+id).value.trim();

  let noteObj = null;
  if (noteText) {
    noteObj = {
      by:   currentUser.email,
      date: new Date().toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),
      text: noteText
    };
  }

  try {
    setWdLabel('⏳ Saving update to Server…', 'syncing');
    const res = await fetch(`${API_URL}/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, note: noteObj })
    });
    if (!res.ok) throw new Error("Failed to update status");
    
    ticket.status = newStatus;
    if (noteObj) {
      if (!ticket.notes) ticket.notes = [];
      ticket.notes.push(noteObj);
    }
    
    setWdLabel('✅ Update saved to Server', 'synced');
    btn.textContent = '✅ Saved!';
    setTimeout(()=>{ btn.disabled=false; btn.textContent='💾 Save & Sync'; },2000);
  } catch(e) {
    setWdLabel('❌ Update failed: ' + e.message.slice(0,60), 'error');
    btn.textContent = '❌ Failed';
    btn.disabled = false;
    setTimeout(()=>{ btn.textContent='💾 Save & Sync'; },3000);
  }

  renderAdminTickets();
  renderTickets();
  setTimeout(()=>{ const el=document.getElementById('at-'+id); if(el) el.classList.add('expanded'); },50);
}"""
html = update_pattern.sub(new_update, html)

# Replace submitTicket
submit_pattern = re.compile(
    r'async function submitTicket\(\)\{.*?(?:btn\.disabled=false; btn\.textContent=\'🚀 Submit Support Ticket\';\s*\n\s+\}\s*)\}',
    re.DOTALL
)

new_submit = """async function submitTicket(){
  if(!validate())return;
  const btn=document.getElementById('btn-submit-ticket');
  btn.disabled=true; btn.textContent='⏳ Saving to Server…';
  setSubmitStatus('Connecting to Server…','syncing');

  const ticket={
    id:generateId(), notes:[],
    property:document.getElementById('inp-property').value,
    name:document.getElementById('inp-name').value.trim(),
    email:document.getElementById('inp-email').value.trim(),
    dept:document.getElementById('inp-dept').value||'N/A',
    subject:document.getElementById('inp-subject').value.trim(),
    category:document.getElementById('inp-cat').value,
    os:document.getElementById('inp-os').value||'N/A',
    desc:document.getElementById('inp-desc').value.trim(),
    priority:document.querySelector('input[name="priority"]:checked').value,
    status:'Open',
    date:new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),
    submittedAt: new Date().toISOString(),
  };

  try {
    const formData = new FormData();
    formData.append('ticketData', JSON.stringify(ticket));
    if (fileInput.files[0]) {
      formData.append('file', fileInput.files[0]);
    }

    setSubmitStatus('☁️ Uploading to Server…','syncing');
    const res = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      body: formData
    });
    if(!res.ok) throw new Error("Failed to submit");
    const data = await res.json();
    
    tickets.unshift(data.ticket);
    renderTickets();
    setSubmitStatus('✅ Saved to Server!','synced');
    document.getElementById('success-ref').textContent=data.ticket.id;

    document.getElementById('form-wrap').style.display='none';
    document.getElementById('success-screen').classList.add('show');
    
    // Add attachment link visually if uploaded
    if(data.ticket.attachmentLink) {
        document.getElementById('success-ref').insertAdjacentHTML('afterend', `<p style="margin-top:10px;"><a href="${data.ticket.attachmentLink}" target="_blank" style="color:var(--accent);text-decoration:none;">📎 View WorkDrive Attachment</a></p>`);
    }

    console.log('✅ Ticket saved:', data.ticket.id);
  } catch(e) {
    console.error('Server save error:', e);
    setSubmitStatus('⚠️ Server unavailable.','error');
  } finally {
    btn.disabled=false; btn.textContent='🚀 Submit Support Ticket';
  }
}"""
html = submit_pattern.sub(new_submit, html)

# Add attachment link in renderAdminTickets
# <div class="detail-row full"><div class="d-label">Description</div><div class="desc-box">${t.desc}</div></div>
desc_box = r'<div class="detail-row full"><div class="d-label">Description</div><div class="desc-box">${t.desc}</div></div>'
desc_replace = desc_box + r'\n          ${t.attachmentLink ? `<div class="detail-row full"><div class="d-label">Attachment</div><div class="d-val"><a href="${t.attachmentLink}" target="_blank" style="color:var(--success);text-decoration:none;">📎 Open stored file</a></div></div>` : ``}'
html = html.replace(desc_box, desc_replace)

# Manage Admins Add
add_admin_pattern = re.compile(
    r'function addHotelAdmin\(\)\{.*?renderAdminUsers\(\);\s*\}',
    re.DOTALL
)

new_add_admin = """async function addHotelAdmin(){
  if(currentUser.role!=='superadmin')return;
  const name=document.getElementById('new-admin-name').value.trim();
  const email=document.getElementById('new-admin-email').value.trim();
  const pass=document.getElementById('new-admin-pass').value;
  const hotel=document.getElementById('new-admin-hotel').value;
  const msg=document.getElementById('add-admin-msg');
  if(!name||!email||!pass||!hotel){msg.style.color='var(--accent2)';msg.textContent='⚠️ Please fill all fields.';return;}
  if(pass.length<6){msg.style.color='var(--accent2)';msg.textContent='⚠️ Password must be 6+ characters.';return;}
  if(hotelAdmins.find(a=>a.email.toLowerCase()===email.toLowerCase())){msg.style.color='var(--accent2)';msg.textContent='⚠️ Email already exists.';return;}
  
  msg.style.color='var(--text)';msg.textContent='⏳ Saving...';
  try {
    const res = await fetch(`${API_URL}/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({name,email,password:pass,hotel,role:'hoteladmin'})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Failed');
    
    hotelAdmins.push({name,email,password:pass,hotel,role:'hoteladmin'});
    ['new-admin-name','new-admin-email','new-admin-pass'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('new-admin-hotel').value='';
    msg.style.color='var(--success)';msg.textContent='✅ Admin added!';
    setTimeout(()=>{msg.textContent='';},3000);
    renderAdminUsers();
  } catch(e) {
    msg.style.color='var(--accent2)';msg.textContent='⚠️ ' + e.message;
  }
}"""
html = add_admin_pattern.sub(new_add_admin, html)

# Manage Admins Delete
del_admin_pattern = re.compile(
    r'function deleteAdmin\(idx\)\{.*?renderAdminUsers\(\);\s*\}',
    re.DOTALL
)

new_del_admin = """async function deleteAdmin(idx){
  if(currentUser.role!=='superadmin')return;
  if(!confirm('Remove this admin?'))return;
  try {
    await fetch(`${API_URL}/admins/${idx}`, { method: 'DELETE' });
    hotelAdmins.splice(idx,1);
    renderAdminUsers();
  } catch(e) { alert("Failed to delete"); }
}"""
html = del_admin_pattern.sub(new_del_admin, html)


with open(r'c:\Users\IT-ROHL\Desktop\Github\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Migration successful.")
