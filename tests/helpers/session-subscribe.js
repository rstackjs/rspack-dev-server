module.exports = async function sessionSubscribe(session) {
  session.on('sessionattached', (s) => {
    sessionSubscribe(s);
  });
  await session.send('Network.enable');
  await session.send('Runtime.runIfWaitingForDebugger');
};
