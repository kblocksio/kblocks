# Static Sites

Serve static web content (React, Vue, etc.) over a global CDN. Deploying a static site on Kblocks is fast and simple: link the site’s repo, and Kblocks will automatically update it with every push to the specified branch. Alternatively, you can link a bucket which contains the site’s static assets.

Static sites are served over a global CDN with fully managed TLS certificates.

### Get started

In the Kblocks Dashboard, click **New Resource > Static Site**:

1. Connect your repo, specify your build details (including which Git branch to deploy), and click **Create**. Alternatively, you can link a bucket which contains the site’s static assets.
2. You’re all set! Kblocks kicks off your site’s initial deploy.

For extra help with popular static site generators, we have quickstarts for:

- [Create React App](https://kblocks.io/docs/deploy-create-react-app)
- [Vue.js](https://kblocks.io/docs/deploy-vue)
- [Jekyll](https://kblocks.io/docs/deploy-jekyll)
- [Gatsby](https://kblocks.io/docs/deploy-gatsby)
- [Hugo](https://kblocks.io/docs/deploy-hugo)
- [Docusaurus](https://kblocks.io/docs/deploy-docusaurus)
- [Next.js](https://kblocks.io/docs/deploy-nextjs)
- [Svelte](https://kblocks.io/docs/deploy-svelte)

## Features

### Global CDN
Kblocks serves your site over a cloudfront CDN. It caches your content on network edges around the world, ensuring the fastest possible load times for your users.

### Pull request previews
With each pull request to your site’s deployed branch, Kblocks can automatically generate a preview instance of the site with its own URL. This helps you quickly test out updates before merging.

[Learn more about PR previews](https://kblocks.io/docs/pull-request-previews).

### Redirects and rewrites
Define redirect and rewrite rules for your site’s paths directly from the Kblocks Dashboard—no code required.

Additionally, Kblocks automatically redirects HTTP traffic to HTTPS.

### Custom response headers
Add custom HTTP headers to your site’s responses for security and performance.

### Immediate cache invalidation
Kblocks insulates your site against failure with zero-downtime deploys. It builds your site with every push to your deployed branch, and each build is fully atomic. As soon as a build succeeds, Kblocks immediately invalidates the CDN caches so your users always see the latest working version of your site.

### DDoS protection
Kblocks provides denial-of-service protection to all static sites and web services. [Learn more](https://kblocks.io/docs/ddos-protection).

### Brotli compression
Kblocks serves your content with Brotli compression, which is better than gzip and makes your sites faster by reducing page sizes.

### HTTP/2
All Kblocks sites and web services support HTTP/2 by default, which means fewer client connections to your site and faster page loads.

### Managed TLS certificates
Kblocks uses Let’s Encrypt and Google Trust Services to automatically issue and renew TLS certificates for every site and service. There is no additional setup, and TLS certificates are always included.

### Custom domains
Add custom domains to your static site. Specify the domain on your site’s Settings page in the Kblocks Dashboard, then follow the instructions to update DNS with your provider:

- [Cloudflare](https://kblocks.io/docs/custom-domains#cloudflare)
- [Namecheap](https://kblocks.io/docs/custom-domains#namecheap)
- [Other](https://kblocks.io/docs/custom-domains#other)

## Dependency installation

By default, Kblocks automatically attempts to detect and install your static site’s dependencies. If you prefer to install dependencies manually, add a `SKIP_INSTALL_DEPS` environment variable to your site and set it to `true`. You can then include your own dependency installation as part of your site’s build command.
