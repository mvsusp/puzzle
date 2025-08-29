// scripts/deploy.js
/* eslint-disable no-console */
const path = require('path');
const ghpages = require('gh-pages');
const { execSync } = require('child_process');
const pkg = require('../package.json');

function repoSlugFromUrl(url) {
  const m = url && url.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  return m && m[1];
}

function getRepoSlug() {
  // 1) GITHUB_REPOSITORY env (owner/repo)
  if (process.env.GITHUB_REPOSITORY && !process.env.GITHUB_REPOSITORY.includes('github.com')) {
    return process.env.GITHUB_REPOSITORY;
  }

  // 2) Try origin remote
  try {
    const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const slug = repoSlugFromUrl(remote);
    if (slug) return slug;
  } catch {}

  // 3) package.json repository
  if (typeof pkg.repository === 'string') {
    const slug = repoSlugFromUrl(pkg.repository);
    if (slug) return slug;
  }
  if (pkg.repository && pkg.repository.url) {
    const slug = repoSlugFromUrl(pkg.repository.url);
    if (slug) return slug;
  }

  throw new Error('Cannot determine repository slug (owner/repo). Set GITHUB_REPOSITORY.');
}

function buildRepoUrl(slug) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    // ✅ Correct format for Actions token: username = x-access-token, password = TOKEN
    return `https://x-access-token:${token}@github.com/${slug}.git`;
  }
  // Fallback: rely on local git credentials (will fail on CI without a token)
  return `https://github.com/${slug}.git`;
}

const slug = getRepoSlug();
const repo = buildRepoUrl(slug);

ghpages.publish(
  path.join(process.cwd(), 'dist'),
  {
    branch: 'gh-pages',
    repo,
    dotfiles: true,
    message: `deploy: ${process.env.GITHUB_SHA?.slice(0, 7) || 'manual'}`,
    user: {
      name: process.env.GIT_AUTHOR_NAME || 'github-actions[bot]',
      email: process.env.GIT_AUTHOR_EMAIL || '41898282+github-actions[bot]@users.noreply.github.com',
    },
  },
  (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      // Hide the token if the URL ever gets printed
      console.log(`Published to ${repo.replace(/:.*@/, ':***@')}`);
    }
  }
);
