import ghpages from 'gh-pages';
import { execSync } from 'child_process';

let repo;
if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
  repo = `https://${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
} else {
  try {
    repo = execSync('git config --get remote.origin.url').toString().trim();
  } catch {
    // ignore
  }
}

if (!repo) {
  console.warn('No repository URL found. Skipping deploy.');
  process.exit(0);
}

ghpages.publish('dist', { repo }, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
