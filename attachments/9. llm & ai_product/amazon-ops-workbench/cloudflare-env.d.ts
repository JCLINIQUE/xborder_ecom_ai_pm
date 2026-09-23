declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CONNECTOR_ALLOWED_HOSTS?: string;
  }
}
