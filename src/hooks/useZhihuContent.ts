import { useEffect, useRef, useState } from 'react';
import { logError } from '../features/logging';

export type ZhihuContent = { id: string; text: string; element: HTMLElement; question?: string };

export const CONTENT_SELECTORS = ['.RichText', '.ContentItem-title', '.AnswerCard', '.QuestionAnswer-content'];
export const QUESTION_SELECTORS = ['.QuestionHeader-title', '.QuestionHeader-main h1', '.Question-title', 'h1.QuestionHeader-title'];

const getQuestionText = (): string | undefined => {
  try {
    for (const selector of QUESTION_SELECTORS) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        const text = (el.innerText || el.textContent || '').trim();
        if (text && text.length > 5) return text;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
};

export const getZhihuContent = (): ZhihuContent[] => {
  try {
    const questionText = getQuestionText();
    const nodes = Array.from(document.querySelectorAll(CONTENT_SELECTORS.join(',')));
    const byAnchor = new Map<HTMLElement, ZhihuContent>();
    nodes.forEach((el) => {
      const node = el as HTMLElement;
      const text = (node.innerText || node.textContent || '').trim();
      if (!text || text.length < 20) return;
      const anchor = (node.closest('.List-item, .ContentItem') as HTMLElement) || (node.closest('.AnswerCard, .QuestionAnswer-content') as HTMLElement) || node;
      const existing = byAnchor.get(anchor);
      if (!existing) {
        const id = anchor.getAttribute('data-id') || text.slice(0, 40);
        byAnchor.set(anchor, { id, text, element: anchor, question: questionText });
      } else {
        if (text.length > existing.text.length) existing.text = text;
        if (!existing.element.getAttribute('data-id') && node.getAttribute('data-id')) {
          existing.element = node;
          existing.id = node.getAttribute('data-id') || existing.id;
        }
        // Ensure question is attached
        if (questionText && !existing.question) existing.question = questionText;
      }
    });
    return Array.from(byAnchor.values());
  } catch (err) {
    logError('Failed to collect Zhihu content', String(err));
    return [];
  }
};

export const useZhihuContent = () => {
  const [contents, setContents] = useState<ZhihuContent[]>([]);
  const scanTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const scan = () => {
      setContents((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        getZhihuContent().forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
      });
    };
    scan();
    const observer = new MutationObserver(() => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
      scanTimer.current = window.setTimeout(scan, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); if (scanTimer.current) window.clearTimeout(scanTimer.current); };
  }, []);

  return { contents, setContents };
};