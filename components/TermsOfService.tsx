import React from 'react';

interface LegalPageProps {
  onBack: () => void;
}

const TermsOfService: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-800 selection:bg-blue-100">
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs">C</div>
          <span className="font-bold text-slate-900 tracking-tight">ColdReach Pro</span>
        </div>
        <button 
          onClick={onBack}
          className="text-sm font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
        >
          ← Back to App
        </button>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12 lg:py-20">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Terms of Service</h1>
          <p className="text-slate-500 font-medium italic">Last Updated: May 24, 2024</p>
        </header>

        <div className="space-y-10 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Introduction</h2>
            <p>
              Welcome to ColdReach Pro. These Terms of Service govern your access to and use of our platform. By using the platform, you agree to be bound by these terms. If you do not agree, you must cease use immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. User Responsibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You represent that the information you provide (Email, Phone, Country) is accurate and belongs to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Acceptable Use</h2>
            <p>
              The platform is intended for professional outreach. You may not use ColdReach Pro for illegal purposes, harassment, or to impersonate others. High-volume spamming that triggers Gmail safety filters is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Email Compliance Responsibility</h2>
            <p>
              ColdReach Pro is a tool for facilitating outreach. <strong>You are the sole sender of all emails.</strong> You are responsible for ensuring compliance with international anti-spam laws, including CAN-SPAM and GDPR. You must provide clear opt-out mechanisms for your recipients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Abuse & Account Suspension</h2>
            <p>
              We monitor for patterns of abuse. We reserve the right to suspend or terminate accounts that exhibit high bounce rates, numerous spam complaints, or violate our single-device-per-account security policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">6. Limitation of Liability</h2>
            <p>
              ColdReach Pro is provided "as is." We are not liable for any account suspensions by third-party providers (like Google) or for any loss of business resulting from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">7. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the service after such changes constitutes your consent to the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">8. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at contact.officialolastech@gmail.com.
            </p>
          </section>
        </div>

        <footer className="mt-20 pt-10 border-t border-slate-100 text-center">
          <button 
            onClick={onBack}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-95"
          >
            I Understand, Return
          </button>
        </footer>
      </article>
    </div>
  );
};

export default TermsOfService;
