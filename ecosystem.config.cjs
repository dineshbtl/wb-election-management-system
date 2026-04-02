/** PM2 ecosystem — `election-assam-4007`: Next production on port 4007 */
module.exports = {
  apps: [
    {
      name: "election-assam-4007",
      cwd: __dirname,
      script: "npm",
      args: "run start:4007",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
    {
      name: "assam-frontend",
      cwd: __dirname,
      script: "npm",
      args: "run start:2334",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
