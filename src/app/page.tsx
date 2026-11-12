import Image from 'next/image';
import { Formulaire } from '@/components/Formulaire';

export default function Page() {
  return (
    <main className="mx-auto max-w-[640px] px-4 pt-4 pb-12">
      <Image
        src="/entete-noel.jpg"
        alt="L'UCAO-UUC et le BEE présentent le Marché de Noël"
        width={853}
        height={440}
        priority
        sizes="(max-width: 672px) 100vw, 640px"
        className="block h-auto w-full rounded-xl border border-trait"
      />
      <Formulaire />
    </main>
  );
}
