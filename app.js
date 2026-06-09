// ============================================================
//  Wire Tracker — app.js
//  Supabase backend | قسم الكهرباء
// ============================================================

const SB_URL = 'https://mqnekmfnjwdzwhbegngm.supabase.co';
const SB_KEY = 'sb_publishable_x8_Vv17NNZqsjq-VMVDfzA_jdxW0ov-';
const TABLE  = 'wire_entries';

// ---- بيانات ثابتة ----
const SUPS = ['يوسف ماهر','أيمن منير','يحيى شعبان','مجدي لطفي','سامي وارث','محمد السعودي','عزت نبيه'];
const CLUSTERS = ['Cluster 5','Cluster 6','Cluster 9','Cluster 10','Cluster 15','Cluster 16','Cluster 17','Cluster 18'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const WIRES = [
  {g:'أسلاك منفردة', items:[
    {v:'3mm نحاس',l:'سلك 3mm نحاس'},{v:'4mm نحاس',l:'سلك 4mm نحاس'},
    {v:'6mm نحاس',l:'سلك 6mm نحاس'},{v:'2mm نحاس',l:'سلك 2mm نحاس'}
  ]},
  {g:'كابلات NYY', items:[
    {v:'NYY 3×2.5',l:'NYY 3×2.5mm'},{v:'NYY 3×4',l:'NYY 3×4mm'},
    {v:'NYY 3×6',l:'NYY 3×6mm'},{v:'NYY 4×10',l:'NYY 4×10mm'},
    {v:'NYY 4×16',l:'NYY 4×16mm'},{v:'NYY 4×25',l:'NYY 4×25mm'}
  ]},
  {g:'أسلاك مرنة NYAF', items:[
    {v:'NYAF 1.5mm',l:'NYAF 1.5mm'},{v:'NYAF 2.5mm',l:'NYAF 2.5mm'},{v:'NYAF 4mm',l:'NYAF 4mm'}
  ]},
  {g:'كابلات SWA', items:[
    {v:'SWA 4×16',l:'SWA 4×16mm'},{v:'SWA 4×25',l:'SWA 4×25mm'},{v:'SWA 4×35',l:'SWA 4×35mm'}
  ]},
];
const COLORS = [
  {v:'أحمر|#e74c3c',      l:'🔴 أحمر — فاز L1'},
  {v:'أصفر|#f1c40f',      l:'🟡 أصفر — فاز L2'},
  {v:'أزرق فاتح|#3498db', l:'🔵 أزرق فاتح — فاز L3'},
  {v:'أسود|#2c3e50',      l:'⚫ أسود — نيوترال'},
  {v:'أزرق غامق|#1a237e', l:'🔵 أزرق غامق — نيوترال IEC'},
  {v:'أخضر/أصفر|#27ae60', l:'🟢 أخضر/أصفر — أرضي'},
  {v:'بني|#795548',        l:'🟤 بني — فاز IEC'},
  {v:'رمادي|#9e9e9e',     l:'⚪ رمادي'},
  {v:'متعدد|#8e44ad',     l:'🟣 متعدد — كابل'},
];

// ---- state ----
let rc = 0;

// ============================================================
//  Supabase helpers
// ============================================================
async function sbFetch(method, path, body) {
  const res = await fetch(SB_URL + '/rest/v1/' + path, {
    method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  if (res.status === 204) return [];
  return res.json();
}

async function getAll(f = {}) {
  let q = TABLE + '?select=*&order=entry_date.desc,created_at.desc';
  if (f.sup)   q += '&supervisor=eq.'  + encodeURIComponent(f.sup);
  if (f.cl)    q += '&cluster=eq.'     + encodeURIComponent(f.cl);
  if (f.fr)    q += '&entry_date=gte.' + f.fr;
  if (f.to)    q += '&entry_date=lte.' + f.to;
  if (f.month) q += '&entry_date=gte.' + f.month + '-01&entry_date=lte.' + f.month + '-31';
  return sbFetch('GET', q);
}
async function insertRow(row) { return sbFetch('POST', TABLE, row); }
async function deleteRow(id)  { return sbFetch('DELETE', TABLE + '?id=eq.' + id); }
async function deleteAllRows(){ return sbFetch('DELETE', TABLE + '?id=neq.00000000-0000-0000-0000-000000000000'); }

// ============================================================
//  UI helpers
// ============================================================
function fmtD(d) {
  if (!d) return '—';
  const [y,m,day] = d.split('T')[0].split('-');
  return day + '/' + m + '/' + y;
}
function wireOpts() {
  return '<option value="">— نوع السلك —</option>' +
    WIRES.map(g =>
      '<optgroup label="' + g.g + '">' +
      g.items.map(i => '<option value="' + i.v + '">' + i.l + '</option>').join('') +
      '</optgroup>'
    ).join('');
}
function colorOpts() {
  return '<option value="">— اللون —</option>' +
    COLORS.map(c => '<option value="' + c.v + '">' + c.l + '</option>').join('');
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function showSyncBar(msg, isErr) {
  const b = document.getElementById('sync-bar');
  b.style.display = 'flex';
  b.textContent = msg;
  b.className = 'sync-bar' + (isErr ? ' err' : '');
}

// ============================================================
//  Modal
// ============================================================
function openModal(title, msg, cb) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent   = msg;
  document.getElementById('modal-ok').onclick = () => { cb(); closeModal(); };
  document.getElementById('overlay').classList.add('on');
}
function closeModal() { document.getElementById('overlay').classList.remove('on'); }

// ============================================================
//  Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('overlay')) closeModal();
  });
  document.getElementById('i-date').value = new Date().toISOString().split('T')[0];
  const now = new Date();
  document.getElementById('r-month').value =
    now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  addRow();
  checkConnection();
  loadStats();
});

