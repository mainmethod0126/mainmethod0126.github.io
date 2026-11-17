import remarkSmartypants from 'remark-smartypants'

// 기술 문서의 따옴표, 대시, 줄임표를 원문 그대로 표시한다.
export const documentMdxOptions = {
  remarkPlugins: [[remarkSmartypants, {
    quotes: false,
    dashes: false,
    ellipses: false,
    backticks: false,
  }]],
}
