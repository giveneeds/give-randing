'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Rocket, Briefcase } from 'lucide-react';
import { clsx } from 'clsx';

export default function ServiceCaseTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/services', label: '서비스/솔루션', icon: Rocket },
    { href: '/admin/cases', label: '고객 사례', icon: Briefcase },
  ];

  return (
    <div className="inline-flex p-1 bg-zinc-100 rounded-xl mb-2">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
              isActive
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                : 'text-zinc-400 hover:text-zinc-600'
            )}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
