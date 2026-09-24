declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CONNECTOR_ALLOWED_HOSTS?: string;
    AI_PROVIDER?: string;
    MODEL_CONFIG_REVISION?: string;
    DEEPSEEK_API_KEY?: string;
    DEEPSEEK_MODEL?: string;
    QWEN_API_KEY?: string;
    QWEN_MODEL?: string;
  }
}
