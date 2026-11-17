import nextra from 'nextra'
import { documentMdxOptions } from './lib/document-mdx-options.mjs'

const withNextra = nextra({
  mdxOptions: documentMdxOptions,
})

export default withNextra({
  output: 'export',
  images: { unoptimized: true },
})
