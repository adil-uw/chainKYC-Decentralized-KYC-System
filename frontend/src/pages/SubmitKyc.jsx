import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitKycRequest } from '../api/kyc';
import { useAppStore } from '../store/appStore';
import FormField from '../components/FormField';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const initial = {
  fullName: '',
  dateOfBirth: '',
  address: '',
  ssn: '',
  driverLicenseNumber: '',
  email: '',
  phoneNumber: '',
};

export default function SubmitKyc() {
  const navigate = useNavigate();
  const setKycRequestId = useAppStore((s) => s.setKycRequestId);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    if (!form.fullName?.trim()) e.fullName = 'Full name is required';
    if (!form.dateOfBirth?.trim()) e.dateOfBirth = 'Date of birth is required';
    if (!form.address?.trim()) e.address = 'Address is required';
    if (!form.email?.trim()) e.email = 'Email is required';
    const hasId = !!(form.ssn?.trim() || form.driverLicenseNumber?.trim());
    if (!hasId) {
      e.ssn = 'Provide at least one: SSN or Driver license number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const payload = {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
      };
      if (form.phoneNumber?.trim()) payload.phoneNumber = form.phoneNumber.trim();
      if (form.ssn?.trim()) payload.ssn = form.ssn.trim();
      if (form.driverLicenseNumber?.trim()) payload.driverLicenseNumber = form.driverLicenseNumber.trim();

      const data = await submitKycRequest(payload);
      const id = data.kycRequestId ?? data.id ?? data.requestId;
      if (id) {
        setKycRequestId(id);
        setToast({ message: 'KYC request submitted. Redirecting to status.', variant: 'success' });
        setTimeout(() => navigate('/kyc-status'), 1500);
      } else {
        setToast({ message: data.message || 'Submitted successfully.', variant: 'success' });
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.detail || 'Submission failed';
      setToast({ message: msg, variant: 'error' });
      if (err.response?.status === 409) {
        setErrors({ form: 'Duplicate active request. Complete or wait for existing request.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Submit KYC</h1>
      <p className="text-gray-400 mb-6">Submit your identity information. At least one of SSN or Driver License is required.</p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {errors.form && (
          <p className="text-sm text-status-error bg-status-error/10 border border-status-error/30 rounded-lg px-3 py-2">
            {errors.form}
          </p>
        )}
        <FormField label="Full name" name="fullName" value={form.fullName} onChange={(v) => update('fullName', v)} error={errors.fullName} required />
        <FormField label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(v) => update('dateOfBirth', v)} error={errors.dateOfBirth} required />
        <FormField label="Address" name="address" value={form.address} onChange={(v) => update('address', v)} error={errors.address} required />
        <FormField label="Email" name="email" type="email" value={form.email} onChange={(v) => update('email', v)} error={errors.email} required />
        <FormField label="Phone (optional)" name="phoneNumber" value={form.phoneNumber} onChange={(v) => update('phoneNumber', v)} />
        <FormField label="SSN" name="ssn" value={form.ssn} onChange={(v) => update('ssn', v)} error={errors.ssn} placeholder="At least one of SSN or Driver license" />
        <FormField label="Driver license number" name="driverLicenseNumber" value={form.driverLicenseNumber} onChange={(v) => update('driverLicenseNumber', v)} />

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading && <LoadingSpinner className="w-4 h-4 border-2" />}
            Submit KYC
          </button>
          <button type="button" className="btn-secondary" onClick={() => setForm(initial)}>
            Reset
          </button>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
