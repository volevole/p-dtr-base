module.exports = {
  apps: [
    {
      name: 'muscule-api',
      cwd: __dirname + '/server',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS || '/etc/ssl/node-extra-ca.pem'
      }
    }
  ]
};
