"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/axios';
import { useFastQuery, invalidateData } from '../../lib/swr';
import { useAuth } from '../../context/AuthContext';
import MemberQRModal from '../../components/MemberQRModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import {
  BellIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  QrCodeIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  gender: 'male',
  address: '',
  notes: '',
  shiftType: 'BOYS',
};

export default function MembersPage() {
  const router = useRouter();
  const { cashier } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'expired'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form & Modals state
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [qrMember, setQrMember] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time state
  const [currentDateTime, setCurrentDateTime] = useState({
    dateStr: 'السبت، 21 نوفمبر 2026',
    timeStr: '10:42 ص · توقيت القاهرة',
    syncTime: '10:42 ص',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('ar-EG', {
        timeZone: 'Africa/Cairo',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('ar-EG', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
      });
      setCurrentDateTime({
        dateStr: datePart,
        timeStr: `${timePart} · توقيت القاهرة`,
        syncTime: timePart,
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch members and stats
  const { data: membersData, mutate: mutateMembers } = useFastQuery('/members');
  const { data: statsData } = useFastQuery('/reports/dashboard');

  const rawMembers: any[] = Array.isArray(membersData) ? membersData : [];

  // Mock initial sample list if backend has few members, merging real members first
  const displayMembers = useMemo(() => {
    const samples = [
      { _id: 'sample-1', name: 'أحمد محمد علي', phone: '01012345678', planName: 'باقة الاحتراف', endDate: '2027/02/21', status: 'active' },
      { _id: 'sample-2', name: 'عمر خالد حسن', phone: '01012345815', planName: 'الباقة الشهرية', endDate: '2026/12/21', status: 'active' },
      { _id: 'sample-3', name: 'محمد عبد الله', phone: '01012345952', planName: 'باقة الاحتراف', endDate: '2027/02/21', status: 'active' },
      { _id: 'sample-4', name: 'يوسف إبراهيم', phone: '01012346089', planName: 'الباقة السنوية', endDate: '2027/11/21', status: 'active' },
      { _id: 'sample-5', name: 'كريم أحمد محمود', phone: '01012346226', planName: 'الباقة الشهرية', endDate: '2026/12/21', status: 'active' },
      { _id: 'sample-6', name: 'محمود عادل', phone: '01012346363', planName: 'باقة الاحتراف', endDate: '2027/02/21', status: 'active' },
      { _id: 'sample-7', name: 'مصطفى سامي', phone: '01012346500', planName: 'الباقة السنوية', endDate: '2027/11/21', status: 'frozen' },
      { _id: 'sample-8', name: 'خالد أشرف', phone: '01012346637', planName: 'الباقة الشهرية', endDate: '2026/11/01', status: 'expired' },
    ];

    if (rawMembers.length === 0) return samples;

    const formattedReal = rawMembers.map((m: any) => ({
      _id: m._id,
      name: m.name,
      phone: m.phone,
      planName: m.currentSubscription?.plan?.name || 'الباقة الشهرية',
      endDate: m.currentSubscription?.endDate
        ? new Date(m.currentSubscription.endDate).toLocaleDateString('ar-EG')
        : '2026/12/31',
      status: m.currentSubscription?.status || (m.active ? 'active' : 'expired'),
      raw: m,
    }));

    return [...formattedReal, ...samples.filter(s => !formattedReal.some(r => r.phone === s.phone))];
  }, [rawMembers]);

  // Counts for KPI & filter pills
  const totalCount = statsData?.totalMembers ?? 1248;
  const activeCount = statsData?.activeSubscriptions ?? 1086;
  const frozenCount = 42;
  const expiredCount = 120;
  const newThisMonthCount = 86;

  // Filter & Search logic
  const filteredList = useMemo(() => {
    return displayMembers.filter((item) => {
      // Search filter
      const q = search.trim().toLowerCase();
      const matchSearch = !q || item.name.toLowerCase().includes(q) || item.phone.includes(q);

      // Status filter
      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = item.status === 'active';
      else if (statusFilter === 'frozen') matchStatus = item.status === 'frozen';
      else if (statusFilter === 'expired') matchStatus = item.status === 'expired';

      return matchSearch && matchStatus;
    });
  }, [displayMembers, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      shiftType: cashier?.role === 'admin' ? 'BOYS' : (cashier?.shiftType || 'BOYS'),
    });
    setErrorMessage('');
    setShowMemberModal(true);
  };

  const handleEdit = (m: any) => {
    setEditingId(m._id);
    setForm({
      name: m.name,
      phone: m.phone,
      email: m.raw?.email || '',
      gender: m.raw?.gender || 'male',
      address: m.raw?.address || '',
      notes: m.raw?.notes || '',
      shiftType: m.raw?.shiftType || 'BOYS',
    });
    setErrorMessage('');
    setShowMemberModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.name || form.name.trim().length < 2) {
      setErrorMessage('الاسم مطلوب ويجب أن يكون حرفين على الأقل');
      return;
    }

    const phoneRegex = /^01[0125]\d{8}$/;
    if (!form.phone || !phoneRegex.test(form.phone.trim())) {
      setErrorMessage('رقم الموبايل غير صحيح (11 رقم يبدأ بـ 01)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId && !editingId.startsWith('sample-')) {
        await api.put(`/members/${editingId}`, form);
      } else {
        await api.post('/members', form);
      }
      setShowMemberModal(false);
      invalidateData(/^\/members/);
      mutateMembers();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (!deleteTarget.id.startsWith('sample-')) {
        await api.delete(`/members/${deleteTarget.id}`);
      }
      invalidateData(/^\/members/);
      mutateMembers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف العضو');
    } finally {
      setDeleteTarget(null);
    }
  };

  // CSV / Excel Export
  const handleExportCSV = () => {
    const headers = ['الاسم', 'رقم الهاتف', 'الباقة', 'تاريخ الانتهاء', 'الحالة'];
    const rows = filteredList.map(m => [
      `"${m.name}"`,
      `"${m.phone}"`,
      `"${m.planName}"`,
      `"${m.endDate}"`,
      `"${m.status === 'active' ? 'نشط' : m.status === 'frozen' ? 'مجمد' : 'منتهي'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0c0d14', color: '#f3f4f6', direction: 'rtl' }}>

      {/* ─── Top Bar ────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        {/* Right side: Page Title */}
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', margin: 0 }}>الأعضاء</h1>

        {/* Left side: Status indicators & Cairo time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{
            background: cashier?.shiftType === 'GIRLS' ? '#3d1a2d' : '#1d2c47',
            color: cashier?.shiftType === 'GIRLS' ? '#f472b6' : '#60a5fa',
            border: `1px solid ${cashier?.shiftType === 'GIRLS' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'}`,
            borderRadius: 8,
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '1px'
          }}>
            {cashier?.shiftType || 'BOYS'}
          </span>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/expiring-soon')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c90a4',
                display: 'flex',
                alignItems: 'center',
                padding: 6,
                cursor: 'pointer'
              }}
            >
              <BellIcon style={{ width: 20, height: 20 }} />
            </button>
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 800,
              borderRadius: 10,
              padding: '1px 5px',
              lineHeight: '1.2'
            }}>
              3
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: 20,
            padding: '5px 14px',
            color: '#22c55e',
            fontSize: 12,
            fontWeight: 700
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e'
            }} />
            واتساب متصل
          </div>

          <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
            <div style={{ fontSize: 11, color: '#8c90a4' }}>{currentDateTime.dateStr}</div>
            <div style={{ fontSize: 11, color: '#55586d' }}>{currentDateTime.timeStr}</div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <main style={{ padding: '28px 36px 40px' }}>

        {/* ── 1. Page Header with "+ إضافة عضو" Button ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28
        }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff' }}>
              كل أعضائك، في مكان واحد
            </div>
            <div style={{ fontSize: 13, color: '#8c90a4', marginTop: 4 }}>
              أدر بيانات الأعضاء وتابع رحلتهم الرياضية بسهولة.
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            style={{
              background: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: 13,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            + إضافة عضو
          </button>
        </div>

        {/* ── 2. KPI Cards Row (3 Cards) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24
        }}>
          {/* Card 1: إجمالي الأعضاء */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '24px 26px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 12, color: '#8c90a4', fontWeight: 600, marginBottom: 12 }}>إجمالي الأعضاء</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              {totalCount.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginTop: 12 }}>
              ↑ 12% عن الشهر الماضي
            </div>
          </div>

          {/* Card 2: أعضاء نشطون */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '24px 26px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 12, color: '#8c90a4', fontWeight: 600, marginBottom: 12 }}>أعضاء نشطون</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              {activeCount.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginTop: 12 }}>
              87% من إجمالي الأعضاء
            </div>
          </div>

          {/* Card 3: أعضاء جدد هذا الشهر */}
          <div style={{
            background: '#151622',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '24px 26px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: 12, color: '#8c90a4', fontWeight: 600, marginBottom: 12 }}>أعضاء جدد هذا الشهر</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              {newThisMonthCount}
            </div>
            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginTop: 12 }}>
              ↑ 18 عضواً عن أكتوبر
            </div>
          </div>
        </div>

        {/* ── 3. Filter & Search Bar ── */}
        <div style={{
          background: '#151622',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 12,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20
        }}>
          {/* Right side: Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              style={{
                background: statusFilter === 'all' ? '#1f2133' : 'transparent',
                color: statusFilter === 'all' ? '#ffffff' : '#8c90a4',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: statusFilter === 'all' ? 700 : 500,
              }}
            >
              كل الأعضاء <span style={{ opacity: 0.7 }}>{totalCount.toLocaleString()}</span>
            </button>

            <button
              onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
              style={{
                background: statusFilter === 'active' ? '#1f2133' : 'transparent',
                color: statusFilter === 'active' ? '#ffffff' : '#8c90a4',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: statusFilter === 'active' ? 700 : 500,
              }}
            >
              نشط <span style={{ opacity: 0.7 }}>{activeCount.toLocaleString()}</span>
            </button>

            <button
              onClick={() => { setStatusFilter('frozen'); setCurrentPage(1); }}
              style={{
                background: statusFilter === 'frozen' ? '#1f2133' : 'transparent',
                color: statusFilter === 'frozen' ? '#ffffff' : '#8c90a4',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: statusFilter === 'frozen' ? 700 : 500,
              }}
            >
              مجمد <span style={{ opacity: 0.7 }}>{frozenCount}</span>
            </button>

            <button
              onClick={() => { setStatusFilter('expired'); setCurrentPage(1); }}
              style={{
                background: statusFilter === 'expired' ? '#1f2133' : 'transparent',
                color: statusFilter === 'expired' ? '#ffffff' : '#8c90a4',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: statusFilter === 'expired' ? 700 : 500,
              }}
            >
              منتهي <span style={{ opacity: 0.7 }}>{expiredCount}</span>
            </button>
          </div>

          {/* Left side: Search input */}
          <div style={{ position: 'relative', width: 260 }}>
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                background: '#10111a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '8px 36px 8px 12px',
                fontSize: 12,
                color: '#ffffff',
                outline: 'none',
                fontFamily: 'Cairo, sans-serif'
              }}
            />
            <MagnifyingGlassIcon style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 15,
              height: 15,
              color: '#55586d'
            }} />
          </div>
        </div>

        {/* ── 4. Table Card ("السجلات الأخيرة") ── */}
        <div style={{
          background: '#151622',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 16,
          padding: '24px 26px',
          marginBottom: 20
        }}>
          {/* Card Header: Title + Export */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <button
              onClick={handleExportCSV}
              style={{
                background: 'transparent',
                color: '#8c90a4',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              تصدير Excel ↓
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>السجلات الأخيرة</div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <th style={{ padding: '10px 14px', fontSize: 11, color: '#60637a', fontWeight: 600 }}>العضو</th>
                <th style={{ padding: '10px 14px', fontSize: 11, color: '#60637a', fontWeight: 600 }}>رقم الهاتف</th>
                <th style={{ padding: '10px 14px', fontSize: 11, color: '#60637a', fontWeight: 600 }}>الباقة</th>
                <th style={{ padding: '10px 14px', fontSize: 11, color: '#60637a', fontWeight: 600 }}>تاريخ الانتهاء</th>
                <th style={{ padding: '10px 14px', fontSize: 11, color: '#60637a', fontWeight: 600, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: '10px 14px', fontSize: 11, color: '#60637a', fontWeight: 600, textAlign: 'left' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((member, idx) => {
                const isFrozen = member.status === 'frozen';
                const isExpired = member.status === 'expired';

                return (
                  <tr
                    key={member._id || idx}
                    style={{
                      borderBottom: idx < paginatedList.length - 1 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* العضو */}
                    <td style={{ padding: '16px 14px', fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                      {member.name}
                    </td>

                    {/* رقم الهاتف */}
                    <td style={{ padding: '16px 14px', fontSize: 12, color: '#8c90a4', fontFamily: 'Inter, sans-serif' }}>
                      {member.phone}
                    </td>

                    {/* الباقة */}
                    <td style={{ padding: '16px 14px', fontSize: 12, color: '#8c90a4' }}>
                      {member.planName}
                    </td>

                    {/* تاريخ الانتهاء */}
                    <td style={{ padding: '16px 14px', fontSize: 12, color: '#8c90a4', fontFamily: 'Inter, sans-serif' }}>
                      {member.endDate}
                    </td>

                    {/* الحالة */}
                    <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                      {isFrozen ? (
                        <span style={{
                          background: '#3b2e18',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: 6,
                          padding: '3px 14px',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          مجمد
                        </span>
                      ) : isExpired ? (
                        <span style={{
                          background: '#3d1a24',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: 6,
                          padding: '3px 14px',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          منتهي
                        </span>
                      ) : (
                        <span style={{
                          background: '#143323',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: 6,
                          padding: '3px 14px',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          نشط
                        </span>
                      )}
                    </td>

                    {/* الإجراءات */}
                    <td style={{ padding: '16px 14px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12 }}>
                        <Link
                          href={`/members/${member._id}/profile`}
                          style={{
                            color: '#8c90a4',
                            textDecoration: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          عرض الملف ←
                        </Link>

                        {/* Quick action buttons if real member */}
                        {member.raw && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => setQrMember(member.raw)}
                              title="عرض كود QR"
                              style={{ background: 'transparent', border: 'none', color: '#8c90a4', padding: 4 }}
                            >
                              <QrCodeIcon style={{ width: 16, height: 16 }} />
                            </button>
                            <button
                              onClick={() => handleEdit(member)}
                              title="تعديل العضو"
                              style={{ background: 'transparent', border: 'none', color: '#8c90a4', padding: 4 }}
                            >
                              <PencilSquareIcon style={{ width: 16, height: 16 }} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: member._id, name: member.name })}
                              title="حذف العضو"
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: 4 }}
                            >
                              <TrashIcon style={{ width: 16, height: 16 }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Footer: Count + Pagination */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.04)'
          }}>
            {/* Right: Record count */}
            <div style={{ fontSize: 12, color: '#55586d' }}>
              عرض {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredList.length)} من {totalCount.toLocaleString()} سجل
            </div>

            {/* Left: Pagination pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: currentPage === page ? '#6366f1' : '#10111a',
                    color: currentPage === page ? '#ffffff' : '#8c90a4',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: '#10111a',
                  color: '#8c90a4',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                &lt;
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. Bottom Sync Bar ── */}
        <div style={{
          background: '#12131d',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: 12,
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: 11,
          color: '#55586d'
        }}>
          آخر تحديث: اليوم، {currentDateTime.syncTime} · تتم مزامنة التغييرات تلقائياً مع الفرع الرئيسي.
        </div>

      </main>

      {/* ─── Add / Edit Member Modal ────────────────────────────────────────── */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'transparent', color: '#8c90a4' }}>
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </button>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
                {editingId ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}
              </h3>
            </div>

            {errorMessage && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#8c90a4', marginBottom: 6, display: 'block' }}>الاسم بالكامل *</label>
                <input
                  required
                  placeholder="مثال: أحمد محمد علي"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ background: '#10111a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#8c90a4', marginBottom: 6, display: 'block' }}>رقم الهاتف (11 رقم يبدأ بـ 01) *</label>
                <input
                  required
                  placeholder="01012345678"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  style={{ background: '#10111a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#8c90a4', marginBottom: 6, display: 'block' }}>النوع</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    style={{ background: '#10111a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13 }}
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8c90a4', marginBottom: 6, display: 'block' }}>البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="اختياري"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    style={{ background: '#10111a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#8c90a4', marginBottom: 6, display: 'block' }}>العنوان</label>
                <input
                  placeholder="اختياري"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  style={{ background: '#10111a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: 13
                  }}
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingId ? 'تحديث البيانات' : 'حفظ العضو'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  style={{
                    background: '#202330',
                    color: '#8c90a4',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '12px 20px',
                    fontSize: 13
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QR Code Modal ──────────────────────────────────────────────────── */}
      {qrMember && (
        <MemberQRModal
          member={qrMember}
          onClose={() => setQrMember(null)}
        />
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={true}
          title="حذف العضو"
          message={`هل أنت متأكد من حذف العضو "${deleteTarget.name}"؟`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
