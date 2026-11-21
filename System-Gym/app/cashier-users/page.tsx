'use client';
import React, { useState, useMemo } from 'react';
import api from '../../lib/axios';
import { useFastQuery } from '../../lib/swr';
import ConfirmModal from '../../components/ConfirmModal';
import {
  UserPlusIcon,
  KeyIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const CashierUsersPage = () => {
  const { data: cashiersData, mutate: mutateCashiers } = useFastQuery('/auth/cashiers');
  const cashiers: any[] = Array.isArray(cashiersData) ? cashiersData : [];
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'cashier' | 'trainer'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    name: '', username: '', password: '', role: 'cashier', shiftType: 'GIRLS',
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [actionType, setActionType] = useState<'create' | 'toggleActive' | 'resetPassword'>('create');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const loadCashiers = () => mutateCashiers();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) {
      setErrorMessage('جميع الحقول مطلوبة');
      return;
    }
    setActionType('create');
    setConfirmOpen(true);
  };

  const handleToggleActive = (cashier: any) => {
    setSelectedCashier(cashier);
    setActionType('toggleActive');
    setConfirmOpen(true);
  };

  const handleOpenResetPassword = (cashier: any) => {
    setSelectedCashier(cashier);
    setNewPasswordInput('');
    setActionType('resetPassword');
    setConfirmOpen(true);
  };

  const executeConfirmedAction = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (actionType === 'resetPassword' && !newPasswordInput.trim()) {
      setErrorMessage('يرجى كتابة كلمة المرور الجديدة');
      return;
    }
    setConfirmOpen(false);
    try {
      if (actionType === 'create') {
        await api.post('/auth/register', form);
        setSuccessMessage(`✅ تم إنشاء حساب (${form.name}) بنجاح!`);
        setForm({ name: '', username: '', password: '', role: 'cashier', shiftType: 'GIRLS' });
        setShowAddForm(false);
        loadCashiers();
      } else if (actionType === 'toggleActive' && selectedCashier) {
        const next = !selectedCashier.active;
        await api.put(`/auth/cashiers/${selectedCashier._id}`, { active: next });
        setSuccessMessage(`✅ تم ${next ? 'تفعيل' : 'تعطيل'} حساب (${selectedCashier.name})`);
        loadCashiers();
      } else if (actionType === 'resetPassword' && selectedCashier) {
        await api.put(`/auth/cashiers/${selectedCashier._id}`, { password: newPasswordInput });
        setSuccessMessage(`✅ تم تغيير كلمة المرور للحساب (${selectedCashier.name})`);
        setNewPasswordInput('');
        loadCashiers();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية');
    }
  };

  // ─── Stats ───
  const totalCount = cashiers.length;
  const activeNow = cashiers.filter(c => c.active !== false).length;
  const boysShift = cashiers.filter(c => c.shiftType === 'BOYS' && c.active !== false).length;
  const girlsShift = cashiers.filter(c => c.shiftType === 'GIRLS' && c.active !== false).length;

  // ─── Filtered & Paginated ───
  const filtered = useMemo(() => {
    let list = cashiers;
    if (roleFilter !== 'all') list = list.filter(c => c.role === roleFilter);
    if (search) list = list.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.username?.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [cashiers, roleFilter, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paged = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => {
    const rows = [['الموظف', 'اليوزرنيم', 'الدور', 'الوردية', 'آخر نشاط', 'الحالة']];
    cashiers.forEach(c => {
      rows.push([c.name, c.username, c.role === 'admin' ? 'ادمن' : c.role === 'cashier' ? 'كاشير' : 'مدرب', c.shiftType || 'جميع', 'منذ دقيقة', c.active !== false ? 'نشط' : 'معطل']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cashier-users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      {/* ─── Page Header ─── */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}
        >
          <UserPlusIcon style={{ width: 18, height: 18 }} />
          + إضافة حساب
        </button>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0 }}>حسابات الكاشير</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>فريقك، بصلاحيات واضحة · أدر حسابات الموظفين وورداياتهم وصلاحيات الوصول</div>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderRight: '3px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserGroupIcon style={{ width: 22, height: 22, color: 'var(--primary)' }} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>إجمالي الحسابات</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)' }}>{totalCount}</div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 6 }}>حسابات إدارية وتشغيلية</div>
        </div>

        <div className="stat-card" style={{ borderRight: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheckIcon style={{ width: 22, height: 22, color: '#10b981' }} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>متصلون الآن</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981' }}>{activeNow}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>وردية الأفور: BOYS</div>
        </div>

        <div className="stat-card" style={{ borderRight: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserGroupIcon style={{ width: 22, height: 22, color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>وردات اليوم</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b' }}>{boysShift + girlsShift}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>صباحية ومسائية</div>
        </div>
      </div>

      {/* ─── Messages ─── */}
      {successMessage && (
        <div style={{ padding: '12px 20px', borderRadius: 12, marginBottom: 16, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700, textAlign: 'center' }}>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ padding: '12px 20px', borderRadius: 12, marginBottom: 16, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700, textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}

      {/* ─── Table Card ─── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border-color)', padding: '0 0 20px' }}>

        {/* Table Header Row */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>السجلات الأخيرة</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['all', 'admin', 'cashier', 'trainer'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => { setRoleFilter(r); setCurrentPage(1); }}
                  style={{
                    padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif', fontSize: 12, fontWeight: 700,
                    background: roleFilter === r ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                    color: roleFilter === r ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  {r === 'all' ? `كل الحسابات ${cashiers.length}` : r === 'admin' ? `الأدمن ${cashiers.filter(c => c.role === 'admin').length}` : r === 'cashier' ? `الكاشير ${cashiers.filter(c => c.role === 'cashier').length}` : `المدربون ${cashiers.filter(c => c.role === 'trainer').length}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{ width: 15, height: 15, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                placeholder="بحث بالاسم أو رقم الهاتف ﺏ"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 34px 8px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', fontSize: 13, width: 220, fontFamily: 'Cairo, sans-serif' }}
              />
            </div>
            <button
              onClick={exportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
            >
              <ArrowDownTrayIcon style={{ width: 15, height: 15 }} />
              تصدير Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ padding: '14px 20px' }}>الموظف</th>
                <th>الدور</th>
                <th>الوردية</th>
                <th>آخر نشاط</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c._id}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: c.role === 'admin' ? 'rgba(99,102,241,0.2)' : c.shiftType === 'GIRLS' ? 'rgba(236,72,153,0.2)' : 'rgba(59,130,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800,
                        color: c.role === 'admin' ? 'var(--primary)' : c.shiftType === 'GIRLS' ? '#f472b6' : '#60a5fa',
                        border: `1.5px solid ${c.role === 'admin' ? 'rgba(99,102,241,0.4)' : c.shiftType === 'GIRLS' ? 'rgba(236,72,153,0.4)' : 'rgba(59,130,246,0.4)'}`,
                      }}>
                        {c.name?.charAt(0) || 'م'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{c.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${c.role === 'admin' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: 11 }}>
                      {c.role === 'admin' ? 'ادمن' : c.role === 'cashier' ? 'كاشير' : 'مدرب'}
                    </span>
                  </td>
                  <td>
                    {c.role === 'admin' ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>جميع</span>
                    ) : c.shiftType === 'GIRLS' ? (
                      <span style={{ fontSize: 12, color: '#f472b6', fontWeight: 700 }}>مسائية · GIRLS</span>
                    ) : c.shiftType === 'BOYS' ? (
                      <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>صباحية · BOYS</span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>غير محدد</span>
                    )}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {c.active !== false ? 'منذ دقيقة' : new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span className={`badge ${c.active !== false ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                      {c.active !== false ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={() => handleOpenResetPassword(c)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)',
                          background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer',
                          fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <KeyIcon style={{ width: 13, height: 13 }} />
                        إدارة الصلاحيات
                      </button>
                      <button
                        onClick={() => handleToggleActive(c)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                          fontFamily: 'Cairo, sans-serif', fontWeight: 700,
                          border: c.active !== false ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)',
                          background: c.active !== false ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                          color: c.active !== false ? '#f87171' : '#34d399',
                        }}
                      >
                        {c.active !== false ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
                    لا يوجد حسابات مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              عرض {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} من {filtered.length} سجل
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: currentPage === i + 1 ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                    color: currentPage === i + 1 ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 13,
                  }}
                >{i + 1}</button>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <div style={{ padding: '12px 24px 0', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          صلاحيات أمنة: يمكن للكاشير إدارة المبيعات، ولا يمكنه تعديل التقارير المالية أو حذف الأعضاء.
        </div>
      </div>

      {/* ─── Add Cashier Modal ─── */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlusIcon style={{ width: 20, height: 20 }} />
                إضافة حساب جديد
              </h3>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ padding: '0 20px 24px' }}>
              <div className="form-row">
                <div>
                  <label>اسم الموظف (ثلاثي)</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: أحمد محمد علي" required />
                </div>
                <div>
                  <label>اسم المستخدم</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="مثال: ahmed12" required />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>كلمة المرور</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="كلمة مرور قوية" required />
                </div>
                <div>
                  <label>الصلاحية</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="cashier">كاشير (صلاحيات شفت)</option>
                    <option value="admin">أدمن (صلاحيات كاملة)</option>
                    <option value="trainer">مدرب</option>
                  </select>
                </div>
              </div>
              {form.role === 'cashier' && (
                <div>
                  <label>الشفت المخصص</label>
                  <select value={form.shiftType} onChange={e => setForm({ ...form, shiftType: e.target.value })}>
                    <option value="GIRLS">🌸 شفت البنات (GIRLS)</option>
                    <option value="BOYS">🏋️‍♂️ شفت الشباب (BOYS)</option>
                  </select>
                </div>
              )}
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, marginTop: 10 }}>
                + حفظ وإضافة الحساب
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Confirm Modal ─── */}
      <ConfirmModal
        open={confirmOpen}
        type={actionType === 'toggleActive' && selectedCashier?.active !== false ? 'danger' : 'info'}
        title={
          actionType === 'create' ? 'تأكيد إضافة الحساب'
            : actionType === 'toggleActive' ? `تأكيد ${selectedCashier?.active !== false ? 'تعطيل' : 'تفعيل'} الحساب`
            : 'تغيير كلمة المرور'
        }
        message={
          actionType === 'create' ? (
            <span>هل أنت متأكد من إنشاء حساب لـ <strong className="confirm-highlight">{form.name}</strong>؟</span>
          ) : actionType === 'toggleActive' ? (
            <span>هل تريد تغيير حالة <strong className="confirm-highlight">{selectedCashier?.name}</strong> إلى ({selectedCashier?.active !== false ? 'معطل' : 'نشط'})؟</span>
          ) : (
            <span>أدخل كلمة المرور الجديدة للحساب <strong className="confirm-highlight">({selectedCashier?.name})</strong>:</span>
          )
        }
        confirmText="نعم، تأكيد"
        cancelText="إلغاء"
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmOpen(false)}
      >
        {actionType === 'resetPassword' && (
          <div style={{ marginTop: 12 }}>
            <input
              type="password"
              placeholder="كلمة المرور الجديدة"
              value={newPasswordInput}
              onChange={e => setNewPasswordInput(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff' }}
              autoFocus
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

export default CashierUsersPage;
