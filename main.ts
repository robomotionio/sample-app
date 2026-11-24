import { flow, Message, Custom, JS, Global, Flow, Credential, AI } from '@robomotion/sdk';

flow.create("4aa0e451-0a2b-415e-b093-f3f4c13c6a1f", "Vacancy Approvals", (f) => {
  f.addDependency('Robomotion.Apps', '0.6.0');
  f.addDependency('Robomotion.SQLite', '1.8.0');
  f.addDependency('Robomotion.Cryptography', '0.10.0');

  f.node('e97227', 'Core.Flow.SubFlow', 'Home', {});
  f.node('2fc616', 'Core.Flow.SubFlow', 'New request', {});
  f.node('61120f', 'Core.Flow.SubFlow', 'All requests', {});
  f.node('8ff162', 'Core.Flow.SubFlow', 'Notifications', {});
  f.node('902bf1', 'Core.Flow.SubFlow', 'Sign in', {});

  f.node('f683c6', 'Core.Trigger.Catch', 'Say What Went Wrong', {
    optNodes: { all: true, ids: [], type: 'catch' },
  })
    .then('ce11d2', 'Robomotion.Apps.RespondError', 'Tell Them The Problem', {
      optRetryable: true,
      inMessage: Message('error.message'),
      continueOnError: true,
    });
}).start();
