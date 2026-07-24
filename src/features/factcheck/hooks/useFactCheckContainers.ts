import { useEffect, useState } from 'react';
import { ZhihuContent } from '../../../hooks/useZhihuContent';
import { INLINE_CLASS } from '../../blocker/hooks/useBlockUser';

const FACTCHECK_CLASS = 'zhihu-factcheck-inline';

export const useFactCheckContainers = (contents: ZhihuContent[]) => {
  const [fcContainers, setFcContainers] = useState<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const next = new Map<string, HTMLElement>();
    const claimed = new Set<HTMLElement>();
    contents.forEach((content) => {
      const parent = content.element; if (!parent) return;
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(content.id) : content.id;
      const existing = parent.querySelector<HTMLElement>(`.${FACTCHECK_CLASS}[data-contentid="${escapedId}"]`);
      if (existing) { if (!claimed.has(existing)) { claimed.add(existing); next.set(content.id, existing); } return; }
      const span = document.createElement('span');
      span.className = FACTCHECK_CLASS;
      span.setAttribute('data-contentid', content.id);
      span.style.display = 'inline-flex'; span.style.alignItems = 'center'; span.style.verticalAlign = 'middle'; span.style.marginLeft = '0.75';
      let blockContainer = parent.querySelector(`.${INLINE_CLASS}`);
      if (!blockContainer) {
        const userLink = parent.querySelector('.UserLink-link');
        if (userLink && userLink.nextElementSibling?.classList.contains(INLINE_CLASS)) blockContainer = userLink.nextElementSibling as HTMLElement;
      }
      if (!blockContainer) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(`.${INLINE_CLASS}`));
        blockContainer = candidates.find((c) => content.element.contains(c.previousElementSibling)) ?? candidates[0] ?? null;
      }
      if (!blockContainer) return;
      const sibling = blockContainer.nextElementSibling as HTMLElement | null;
      if (sibling?.classList.contains(FACTCHECK_CLASS)) { if (!claimed.has(sibling)) { claimed.add(sibling); next.set(content.id, sibling); } }
      else if (!sibling) { blockContainer.insertAdjacentElement('afterend', span); claimed.add(span); next.set(content.id, span); }
    });
    setFcContainers(next);
  }, [contents]);

  return fcContainers;
};