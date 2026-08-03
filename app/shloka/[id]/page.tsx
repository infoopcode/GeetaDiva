import { getShloka, shlokas } from '@/lib/shlokas';
import Player from '@/components/Player';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return shlokas.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const shloka = getShloka(id);
  return {
    title: shloka ? `${shloka.source} · GeetaDiwa` : 'Shloka · GeetaDiwa',
    description: shloka?.text.en?.slice(0, 160) ?? 'Sanskrit shloka with synchronized speech.',
  };
}

export default async function ShlokaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Player id={id} />;
}
