import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Work Intel',
  description: 'Work Intel terms of service - rules and guidelines for using our platform.',
};

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 mb-12">
          Last updated: February 5, 2026
        </p>

        <div className="space-y-10 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              1. Service Description
            </h2>
            <p>
              Work Intel is an engineering intelligence platform that connects to your
              team&apos;s development tools (such as GitHub) and generates AI-powered
              weekly reports, activity summaries, and insights. The service is provided
              by Work Intel (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              2. Account Terms
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                You must provide a valid email address to create an account.
              </li>
              <li>
                You are responsible for maintaining the security of your account and any
                connected integrations.
              </li>
              <li>
                One person per account. Shared or machine accounts are not permitted.
              </li>
              <li>
                You must be at least 16 years old to use this service.
              </li>
              <li>
                You are responsible for all activity that occurs under your account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              3. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                Use the service for any illegal purpose or to violate any laws.
              </li>
              <li>
                Attempt to gain unauthorized access to other users&apos; accounts or data.
              </li>
              <li>
                Scrape, crawl, or use automated means to access the service beyond
                normal API usage.
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any part of the service.
              </li>
              <li>
                Use the service to harass, abuse, or harm other users.
              </li>
              <li>
                Transmit any malware, viruses, or malicious code through the service.
              </li>
              <li>
                Interfere with or disrupt the service or its infrastructure.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. Payment Terms
            </h2>
            <p>
              Work Intel is currently free during the beta period. When paid plans are
              introduced, we will provide at least 30 days notice. You will not be
              charged without explicitly opting in to a paid plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              5. Intellectual Property
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                The Work Intel service, including its design, code, and branding, is owned
                by Work Intel and protected by intellectual property laws.
              </li>
              <li>
                You retain ownership of your data, including the source data from your
                connected integrations.
              </li>
              <li>
                By using the service, you grant us a limited license to process your data
                solely for the purpose of providing the service to you.
              </li>
              <li>
                AI-generated reports and summaries are provided for your use. You may share
                them freely within your organization.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              6. Limitation of Liability
            </h2>
            <p className="mb-3">
              The service is provided &quot;as is&quot; without warranties of any kind,
              either express or implied. We do not guarantee that the service will be
              uninterrupted, error-free, or secure.
            </p>
            <p>
              To the maximum extent permitted by law, Work Intel shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages,
              including loss of profits, data, or business opportunities, arising from
              your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. Termination
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-[15px]">
              <li>
                You may terminate your account at any time by contacting us.
              </li>
              <li>
                We may suspend or terminate your account if you violate these terms.
              </li>
              <li>
                Upon termination, your data will be deleted within 30 days, unless
                retention is required by law.
              </li>
              <li>
                Team administrators may remove members from teams at any time.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              8. Changes to These Terms
            </h2>
            <p>
              We may modify these terms at any time. If we make material changes, we will
              notify you by email at least 14 days before the changes take effect.
              Continued use of the service after the effective date constitutes acceptance
              of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              9. Governing Law
            </h2>
            <p>
              These terms are governed by the laws of the United States. Any disputes
              arising from these terms or your use of the service will be resolved through
              binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              10. Contact
            </h2>
            <p>
              If you have any questions about these terms, please contact us at{' '}
              <a
                href="mailto:legal@work-intel.com"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                legal@work-intel.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">
            Privacy Policy
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
