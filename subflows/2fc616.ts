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

subflow.create('New request', (f) => {
  f.node('7bbb3d', 'Core.Flow.Begin', 'Begin', {});
  f.node('014f24', 'Core.Flow.End', 'End', { sfPort: 0 });

  // ---- saveRequest: form 1, kept as a draft or sent to the People Business Partner
  f.node('05d6cb', 'Robomotion.Apps.Action', 'Request Saved', { optActionName: 'saveRequest' })
    .then('0abe61', 'Core.Programming.Function', 'Which Request', {
      func: `var p = msg.params || {};

msg.db = 'Data Source=' + global.get('$Home$') + '/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();
msg.id = String(p.id || '').replace(/[^A-Za-z0-9-]/g, '');

return msg;`,
    })
    .then('f9af93', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('6f68cd', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('a3486c', 'Robomotion.SQLite.Query', 'Read The Saved Version', {
      optConnectionString: Message('db'),
      outResult: Message('existing'),
      func: `SELECT id, ref, status, hiring_manager, created_at, stage_since, data
FROM requests
WHERE id = '{{{id}}}'`,
    })
    .then('6004cf', 'Robomotion.SQLite.Query', 'Find The Next Reference', {
      optConnectionString: Message('db'),
      outResult: Message('last'),
      func: `SELECT COALESCE(MAX(CAST(substr(ref, 9) AS INTEGER)), 0) AS n FROM requests`,
    })
    .then('b4429c', 'Core.Programming.Function', 'Check And Write Form 1', {
      outputs: 2,
      func: `var p = msg.params || {};
var now = Date.now();
var old = msg.existing.rows[0];
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (me.role !== 'hiring_manager') {
  msg.refused = 'Only a hiring manager can raise or change a vacancy request.';
  return [null, msg];
}
if (old && old.hiring_manager !== me.name) {
  msg.refused = 'You can only change your own requests.';
  return [null, msg];
}

// The local People Business Partner looks after each site.
var localPartner = {
  'Argentan': 'Holly',
  "Castel d'Ario": 'Holly',
  'Cavriago': 'Holly',
  'Monignoso': 'Holly',
  'Langemark': 'Holly',
  'Fully remote': 'Holly'
};

var form1 = {
  hiring_manager: me.name,
  department: String(p.department || ''),
  request_date: String(p.request_date || ''),
  job_title: String(p.job_title || '').trim(),
  location: String(p.location || ''),
  role_type: String(p.role_type || ''),
  business_justification: String(p.business_justification || '').trim(),
  desired_start_date: String(p.desired_start_date || ''),
  reporting_manager: String(p.reporting_manager || '').trim()
};

if (msg.id && !old) {
  msg.refused = 'That request no longer exists.';
  return [null, msg];
}

var data = old ? JSON.parse(old.data || '{}') : {};
var info = data.info || {};
var answeringHm = old && old.status === 'info_requested' && info.target === 'hiring_manager';

if (old && old.status !== 'draft' && !answeringHm) {
  msg.refused = 'This request has already been sent on and can no longer be changed here.';
  return [null, msg];
}

var missing = Object.keys(form1).filter(function (k) {
  return !form1[k];
});

if (p.submit && !answeringHm && missing.length > 0) {
  msg.refused = 'Fill in every field before sending: ' + missing.join(', ').replace(/_/g, ' ') + ' still missing.';
  return [null, msg];
}

var year = new Date().getFullYear();
var seq = Number((msg.last.rows[0] || {}).n || 0) + 1;
var id = old ? old.id : 'r' + now.toString(36) + Math.floor(Math.random() * 1000);
var ref = old ? old.ref : 'VR-' + year + '-' + ('00' + seq).slice(-3);
var pbp = localPartner[form1.location] || 'Holly';

var status = 'draft';
if (answeringHm) {
  status = 'info_requested';
} else if (p.submit) {
  status = 'pending_hr';
}

data.form1 = form1;
data.form2 = data.form2 || {};
data.approvals = data.approvals || [
  { role: 'cpo', decision: 'pending', comment: '', at: 0, reminders: 0 },
  { role: 'cfo', decision: 'pending', comment: '', at: 0, reminders: 0 },
  { role: 'ceo', decision: 'pending', comment: '', at: 0, reminders: 0 }
];
data.info = info;

var sentNow = status === 'pending_hr';
var stageSince = old && !sentNow ? Number(old.stage_since) : now;

msg.request_table = {
  columns: ['id', 'ref', 'status', 'hiring_manager', 'pbp', 'job_title', 'department', 'location',
    'created_at', 'updated_at', 'stage_since', 'data'],
  rows: [{
    id: id,
    ref: ref,
    status: status,
    hiring_manager: form1.hiring_manager,
    pbp: pbp,
    job_title: form1.job_title,
    department: form1.department,
    location: form1.location,
    created_at: old ? Number(old.created_at) : now,
    updated_at: now,
    stage_since: stageSince,
    data: JSON.stringify(data)
  }]
};

var events = [];
var add = function (kind, toRole, toPerson, title, note, tone) {
  events.push({
    id: 'e' + now.toString(36) + events.length + Math.floor(Math.random() * 1000),
    request_id: id,
    ref: ref,
    at: now,
    kind: kind,
    actor_role: 'hiring_manager',
    actor_name: form1.hiring_manager,
    to_role: toRole,
    to_person: toPerson,
    title: title,
    note: note,
    tone: tone,
    read: kind === 'audit' ? 1 : 0
  });
};

if (sentNow) {
  add('audit', '', '', 'Request sent to the People team', 'Assigned to ' + pbp + ' for ' + form1.location + '.', 'pending');
  add('notify', 'hiring_manager', form1.hiring_manager, 'Request submitted: ' + form1.job_title,
    'Your request is with ' + pbp + ' for HR validation.', 'pending');
  add('notify', 'people_partner', pbp, 'Validation requested: ' + form1.job_title,
    form1.hiring_manager + ' sent a vacancy request for ' + form1.location + '.', 'pending');
} else if (answeringHm) {
  add('audit', '', '', 'Request details updated by the hiring manager', '', 'pending');
} else {
  add('audit', '', '', old ? 'Draft updated' : 'Draft saved', '', 'pending');
}

msg.event_table = {
  columns: ['id', 'request_id', 'ref', 'at', 'kind', 'actor_role', 'actor_name', 'to_role', 'to_person',
    'title', 'note', 'tone', 'read'],
  rows: events
};
msg.result = { id: id, ref: ref, status: status };
msg.changed = msg.result;

return [msg, null];`,
    })
    .then('20899a', 'Robomotion.SQLite.Insert', 'Save The Request', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('72a0fc', 'Robomotion.SQLite.Insert', 'Record It And Notify', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('dbde10', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('502a55', 'Robomotion.Apps.Respond', 'Send The Reference', {});

  f.node('e1603a', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['da23ea'], type: 'goto', all: false } });
  f.edge('b4429c', 1, 'e1603a', 0);
  f.node('da23ea', 'Core.Flow.Label', 'Refused', {});
  f.node('e65ebc', 'Robomotion.Apps.RespondError', 'Say Why Not', {
    optCode: 'invalid_params',
    optRetryable: false,
    inMessage: Message('refused'),
  });
  f.edge('da23ea', 0, 'e65ebc', 0);
});