// ============================================================
//  Connection
// ============================================================
async function checkConnection() {
  try {
    await sbFetch('GET', TABLE + '?select=id&limit=1');
    document.getElementById('status-dot').classList.remove('offline');
    document.getElementById('status-text').textContent = 'متصل';
    showSyncBar('✅ متصل — البيانات مشتركة بين جميع الأجهزة', false);
    setTimeout(() => { document.getElementById('sync-bar').style.display = 'none'; }, 3500);
  } catch (e) {
    document.getElementById('status-dot').classList.add('offline');
    document.getElementById('status-text').textContent = 'غير متصل';
    showSyncBar('❌ تعذر الاتصال بقاعدة البيانات', true);
  }
}

// ============================================================
//  Stats
// ============================================================
async function loadStats() {
  try {
    const all = await getAll();
    document.getElementById('s-ent').textContent = all.length;
    const tot = all.reduce((s, e) => s + parseFloat(e.qty || 0), 0);
    document.getElementById('s-met').textContent = Math.round(tot).toLocaleString('ar') + 'م';
  } catch (e) {
    document.getElementById('s-ent').textContent = '—';
    document.getElementById('s-met').textContent = '—';
  }
}

// ============================================================
//  Navigation
// ============================================================
function nav(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.tnav-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('pg-' + id).classList.add('on');
  btn.classList.add('on');
  window.scrollTo(0, 0);
  if (id === 'records') { loadCrossTable(); loadRecords(); }
}

// ============================================================
//  Wire rows (multi-wire entry)
// ============================================================
function addRow() {
  rc++;
  const n = rc;
  const div = document.createElement('div');
  div.className = 'wrow';
  div.id = 'wr-' + n;
  div.innerHTML =
    '<div class="wrow-badge">سلك ' + n + '</div>' +
    '<div class="wrow-grid">' +
      '<div class="fg"><label>نوع السلك</label><select id="wt-' + n + '">' + wireOpts() + '</select></div>' +
      '<div class="fg"><label>اللون</label><select id="wc-' + n + '">' + colorOpts() + '</select></div>' +
    '</div>' +
    '<div class="wrow-footer">' +
      '<div class="fg"><label>الكمية (متر)</label><input type="number" id="wq-' + n + '" placeholder="0" min="0" step="0.5"></div>' +
      '<button class="btn btn-danger btn-icon" onclick="delRow(' + n + ')">✕</button>' +
    '</div>';
  document.getElementById('rows-wrap').appendChild(div);
}

function delRow(n) {
  const el = document.getElementById('wr-' + n);
  if (el) el.remove();
}

