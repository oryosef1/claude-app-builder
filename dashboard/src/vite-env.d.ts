/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_MEMORY_API_URL: string
  readonly VITE_CORPORATE_WORKFLOW_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}