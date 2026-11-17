import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import type { MDXComponents } from 'mdx/types'
import { MarkdownImage, MarkdownLink } from './components/markdown-image'

const components = getThemeComponents({ img: MarkdownImage, a: MarkdownLink })

export function useMDXComponents(overrides: MDXComponents = {}) {
  return { ...components, ...overrides }
}
