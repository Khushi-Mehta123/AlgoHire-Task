interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ZONE_ID?: string;
  readonly VITE_OPERATOR_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
