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

subflow.create('Sign in', (f) => {
  f.node('9419d2', 'Core.Flow.Begin', 'Begin', {});
  f.node('46c020', 'Core.Flow.End', 'End', { sfPort: 0 });

  f.node('a90da2', 'Core.Flow.Label', 'Refused', {});
  f.node('6e3b10', 'Robomotion.Apps.RespondError', 'Say Why Not', {
    optCode: 'invalid_params',
    optRetryable: false,
    inMessage: Message('refused'),
  });
  f.edge('a90da2', 0, '6e3b10', 0);

  // ---- signIn: username and password in, a session out
  f.node('194a35', 'Robomotion.Apps.Action', 'Sign In Pressed', { optActionName: 'signIn' })
    .then('beb5ee', 'Core.Programming.Function', 'What Was Typed', {
      func: `var p = msg.params || {};

msg.db = 'Data Source=C:/Users/İlknur/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.now = Date.now();
msg.username = String(p.username || '').trim().toLowerCase().replace(/[^a-z0-9._@-]/g, '');
// Sign-in is by work email; a bare name gets the company domain added.
if (msg.username && msg.username.indexOf('@') < 0) msg.username = msg.username + '@glacierglobal.com';
// Passwords are never stored: only this fingerprint of them is compared.
msg.salted = msg.username + ':' + String(p.password || '') + ':glacier-poc';

return msg;`,
    })
    .then('74d876', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('5c643f', 'Robomotion.SQLite.NonQuery', 'Make Sure The Demo Accounts Exist', {
      optConnectionString: Message('db'),
      func: `DELETE FROM users WHERE username NOT IN ('sophie@glacierglobal.com', 'holly@glacierglobal.com', 'cpo@glacierglobal.com', 'cfo@glacierglobal.com', 'ceo@glacierglobal.com', 'talent@glacierglobal.com', 'admin@glacierglobal.com');
DELETE FROM sessions WHERE username NOT IN (SELECT username FROM users);
INSERT OR REPLACE INTO users (username, name, role, password_hash) VALUES
('sophie@glacierglobal.com', 'Sophie Laurent', 'hiring_manager', 'ff8e810d2c1780262b297080f702985417b0ec4b77e27084487f54f299c0f2f7'),
('holly@glacierglobal.com', 'Holly', 'people_partner', 'c2e7e28ca236df9edc11c76af02cf87e8d46981df304ba3cb24caf5f9c29af3d'),
('cpo@glacierglobal.com', 'CPO', 'cpo', '70f4cb8fdabc8cc3ad72b63f9bd7c45e181d2d2f665e0fdedc06104a9c5b4144'),
('cfo@glacierglobal.com', 'CFO', 'cfo', '3ed0aeeaf6a89e3574d33401d3db7cda3f4a5e4bad2252a996ed9022f985f140'),
('ceo@glacierglobal.com', 'CEO', 'ceo', '9f8964bfef93d5c6c313dd19a5749d40941ce7bae200f12ace4a755debfeb0dc'),
('talent@glacierglobal.com', 'Talent Partner', 'talent_partner', '6f191997a5a5b4084cfc46183544e018c6d47c4b2fdc7c3d11269541f95ce0eb'),
('admin@glacierglobal.com', 'Administrator', 'admin', '9cb51cb31e08887d88a436597e5afc148c6b0b9a95998453bf0778296ee8e194')`,
    })
    .then('21e7dc', 'Robomotion.Cryptography.HashText', 'Fingerprint The Password', {
      inText: Message('salted'),
      optFunction: 'sha256-plain',
      outHash: Message('hash'),
    })
    .then('e99a66', 'Robomotion.SQLite.Query', 'Find The Account', {
      optConnectionString: Message('db'),
      outResult: Message('account'),
      func: `SELECT username, name, role, password_hash
FROM users
WHERE username = '{{{username}}}'`,
    })
    .then('fa2820', 'Robomotion.Cryptography.GenerateKey', 'Make A Session Key', {
      optSize: '6',
      outKey: Message('key'),
    })
    .then('2ca05b', 'Core.Programming.Function', 'Right Password?', {
      outputs: 2,
      func: `var account = msg.account.rows[0];
var typed = String(msg.hash || '').toLowerCase();

msg.salted = '';

if (!account || account.password_hash !== typed) {
  msg.refused = 'That username and password do not match.';
  return [null, msg];
}

var token = String(msg.key || '').replace(/[^A-Za-z0-9]/g, '') + msg.now.toString(36);

msg.session_table = {
  columns: ['token', 'username', 'created_at', 'expires_at'],
  rows: [{
    token: token,
    username: account.username,
    created_at: msg.now,
    expires_at: msg.now + 12 * 60 * 60 * 1000
  }]
};
msg.result = { token: token, username: account.username, name: account.name, role: account.role };

return [msg, null];`,
    })
    .then('108df8', 'Robomotion.SQLite.Insert', 'Open The Session', {
      optConnectionString: Message('db'),
      inDatabaseTable: Custom('sessions'),
      inTable: Message('session_table'),
      optReplace: true,
    })
    .then('8f69dc', 'Robomotion.Apps.Respond', 'Welcome Them', {});
  f.node('0978cc', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['a90da2'], type: 'goto', all: false } });
  f.edge('2ca05b', 1, '0978cc', 0);

  // ---- whoAmI: is this browser's session still good?
  f.node('805c41', 'Robomotion.Apps.Action', 'Session Checked', { optActionName: 'whoAmI' })
    .then('9688b9', 'Core.Programming.Function', 'Which Session', {
      func: `var p = msg.params || {};

msg.db = 'Data Source=C:/Users/İlknur/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String(p.token || '').replace(/[^A-Za-z0-9]/g, '');
msg.now = Date.now();

return msg;`,
    })
    .then('20dc93', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('30586f', 'Robomotion.SQLite.Query', 'Who Is Signed In', {
      optConnectionString: Message('db'),
      outResult: Message('me'),
      func: SIGNED_IN,
    })
    .then('86cdd7', 'Core.Programming.Function', 'Still Signed In?', {
      outputs: 2,
      func: `var me = msg.me.rows[0];

if (!me) {
  msg.refused = 'Your session has ended. Please sign in again.';
  return [null, msg];
}

msg.result = { token: msg.token, username: me.username, name: me.name, role: me.role };
return [msg, null];`,
    })
    .then('7e7a5e', 'Robomotion.Apps.Respond', 'Say Who', {});
  f.node('2594d5', 'Core.Flow.GoTo', 'Say Why Not', { optNodes: { ids: ['a90da2'], type: 'goto', all: false } });
  f.edge('86cdd7', 1, '2594d5', 0);

  // ---- signOut
  f.node('ddd0ea', 'Robomotion.Apps.Action', 'Sign Out Pressed', { optActionName: 'signOut' })
    .then('13af65', 'Core.Programming.Function', 'Which Session Ends', {
      func: `var p = msg.params || {};

msg.db = 'Data Source=C:/Users/İlknur/Desktop/Robomotion/Glacier/vacancy-approvals/data/vacancy-approvals.db;Version=3;';
msg.token = String(p.token || '').replace(/[^A-Za-z0-9]/g, '');
msg.result = { ok: true };

return msg;`,
    })
    .then('9a2b77', 'Robomotion.SQLite.NonQuery', 'Make Sure The Lists Exist', {
      optConnectionString: Message('db'),
      func: ENSURE_TABLES,
    })
    .then('2bd98f', 'Robomotion.SQLite.NonQuery', 'End The Session', {
      optConnectionString: Message('db'),
      func: `DELETE FROM sessions WHERE token = '{{{token}}}'`,
    })
    .then('ee09e4', 'Robomotion.Apps.Respond', 'Say Goodbye', {});
});
