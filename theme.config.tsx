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
      if (title === 'My Profile') {
        return <>🧑🏻‍💻 {title}</>
      }
      if (title === 'projects') {
        return <>🗄 {title}</>
      }
      if (title === 'search condition metadata') {
        return <>🗃 {title}</>
      }
      if (title === 'hiworks auto attendance') {
        return <>🗃 {title}</>
      }
      if (title === 'simple semantic version') {
        return <>🗃 {title}</>
      }
      if (title === 'sneaky chat games') {
        return <>🗃 {title}</>
      }
      if (title === 'annotation scanner') {
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
      if (title === 'linux') {
        return <>📒 {title}</>
      }
      if (title === 'command') {
        return <>📒 {title}</>
      }
      if (title === 'java') {
        return <>📒 {title}</>
      }
      if (title === 'spring') {
        return <>📒 {title}</>
      }
      if (title === 'webflux') {
        return <>📒 {title}</>
      }
      if (title === 'r2dbc') {
        return <>📒 {title}</>
      }
      if (title === 'jpa') {
        return <>📒 {title}</>
      }
      if (title === 'rdb') {
        return <>📒 {title}</>
      }
      if (title === 'nginx') {
        return <>📒 {title}</>
      }
      if (title === 'security') {
        return <>📒 {title}</>
      }
      if (title === 'vue') {
        return <>📒 {title}</>
      }
      if (title === 'docker') {
        return <>📒 {title}</>
      }
      if (title === 'kafka') {
        return <>📒 {title}</>
      }
      if (title === 'serialized data structure') {
        return <>📒 {title}</>
      }
      if (title === 'etc') {
        return <>📒 {title}</>
      }
      if (type === 'page') {
        return <>↗️ {title}</>
      }
      return <>📃 {title}</>
    }
  },
}

export default config
