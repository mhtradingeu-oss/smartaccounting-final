const { spawnSync } = require('child_process');

module.exports = () => {
  const script = `
    const http = require('http');
    const server = http.createServer();
    server.on('error', () => process.exit(1));
    server.listen(0, '127.0.0.1', () => {
      server.close(() => process.exit(0));
    });
  `;
  const result = spawnSync('node', ['-e', script], { stdio: 'ignore', timeout: 2000 });
  return result.status === 0;
};
