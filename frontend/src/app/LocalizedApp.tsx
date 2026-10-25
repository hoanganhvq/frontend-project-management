import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'aria-description', 'placeholder', 'title', 'alt']

/**
 * Applies the app phrase catalog to rendered UI text, including text emitted by
 * shared components and third-party controls. Original strings are retained so
 * changing languages never translates an already translated value.
 */
export function LocalizedApp({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { i18n } = useTranslation('app')
  const originalText = useRef(new WeakMap<Text, string>())
  const originalAttributes = useRef(new WeakMap<Element, Map<string, string>>())

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const translate = (source: string) => {
      if (i18n.exists(source, { ns: 'app', keySeparator: false })) {
        return i18n.t(source, { ns: 'app', keySeparator: false, defaultValue: source })
      }
      const phrases = i18n.getResourceBundle(i18n.language, 'app') as Record<string, string> | undefined
      for (const key of Object.keys(phrases ?? {})) {
        if (!key.includes('{{')) continue
        const tokens = [...key.matchAll(/{{\s*([^{}\s]+)\s*}}/g)]
        const pattern = key.split(/{{\s*[^{}\s]+\s*}}/g).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)')
        const match = source.match(new RegExp(`^${pattern}$`))
        if (!match) continue
        const values = Object.fromEntries(tokens.map((token, index) => [token[1], match[index + 1]]))
        return i18n.t(key, { ...values, ns: 'app', keySeparator: false, defaultValue: source })
      }
      return source
    }

    const translateText = (node: Text) => {
      let source = originalText.current.get(node)
      if (source === undefined) {
        source = node.nodeValue ?? ''
        originalText.current.set(node, source)
      }
      const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/)
      if (!match) return
      const value = translate(match[2])
      const next = `${match[1]}${value}${match[3]}`
      if (node.nodeValue !== next) node.nodeValue = next
    }

    const translateElement = (element: Element) => {
      let originals = originalAttributes.current.get(element)
      if (!originals) {
        originals = new Map<string, string>()
        originalAttributes.current.set(element, originals)
      }
      for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        if (!element.hasAttribute(attribute)) continue
        if (!originals.has(attribute)) originals.set(attribute, element.getAttribute(attribute) ?? '')
        const source = originals.get(attribute) ?? ''
        const value = translate(source)
        if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value)
      }
    }

    const scan = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        translateText(node as Text)
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE && node !== root) return
      const element = node as Element
      if (element instanceof HTMLElement || element instanceof SVGElement) translateElement(element)
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
      let child: Node | null
      while ((child = walker.nextNode())) {
        if (child.nodeType === Node.TEXT_NODE) translateText(child as Text)
        else if (child.nodeType === Node.ELEMENT_NODE) translateElement(child as Element)
      }
    }

    scan(root)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') translateText(record.target as Text)
        else if (record.type === 'attributes') translateElement(record.target as Element)
        else record.addedNodes.forEach(scan)
      }
    })
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: TRANSLATABLE_ATTRIBUTES })
    return () => observer.disconnect()
  }, [i18n, i18n.language])

  return <div ref={rootRef} style={{ display: 'contents' }}>{children}</div>
}