function resetForm() {
  ['i-sup', 'i-cl', 'i-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('rows-wrap').innerHTML = '';
  rc = 0;
  addRow();
}

// ============================================================
//  Save entry
// ============================================================
async function save() {
  const date  = document.getElementById('i-date').value;
  const sup   = document.getElementById('i-sup').value;
  const cl    = document.getElementById('i-cl').value;
  const notes = document.getElementById('i-notes').value.trim();

  if (!date || !sup || !cl) { showToast('⚠️ يرجى اختيار التاريخ والمشرف والـ Cluster'); return; }
  const rows = document.querySelectorAll('.wrow');
  if (!rows.length) { showToast('⚠️ أضف سلك واحد على الأقل'); return; }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '⏳ جاري الحفظ...';

  let added = 0, failed = 0;
  for (const row of rows) {
    const id = row.id.replace('wr-', '');
    const wt = document.getElementById('wt-' + id)?.value;
    const wc = document.getElementById('wc-' + id)?.value;
    const wq = parseFloat(document.getElementById('wq-' + id)?.value);
    if (!wt || !wc || !wq || wq <= 0) continue;
    const [cn, ch] = wc.split('|');
    try {
      await insertRow({ entry_date: date, supervisor: sup, cluster: cl, wire_type: wt, color_name: cn, color_hex: ch || '#999', qty: wq, notes });
      added++;
    } catch (e) { failed++; }
  }

  btn.disabled = false;
  btn.innerHTML = '✅ حفظ السجل';

  if (added === 0) { showToast('⚠️ أكمل بيانات الأسلاك (النوع + اللون + الكمية)'); return; }
  showToast('✅ تم حفظ ' + added + ' سلك' + (failed ? ' — فشل ' + failed : ''));
  resetForm();
  loadStats();
}

// ============================================================
//  Cross table: مشرف × Cluster
// ============================================================
async function loadCrossTable() {
  document.getElementById('cross-wrap').innerHTML = '<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  try {
    const data = await getAll();
    if (!data.length) {
      document.getElementById('cross-wrap').innerHTML = '<div class="empty-state"><span class="e-icon">📭</span><p>لا توجد بيانات بعد</p></div>';
      return;
    }
    const activeCls  = CLUSTERS.filter(c  => data.some(e => e.cluster    === c));
    const activeSups = SUPS.filter(s       => data.some(e => e.supervisor === s));
    const mat = {};
    activeSups.forEach(s => { mat[s] = {}; activeCls.forEach(c => { mat[s][c] = 0; }); });
    data.forEach(e => { if (mat[e.supervisor]?.[e.cluster] !== undefined) mat[e.supervisor][e.cluster] += parseFloat(e.qty || 0); });

    let html =
      '<table class="cross-tbl"><thead><tr>' +
      '<th class="h-sup">المشرف / Cluster</th>' +
      activeCls.map(c => '<th class="h-cl">' + c + '</th>').join('') +
      '<th class="h-tot">الإجمالي</th></tr></thead><tbody>';

    activeSups.forEach(s => {
      const tot = activeCls.reduce((sum, c) => sum + (mat[s][c] || 0), 0);
      html += '<tr><td class="c-sup">' + s + '</td>' +
        activeCls.map(c => {
          const v = mat[s][c] || 0;
          return v > 0
            ? '<td class="c-val">' + Math.round(v).toLocaleString('ar') + 'م</td>'
            : '<td class="c-zero">—</td>';
        }).join('') +
        '<td class="c-tot">' + Math.round(tot).toLocaleString('ar') + 'م</td></tr>';
    });

    const grandTotal = data.reduce((s, e) => s + parseFloat(e.qty || 0), 0);
    html +=
      '</tbody><tfoot><tr><td class="c-sup">إجمالي Cluster</td>' +
      activeCls.map(c => {
        const t = activeSups.reduce((s, sup) => s + (mat[sup][c] || 0), 0);
        return '<td>' + Math.round(t).toLocaleString('ar') + 'م</td>';
      }).join('') +
      '<td style="font-weight:800;color:var(--pr)">' + Math.round(grandTotal).toLocaleString('ar') + 'م</td>' +
      '</tr></tfoot></table>';

    document.getElementById('cross-wrap').innerHTML = html;
  } catch (e) {
    document.getElementById('cross-wrap').innerHTML = '<div class="empty-state"><span class="e-icon">❌</span><p>خطأ في التحميل</p></div>';
  }
}

