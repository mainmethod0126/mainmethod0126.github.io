import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import type { MDXComponents } from 'mdx/types'
import { DocumentImage } from './components/document-image'

const components = getThemeComponents({ img: DocumentImage })

export function useMDXComponents(overrides: MDXComponents = {}) {
  return { ...components, ...overrides }
}
