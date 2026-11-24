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

subflow.create('Home', (f) => {
  f.node('13bbca', 'Core.Flow.Begin', 'Begin', {});
  f.node('6500ca', 'Core.Flow.End', 'End', { sfPort: 0 });

  // ---- getOverview: the numbers and the "waiting for you" list for one role
  f.node('ea108e', 'Robomotion.Apps.Action', 'Overview Asked', { optActionName: 'getOverview' })
    .then('c214fa', 'Core.Programming.Function', 'Who Is Asking', {
      func: `msg.db = 'Data Source=C:/Users/İlknur/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`,
    })
    .then('983ab9', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('104a3a', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('d8a81e', 'Robomotion.SQLite.Query', 'Read Every Request', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: `SELECT id, ref, status, hiring_manager, pbp, job_title, department, location,
       created_at, updated_at, stage_since, data
FROM requests
ORDER BY updated_at DESC`,
    })
    .then('088a72', 'Robomotion.SQLite.Query', 'Read The Latest Decisions', {
      optConnectionString: Message('db'),
      outResult: Message('recent'),
      func: `SELECT id, request_id, ref, at, actor_role, actor_name, title, note, tone
FROM events
WHERE kind = 'audit'
ORDER BY at DESC
LIMIT 200`,
    })
    .then('599b28', 'Robomotion.SQLite.Query', 'Read Unread Notifications', {
      optConnectionString: Message('db'),
      outResult: Message('unread'),
      func: `SELECT to_role, to_person
FROM events
WHERE kind = 'notify' AND read = 0`,
    })
    .then('9e5d19', 'Core.Programming.Function', 'Work Out What Needs Me', {
      outputs: 2,
      func: `var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}

var role = me.role;
var person = me.name;
var visible = {};
var isExec = role === 'ceo' || role === 'cpo' || role === 'cfo';
var counts = {
  draft: 0,
  pending_hr: 0,
  pending_approval: 0,
  info_requested: 0,
  approved: 0,
  rejected: 0,
  closed: 0,
  total: 0
};
var needs = [];

msg.found.rows.forEach(function (row) {
  var data = JSON.parse(row.data || '{}');
  var approvals = data.approvals || [];
  var info = data.info || {};
  var mine = approvals.filter(function (a) { return a.role === role; })[0];

  // Each role only sees the requests it has a part in.
  var canSee = role === 'admin' ||
    (role === 'hiring_manager' && row.hiring_manager === person) ||
    (role === 'people_partner' && row.pbp === person && row.status !== 'draft') ||
    (role === 'talent_partner' && (row.status === 'approved' || row.status === 'closed')) ||
    (isExec && Boolean((data.form2 || {}).validated_at));
  if (!canSee) {
    return;
  }
  visible[row.id] = true;

  counts.total += 1;
  if (counts[row.status] !== undefined) {
    counts[row.status] += 1;
  }

  var waitingOnMe = false;
  if (role === 'hiring_manager') {
    waitingOnMe = row.hiring_manager === person &&
      (row.status === 'draft' || (row.status === 'info_requested' && info.target === 'hiring_manager'));
  } else if (role === 'people_partner') {
    waitingOnMe = row.pbp === person &&
      (row.status === 'pending_hr' || (row.status === 'info_requested' && info.target === 'people_partner'));
  } else if (isExec) {
    waitingOnMe = (row.status === 'pending_approval' || row.status === 'info_requested') &&
      mine && mine.decision === 'pending';
  } else if (role === 'talent_partner') {
    waitingOnMe = row.status === 'approved';
  } else if (role === 'admin') {
    waitingOnMe = ['pending_hr', 'pending_approval', 'info_requested'].indexOf(row.status) >= 0;
  }

  if (waitingOnMe) {
    needs.push({
      id: row.id,
      ref: row.ref,
      status: row.status,
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
  }
});

var recent = msg.recent.rows.filter(function (e) {
  return visible[e.request_id];
}).slice(0, 8).map(function (e) {
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
});

var unread = msg.unread.rows.filter(function (n) {
  return n.to_role === role && (!n.to_person || n.to_person === person);
}).length;

msg.result = { counts: counts, needs_me: needs, recent: recent, unread: unread };
return [msg, null];`,
    })
    .then('44e0e6', 'Robomotion.Apps.Respond', 'Send The Overview', {});
  f.node('6c2bbf', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['045f10'], type: 'goto', all: false } });
  f.edge('9e5d19', 1, '6c2bbf', 0);

  // ---- loadSampleData: a few example requests in every stage, for an empty app
  f.node('d32c4a', 'Robomotion.Apps.Action', 'Examples Asked For', { optActionName: 'loadSampleData' })
    .then('2983dc', 'Core.Programming.Function', 'Where The Requests Live', {
      func: `msg.db = 'Data Source=C:/Users/İlknur/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`,
    })
    .then('fbbdef', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('83f63c', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('a37e5c', 'Robomotion.SQLite.Query', 'Count The Requests', {
      optConnectionString: Message('db'),
      outResult: Message('existing'),
      func: `SELECT COUNT(*) AS n FROM requests`,
    })
    .then('f813c8', 'Core.Programming.Function', 'Only Into An Empty App', {
      outputs: 2,
      func: `var n = Number((msg.existing.rows[0] || {}).n || 0);
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (me.role !== 'admin') {
  msg.refused = 'Only the administrator can load example requests.';
  return [null, msg];
}
if (n > 0) {
  msg.refused = 'There are already requests in the app, so no examples were added.';
  return [null, msg];
}

var DAY = 24 * 60 * 60 * 1000;
var now = Date.now();
var year = new Date().getFullYear();
var pending = function (role) {
  return { role: role, decision: 'pending', comment: '', at: 0, reminders: 0 };
};
var decided = function (role, decision, comment, daysAgo) {
  return { role: role, decision: decision, comment: comment, at: now - daysAgo * DAY, reminders: 0 };
};
var validation = function (salary, hay, advertised, methods, comment) {
  return {
    validated_at: now - DAY,
    salary_range: salary,
    benefit_package: 'Standard site package with pension, meal vouchers and 25 days holiday.',
    job_family: hay,
    advertised: advertised,
    recruitment_methods: methods,
    budget_confirmed: true,
    hr_recommendation: 'support',
    hr_comments: comment
  };
};

var examples = [
  {
    seq: 1, status: 'pending_approval', hm: 'Sophie Laurent', pbp: 'Holly', days: 12, stage: 9,
    f1: ['Operations', 'Maintenance Engineer', 'Argentan', 'Replacement',
      'Replaces a senior engineer retiring in January; line 3 needs cover on all three shifts.', 'Luc Moreau', 45],
    f2: validation('EUR 48,000 - 54,000', 'Engineering / Hay 14', 'Both Internally and Externally',
      ['LinkedIn Search', 'Job Boards'], 'Like-for-like backfill within the headcount plan.'),
    approvals: [decided('cpo', 'approved', 'Clear backfill.', 7), pending('cfo'), pending('ceo')]
  },
  {
    seq: 2, status: 'pending_hr', hm: 'Sophie Laurent', pbp: 'Holly', days: 2, stage: 2,
    f1: ['Information Technology', 'Data Analyst', 'Cavriago', 'New role',
      'Reporting moves to a central data platform next year; nobody on site can build the dashboards.', 'Elena Conti', 60],
    approvals: [pending('cpo'), pending('cfo'), pending('ceo')]
  },
  {
    seq: 3, status: 'approved', hm: 'Sophie Laurent', pbp: 'Holly', days: 20, stage: 3,
    f1: ['Commercial', 'Key Account Manager', 'Langemark', 'New role',
      'Two new retail accounts signed for 2027 need a dedicated account owner.', 'Annelies Peeters', 30],
    f2: validation('EUR 55,000 - 62,000 + bonus', 'Sales / Hay 15', 'Externally', ['LinkedIn Search', 'Agency'],
      'Revenue from the two accounts covers the role in year one.'),
    approvals: [decided('cpo', 'approved', '', 6), decided('cfo', 'approved', 'Covered by the new accounts.', 4),
      decided('ceo', 'approved', '', 3)]
  },
  {
    seq: 4, status: 'info_requested', hm: 'Sophie Laurent', pbp: 'Holly', days: 8, stage: 1,
    f1: ['Finance', 'Payroll Specialist', 'Monignoso', 'Replacement',
      'Current specialist leaves at the end of the quarter; payroll for 240 people cannot run on one person.', 'Paolo Neri', 40],
    f2: validation('EUR 34,000 - 38,000', 'Finance / Hay 11', 'Internally', [], 'Internal candidates are likely.'),
    approvals: [pending('cpo'), decided('cfo', 'info', 'Is this backfill already in the 2026 payroll budget?', 1), pending('ceo')],
    info: { from_role: 'cfo', from_name: 'CFO', target: 'people_partner',
      question: 'Is this backfill already in the 2026 payroll budget?', asked_at: now - DAY }
  },
  {
    seq: 5, status: 'rejected', hm: 'Sophie Laurent', pbp: 'Holly', days: 30, stage: 18,
    f1: ['Acquisitions', 'M&A Analyst', 'Fully remote', 'New role',
      'Support for the two acquisitions planned next year.', 'Sophie Laurent', 90],
    f2: validation('EUR 70,000 - 80,000', 'Strategy / Hay 16', 'Externally', ['Agency'], 'Specialist profile.'),
    approvals: [decided('cpo', 'approved', '', 20), decided('cfo', 'rejected', 'No acquisition budget approved for 2027 yet.', 18), pending('ceo')]
  },
  {
    seq: 6, status: 'draft', hm: 'Sophie Laurent', pbp: 'Holly', days: 0, stage: 0,
    f1: ['People', 'HR Coordinator', "Castel d'Ario", 'New role', '', '', 60],
    approvals: [pending('cpo'), pending('cfo'), pending('ceo')]
  }
];

var requests = [];
var events = [];

examples.forEach(function (x) {
  var id = 'r' + now.toString(36) + x.seq;
  var ref = 'VR-' + year + '-' + ('00' + x.seq).slice(-3);
  var created = now - x.days * DAY - 3600000;
  var stageSince = now - x.stage * DAY - 1800000;
  var start = new Date(now + x.f1[6] * DAY).toISOString().slice(0, 10);
  var form1 = {
    hiring_manager: x.hm,
    department: x.f1[0],
    request_date: new Date(created).toISOString().slice(0, 10),
    job_title: x.f1[1],
    location: x.f1[2],
    role_type: x.f1[3],
    business_justification: x.f1[4],
    desired_start_date: x.f1[4] ? start : '',
    reporting_manager: x.f1[5]
  };

  requests.push({
    id: id,
    ref: ref,
    status: x.status,
    hiring_manager: x.hm,
    pbp: x.pbp,
    job_title: form1.job_title,
    department: form1.department,
    location: form1.location,
    created_at: created,
    updated_at: stageSince,
    stage_since: stageSince,
    data: JSON.stringify({ form1: form1, form2: x.f2 || {}, approvals: x.approvals, info: x.info || {} })
  });

  var add = function (n, at, actorRole, actorName, title, note, tone) {
    events.push({
      id: 'e' + now.toString(36) + x.seq + n,
      request_id: id,
      ref: ref,
      at: at,
      kind: 'audit',
      actor_role: actorRole,
      actor_name: actorName,
      to_role: '',
      to_person: '',
      title: title,
      note: note,
      tone: tone,
      read: 1
    });
  };

  if (x.status === 'draft') {
    add('a', created, 'hiring_manager', x.hm, 'Draft saved', '', 'pending');
    return;
  }
  add('a', created, 'hiring_manager', x.hm, 'Request sent to the People team', '', 'pending');
  if (x.f2) {
    add('b', created + DAY, 'people_partner', x.pbp, 'Validated by ' + x.pbp + ' and sent to the CEO, CPO and CFO',
      x.f2.hr_comments, 'pending');
  }
  x.approvals.forEach(function (a, i) {
    if (a.decision === 'pending') {
      return;
    }
    var label = a.role.toUpperCase();
    var title = a.decision === 'approved' ? label + ' approved'
      : a.decision === 'rejected' ? label + ' rejected the request'
      : label + ' asked the People Business Partner for more information';
    var tone = a.decision === 'approved' ? 'ok' : a.decision === 'rejected' ? 'error' : 'warn';
    add('c' + i, a.at, a.role, label, title, a.comment, tone);
  });
  if (x.status === 'approved') {
    add('d', stageSince, 'system', 'Vacancy Approvals', 'All three approvals in - Talent Partner notified', '', 'ok');
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
msg.result = { added: requests.length };
msg.changed = { id: requests[0].id, ref: requests[0].ref, status: requests[0].status };

return [msg, null];`,
    })
    .then('d03af1', 'Robomotion.SQLite.Insert', 'Save The Examples', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('requests'),
      inTable: Message('request_table'),
      optReplace: true,
    })
    .then('d22122', 'Robomotion.SQLite.Insert', 'Save Their History', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('events'),
      inTable: Message('event_table'),
      optReplace: true,
    })
    .then('dabbbd', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('6d6511', 'Robomotion.Apps.Respond', 'Say How Many', {});

  f.node('e8ec0d', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['045f10'], type: 'goto', all: false } });
  f.edge('f813c8', 1, 'e8ec0d', 0);
  f.node('045f10', 'Core.Flow.Label', 'Refused', {});
  f.node('b0c42d', 'Robomotion.Apps.RespondError', 'Say Why Not', {
    optCode: 'invalid_params',
    optRetryable: false,
    inMessage: Message('refused'),
  });
  f.edge('045f10', 0, 'b0c42d', 0);

  // ---- clearAllRequests: start a demo from an empty app
  f.node('74e79c', 'Robomotion.Apps.Action', 'Start Over Asked For', { optActionName: 'clearAllRequests' })
    .then('efb872', 'Core.Programming.Function', 'Where The Requests Live', {
      func: `msg.db = 'Data Source=C:/Users/İlknur/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`,
    })
    .then('d211b8', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('8467f2', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('dfa118', 'Core.Programming.Function', 'Only The Demo Admin, Only When Confirmed', {
      outputs: 2,
      func: `var confirmed = (msg.params || {}).confirm === true;
var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}
if (me.role !== 'admin') {
  msg.refused = 'Only the administrator can clear all requests.';
  return [null, msg];
}
if (!confirmed) {
  msg.refused = 'Nothing was removed: the clear-out was not confirmed.';
  return [null, msg];
}
return [msg, null];`,
    })
    .then('d1ab3b', 'Robomotion.SQLite.NonQuery', 'Remove Every Request', {
      optConnectionString: Message('db'),
      outAffectedRows: Message('removed'),
      func: `DELETE FROM requests`,
    })
    .then('8cce60', 'Robomotion.SQLite.NonQuery', 'Remove Every Notification', {
      optConnectionString: Message('db'),
      func: `DELETE FROM events`,
    })
    .then('fccf81', 'Core.Programming.Function', 'Say How Many', {
      func: `msg.result = { removed: Number(msg.removed) || 0 };
msg.changed = { id: '', status: 'draft' };

return msg;`,
    })
    .then('e188fc', 'Robomotion.Apps.EmitEvent', 'Tell Every Screen', {
      optEventName: 'requestChanged',
      optAudience: 'manifest',
      inPayload: Message('changed'),
    })
    .then('7b3439', 'Robomotion.Apps.Respond', 'Confirm It Is Empty', {});

  f.node('cc95ee', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['16c1b5'], type: 'goto', all: false } });
  f.edge('dfa118', 1, 'cc95ee', 0);
  f.node('16c1b5', 'Core.Flow.Label', 'Not Confirmed', {});
  f.node('59c059', 'Robomotion.Apps.RespondError', 'Say Why Not', {
    optCode: 'invalid_params',
    optRetryable: false,
    inMessage: Message('refused'),
  });
  f.edge('16c1b5', 0, '59c059', 0);
});
