import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { withSidebarTitles } from '../components/sidebar-title'
import 'nextra-theme-docs/style.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://mainmethod0126.github.io'),
  title: { default: '신우섭의 도서관 v2', template: '%s - 신우섭의 도서관 v2' },
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={<Navbar logo={<span>😸신우섭의 도서관 v2</span>} projectLink="https://github.com/mainmethod0126" chatLink="https://discord.com" />}
          pageMap={withSidebarTitles(await getPageMap())}
          docsRepositoryBase="https://github.com/mainmethod0126/mainmethod0126.github.io/tree/main"
          footer={<Footer>📧 mainmethod0126@gmail.com</Footer>}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
