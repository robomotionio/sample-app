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

subflow.create('Notifications', (f) => {
  f.node('f1e512', 'Core.Flow.Begin', 'Begin', {});
  f.node('f3d72a', 'Core.Flow.End', 'End', { sfPort: 0 });

  // ---- listNotifications: what was sent to this role (and this person)
  f.node('406e0b', 'Robomotion.Apps.Action', 'Notifications Asked For', { optActionName: 'listNotifications' })
    .then('8a2737', 'Core.Programming.Function', 'Who Is Asking', {
      func: `msg.db = 'Data Source=' + global.get('$Home$') + '/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`,
    })
    .then('1babaf', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('f71c48', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('a8d2fd', 'Robomotion.SQLite.Query', 'Read Notifications For This Role', {
      optConnectionString: Message('db'),
      outResult: Message('found'),
      func: `SELECT id, at, request_id, ref, to_role, to_person, title, note, tone, read
FROM events
WHERE kind = 'notify'
ORDER BY at DESC
LIMIT 1000`,
    })
    .then('7b6fde', 'Core.Programming.Function', 'Keep The Ones For Me', {
      outputs: 2,
      func: `var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}

var rows = msg.found.rows
  .filter(function (n) {
    return n.to_role === me.role && (!n.to_person || n.to_person === me.name);
  })
  .slice(0, 200)
  .map(function (n) {
    return {
      id: n.id,
      at: Number(n.at),
      request_id: n.request_id,
      ref: n.ref,
      title: n.title,
      note: n.note || '',
      tone: n.tone,
      read: Number(n.read) === 1
    };
  });

msg.result = {
  rows: rows,
  unread: rows.filter(function (n) { return !n.read; }).length
};
return [msg, null];`,
    })
    .then('b50270', 'Robomotion.Apps.Respond', 'Send The Notifications', {});

  // ---- markNotificationsRead
  f.node('e76e27', 'Robomotion.Apps.Action', 'Marked As Read', { optActionName: 'markNotificationsRead' })
    .then('045bd8', 'Core.Programming.Function', 'Whose Notifications', {
      func: `msg.db = 'Data Source=' + global.get('$Home$') + '/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();
msg.token = String((msg.params || {}).token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`,
    })
    .then('7c70ba', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('0d320f', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('03bdf0', 'Core.Programming.Function', 'Whose Are They', {
      outputs: 2,
      func: `var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}

msg.role = me.role;
// A name like D'Arcy must not break the statement.
msg.person = String(me.name).replace(/'/g, "''");

return [msg, null];`,
    })
    .then('7b2b00', 'Robomotion.SQLite.NonQuery', 'Mark Them Read', {
      optConnectionString: Message('db'),
      outAffectedRows: Message('marked'),
      func: `UPDATE events
SET read = 1
WHERE kind = 'notify' AND read = 0 AND to_role = '{{{role}}}'
  AND (to_person = '' OR to_person IS NULL OR to_person = '{{{person}}}')`,
    })
    .then('c72e3a', 'Core.Programming.Function', 'Say How Many', {
      func: `msg.result = { marked: Number(msg.marked) || 0 };

return msg;`,
    })
    .then('1f22ae', 'Robomotion.Apps.Respond', 'Confirm', {});
  f.node('1bd378', 'Core.Flow.Label', 'Refused', {});
  f.node('e7acb0', 'Robomotion.Apps.RespondError', 'Say Why Not', {
    optCode: 'invalid_params',
    optRetryable: false,
    inMessage: Message('refused'),
  });
  f.edge('1bd378', 0, 'e7acb0', 0);
  f.node('c2940b', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['1bd378'], type: 'goto', all: false } });
  f.edge('7b6fde', 1, 'c2940b', 0);
  f.node('a9a8e8', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['1bd378'], type: 'goto', all: false } });
  f.edge('03bdf0', 1, 'a9a8e8', 0);

  // ---- Teams: every new notification is posted to the team's channel.
  // The channel's address lives in the local database (settings), never in git.
  f.node('71cc2f', 'Core.Trigger.Inject', 'Every Twenty Seconds', {
    optOnce: false,
    optOnceDelay: 15,
    optRepeat: 20,
  })
    .then('ac5a54', 'Core.Programming.Function', 'Where Things Live', {
      func: `msg.db = 'Data Source=' + global.get('$Home$') + '/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
// Only what happened in the last hour is posted, so an old backlog never floods the channel.
msg.since = Date.now() - 60 * 60 * 1000;

return msg;`,
    })
    .then('6ffc80', 'Robomotion.SQLite.NonQuery', 'Make Sure The Teams Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES + `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS teams_posted (
  event_id TEXT PRIMARY KEY,
  at INTEGER
);`,
    })
    .then('30d6a8', 'Robomotion.SQLite.Query', 'Read The Channel Address', {
      optConnectionString: Message('db'),
      outResult: Message('setting'),
      func: `SELECT value FROM settings WHERE key = 'teams_webhook'`,
    })
    .then('f453a3', 'Robomotion.SQLite.Query', 'Read Notifications Not Yet Posted', {
      optConnectionString: Message('db'),
      outResult: Message('fresh'),
      func: `SELECT e.id, e.ref, e.at, e.actor_name, e.to_role, e.to_person, e.title, e.note, e.tone
FROM events e
WHERE e.kind = 'notify' AND e.at > {{{since}}}
  AND NOT EXISTS (SELECT 1 FROM teams_posted p WHERE p.event_id = e.id)
ORDER BY e.at
LIMIT 20`,
    })
    .then('f63d93', 'Core.Programming.Function', 'Write The Teams Cards', {
      func: `var hook = ((msg.setting && msg.setting.rows) || [])[0];
var rows = (msg.fresh && msg.fresh.rows) || [];
if (!hook || !hook.value || rows.length === 0) {
  return null;
}

var ROLE = {
  hiring_manager: 'Hiring Manager',
  people_partner: 'People Business Partner',
  cpo: 'CPO',
  cfo: 'CFO',
  ceo: 'CEO',
  talent_partner: 'Talent Partner',
  admin: 'Administrator'
};
var COLOR = { ok: 'Good', error: 'Attention', warn: 'Warning', pending: 'Accent' };

var cards = rows.map(function (n) {
  var who = n.to_person ? n.to_person + ' (' + (ROLE[n.to_role] || n.to_role) + ')' : (ROLE[n.to_role] || n.to_role);
  var body = [
    { type: 'TextBlock', text: n.title, weight: 'Bolder', size: 'Medium', wrap: true, color: COLOR[n.tone] || 'Default' },
    { type: 'FactSet', facts: [
      { title: 'For', value: who },
      { title: 'Request', value: n.ref || '' }
    ] }
  ];
  if (n.note) {
    body.splice(1, 0, { type: 'TextBlock', text: n.note, wrap: true });
  }
  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: body
    }
  };
});

msg.hook = hook.value;
msg.req = { type: 'message', attachments: cards };
msg.posted_table = {
  columns: ['event_id', 'at'],
  rows: rows.map(function (n) { return { event_id: n.id, at: Date.now() }; })
};
msg.posted_count = String(rows.length) + ' notification(s) posted to Teams';

return msg;`,
    })
    .then('8a15aa', 'Core.Net.HttpRequest', 'Post To The Teams Channel', {
      optUrl: Message('hook'),
      optMethod: 'post',
      inBody: Message('req'),
      optTimeout: 30,
    })
    .then('18e772', 'Robomotion.SQLite.Insert', 'Remember What Was Posted', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('teams_posted'),
      inTable: Message('posted_table'),
      optReplace: true,
    })
    .then('abd4e7', 'Core.Flow.Log', 'Note What Was Posted', {
      inText: Message('posted_count'),
      optLevel: 'info',
    });
});
