import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Work Intel',
  description: 'Work Intel privacy policy - how we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mb-12">
          Last updated: February 5, 2026
        </p>

        <div className="space-y-10 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              1. Information We Collect
            </h2>
            <p className="mb-3">
              When you use Work Intel, we collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                <strong>Account information:</strong> Your email address and display name,
                provided during sign-up via OAuth.
              </li>
              <li>
                <strong>Team membership data:</strong> Team names, member roles, and
                invitation records.
              </li>
              <li>
                <strong>GitHub activity data:</strong> Pull requests, commits, code reviews,
                and repository metadata from your connected GitHub organization. We only
                access repositories your team has explicitly selected.
              </li>
              <li>
                <strong>Generated reports:</strong> AI-generated weekly summaries and
                analytics based on your team&apos;s activity.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                Generating AI-powered weekly team reports and individual activity summaries.
              </li>
              <li>
                Identifying items that need attention, such as stale pull requests or
                blocked work.
              </li>
              <li>
                Sending email notifications including weekly reports and team invitations.
              </li>
              <li>
                Improving the service and fixing bugs.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              3. Data Storage and Security
            </h2>
            <p className="mb-3">
              Your data is stored in a PostgreSQL database hosted on{' '}
              <strong>Supabase</strong> with encryption at rest. OAuth tokens and API
              credentials are stored securely and are never exposed to other users.
            </p>
            <p>
              We use HTTPS for all data transmission and follow industry-standard security
              practices to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. Third-Party Services
            </h2>
            <p className="mb-3">
              Work Intel integrates with the following third-party services to provide its
              functionality:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                <strong>GitHub API:</strong> To collect repository activity data for your
                team.
              </li>
              <li>
                <strong>Anthropic (Claude AI):</strong> To generate AI-powered summaries
                and analysis of your team&apos;s activity. Activity data is sent to
                Anthropic&apos;s API for processing but is not retained by Anthropic beyond
                the request.
              </li>
              <li>
                <strong>Resend:</strong> To deliver email notifications and team
                invitations.
              </li>
              <li>
                <strong>Vercel:</strong> For application hosting and serverless function
                execution.
              </li>
              <li>
                <strong>Supabase:</strong> For database hosting and authentication
                infrastructure.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              5. Data Retention
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                Weekly reports are retained for up to 6 months.
              </li>
              <li>
                Account data is retained for as long as your account is active.
              </li>
              <li>
                If you delete your account or request data deletion, we will remove your
                data within 30 days.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              6. Your Rights
            </h2>
            <p className="mb-3">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                <strong>Access:</strong> You can request a copy of the data we hold about
                you.
              </li>
              <li>
                <strong>Correction:</strong> You can request corrections to inaccurate
                data.
              </li>
              <li>
                <strong>Deletion:</strong> You can request that we delete your personal
                data.
              </li>
              <li>
                <strong>Portability:</strong> You can request your data in a portable
                format.
              </li>
              <li>
                <strong>Objection:</strong> You can object to certain types of data
                processing.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a
                href="mailto:privacy@work-intel.com"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                privacy@work-intel.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. Cookies
            </h2>
            <p>
              We use essential cookies for authentication (session tokens). We do not use
              tracking cookies or third-party analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. If we make significant
              changes, we will notify you by email. Continued use of the service after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              9. Contact Us
            </h2>
            <p>
              If you have any questions about this privacy policy, please contact us at{' '}
              <a
                href="mailto:privacy@work-intel.com"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                privacy@work-intel.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 transition-colors">
            Terms of Service
          </Link>
          <span className="mx-3">&middot;</span>
          <Link href="/" className="hover:text-slate-600 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
