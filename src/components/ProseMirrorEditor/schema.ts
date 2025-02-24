export const marks = {
  fontSize: {
    attrs: { size: { default: '16px' } },
    parseDOM: [{
      style: 'font-size',
      getAttrs: (value: string) => value ? { size: value } : null
    }],
    toDOM: (mark: any) => ['span', { style: `font-size: ${mark.attrs.size}` }, 0]
  }
}; 