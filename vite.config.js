import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const defaultGithubPagesBase = process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || defaultGithubPagesBase,
  plugins: [react()],
})
