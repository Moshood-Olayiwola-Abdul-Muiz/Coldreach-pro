
import React from 'react';

interface LegalPageProps {
  onBack: () => void;
}

const SecurityPolicy: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white text-slate-800 selection:bg-emerald-100">
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
        <header className="mb-12 text-center lg:text-left">
          <div className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest mb-4">Security First</div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Security & Privacy Policy</h1>
          <p className="text-slate-500 font-medium italic">How we protect your data and identity.</p>
        </header>

        <div className="space-y-10 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Data Collected</h2>
            <p>
              To provide a secure service, we collect: 
              Full Name, Business Email, Sender Gmail, Phone Number, Country, and technical metadata (Browser type, Screen resolution, Timezone).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. How Data Is Used</h2>
            <p>
              Your data is strictly used for account verification, providing personalized outreach services, and platform security. We never sell your personal contact information to third-party data brokers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Device & IP Monitoring</h2>
            <p>
              To prevent industrial-scale spam abuse, we log persistent Device IDs and IP addresses. This information is used to enforce our "One Account Per Device" policy and block suspicious login attempts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Gmail Usage Limitations</h2>
            <p>
              ColdReach Pro uses a web-based integration. <strong>We do not read your private emails,</strong> access your inbox content, or store your Gmail password. We only use your Gmail address to pre-fill the compose window for your manual outreach.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Data Storage & Protection</h2>
            <p>
              Your campaign data and leads are stored in your browser's Local Storage for immediate access. Account data is hashed using industry-standard SHA-256 protocols.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">6. User Rights</h2>
            <p>
              You have the right to request the deletion of your account and all associated security logs at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">7. Security Practices</h2>
            <p>
              We implement HTTPS for all data in transit, session-based isolation for user data, and robust input validation to prevent cross-site scripting (XSS) and injection attacks.
            </p>
          </section>
        </div>

        <footer className="mt-20 pt-10 border-t border-slate-100 text-center">
          <button 
            onClick={onBack}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-xl shadow-slate-200"
          >
            I Understand
          </button>
        </footer>
      </article>
    </div>
  );
};

export default SecurityPolicy;
