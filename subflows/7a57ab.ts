import { subflow, Message, Custom, JS, Global, Flow, Credential, AI } from '@robomotion/sdk';

const ENSURE_TABLES = `CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  ref TEXT,
  status TEXT,
  hiring_manager TEXT,
  pbp TEXT,
  job_title TEXT,
  department TEXT,
  location TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  stage_since INTEGER,
  data TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  ref TEXT,
  at INTEGER,
  kind TEXT,
  actor_role TEXT,
  actor_name TEXT,
  to_role TEXT,
  to_person TEXT,
  title TEXT,
  note TEXT,
  tone TEXT,
  read INTEGER
);
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  password_hash TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  username TEXT,
  created_at INTEGER,
  expires_at INTEGER
);`;

const SIGNED_IN = `SELECT u.username, u.name, u.role
FROM sessions s
JOIN users u ON u.username = s.username
WHERE s.token = '{{{token}}}' AND s.expires_at > {{{now}}}`;

const READ_ONE = `SELECT id, ref, status, hiring_manager, pbp, job_title, department, location,
       created_at, updated_at, stage_since, data
FROM requests
WHERE id = '{{{id}}}'`;

const OPEN_REQUEST = `var p = msg.params || {};

msg.db = 'Data Source=C:/Users/İlknur/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.id = String(p.id || '').replace(/[^A-Za-z0-9-]/g, '');
msg.token = String(p.token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`;

const TABLE_COLUMNS = `msg.request_table = {
  columns: ['id', 'ref', 'status', 'hiring_manager', 'pbp', 'job_title', 'department', 'location',
    'created_at', 'updated_at', 'stage_since', 'data'],
  rows: [row]
};
msg.event_table = {
  columns: ['id', 'request_id', 'ref', 'at', 'kind', 'actor_role', 'actor_name', 'to_role', 'to_person',
    'title', 'note', 'tone', 'read'],
  rows: events
};
msg.result = { id: row.id, ref: row.ref, status: row.status };
msg.changed = msg.result;

return [msg, null];`;