// ============================================================
//  Records table
// ============================================================
async function loadRecords() {
  document.getElementById('tbl-wrap').innerHTML = '<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  const filters = {
    sup: document.getElementById('f-sup').value,
    cl:  document.getElementById('f-cl').value,
    fr:  document.getElementById('f-fr').value,
    to:  document.getElementById('f-to').value,
  };
  try {
    const data = await getAll(filters);
    document.getElementById('tbl-count').textContent = data.length + ' سجل';
    if (!data.length) {
      document.getElementById('tbl-wrap').innerHTML = '<div class="empty-state"><span class="e-icon">📭</span><p>لا توجد سجلات مطابقة</p></div>';
      return;
    }
    let html =
      '<table class="main-tbl"><thead><tr>' +
      ['#','التاريخ','المشرف','Cluster','نوع السلك','اللون','الكمية','ملاحظات','حذف']
        .map(h => '<th>' + h + '</th>').join('') +
      '</tr></thead><tbody>';

    data.forEach((e, i) => {
      html +=
        '<tr>' +
        '<td style="color:var(--muted);font-size:11px">' + (i + 1) + '</td>' +
        '<td style="font-weight:600;white-space:nowrap">' + fmtD(e.entry_date) + '</td>' +
        '<td style="font-weight:600;white-space:nowrap">' + e.supervisor + '</td>' +
        '<td><span class="badge badge-blue">' + e.cluster + '</span></td>' +
        '<td style="white-space:nowrap">' + e.wire_type + '</td>' +
        '<td><span class="dot" style="background:' + e.color_hex + '"></span>' + e.color_name + '</td>' +
        '<td style="font-weight:700;color:var(--green);white-space:nowrap">' + parseFloat(e.qty).toLocaleString('ar') + ' م</td>' +
        '<td style="color:var(--muted);font-size:11px;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (e.notes || '—') + '</td>' +
        '<td><button class="btn btn-danger btn-icon btn-sm" onclick="confirmDel(\'' + e.id + '\',\'' + e.supervisor + '\')">🗑️</button></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('tbl-wrap').innerHTML = html;
  } catch (err) {
    document.getElementById('tbl-wrap').innerHTML = '<div class="empty-state"><span class="e-icon">❌</span><p>خطأ في التحميل</p></div>';
  }
}

function resetF() {
  ['f-sup', 'f-cl', 'f-fr', 'f-to'].forEach(id => document.getElementById(id).value = '');
  loadRecords();
}

// ============================================================
//  Delete
// ============================================================
function confirmDel(id, sup) {
  openModal(
    'تأكيد حذف السجل',
    'هل أنت متأكد من حذف سجل "' + sup + '"؟ لا يمكن التراجع.',
    async () => {
      try { await deleteRow(id); showToast('تم الحذف'); loadRecords(); loadCrossTable(); loadStats(); }
      catch (e) { showToast('❌ خطأ في الحذف'); }
    }
  );
}

function confirmDeleteAll() {
  openModal(
    'حذف جميع السجلات',
    'هل أنت متأكد من حذف جميع السجلات نهائياً؟ لا يمكن التراجع.',
    async () => {
      try { await deleteAllRows(); showToast('تم حذف جميع السجلات'); loadRecords(); loadCrossTable(); loadStats(); }
      catch (e) { showToast('❌ خطأ في الحذف'); }
    }
  );
}

// ============================================================
//  Backup — CSV
// ============================================================
async function backupCSV() {
  showToast('⏳ جاري تحضير النسخة الاحتياطية...');
  try {
    const data = await getAll();
    if (!data.length) { showToast('⚠️ لا توجد بيانات للتصدير'); return; }
    const headers = ['التاريخ','المشرف','الـ Cluster','نوع السلك','اللون','الكمية (م)','ملاحظات','تاريخ الإدخال'];
    const rows = data.map(e => [
      e.entry_date, e.supervisor, e.cluster, e.wire_type,
      e.color_name, e.qty, e.notes || '',
      e.created_at ? e.created_at.split('T')[0] : ''
    ]);
    const csv = '\uFEFF' + [headers, ...rows]
      .map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'wire-backup-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم التحميل — ' + data.length + ' سجل');
  } catch (e) { showToast('❌ خطأ في التصدير'); }
}

// ============================================================
//  Backup — JSON
// ============================================================
async function backupJSON() {
  showToast('⏳ جاري تحضير ملف JSON...');
  try {
    const data = await getAll();
    if (!data.length) { showToast('⚠️ لا توجد بيانات للتصدير'); return; }
    const backup = { exported_at: new Date().toISOString(), total: data.length, data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'wire-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم التحميل — ' + data.length + ' سجل');
  } catch (e) { showToast('❌ خطأ في التصدير'); }
}

