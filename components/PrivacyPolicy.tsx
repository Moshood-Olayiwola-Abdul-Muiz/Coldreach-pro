import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8">
          <a href="/" className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2">
            &larr; Back to Home
          </a>
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-500 mb-8">Last updated: March 29, 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              Welcome to ColdReach Pro. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you as to how we look after your personal data when you visit our website 
              and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. The Data We Collect About You</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
              <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
              <li><strong>Profile Data</strong> includes your username and password, purchases or orders made by you, your interests, preferences, feedback and survey responses.</li>
              <li><strong>Usage Data</strong> includes information about how you use our website, products and services.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. How We Use Your Personal Data</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
              <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Google Workspace APIs</h2>
            <p className="text-slate-600 leading-relaxed">
              ColdReach Pro's use and transfer to any other app of information received from Google APIs will adhere to 
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mx-1">
                Google API Services User Data Policy
              </a>, 
              including the Limited Use requirements. We only request the minimum permissions necessary to send emails on your behalf and read replies for campaign tracking. We do not use your Google data for advertising purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Data Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this privacy policy or our privacy practices, please contact us at contact.officialolastech@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
