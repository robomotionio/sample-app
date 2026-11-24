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

// Who gets reminded: an executive whose sign-off has been waiting a week
// since the request reached them or since their last reminder.
const REMINDER_RULE = `var WEEK = 7 * 24 * 60 * 60 * 1000;
var now = Date.now();
var requests = [];
var events = [];

msg.waiting.rows.forEach(function (row) {
  var data = JSON.parse(row.data || '{}');
  var touched = false;

  (data.approvals || []).forEach(function (a) {
    if (a.decision !== 'pending') {
      return;
    }
    var since = Math.max(Number(row.stage_since) || 0, Number(a.last_reminded_at) || 0);
    if (now - since < WEEK) {
      return;
    }
    var days = Math.floor((now - Number(row.stage_since)) / (24 * 60 * 60 * 1000));
    a.reminders = (Number(a.reminders) || 0) + 1;
    a.last_reminded_at = now;
    touched = true;

    events.push({
      id: 'e' + now.toString(36) + events.length + Math.floor(Math.random() * 1000),
      request_id: row.id,
      ref: row.ref,
      at: now,
      kind: 'notify',
      actor_role: 'system',
      actor_name: 'Vacancy Approvals',
      to_role: a.role,
      to_person: '',
      title: 'Reminder: ' + row.job_title + ' is waiting for your approval',
      note: 'It has been waiting ' + days + ' days.',
      tone: 'warn',
      read: 0
    });
    events.push({
      id: 'e' + now.toString(36) + events.length + Math.floor(Math.random() * 1000),
      request_id: row.id,
      ref: row.ref,
      at: now,
      kind: 'audit',
      actor_role: 'system',
      actor_name: 'Vacancy Approvals',
      to_role: '',
      to_person: '',
      title: 'Reminder sent to the ' + a.role.toUpperCase(),
      note: 'Waiting ' + days + ' days.',
      tone: 'warn',
      read: 1
    });
  });

  if (touched) {
    row.data = JSON.stringify(data);
    requests.push(row);
  }
});

msg.request_table = {
  columns: ['id', 'ref', 'status', 'hiring_manager', 'pbp', 'job_title', 'department', 'location',
    'created_at', 'updated_at', 'stage_since', 'data'],
  rows: requests
};
msg.event_table = {
  columns: ['id', 'request_id', 'ref', 'at', 'kind', 'actor_role', 'actor_name', 'to_role', 'to_person',
    'title', 'note', 'tone', 'read'],
  rows: events
};
msg.result = { sent: events.length / 2 };
msg.changed = { id: requests.length ? requests[0].id : '', status: requests.length ? requests[0].status : 'pending_approval' };`;

