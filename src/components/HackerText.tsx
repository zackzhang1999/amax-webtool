import { useEffect, useRef, useCallback } from 'react';

interface HackerTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p';
  trigger?: 'hover' | 'mount' | 'intersection';
}

export default function HackerText({
  text,
  className = '',
  as: Tag = 'span',
  trigger = 'intersection',
}: HackerTextProps) {
  const ref = useRef<HTMLElement>(null);
  const iterationRef = useRef(0);
  const hasTriggered = useRef(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_!@#$%^&*';

  const startReveal = useCallback(() => {
    if (hasTriggered.current && trigger === 'intersection') return;
    hasTriggered.current = true;

    const el = ref.current;
    if (!el) return;

    iterationRef.current = 0;
    const originalText = text;

    const interval = setInterval(() => {
      const iteration = iterationRef.current;
      const startReveal = Math.floor(iteration);
      const endReveal = startReveal + 2;

      el.innerText = originalText
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' ';
          if (index < startReveal) return originalText[index];
          if (index >= startReveal && index < endReveal) {
            return Math.random() < 0.5 ? originalText[index] : chars[Math.floor(Math.random() * chars.length)];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      iterationRef.current += 1 / 3;

      if (iterationRef.current >= originalText.length) {
        clearInterval(interval);
        el.innerText = originalText;
      }
    }, 30);
  }, [text, trigger]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (trigger === 'mount') {
      const timer = setTimeout(startReveal, 200);
      return () => clearTimeout(timer);
    }

    if (trigger === 'intersection') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            startReveal();
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [trigger, startReveal]);

  return (
    <Tag
      ref={ref as React.Ref<any>}
      className={`hacker-text-reveal ${className}`}
      onMouseEnter={trigger === 'hover' ? startReveal : undefined}
    >
      {text}
    </Tag>
  );
}
