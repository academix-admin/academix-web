// CI/Vercel-only GitHub auth for private git dependencies (e.g. @academix-admin/domain-types).
//
// Vercel clones academix-web via its GitHub App, but that access does NOT carry into the plain `git`
// that `npm install` shells out to for git dependencies — so cloning the private domain-types repo
// fails ("Permission denied (publickey)"). When a token is present in the environment, rewrite
// github.com git URLs to authenticated HTTPS so npm can fetch it. The token never lives in the repo.
//
// No-op locally: npm does not load .env.local, so this stays inert on dev machines and your normal
// SSH / credential-manager installs are untouched. In Vercel, set GITHUB_FINE_GRAIN_TOKEN (a
// fine-grained PAT, Contents: Read-only on academix-admin/domain-types) for Production + Preview.
const { execSync } = require('node:child_process');

const token =
  process.env.GITHUB_FINE_GRAIN_TOKEN ||
  process.env.GH_TOKEN ||
  process.env.GITHUB_TOKEN;

if (token) {
  const authed = `https://x-access-token:${token}@github.com/`;
  // Cover every form npm/git might use for github.com (https, ssh URL, scp-like ssh).
  for (const from of ['https://github.com/', 'ssh://git@github.com/', 'git@github.com:']) {
    try {
      // --add so all three forms coexist (a plain set would overwrite the previous rule).
      execSync(`git config --global --add url."${authed}".insteadOf "${from}"`, { stdio: 'ignore' });
    } catch {
      /* best-effort */
    }
  }
  console.log('[preinstall] authenticated GitHub HTTPS configured for private git dependencies');
}
