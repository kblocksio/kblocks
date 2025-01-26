import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { remarkCodeHike, recmaCodeHike } from "codehike/mdx"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const chConfig = {
  components: { code: "MyCode" },
  syntaxHighlighting: {
    theme: "github-dark",
  },
}

const config: Config = {
  title: "Kblocks",
  tagline:
    "A tool for creating Kubernetes CRDs using Helm, Terraform/OpenTofu and other and IaC engines",
  favicon: "img/favicon.ico",


  // Set the production url of your site here
  url: "https://kblocks.io/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "kblocksio", // Usually your GitHub org/user name.
  projectName: "kblocks", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [
    function tailwindPlugin(context, options) {
      return {
        name: "tailwind-plugin",
        configurePostCss(postcssOptions) {
          postcssOptions.plugins = [
            require("postcss-import"),
            require("tailwindcss"),
            require("autoprefixer"),
          ];
          return postcssOptions;
        },
      };
    },
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          beforeDefaultRemarkPlugins: [[remarkCodeHike, chConfig]],
          recmaPlugins: [[recmaCodeHike, chConfig]],
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/kblocksio/kblocks/tree/main/docs",
        },
        // Enable if we want to add a blog support
        // blog: {
        //   showReadingTime: true,
        //   feedOptions: {
        //     type: ["rss", "atom"],
        //     xslt: true,
        //   },
        //   // Please change this to your repo.
        //   // Remove this to remove the "edit this page" links.
        //   editUrl: "https://github.com/kblocksio/kblocks/tree/main/docs",
        //   // Useful options to enforce blogging best practices
        //   onInlineTags: "warn",
        //   onInlineAuthors: "warn",
        //   onUntruncatedBlogPosts: "warn",
        // },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    navbar: {
      title: "Kblocks",
      logo: {
        alt: "Kblocks Logo",
        src: "img/wing-light.svg",
        srcDark: "img/wing-dark.svg",
      },
      items: [
        {
          href: "/docs/user-guide/installation",
          position: "left",
          label: "Install",
        },
        {
          href: "/docs",
          position: "left",
          label: "Docs",
        },

        {
          href: "/docs/user-guide/installation",
          label: "Contributing",
          position: "right",
        },
        {
          href: "https://github.com/kblocksio/kblocks",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Install",
              to: "/docs/user-guide/installation",
            },
            {
              label: "Getting Started",
              to: "/docs",
            },
          ],
        },
        
        {
          title: "Supported Engines",
          items: [
            {
              label: "Helm",
              to: "/docs/reference/supported-engines/helm",
            },
            {
              label: "OpenTofu",
              to: "/docs/reference/supported-engines/tofu",
            },
            {
              label: "Terraform",
              to: "/docs/reference/supported-engines/terraform",
            },
            {
              label: "Wing",
              to: "/docs/reference/supported-engines/wing",
            },
            {
              label: "Noop",
              to: "/docs/reference/supported-engines/noop",
            },
            {
              label: "Custom",
              to: "/docs/reference/supported-engines/custom",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/kblocksio/kblocks",
            },
            {
              label: "Report an issue",
              href: "https://github.com/kblocksio/kblocks/issues",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Wing Cloud, Inc.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
