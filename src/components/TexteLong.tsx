'use client';

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'value'> & {
  /** 110 px pour « Votre idée », 38 px pour « Autre ». */
  hauteurMin?: number;
  value: string;
};

/** Zone de texte soulignée, sans limite de longueur, qui s'agrandit toute seule. */
export const TexteLong = forwardRef<HTMLTextAreaElement, Props>(function TexteLong(
  { hauteurMin = 110, value, ...props },
  ref,
) {
  const interne = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => interne.current as HTMLTextAreaElement);

  // Recalcule la hauteur à chaque changement de texte (aucune barre de défilement).
  useLayoutEffect(() => {
    const t = interne.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${Math.max(hauteurMin, t.scrollHeight + 2)}px`;
  }, [value, hauteurMin]);

  return (
    <textarea
      ref={interne}
      rows={1}
      value={value}
      style={{ minHeight: hauteurMin }}
      className={`block w-full flex-1 resize-none overflow-hidden border-0 border-b border-ligne-champ bg-transparent px-0 font-sans text-[15px] leading-[1.6] text-encre outline-none placeholder:text-gris focus:border-b-2 focus:border-rouge focus-visible:outline-none ${
        hauteurMin < 60 ? 'py-1.5' : 'py-2'
      }`}
      {...props}
    />
  );
});
