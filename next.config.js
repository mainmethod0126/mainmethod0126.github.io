const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

// module.exports = withNextra()

module.exports = {
  ...withNextra(),
  images: {
    unoptimized: true,
  },
};