subflow.create('All requests', (f) => {
  f.node('5df06c', 'Core.Flow.Begin', 'Begin', {});
  f.node('c2647f', 'Core.Flow.End', 'End', { sfPort: 0 });

  // The screen that opens one request from any list.
  f.node('7a57ab', 'Core.Flow.SubFlow', 'All requests / Request', {});

  // ---- listRequests: one view of the requests, filtered for the role asking
  f.node('466bf6', 'Robomotion.Apps.Action', 'List Asked For', { optActionName: 'listRequests' })
    .then('ecb537', 'Core.Programming.Function', 'Who And Which View', {
      func: `var p = msg.params || {};

msg.db = 'Data Source=' + global.get('$Home$') + '/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();
msg.scope = String(p.scope || 'all');

return msg;`,
    })
    .then('d5b150', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('d8daad', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('ed3248', 'Robomotion.SQLite.Query', 'Read Every Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: `SELECT id, ref, status, hiring_manager, pbp, job_title, department, location,
       created_at, updated_at, stage_since, data
FROM requests
ORDER BY updated_at DESC`,
    })
    .then('51a5a5', 'Core.Programming.Function', 'Keep The Ones In This View', {
      outputs: 2,
      func: `var scope = msg.scope;
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}

var role = me.role;
var person = me.name;
var isExec = role === 'ceo' || role === 'cpo' || role === 'cfo';
var rows = [];

msg.found.rows.forEach(function (row) {
  var data = JSON.parse(row.data || '{}');
  var approvals = data.approvals || [];
  var info = data.info || {};
  var form2 = data.form2 || {};
  var mine = approvals.filter(function (a) { return a.role === role; })[0];
  var s = row.status;
  var keep = false;

  // Each role only sees the requests it has a part in.
  var canSee = role === 'admin' ||
    (role === 'hiring_manager' && row.hiring_manager === person) ||
    (role === 'people_partner' && row.pbp === person && s !== 'draft') ||
    (role === 'talent_partner' && (s === 'approved' || s === 'closed')) ||
    (isExec && Boolean(form2.validated_at));
  if (!canSee) {
    return;
  }

  if (scope === 'mine') {
    keep = row.hiring_manager === person;
  } else if (scope === 'to_validate') {
    keep = row.pbp === person && (s === 'pending_hr' || (s === 'info_requested' && info.target === 'people_partner'));
  } else if (scope === 'validated') {
    keep = row.pbp === person && Boolean(form2.validated_at) &&
      s !== 'pending_hr' && !(s === 'info_requested' && info.target === 'people_partner');
  } else if (scope === 'awaiting_me') {
    keep = (s === 'pending_approval' || s === 'info_requested') && mine && mine.decision === 'pending';
  } else if (scope === 'decided_by_me') {
    keep = Boolean(mine) && mine.decision !== 'pending';
  } else if (scope === 'to_recruit') {
    keep = s === 'approved';
  } else if (scope === 'recruited') {
    keep = s === 'closed';
  } else {
    // Everything this role may see, except other people's unsent drafts.
    keep = s !== 'draft' || row.hiring_manager === person;
  }

  if (!keep) {
    return;
  }

  rows.push({
    id: row.id,
    ref: row.ref,
    status: s,
    job_title: row.job_title,
    department: row.department,
    location: row.location,
    role_type: (data.form1 || {}).role_type || '',
    hiring_manager: row.hiring_manager,
    pbp: row.pbp,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    stage_since: Number(row.stage_since),
    approvals: approvals,
    info_target: info.target || '',
    my_decision: mine ? mine.decision : ''
  });
});

msg.result = { rows: rows, total: rows.length };
return [msg, null];`,
    })
    .then('439dd5', 'Robomotion.Apps.Respond', 'Send The List', {});

  // ---- sendReminders: pressed from the screen
  f.node('22b070', 'Robomotion.Apps.Action', 'Reminders Asked For', { optActionName: 'sendReminders' })
    .then('093f43', 'Core.Programming.Function', 'Where The Requests Live', {
      func: `msg.db = 'Data Source=' + global.get('$Home$') + '/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`,
    })
    .then('c9b839', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('ed7972', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('392d4d', 'Core.Programming.Function', 'Only The People Team', {
      outputs: 2,
      func: `var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (me.role !== 'people_partner' && me.role !== 'admin') {
  msg.refused = 'Only the People team can send reminders.';
  return [null, msg];
}
return [msg, null];`,
    })
    .then('8a695b', 'Robomotion.SQLite.Query', 'Read Requests With The Executives', {
      optConnectionString: Message('db'),
      outResult: Message('waiting'),
      func: `SELECT id, ref, status, hiring_manager, pbp, job_title, department, location,
       created_at, updated_at, stage_since, data
FROM requests
WHERE status IN ('pending_approval', 'info_requested')`,
    })
    .then('73ffae', 'Core.Programming.Function', 'Find Who Is Overdue', {
      outputs: 2,
      func: `${REMINDER_RULE}

if (requests.length === 0) {
  return [null, msg];
}
return [msg, null];`,
    })
    .then('60d241', 'Robomotion.SQLite.Insert', 'Count The Reminder', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('876fb3', 'Robomotion.SQLite.Insert', 'Send The Reminders', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('90390f', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('fdeb8a', 'Robomotion.Apps.Respond', 'Say How Many', {});

  f.node('e25daa', 'Robomotion.Apps.Respond', 'Nobody Overdue', {});
  f.edge('73ffae', 1, 'e25daa', 0);

  // Every refusal on this screen ends here, with the sentence its check wrote.
  f.node('a47c72', 'Core.Flow.Label', 'Refused', {});
  f.node('bc257d', 'Robomotion.Apps.RespondError', 'Say Why Not', {
    optCode: 'invalid_params',
    optRetryable: false,
    inMessage: Message('refused'),
  });
  f.edge('a47c72', 0, 'bc257d', 0);
  f.node('35809d', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['a47c72'], type: 'goto', all: false } });
  f.edge('51a5a5', 1, '35809d', 0);
  f.node('830ff9', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['a47c72'], type: 'goto', all: false } });
  f.edge('392d4d', 1, '830ff9', 0);

  // ---- the same check by itself, every six hours
  f.node('a994e5', 'Core.Trigger.Inject', 'Every Six Hours', {
    optOnce: false,
    optOnceDelay: 60,
    optRepeat: 21600,
  })
    .then('c8636c', 'Core.Programming.Function', 'Where The Requests Live', {
      func: `msg.db = 'Data Source=' + global.get('$Home$') + '/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';

return msg;`,
    })
    .then('31eace', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('1848bf', 'Robomotion.SQLite.Query', 'Read Requests With The Executives', {
      optConnectionString: Message('db'),
      outResult: Message('waiting'),
      func: `SELECT id, ref, status, hiring_manager, pbp, job_title, department, location,
       created_at, updated_at, stage_since, data
FROM requests
WHERE status IN ('pending_approval', 'info_requested')`,
    })
    .then('1c79df', 'Core.Programming.Function', 'Find Who Is Overdue', {
      func: `${REMINDER_RULE}

if (requests.length === 0) {
  return null;
}
return msg;`,
    })
    .then('fb1b9b', 'Robomotion.SQLite.Insert', 'Count The Reminder', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('34c186', 'Robomotion.SQLite.Insert', 'Send The Reminders', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('8ca1c7', 'Core.Flow.Log', 'Note The Reminders', {
      inText: Message('result.sent'),
      optLevel: 'info',
    });
});