// ============================================================
//  Report
// ============================================================
async function genReport() {
  const s     = document.getElementById('r-sup').value;
  const c     = document.getElementById('r-cl').value;
  const month = document.getElementById('r-month').value;
  const fr    = document.getElementById('r-fr').value;
  const to    = document.getElementById('r-to').value;

  showToast('⏳ جاري توليد التقرير...');
  try {
    const data = await getAll({ sup: s, cl: c, month: month || undefined, fr: fr || undefined, to: to || undefined });
    if (!data.length) { showToast('⚠️ لا توجد بيانات بهذه الفلاتر'); return; }

    const tot   = data.reduce((s, e) => s + parseFloat(e.qty || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    let period  = '';
    if (month) { const [y, m] = month.split('-'); period = 'شهر ' + MONTHS_AR[parseInt(m) - 1] + ' ' + y; }
    else if (fr && to) period = 'من ' + fmtD(fr) + ' إلى ' + fmtD(to);
    else period = 'جميع الفترات';

    document.getElementById('rep-ttl').textContent = s ? 'تقرير: ' + s : 'تقرير استهلاك الأسلاك';
    document.getElementById('rep-sub').textContent = (c ? 'الـ Cluster: ' + c : 'جميع الـ Clusters') + ' | ' + period;
    document.getElementById('rep-meta').innerHTML  =
      'تاريخ الطباعة: ' + fmtD(today) +
      '<br>الفترة: '    + period +
      '<br>الإجمالي: '  + Math.round(tot).toLocaleString('ar') + ' م';

    const byS = {};
    data.forEach(e => { if (!byS[e.supervisor]) byS[e.supervisor] = []; byS[e.supervisor].push(e); });
    const activeCls = CLUSTERS.filter(cl => data.some(e => e.cluster === cl));

    let html = '';
    Object.keys(byS).forEach(sup => {
      const se   = byS[sup];
      const stot = se.reduce((s, e) => s + parseFloat(e.qty || 0), 0);

      // cluster breakdown
      const clM = {}; activeCls.forEach(cl => { clM[cl] = 0; });
      se.forEach(e => { if (clM[e.cluster] !== undefined) clM[e.cluster] += parseFloat(e.qty || 0); });
      const clRows = activeCls.map(cl => {
        const v = clM[cl] || 0;
        return '<tr><td class="r">' + cl + '</td><td class="' + (v > 0 ? 'v' : '') + '">' +
          (v > 0 ? Math.round(v).toLocaleString('ar') + ' م' : '—') + '</td></tr>';
      }).join('');

      // wire type pills
      const byW = {};
      se.forEach(e => { const k = e.wire_type + '|' + e.color_name + '|' + e.color_hex; byW[k] = (byW[k] || 0) + parseFloat(e.qty || 0); });
      const wPills = Object.entries(byW).map(([k, q]) => {
        const [wt, cn, ch] = k.split('|');
        return '<span class="pill"><span class="dot" style="background:' + ch + '"></span>' + wt + ' ' + cn + ': <strong>' + Math.round(q).toLocaleString('ar') + 'م</strong></span>';
      }).join('');

      // detail rows
      const detRows = se
        .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
        .map((e, i) =>
          '<tr>' +
          '<td style="padding:7px 11px;color:var(--muted);font-size:11px">' + (i + 1) + '</td>' +
          '<td style="padding:7px 11px;font-weight:600;white-space:nowrap">' + fmtD(e.entry_date) + '</td>' +
          '<td style="padding:7px 11px"><span class="badge badge-blue">' + e.cluster + '</span></td>' +
          '<td style="padding:7px 11px">' + e.wire_type + '</td>' +
          '<td style="padding:7px 11px"><span class="dot" style="background:' + e.color_hex + '"></span>' + e.color_name + '</td>' +
          '<td style="padding:7px 11px;font-weight:700;color:var(--green)">' + parseFloat(e.qty).toLocaleString('ar') + ' م</td>' +
          '<td style="padding:7px 11px;font-size:11px;color:var(--muted)">' + (e.notes || '—') + '</td>' +
          '</tr>'
        ).join('');

      html +=
        '<div style="border-bottom:1px solid var(--border)">' +
          '<div class="sup-hd"><div class="av">' + sup.charAt(0) + '</div><div class="sup-name">' + sup + '</div><div class="sup-tot">' + Math.round(stot).toLocaleString('ar') + ' م</div></div>' +
          '<div class="cl-mini-tbl"><p>📊 الاستهلاك بالـ Cluster:</p>' +
            '<table><thead><tr><th>الـ Cluster</th><th style="text-align:center">إجمالي الأمتار</th></tr></thead>' +
            '<tbody>' + clRows + '</tbody>' +
            '<tfoot><tr><td class="r">الإجمالي</td><td class="v" style="text-align:center">' + Math.round(stot).toLocaleString('ar') + ' م</td></tr></tfoot>' +
          '</table></div>' +
          '<div class="pills-row"><label>بالنوع:</label>' + wPills + '</div>' +
          '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">' +
            '<table class="main-tbl" style="min-width:520px"><thead><tr>' +
            ['#','التاريخ','Cluster','نوع السلك','اللون','الكمية','ملاحظات'].map(h => '<th>' + h + '</th>').join('') +
            '</tr></thead><tbody>' + detRows + '</tbody></table>' +
          '</div>' +
        '</div>';
    });

    document.getElementById('rep-body').innerHTML = html;
    document.getElementById('rep-wrap').classList.add('on');
    document.getElementById('rep-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { showToast('❌ خطأ في توليد التقرير'); }
}
