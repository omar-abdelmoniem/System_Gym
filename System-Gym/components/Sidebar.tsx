'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useFastQuery, prefetchData } from '../lib/swr';
import {
  Squares2X2Icon,
  UsersIcon,
  TicketIcon,
  QrCodeIcon,
  ShoppingCartIcon,
  ChartBarSquareIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const { cashier, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Query expiring subscriptions count for the badge
  const { data: statsData } = useFastQuery('/reports/dashboard');
  const expiringCount = statsData?.expiringSoon ?? 24;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/',              icon: <Squares2X2Icon />,          label: 'الرئيسية',      prefetchUrls: ['/reports/dashboard', '/attendance/stats', '/payments/dashboard'] },
    { href: '/members',       icon: <UsersIcon />,               label: 'الأعضاء',       prefetchUrls: ['/members'] },
    { href: '/subscriptions', icon: <TicketIcon />,              label: 'الاشتراكات',    prefetchUrls: ['/subscriptions', '/subscriptions/plans', '/members'] },
    { href: '/expiring-soon', icon: <ClockIcon />,               label: 'تنتهي قريباً',  badge: expiringCount, prefetchUrls: ['/subscriptions/expiring-soon?days=7'] },
    { href: '/attendance',    icon: <QrCodeIcon />,              label: 'الحضور / QR',   prefetchUrls: ['/attendance', '/members', '/single-visits?date=today'] },
    { href: '/payments',      icon: <BanknotesIcon />,           label: 'المالية',       prefetchUrls: ['/payments', '/payments/stats'] },
    { href: '/expenses',      icon: <ReceiptRefundIcon />,       label: 'المصروفات',     prefetchUrls: ['/expenses'] },
    { href: '/coaches',       icon: <AcademicCapIcon />,         label: 'الكباتن',       prefetchUrls: ['/coaches', '/coaches/salaries'] },
    { href: '/plans',         icon: <ClipboardDocumentListIcon />, label: 'الخطط',       prefetchUrls: ['/subscriptions/plans'] },
    { href: '/cashier',       icon: <ShoppingCartIcon />,        label: 'المتجر والكاشير', prefetchUrls: ['/products'] },
    { href: '/cashier-users', icon: <UserGroupIcon />,           label: 'حسابات الكاشير', prefetchUrls: ['/auth/cashiers'] },
    { href: '/reports',       icon: <ChartBarSquareIcon />,      label: 'التقارير',     prefetchUrls: ['/reports/daily'] },
  ];

  const handleLinkHover = (urls?: string[]) => {
    if (urls && Array.isArray(urls)) {
      urls.forEach(url => prefetchData(url));
    }
  };

  return (
    <aside className="gympro-sidebar">
      {/* ── Brand Header ── */}
      <div className="gympro-brand">
        <div className="gympro-logo-box">
          {/* Dumbbell Icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: '#fff' }}>
            <path d="M6 5v14M18 5v14M6 12h12M3 8v8M21 8v8" />
          </svg>
        </div>
        <div className="gympro-brand-info">
          <div className="gympro-brand-title">GymPro</div>
          <div className="gympro-brand-sub">نظام الجيم</div>
        </div>
      </div>

      {/* ── Section Label ── */}
      <div className="gympro-section-label">مساحة الإدارة</div>

      {/* ── Nav Links ── */}
      <nav className="gympro-nav">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onMouseEnter={() => handleLinkHover(link.prefetchUrls)}
              onTouchStart={() => handleLinkHover(link.prefetchUrls)}
              className={`gympro-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="gympro-nav-icon">
                {React.cloneElement(link.icon as React.ReactElement, { style: { width: 19, height: 19 } })}
              </span>
              <span className="gympro-nav-label">{link.label}</span>
              {link.badge !== undefined && (
                <span className="gympro-nav-badge">{link.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div className="gympro-sidebar-bottom">
        {/* Branch Card */}
        <div className="gympro-branch-card">
          <div className="gympro-branch-name">فرع مدينة نصر</div>
          <div className="gympro-branch-desc">القاهرة · الفرع الرئيسي</div>
        </div>

        {/* User Profile Bar */}
        <div className="gympro-user-row">
          <button
            onClick={handleLogout}
            title="تسجيل خروج"
            className="gympro-logout-btn"
          >
            <ArrowRightOnRectangleIcon style={{ width: 18, height: 18 }} />
          </button>

          <div className="gympro-user-info">
            <div className="gympro-user-name">{cashier?.name || 'أحمد محمود'}</div>
            <div className="gympro-user-role">
              {cashier?.role === 'admin' ? 'أدمن' : cashier?.role === 'cashier' ? 'كاشير' : 'مدرب'}
            </div>
          </div>

          <div className="gympro-user-avatar">
            <span>{cashier?.name?.charAt(0) || 'أ'}</span>
            <span className="gympro-avatar-status" />
          </div>
        </div>

        {/* Version Footer */}
        <div className="gympro-version">GymPro v2.4</div>
      </div>
    </aside>
  );
};

export default Sidebar;
