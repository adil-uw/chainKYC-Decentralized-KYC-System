import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import IntroLayer from './components/IntroLayer';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import SubmitKyc from './pages/SubmitKyc';
import KycStatus from './pages/KycStatus';
import ConnectWallet from './pages/ConnectWallet';
import MyCredentials from './pages/MyCredentials';
import CredentialDetails from './pages/CredentialDetails';
import VerifyCredential from './pages/VerifyCredential';
import ProviderDashboard from './pages/ProviderDashboard';
import KycScreening from './pages/KycScreening';
import IssueCredential from './pages/IssueCredential';
import SignCredential from './pages/SignCredential';
import RegisterOnChain from './pages/RegisterOnChain';
import RevokeCredential from './pages/RevokeCredential';
import TestCases from './pages/TestCases';

export default function App() {
  const { introDismissed, dismissIntro, hydrateFromStorage } = useAppStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <>
      {!introDismissed && (
        <IntroLayer onEnter={dismissIntro} />
      )}
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/submit-kyc" element={<SubmitKyc />} />
          <Route path="/kyc-status" element={<KycStatus />} />
          <Route path="/connect-wallet" element={<ConnectWallet />} />
          <Route path="/my-credentials" element={<MyCredentials />} />
          <Route path="/credentials/:credentialId" element={<CredentialDetails />} />
          <Route path="/verify" element={<VerifyCredential />} />
          <Route path="/provider" element={<ProviderDashboard />} />
          <Route path="/provider/screen/:kycRequestId" element={<KycScreening />} />
          <Route path="/provider/issue" element={<IssueCredential />} />
          <Route path="/provider/sign/:credentialId" element={<SignCredential />} />
          <Route path="/provider/register/:credentialId" element={<RegisterOnChain />} />
          <Route path="/provider/revoke/:credentialId" element={<RevokeCredential />} />
          <Route path="/test-cases" element={<TestCases />} />
        </Routes>
      </Layout>
    </>
  );
}
