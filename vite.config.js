import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const repo = process.env.GITHUB_REPOSITORY
    ? process.env.GITHUB_REPOSITORY.split('/')[1]
    : null;
  const base = process.env.BASE_PATH || (repo ? `/${repo}/` : '/');

  return {
    plugins: [react()],
    base,
  };
});
