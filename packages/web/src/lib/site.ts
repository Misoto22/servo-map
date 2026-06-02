/**
 * 站点规范 URL 的单一事实来源（single source of truth）。
 * layout 的 metadataBase、sitemap/robots 的 BASE，以及所有 canonical/alternates
 * 都必须从此派生，避免散落的硬编码 "https://servo-map.com" 与服务域名漂移。
 *
 * 可通过环境变量 NEXT_PUBLIC_SITE_URL 覆盖（例如线上以 www 提供服务时设为 www 主机，
 * 让 canonical 与实际服务的主机一致）。注意去掉结尾斜杠以便安全拼接路径。
 */
// Default to the www host the site is actually SERVED on, so canonical/og:url
// match the serving host (the apex only 307-redirects to www). Override with
// NEXT_PUBLIC_SITE_URL if a 301 apex<->www is set up and the apex becomes canonical.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.servo-map.com"
).replace(/\/$/, "");
