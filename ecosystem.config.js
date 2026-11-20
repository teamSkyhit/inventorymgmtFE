// PM2 process file for production (DigitalOcean droplet, user `deploy`).
//
// Runs the Next.js *standalone* server that `next build` generates at
// .next/standalone/server.js. The deploy workflow ships that bundle (plus this
// file) as the root of each release, so `server.js` below is the standalone
// server -- NOT the repo-root server.js, which is a dev-only custom server
// (hardcoded port 3000) and is never included in the bundle.
//
// Usage on the server (done by scripts/deploy/remote-deploy.sh):
//   pm2 startOrReload /var/www/prod/poojastore-frontend/current/ecosystem.config.js --update-env
const APP_DIR = "/var/www/prod/poojastore-frontend";

module.exports = {
  apps: [
    {
      name: "poojastore-web",
      cwd: `${APP_DIR}/current`,
      script: "server.js",
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "350M",
      kill_timeout: 5000,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "8102",
        HOSTNAME: "127.0.0.1",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
};
