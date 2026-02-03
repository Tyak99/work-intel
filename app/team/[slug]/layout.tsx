import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Dashboard | Work Intel',
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
