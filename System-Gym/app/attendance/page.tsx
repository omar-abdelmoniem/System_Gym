'use client';

import React, { useEffect, useRef, useState } from 'react';
import api from '../../lib/axios';
import { useFastQuery } from '../../lib/swr';
import { cleanScanCode, getLocalDateString } from '../../lib/qrUtils';
import CameraQRScanner from '../../components/CameraQRScanner';
import ConfirmModal from '../../components/ConfirmModal';
import SingleVisitModal from '../../components/SingleVisitModal';
import { 
  SparklesIcon, 
  TrashIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CameraIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';

const Attendance = () => {
  const today = getLocalDateString();
  const { data: recData, mutate: mutateRec } = useFastQuery(`/attendance?date=${today}`);
  const { data: memData, mutate: mutateMem } = useFastQuery('/members');
  const { data: visitData, mutate: mutateVisit } = useFastQuery('/single-visits?date=today');

  const rawRecords: any[] = Array.isArray(recData) ? recData : [];
  const records: any[] = [...rawRecords].sort((a, b) => {
    const tA = new Date(a.checkInTime || a.checkIn || a.createdAt || 0).getTime();
    const tB = new Date(b.checkInTime || b.checkIn || b.createdAt || 0).getTime();
    return tB - tA;
  });

  const members: any[] = Array.isArray(memData) ? memData.filter((m: any) => m.active) : [];

  const rawVisits: any[] = Array.isArray(visitData?.data) ? visitData.data : [];
  const singleVisits: any[] = [...rawVisits].sort((a, b) => {
    const tA = new Date(a.visitedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.visitedAt || b.createdAt || 0).getTime();
    return tB - tA;
  });

  const [showSingleVisitModal, setShowSingleVisitModal] = useState(false);
  const [deleteVisitTarget, setDeleteVisitTarget] = useState<{ id: string; name: string } | null>(null);

  const [selectedMember, setSelectedMember] = useState('');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visitSearchQuery, setVisitSearchQuery] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [scanValue, setScanValue] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanFocused, setIsScanFocused] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const focusScanInput = () => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  };

  const loadData = async () => {
    mutateRec(undefined, { revalidate: true });
    mutateMem(undefined, { revalidate: true });
    mutateVisit(undefined, { revalidate: true });
  };

  // Keep scan input always focused — scanner acts as keyboard
  useEffect(() => {
    focusScanInput();
    const handleWindowClick = (e: any) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' && e.target !== scanInputRef.current) return;
      if (tag === 'SELECT' || tag === 'BUTTON') return;
      if (e.target.closest && e.target.closest('.manual-checkin-area')) return;
      focusScanInput();
    };
    const handleOutsideClick = (e: any) => {
      if (e.target.closest && !e.target.closest('.manual-checkin-area')) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('click', handleWindowClick);
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleManualCheckin = async () => {
    let memberIdToSubmit = selectedMember;
    if (!memberIdToSubmit && manualSearchQuery.trim()) {
      const q = manualSearchQuery.trim().toLowerCase();
      const matches = members.filter(m => (m.name?.toLowerCase() || '').includes(q) || (m.phone || '').includes(q));
      if (matches.length === 1) {
        memberIdToSubmit = matches[0]._id;
      }
    }

    if (!memberIdToSubmit) {
      setMessage('⚠️ يرجى اختيار أو كتابة اسم العضو أولاً');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const { data } = await api.post('/attendance/checkin', { memberId: memberIdToSubmit });
      setMessage('✅ تم تسجيل الحضور بنجاح');
      setSelectedMember('');
      setManualSearchQuery('');
      setIsSearchOpen(false);
      loadData();
      // إرسال إشعار واتساب بعد تسجيل الحضور اليدوي
      try {
        await api.post('/members/' + memberIdToSubmit + '/send-checkin-whatsapp', {
          attendanceId: data?.attendance?._id || data?._id,
        });
      } catch {
        // الواتساب اختياري — لو السيرفر مش عنده الـ endpoint مش هيأثر على الحضور
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || '❌ فشل تسجيل الحضور');
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const confirmDeleteAttendance = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/attendance/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف سجل الحضور');
    }
  };

  const confirmDeleteSingleVisit = async () => {
    if (!deleteVisitTarget) return;
    try {
      await api.delete(`/single-visits/${deleteVisitTarget.id}`);
      setDeleteVisitTarget(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف سجل الحصة الفردية');
    }
  };

  const handleCheckout = async (memberId: string) => {
    await api.put(`/attendance/checkout/${memberId}`);
    loadData();
  };

  const handleScanSubmit = async (e: any) => {
    e.preventDefault();
    // تنظيف الكود — يحذف URL ويحوّل الحروف العربية لو الكيبورد عربي
    const code = cleanScanCode(scanValue.trim());
    setScanValue('');
    if (!code) return;

    try {
      const { data } = await api.post('/attendance/scan', { qrToken: code });
      setScanResult({
        type: 'checkin',
        text: `✅ ${data.member?.name || data.member}\nChecked In Successfully\n${new Date(data.attendance?.checkIn || new Date()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || '❌ Invalid QR Code';
      if (msg.includes('Already Checked In') || msg.includes('مسجل حضور بالفعل') || msg.includes('مسجل اليوم')) {
        setScanResult({ type: 'checkout', text: msg });
      } else {
        setScanResult({ type: 'error', text: msg });
      }
    }
    setTimeout(() => setScanResult(null), 5000);
  };

  const handleCameraScan = async (decodedText: string) => {
    setShowCamera(false);
    // تنظيف الكود من URL أو حروف عربية
    const code = cleanScanCode(decodedText.trim());
    if (!code) return;
    try {
      const { data } = await api.post('/attendance/scan', { qrToken: code });
      setScanResult({
        type: 'checkin',
        text: `✅ ${data.member.name}\nChecked In Successfully\n${new Date(data.member.checkInTime || new Date()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || '❌ Invalid QR Code';
      const isDup = msg.includes('Already Checked In') || msg.includes('مسجل حضور بالفعل') || msg.includes('مسجل اليوم');
      setScanResult({ type: isDup ? 'checkout' : 'error', text: msg });
    }
    setTimeout(() => setScanResult(null), 5000);
  };

  const filteredManualMembers = members.filter((m) => {
    if (!manualSearchQuery.trim()) return true;
    const q = manualSearchQuery.trim().toLowerCase();
    return (m.name?.toLowerCase() || '').includes(q) || (m.phone || '').includes(q);
  });

  const filteredRecords = records.filter(r =>
    r.member?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVisits = singleVisits.filter(v =>
    v.name?.toLowerCase().includes(visitSearchQuery.toLowerCase()) ||
    (v.phone && v.phone.includes(visitSearchQuery))
  );

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const totalVisitRevenue = singleVisits.reduce((acc, v) => acc + (v.amount || 0), 0);

  return (
    <div className="page">
      {showCamera && (
        <CameraQRScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Header with Quick Single Visit Action */}
      <div className="page-header">
        <div>
          <button
            onClick={() => setShowSingleVisitModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))',
              color: '#fbbf24',
              border: '1px solid rgba(245,158,11,0.35)',
              fontWeight: 600,
              padding: '9px 18px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              fontSize: '13px',
              transition: 'all 0.2s ease',
            }}
          >
            <SparklesIcon style={{ width: '18px', height: '18px' }} />
            حصة فردية (Single Visit)
          </button>
        </div>
        <div>
          <h1>الحضور والانصراف (Attendance)</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>
            مسح QR للأعضاء المشتركين وتسجيل الحصص الفردية للزوار.
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="cards-grid" style={{ marginBottom: '24px' }}>
        <div 
          className="stat-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="stat-label" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              حضور الأعضاء اليوم
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              boxShadow: '0 4px 14px rgba(59,130,246,0.2)'
            }}>
              <UserGroupIcon style={{ width: '22px', height: '22px' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#3b82f6', fontSize: '26px', fontWeight: 'bold' }}>
            {records.length}
          </div>
        </div>

        <div 
          className="stat-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="stat-label" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              أعضاء نشطين حاضرين
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
              boxShadow: '0 4px 14px rgba(34,197,94,0.2)'
            }}>
              <CheckCircleIcon style={{ width: '22px', height: '22px' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#22c55e', fontSize: '26px', fontWeight: 'bold' }}>
            {records.filter(r => r.member?.membershipStatus === 'Active').length}
          </div>
        </div>

        <div 
          className="stat-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="stat-label" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              حصص فردية اليوم
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              boxShadow: '0 4px 14px rgba(245,158,11,0.2)'
            }}>
              <SparklesIcon style={{ width: '22px', height: '22px' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#f59e0b', fontSize: '26px', fontWeight: 'bold' }}>
            {singleVisits.length} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({totalVisitRevenue} ج.م)</span>
          </div>
        </div>

        <div 
          className="stat-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="stat-label" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              عضويات منتهية / مجمدة
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              boxShadow: '0 4px 14px rgba(239,68,68,0.2)'
            }}>
              <ExclamationCircleIcon style={{ width: '22px', height: '22px' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ef4444', fontSize: '26px', fontWeight: 'bold' }}>
            {records.filter(r => r.member && r.member.membershipStatus !== 'Active').length}
          </div>
        </div>
      </div>

      {/* Grid: QR Scanner + Attendance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'start', marginBottom: '32px' }}>
        {/* Attendance Table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>سجل حضور الأعضاء المشتركين اليوم ({filteredRecords.length})</span>
            <input 
              type="text" 
              placeholder="ابحث في حضور الأعضاء..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '220px', marginBottom: 0, padding: '8px 12px' }}
            />
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>العضو</th>
                  <th>حالة العضوية</th>
                  <th>وقت الدخول</th>
                  <th>وقت الخروج</th>
                  <th style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 'bold' }}>{r.member?.name || 'عضو محذوف'}</td>
                    <td>
                      <span className={'badge ' + (
                        r.member?.membershipStatus === 'Active' ? 'badge-success' :
                        r.member?.membershipStatus === 'Frozen' ? 'badge-warning' : 'badge-danger'
                      )}>
                        {r.member?.membershipStatus === 'Active' ? 'نشط / Active' :
                         r.member?.membershipStatus === 'Frozen' ? 'مجمد / Frozen' : 'منتهي / Expired'}
                      </span>
                    </td>
                    <td>{formatTime(r.checkInTime || r.checkIn)}</td>
                    <td>{formatTime(r.checkOutTime || r.checkOut)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        {!(r.checkOutTime || r.checkOut) && r.member && (
                          <button className="btn-small" onClick={() => handleCheckout(r.member._id)}>تسجيل انصراف</button>
                        )}
                        <button
                          className="btn-small btn-danger"
                          onClick={() => setDeleteTarget({ id: r._id, name: r.member?.name || 'العضو' })}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      {searchQuery ? 'لا توجد نتائج بحث مطابقة' : 'لا يوجد حضور للأعضاء المشتركين مسجل اليوم بعد'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* QR Scanner & Manual checkin */}
        <div>
          <div className="scan-box" style={{ marginBottom: '20px' }}>
            {/* Camera button */}
            <button
              onClick={() => setShowCamera(true)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                color: '#fff',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              📷 مسح بكاميرا الموبايل / اللابتوب
            </button>

            <div
              className={`scan-area ${isScanFocused ? 'active' : ''}`}
              onClick={focusScanInput}
              style={{ cursor: 'pointer' }}
            >
              <div className="scan-icon">⚡</div>
              <div className="scan-label" style={{ fontWeight: 'bold' }}>
                {isScanFocused ? 'جاهز للمسح من القارئ...' : 'اضغط لتفعيل القارئ السلكي'}
              </div>
              <form onSubmit={handleScanSubmit} style={{ margin: 0 }}>
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onFocus={() => setIsScanFocused(true)}
                  onBlur={() => setIsScanFocused(false)}
                  placeholder={isScanFocused ? '⚡ جاهز... سكن الـ QR' : 'اضغط هنا أولاً'}
                  autoFocus
                  style={{
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'center',
                    width: '220px',
                    fontSize: '14px',
                    color: 'var(--primary)',
                    marginBottom: 0,
                    outline: 'none',
                  }}
                />
              </form>
              {!isScanFocused && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  👆 اضغط على هذه المنطقة لتفعيل السكان
                </div>
              )}
            </div>
            {scanResult && <div className={`scan-result ${scanResult.type}`}>{scanResult.text}</div>}
          </div>

          {/* Manual check-in */}
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>أو تسجيل الحضور بالاسم يدوياً</span>
              {selectedMember && (
                <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  ✓ تم اختيار عضو
                </span>
              )}
            </div>

            <div className="manual-checkin-area" style={{ position: 'relative', marginBottom: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="اكتب اسم العضو أو رقم التليفون..."
                  value={manualSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualSearchQuery(val);
                    setIsSearchOpen(true);
                    if (!val.trim()) {
                      setSelectedMember('');
                    } else {
                      const q = val.trim().toLowerCase();
                      const matches = members.filter(m => 
                        (m.name?.toLowerCase() || '').includes(q) || (m.phone || '').includes(q)
                      );
                      if (matches.length === 1) {
                        setSelectedMember(matches[0]._id);
                      } else if (!matches.some(m => m._id === selectedMember)) {
                        setSelectedMember('');
                      }
                    }
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualCheckin();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 14px',
                    borderRadius: '10px',
                    border: selectedMember ? '1.5px solid #22c55e' : '1px solid var(--border-color)',
                    background: 'var(--bg-input, rgba(255,255,255,0.05))',
                    color: '#fff',
                    fontSize: '14px',
                    marginBottom: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
                {manualSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualSearchQuery('');
                      setSelectedMember('');
                      setIsSearchOpen(false);
                    }}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px',
                      lineHeight: 1,
                    }}
                    title="مسح البحث"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isSearchOpen && manualSearchQuery.trim().length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '48px',
                    left: 0,
                    right: 0,
                    background: '#16161f',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 60,
                    boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
                  }}
                >
                  {filteredManualMembers.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      لا يوجد عضو بهذا الاسم أو الرقم
                    </div>
                  ) : (
                    filteredManualMembers.slice(0, 15).map((m) => {
                      const isSel = m._id === selectedMember;
                      return (
                        <div
                          key={m._id}
                          onClick={() => {
                            setSelectedMember(m._id);
                            setManualSearchQuery(m.name);
                            setIsSearchOpen(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: isSel ? 'rgba(34, 197, 94, 0.18)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSel) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: isSel ? '#4ade80' : '#fff' }}>
                              {m.name}
                            </div>
                            {m.phone && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {m.phone}
                              </div>
                            )}
                          </div>
                          {isSel && (
                            <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 'bold' }}>✓ تم الاختيار</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Filtered Dropdown Select */}
              <select
                value={selectedMember}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedMember(id);
                  const found = members.find(m => m._id === id);
                  if (found) {
                    setManualSearchQuery(found.name);
                  } else {
                    setManualSearchQuery('');
                  }
                  setIsSearchOpen(false);
                }}
                style={{ marginBottom: '12px' }}
              >
                <option value="">
                  {filteredManualMembers.length === 0
                    ? 'لا توجد نتائج'
                    : `اختر من القائمة (${filteredManualMembers.length} عضو)`}
                </option>
                {filteredManualMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m.phone ? `(${m.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={handleManualCheckin} style={{ width: '100%' }}>تسجيل حضور</button>
            {message && <div className="message" style={{ marginTop: '12px' }}>{message}</div>}
          </div>
        </div>
      </div>

      {/* ─── Today's Single Visits Section ─── */}
      <div style={{ marginTop: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
              <SparklesIcon style={{ width: '22px', height: '22px' }} />
              زيارات الحصة الواحدة اليوم — Day Passes ({singleVisits.length})
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              إجمالي إيراد الحصص الفردية اليوم: <strong style={{ color: '#22c55e' }}>{totalVisitRevenue} ج.م</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو التليفون..." 
              value={visitSearchQuery}
              onChange={(e) => setVisitSearchQuery(e.target.value)}
              style={{ width: '220px', marginBottom: 0, padding: '8px 12px' }}
            />
            <button
              onClick={() => setShowSingleVisitModal(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))',
                color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.35)',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              <SparklesIcon style={{ width: '15px', height: '15px' }} />
              حصة فردية جديدة
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم الزائر / اللاعب</th>
                <th>نوع / اسم الحصة</th>
                <th>الموبايل</th>
                <th>المبلغ المدفوع</th>
                <th>طريقة الدفع</th>
                <th>الشفت</th>
                <th>وقت الزيارة</th>
                <th>الكاشير</th>
                <th style={{ textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.map((v) => (
                <tr key={v._id}>
                  <td style={{ fontWeight: 'bold', color: '#fff' }}>{v.name}</td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 'bold' }}>
                      {v.sessionName || 'حصة عامة'}
                    </span>
                  </td>
                  <td>{v.phone || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>بدون رقم</span>}</td>
                  <td><strong style={{ color: '#22c55e' }}>{v.amount} ج.م</strong></td>
                  <td>
                    <span className="badge badge-secondary">
                      {v.paymentMethod === 'CASH' ? '💵 كاش' : v.paymentMethod === 'CARD' ? '💳 بطاقة' : v.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-secondary" style={{
                      color: v.shiftType === 'GIRLS' ? '#ec4899' : '#3b82f6',
                      background: v.shiftType === 'GIRLS' ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)',
                      borderColor: v.shiftType === 'GIRLS' ? '#fbcfe8' : '#bfdbfe'
                    }}>
                      {v.shiftType === 'GIRLS' ? '🌸 بنات' : '🏋️‍♂️ شباب'}
                    </span>
                  </td>
                  <td>{formatTime(v.visitedAt || v.createdAt)}</td>
                  <td>{v.createdBy?.name || 'الكاشير'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => setDeleteVisitTarget({ id: v._id, name: `${v.name} (${v.sessionName || 'حصة'})` })}
                    >
                      <TrashIcon style={{ width: '14px', height: '14px', display: 'inline', marginLeft: '4px' }} />
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVisits.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                    {visitSearchQuery ? 'لا توجد نتائج بحث مطابقة' : 'لا توجد حصص فردية مسجلة اليوم'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Member Attendance Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        type="danger"
        title="تأكيد حذف الحضور"
        message={`هل أنت متأكد من حذف سجل حضور العضو "${deleteTarget?.name || ''}" اليوم؟`}
        confirmText="نعم، احذف الحضور"
        cancelText="إلغاء"
        onConfirm={confirmDeleteAttendance}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Delete Single Visit Modal */}
      <ConfirmModal
        open={!!deleteVisitTarget}
        type="danger"
        title="تأكيد حذف الحصة الفردية"
        message={`هل أنت متأكد من حذف سجل الحصة الفردية لـ "${deleteVisitTarget?.name || ''}" وحذف المعاملة المالية المرتبطة بها؟`}
        confirmText="نعم، حذف الحصة والمعاملة"
        cancelText="إلغاء"
        onConfirm={confirmDeleteSingleVisit}
        onCancel={() => setDeleteVisitTarget(null)}
      />

      {/* Single Visit Modal */}
      <SingleVisitModal
        open={showSingleVisitModal}
        onClose={() => setShowSingleVisitModal(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};

export default Attendance;
