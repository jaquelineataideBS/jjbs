import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{const host=process.env.NEXT_PUBLIC_SITE_URL??(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:"http://127.0.0.1:3030");return{rules:{userAgent:"*",allow:"/",disallow:["/admin","/api/"]},sitemap:`${host}/sitemap.xml`};}
