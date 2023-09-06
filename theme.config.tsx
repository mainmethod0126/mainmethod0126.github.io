import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>😸신우섭의 도서관 v2</span>,
  project: {
    link: 'https://github.com/mainmethod0126',
  },
  chat: {
    link: 'https://discord.com',
  },
  docsRepositoryBase: 'https://github.com/mainmethod0126/mainmethod0126.github.io',
  footer: {
    text: 'Nextra Docs Template',
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    titleComponent({ title, type }) {
      if (type === 'separator') {
        return (
          <div style={{ background: 'cyan', textAlign: 'center' }}>{title}</div>
        )
      }
      if (title === 'Introduction') {
        return <>👋 {title}</>
      }
      if (title === 'projects') {
        return <>🗄 {title}</>
      }
      if (title === 'search condition metadata') {
        return <>🗃 {title}</>
      }
      if (title === 'elasticsearch') {
        return <>📒 {title}</>
      }
      if (title === 'c++') {
        return <>📒 {title}</>
      }
      if (title === 'common') {
        return <>📒 {title}</>
      }
      if (title === 'java') {
        return <>📒 {title}</>
      }
      if (title === 'serialized data structure') {
        return <>📒 {title}</>
      }
      if (type === 'page') {
        return <>↗️ {title}</>
      }
      return <>📝 {title}</>
    }
  },
}

export default config
