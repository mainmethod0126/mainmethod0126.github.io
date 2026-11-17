import type { Metadata } from 'next'
import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../mdx-components'
import { GiscusComments } from '../../components/giscus-comments'
import { createTextTableOfContents } from '../../lib/table-of-contents'
import { encodeDocumentRoute } from '../../lib/document-route.mjs'

type PageProps = { params: Promise<{ mdxPath?: string[] }> }

export const generateStaticParams = generateStaticParamsFor('mdxPath')
export const dynamicParams = false

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { mdxPath } = await params
  const { metadata } = await importPage(mdxPath)
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: encodeDocumentRoute('/' + (mdxPath?.join('/') ?? '')),
    },
  }
}

const Wrapper = getMDXComponents().wrapper

export default async function Page(props: PageProps) {
  const params = await props.params
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(params.mdxPath)
  return (
    <Wrapper toc={createTextTableOfContents(toc)} metadata={metadata} sourceCode={sourceCode} bottomContent={<GiscusComments />}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