subflow.create('All requests / Request', (f) => {
  f.node('617f2f', 'Core.Flow.Begin', 'Begin', {});
  f.node('2e8421', 'Core.Flow.End', 'End', { sfPort: 0 });

  // Every refusal on this screen ends here, with the sentence its check wrote.
  f.node('54b137', 'Core.Flow.Label', 'Refused', {});
  f.node('101d7a', 'Robomotion.Apps.RespondError', 'Say Why Not', {
    optCode: 'invalid_params',
    optRetryable: false,
    inMessage: Message('refused'),
  });
  f.edge('54b137', 0, '101d7a', 0);

  // ---- getRequest: both forms, the sign-offs and the history
  f.node('df883e', 'Robomotion.Apps.Action', 'Request Opened', { optActionName: 'getRequest' })
    .then('a61dad', 'Core.Programming.Function', 'Which Request', { func: OPEN_REQUEST })
    .then('cb8a84', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('1e17ad', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('06e6ca', 'Robomotion.SQLite.Query', 'Read The Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: READ_ONE,
    })
    .then('a2405f', 'Robomotion.SQLite.Query', 'Read Its History', {
      optConnectionString: Message('db'),
      outResult: Message('history'),
      func: `SELECT id, at, ref, request_id, actor_role, actor_name, title, note, tone
FROM events
WHERE request_id = '{{{id}}}' AND kind = 'audit'
ORDER BY at DESC`,
    })
    .then('e2b5ca', 'Core.Programming.Function', 'Put It Together', {
      outputs: 2,
      func: `var row = msg.found.rows[0];
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (!row) {
  msg.refused = 'That request could not be found. It may have been a draft that was deleted.';
  return [null, msg];
}

var data = JSON.parse(row.data || '{}');
var role = me.role;
var isExec = role === 'ceo' || role === 'cpo' || role === 'cfo';

// Each role only opens the requests it has a part in.
var canSee = role === 'admin' ||
  (role === 'hiring_manager' && row.hiring_manager === me.name) ||
  (role === 'people_partner' && row.pbp === me.name && row.status !== 'draft') ||
  (role === 'talent_partner' && (row.status === 'approved' || row.status === 'closed')) ||
  (isExec && Boolean((data.form2 || {}).validated_at));
if (!canSee) {
  msg.refused = 'You do not have access to this request.';
  return [null, msg];
}

msg.result = {
  id: row.id,
  ref: row.ref,
  status: row.status,
  hiring_manager: row.hiring_manager,
  pbp: row.pbp,
  created_at: Number(row.created_at),
  updated_at: Number(row.updated_at),
  stage_since: Number(row.stage_since),
  form1: data.form1 || {},
  form2: data.form2 || {},
  approvals: data.approvals || [],
  info: data.info || {},
  history: msg.history.rows.map(function (e) {
    return {
      id: e.id,
      at: Number(e.at),
      ref: e.ref,
      request_id: e.request_id,
      actor_role: e.actor_role,
      actor_name: e.actor_name,
      title: e.title,
      note: e.note || '',
      tone: e.tone
    };
  })
};

return [msg, null];`,
    })
    .then('044f25', 'Robomotion.Apps.Respond', 'Send The Request', {});
  f.node('ac9c49', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['54b137'], type: 'goto', all: false } });
  f.edge('e2b5ca', 1, 'ac9c49', 0);

  // ---- validateRequest: form 2, then on to the executives or back to the hiring manager
  f.node('adf0bc', 'Robomotion.Apps.Action', 'Validation Sent', { optActionName: 'validateRequest' })
    .then('5f35cb', 'Core.Programming.Function', 'Which Request', { func: OPEN_REQUEST })
    .then('5d54b1', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('2200cd', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('5aadf5', 'Robomotion.SQLite.Query', 'Read The Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: READ_ONE,
    })
    .then('54b882', 'Core.Programming.Function', 'Both Forms Complete Before Approval', {
      outputs: 2,
      func: `var p = msg.params || {};
var row = msg.found.rows[0];
var now = Date.now();
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (me.role !== 'people_partner') {
  msg.refused = 'Only a People Business Partner can validate a request.';
  return [null, msg];
}

var person = me.name;

if (!row) {
  msg.refused = 'That request could not be found.';
  return [null, msg];
}
if (row.pbp !== person) {
  msg.refused = 'This request belongs to ' + row.pbp + ', the People Business Partner for ' + row.location + '.';
  return [null, msg];
}
if (row.status !== 'pending_hr') {
  msg.refused = 'This request is not waiting for HR validation any more.';
  return [null, msg];
}

var data = JSON.parse(row.data || '{}');
var form1 = data.form1 || {};
var external = p.advertised !== 'Internally';
var form2 = {
  salary_range: String(p.salary_range || '').trim(),
  benefit_package: String(p.benefit_package || '').trim(),
  job_family: String(p.job_family || '').trim(),
  advertised: String(p.advertised || ''),
  recruitment_methods: external ? (p.recruitment_methods || []) : [],
  budget_confirmed: Boolean(p.budget_confirmed),
  hr_recommendation: String(p.hr_recommendation || ''),
  hr_comments: String(p.hr_comments || '').trim()
};
var events = [];
var add = function (kind, toRole, toPerson, title, note, tone) {
  events.push({
    id: 'e' + now.toString(36) + events.length + Math.floor(Math.random() * 1000),
    request_id: row.id,
    ref: row.ref,
    at: now,
    kind: kind,
    actor_role: 'people_partner',
    actor_name: person,
    to_role: toRole,
    to_person: toPerson,
    title: title,
    note: note,
    tone: tone,
    read: kind === 'audit' ? 1 : 0
  });
};

if (p.outcome === 'return') {
  var question = String(p.question || '').trim();
  if (!question) {
    msg.refused = 'Say what the hiring manager should add or change.';
    return [null, msg];
  }
  data.form2 = form2;
  data.info = { from_role: 'people_partner', from_name: person, target: 'hiring_manager', question: question, asked_at: now };
  row.status = 'info_requested';
  add('audit', '', '', person + ' sent the request back to the hiring manager', question, 'warn');
  add('notify', 'hiring_manager', row.hiring_manager, 'More information needed: ' + row.job_title,
    person + ' asks: ' + question, 'warn');
} else {
  var missing = [];
  var checks = [
    [!form2.salary_range, 'salary range'],
    [!form2.benefit_package, 'benefit package'],
    [!form2.job_family, 'job family / Hay level'],
    [!form2.advertised, 'where it is advertised'],
    [external && form2.recruitment_methods.length === 0, 'external recruitment method'],
    [!form2.hr_recommendation, 'recommendation'],
    [!form1.job_title || !form1.business_justification, 'the request form itself']
  ];
  checks.forEach(function (c) {
    if (c[0]) {
      missing.push(c[1]);
    }
  });

  if (missing.length > 0) {
    msg.refused = 'Executive approval can only start once both forms are complete. Missing: ' + missing.join(', ') + '.';
    return [null, msg];
  }

  form2.validated_at = now;
  form2.validated_by = person;
  data.form2 = form2;
  data.info = {};
  data.approvals = ['cpo', 'cfo', 'ceo'].map(function (r) {
    return { role: r, decision: 'pending', comment: '', at: 0, reminders: 0 };
  });
  row.status = 'pending_approval';
  add('audit', '', '', 'Validated by ' + person + ' and sent to the CEO, CPO and CFO', form2.hr_comments, 'pending');
  ['cpo', 'cfo', 'ceo'].forEach(function (r) {
    add('notify', r, '', 'Approval required: ' + row.job_title,
      row.ref + ' · ' + row.department + ' · ' + row.location + '. Validated by ' + person + '.', 'pending');
  });
}

row.pbp = person;
row.updated_at = now;
row.stage_since = now;
row.data = JSON.stringify(data);

${TABLE_COLUMNS}`,
    })
    .then('929c6e', 'Robomotion.SQLite.Insert', 'Save The Request', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('3305bc', 'Robomotion.SQLite.Insert', 'Record It And Notify', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('be18cf', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('12c47f', 'Robomotion.Apps.Respond', 'Say Where It Went', {});
  f.node('2a8503', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['54b137'], type: 'goto', all: false } });
  f.edge('54b882', 1, '2a8503', 0);

  // ---- decideRequest: an executive approves, rejects or asks a question
  f.node('6e6848', 'Robomotion.Apps.Action', 'Decision Made', { optActionName: 'decideRequest' })
    .then('ed6ad0', 'Core.Programming.Function', 'Which Request', { func: OPEN_REQUEST })
    .then('dfc47b', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('702fef', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('929d2c', 'Robomotion.SQLite.Query', 'Read The Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: READ_ONE,
    })
    .then('49d9da', 'Core.Programming.Function', 'All Three Approve, One Rejects', {
      outputs: 2,
      func: `var p = msg.params || {};
var row = msg.found.rows[0];
var now = Date.now();
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}

var role = me.role;
var label = role.toUpperCase();
var comment = String(p.comment || '').trim();

if (role !== 'ceo' && role !== 'cpo' && role !== 'cfo') {
  msg.refused = 'Only the CEO, CPO or CFO can approve or reject a request.';
  return [null, msg];
}

if (!row) {
  msg.refused = 'That request could not be found.';
  return [null, msg];
}
if (row.status !== 'pending_approval' && row.status !== 'info_requested') {
  msg.refused = 'This request is not waiting for executive approval.';
  return [null, msg];
}

var data = JSON.parse(row.data || '{}');
var approvals = data.approvals || [];
var mine = approvals.filter(function (a) { return a.role === role; })[0];

if (!mine) {
  msg.refused = 'Only the CEO, CPO or CFO can decide on a request.';
  return [null, msg];
}
if (mine.decision !== 'pending') {
  msg.refused = 'The ' + label + ' has already decided on this request.';
  return [null, msg];
}
if (p.decision !== 'approve' && !comment) {
  msg.refused = p.decision === 'reject' ? 'Give a reason for the rejection.' : 'Write the question you need answered.';
  return [null, msg];
}
if (p.decision === 'info' && row.status === 'info_requested') {
  msg.refused = 'A question is already open on this request. Decide once it has been answered, or approve or reject now.';
  return [null, msg];
}

var events = [];
var add = function (kind, toRole, toPerson, title, note, tone) {
  events.push({
    id: 'e' + now.toString(36) + events.length + Math.floor(Math.random() * 1000),
    request_id: row.id,
    ref: row.ref,
    at: now,
    kind: kind,
    actor_role: role,
    actor_name: label,
    to_role: toRole,
    to_person: toPerson,
    title: title,
    note: note,
    tone: tone,
    read: kind === 'audit' ? 1 : 0
  });
};

mine.comment = comment;
mine.at = now;

if (p.decision === 'approve') {
  mine.decision = 'approved';
  var approved = approvals.filter(function (a) { return a.decision === 'approved'; }).length;
  if (approved === approvals.length && row.status === 'pending_approval') {
    row.status = 'approved';
    row.stage_since = now;
    add('audit', '', '', label + ' approved - all three approvals in, Talent Partner notified', comment, 'ok');
    add('notify', 'talent_partner', '', 'Vacancy approved and ready for recruitment: ' + row.job_title,
      row.ref + ' · ' + row.department + ' · ' + row.location + '. Hiring manager: ' + row.hiring_manager + '.', 'ok');
    add('notify', 'hiring_manager', row.hiring_manager, 'Request approved: ' + row.job_title,
      'The CEO, CPO and CFO all approved. The Talent Partner will start recruiting.', 'ok');
  } else {
    add('audit', '', '', label + ' approved', comment, 'ok');
  }
} else if (p.decision === 'reject') {
  mine.decision = 'rejected';
  row.status = 'rejected';
  row.stage_since = now;
  data.info = {};
  add('audit', '', '', label + ' rejected the request', comment, 'error');
  add('notify', 'hiring_manager', row.hiring_manager, 'Request rejected: ' + row.job_title,
    'The ' + label + ' rejected it: ' + comment, 'error');
  add('notify', 'people_partner', row.pbp, 'Request rejected: ' + row.job_title,
    'The ' + label + ' rejected it: ' + comment, 'error');
} else {
  var target = p.info_target === 'people_partner' ? 'people_partner' : 'hiring_manager';
  var who = target === 'people_partner' ? row.pbp : row.hiring_manager;
  mine.decision = 'info';
  row.status = 'info_requested';
  data.info = { from_role: role, from_name: label, target: target, question: comment, asked_at: now };
  add('audit', '', '', label + ' asked ' + (target === 'people_partner' ? 'the People Business Partner' : 'the hiring manager') +
    ' for more information', comment, 'warn');
  add('notify', target, who, 'More information needed: ' + row.job_title, 'The ' + label + ' asks: ' + comment, 'warn');
}

data.approvals = approvals;
row.updated_at = now;
row.data = JSON.stringify(data);

${TABLE_COLUMNS}`,
    })
    .then('91792d', 'Robomotion.SQLite.Insert', 'Save The Decision', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('97850c', 'Robomotion.SQLite.Insert', 'Record It And Notify', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('a6e064', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('4d91b8', 'Robomotion.Apps.Respond', 'Say Where It Stands', {});
  f.node('0eb023', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['54b137'], type: 'goto', all: false } });
  f.edge('49d9da', 1, '0eb023', 0);

  // ---- answerInfo: the person asked answers, and the request goes back to whoever asked
  f.node('5a2e9e', 'Robomotion.Apps.Action', 'Question Answered', { optActionName: 'answerInfo' })
    .then('41fa85', 'Core.Programming.Function', 'Which Request', { func: OPEN_REQUEST })
    .then('e08cfa', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('9cdcc1', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('db0edc', 'Robomotion.SQLite.Query', 'Read The Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: READ_ONE,
    })
    .then('f712fb', 'Core.Programming.Function', 'Back To Whoever Asked', {
      outputs: 2,
      func: `var p = msg.params || {};
var row = msg.found.rows[0];
var now = Date.now();
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}

var role = me.role;
var answer = String(p.answer || '').trim();

if (!row) {
  msg.refused = 'That request could not be found.';
  return [null, msg];
}

var data = JSON.parse(row.data || '{}');
var info = data.info || {};

var asked = role === 'hiring_manager' ? row.hiring_manager : row.pbp;
if (row.status !== 'info_requested' || info.target !== role || asked !== me.name) {
  msg.refused = 'There is no open question on this request for you to answer.';
  return [null, msg];
}
if (!answer) {
  msg.refused = 'Write your answer first.';
  return [null, msg];
}

var person = me.name;
var events = [];
var add = function (kind, toRole, toPerson, title, note, tone) {
  events.push({
    id: 'e' + now.toString(36) + events.length + Math.floor(Math.random() * 1000),
    request_id: row.id,
    ref: row.ref,
    at: now,
    kind: kind,
    actor_role: role,
    actor_name: person,
    to_role: toRole,
    to_person: toPerson,
    title: title,
    note: note,
    tone: tone,
    read: kind === 'audit' ? 1 : 0
  });
};

add('audit', '', '', person + ' answered ' + (info.from_role === 'people_partner' ? info.from_name : 'the ' + String(info.from_role).toUpperCase()),
  answer, 'ok');

if (info.from_role === 'people_partner') {
  row.status = 'pending_hr';
  add('notify', 'people_partner', info.from_name || row.pbp, 'Your question was answered: ' + row.job_title,
    person + ': ' + answer, 'pending');
} else {
  row.status = 'pending_approval';
  (data.approvals || []).forEach(function (a) {
    if (a.role === info.from_role && a.decision === 'info') {
      a.decision = 'pending';
    }
  });
  add('notify', info.from_role, '', 'Your question was answered: ' + row.job_title, person + ': ' + answer, 'pending');
}

data.last_info = { question: info.question, answer: answer, from_role: info.from_role, answered_by: person, answered_at: now };
data.info = {};
row.updated_at = now;
row.stage_since = now;
row.data = JSON.stringify(data);

${TABLE_COLUMNS}`,
    })
    .then('54b38a', 'Robomotion.SQLite.Insert', 'Save The Request', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('d1ba4c', 'Robomotion.SQLite.Insert', 'Record It And Notify', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('bdc66a', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('912c0e', 'Robomotion.Apps.Respond', 'Say Where It Went', {});
  f.node('443a2f', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['54b137'], type: 'goto', all: false } });
  f.edge('f712fb', 1, '443a2f', 0);

  // ---- closeRequest: the Talent Partner has started recruiting in Deel ATS
  f.node('3a4f0d', 'Robomotion.Apps.Action', 'Recruitment Started', { optActionName: 'closeRequest' })
    .then('ff5b38', 'Core.Programming.Function', 'Which Request', { func: OPEN_REQUEST })
    .then('94a3e9', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('591b65', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('03a76d', 'Robomotion.SQLite.Query', 'Read The Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: READ_ONE,
    })
    .then('94791e', 'Core.Programming.Function', 'Only Approved Ones Close', {
      outputs: 2,
      func: `var p = msg.params || {};
var row = msg.found.rows[0];
var now = Date.now();
var note = String(p.note || '').trim();
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (me.role !== 'talent_partner') {
  msg.refused = 'Only the Talent Partner can hand a vacancy over to recruitment.';
  return [null, msg];
}

var person = me.name;

if (!row) {
  msg.refused = 'That request could not be found.';
  return [null, msg];
}
if (row.status !== 'approved') {
  msg.refused = 'Only an approved vacancy can be handed over to recruitment.';
  return [null, msg];
}

var events = [];
var add = function (kind, toRole, toPerson, title, text, tone) {
  events.push({
    id: 'e' + now.toString(36) + events.length + Math.floor(Math.random() * 1000),
    request_id: row.id,
    ref: row.ref,
    at: now,
    kind: kind,
    actor_role: 'talent_partner',
    actor_name: person,
    to_role: toRole,
    to_person: toPerson,
    title: title,
    note: text,
    tone: tone,
    read: kind === 'audit' ? 1 : 0
  });
};

add('audit', '', '', 'Recruitment started in Deel ATS - now recruiting', note, 'ok');
add('notify', 'hiring_manager', row.hiring_manager, 'Recruitment started: ' + row.job_title,
  'The Talent Partner has opened the vacancy in Deel ATS.' + (note ? ' ' + note : ''), 'ok');

row.status = 'closed';
row.updated_at = now;
row.stage_since = now;

${TABLE_COLUMNS}`,
    })
    .then('d20ecd', 'Robomotion.SQLite.Insert', 'Save The Request', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('44b6f4', 'Robomotion.SQLite.Insert', 'Record It And Notify', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('26fa4a', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('687c95', 'Robomotion.Apps.Respond', 'Say It Is Closed', {});
  f.node('acdba0', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['54b137'], type: 'goto', all: false } });
  f.edge('94791e', 1, 'acdba0', 0);

  // ---- deleteDraft: only a draft nobody else has seen
  f.node('deb257', 'Robomotion.Apps.Action', 'Draft Thrown Away', { optActionName: 'deleteDraft' })
    .then('3b79ea', 'Core.Programming.Function', 'Which Request', { func: OPEN_REQUEST })
    .then('56ed04', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('9bf85d', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('a9fc9d', 'Robomotion.SQLite.Query', 'Read The Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: READ_ONE,
    })
    .then('96b8c4', 'Core.Programming.Function', 'Only Drafts Can Go', {
      outputs: 2,
      func: `var draft = msg.found.rows[0];
var me = msg.me.rows[0];
var row = draft;

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (!row) {
  msg.refused = 'That draft has already gone.';
  return [null, msg];
}
if (me.role !== 'hiring_manager' || row.hiring_manager !== me.name) {
  msg.refused = 'You can only delete your own drafts.';
  return [null, msg];
}
if (row.status !== 'draft') {
  msg.refused = 'Only a draft that was never sent can be deleted.';
  return [null, msg];
}

msg.result = { id: row.id, removed: true };
msg.changed = { id: row.id, ref: row.ref, status: 'draft' };

return [msg, null];`,
    })
    .then('5d67f3', 'Robomotion.SQLite.NonQuery', 'Delete The Draft', {
      optConnectionString: Message('db'),
      func: `DELETE FROM requests WHERE id = '{{{id}}}' AND status = 'draft'`,
    })
    .then('db6139', 'Robomotion.SQLite.NonQuery', 'Delete Its History', {
      optConnectionString: Message('db'),
      func: `DELETE FROM events WHERE request_id = '{{{id}}}'`,
    })
    .then('10616f', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('4376d2', 'Robomotion.Apps.Respond', 'Say It Is Gone', {});
  f.node('d990af', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['54b137'], type: 'goto', all: false } });
  f.edge('96b8c4', 1, 'd990af', 0);
});
