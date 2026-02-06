'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Github,
  Users,
  Zap,
  BarChart3,
  Clock,
  MessageSquareWarning,
  UserCheck,
  Mail,
  Check,
  Activity,
} from 'lucide-react';

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900 tracking-tight">
            Work Intel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Start Free
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-white to-white" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-sm text-indigo-700 font-medium mb-8">
          <Zap className="h-3.5 w-3.5" />
          Powered by AI
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1]">
          See what your team{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            shipped this week
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Work Intel connects to your GitHub org and delivers AI-powered weekly
          reports to your engineering team. Setup takes 2 minutes.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 transition-all"
          >
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 transition-all"
          >
            See How It Works
          </a>
        </div>

        {/* Product preview card */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-slate-500">
                Weekly Team Report — Feb 3, 2026
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">23</div>
                <div className="text-xs text-slate-500 mt-1">PRs Merged</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">7</div>
                <div className="text-xs text-slate-500 mt-1">Contributors</div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">3</div>
                <div className="text-xs text-slate-500 mt-1">Need Attention</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-violet-600">
                    SK
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    Sarah Kim
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Shipped auth redesign (6 PRs), fixed 2 critical bugs in
                    payments flow
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-600">
                    JR
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    James Rodriguez
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Completed API v2 migration, reviewing 3 open PRs from
                    frontend team
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    {
      icon: Clock,
      title: 'Status meetings waste time',
      description:
        'Weekly standups that could be an email. Your team loses hours every week to "what did you work on?" rituals.',
    },
    {
      icon: MessageSquareWarning,
      title: 'PRs get lost in the noise',
      description:
        'Important pull requests sit for days without review while your team drowns in notifications.',
    },
    {
      icon: BarChart3,
      title: 'Writing updates is tedious',
      description:
        'Nobody wants to write a weekly summary. So nobody does, and leadership has no visibility.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Your team ships great work.
            <br />
            <span className="text-slate-400">But who knows about it?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="group rounded-xl border border-slate-200 bg-white p-6 sm:p-8 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
            >
              <div className="h-11 w-11 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center mb-5 group-hover:bg-red-100 transition-colors">
                <problem.icon className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {problem.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Github,
      title: 'Connect GitHub in 2 minutes',
      description:
        'Add your GitHub org and select the repos you care about. One admin connects, and the whole team gets value from day one.',
      color: 'bg-slate-900',
      iconColor: 'text-white',
    },
    {
      icon: Zap,
      title: 'AI-powered weekly summaries',
      description:
        'Claude AI analyzes commits, PRs, and code reviews to generate clear, actionable weekly reports for your team.',
      color: 'bg-indigo-50 border border-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      icon: MessageSquareWarning,
      title: 'See what needs attention',
      description:
        'Spot stale PRs, blocked work, and team members who might need help before small issues become big problems.',
      color: 'bg-amber-50 border border-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      icon: UserCheck,
      title: 'Per-member breakdowns',
      description:
        'Every team member gets their own summary card showing what they shipped, what they reviewed, and what is open.',
      color: 'bg-emerald-50 border border-emerald-100',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Everything you need to keep
            <br />
            your team in sync
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Replace status meetings with automated, AI-generated weekly recaps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-slate-200 bg-white p-6 sm:p-8 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
            >
              <div
                className={`h-11 w-11 rounded-lg ${feature.color} flex items-center justify-center mb-5`}
              >
                <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: '1',
      icon: Github,
      title: 'Connect your GitHub org',
      description:
        'One admin adds the GitHub integration. Select which repos to track. Takes under 2 minutes.',
    },
    {
      step: '2',
      icon: Users,
      title: 'Add your team members',
      description:
        'Invite your team by email. Map GitHub usernames to team members for personalized reports.',
    },
    {
      step: '3',
      icon: Mail,
      title: 'Get your first report Monday',
      description:
        'Every Monday, your team receives an AI-generated weekly summary. On-demand reports anytime.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            No complex setup. No agents to install. Just connect and go.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center">
              {/* Connector line (hidden on mobile, shown between steps on desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-slate-200" />
              )}

              <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 mb-6">
                <step.icon className="h-7 w-7 text-indigo-600" />
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  {step.step}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'For small teams getting started',
      features: [
        'Up to 5 team members',
        '1 team',
        'Weekly reports',
        '4 weeks history',
        'GitHub integration',
      ],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Team',
      price: '$10',
      period: 'per seat / month',
      description: 'For growing engineering teams',
      features: [
        'Unlimited members',
        'Unlimited teams',
        'On-demand reports',
        '6 months history',
        'Multiple GitHub orgs',
        'Slack delivery',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Business',
      price: '$18',
      period: 'per seat / month',
      description: 'For organizations that need more',
      features: [
        'Everything in Team',
        'Jira & Linear integration',
        'SSO / SAML',
        'API access',
        'Custom report cadence',
        'Dedicated support',
        'Data export',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Start free. Upgrade when your team grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 sm:p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100/50 scale-[1.02] md:scale-105'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Recommended
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  {plan.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">
                  {plan.price}
                </span>
                <span className="text-sm text-slate-500 ml-2">
                  {plan.period}
                </span>
              </div>

              <Link
                href="/login"
                className={`block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-slate-600"
                  >
                    <Check
                      className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        plan.highlighted
                          ? 'text-indigo-600'
                          : 'text-slate-400'
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          Start free — no credit card required
        </p>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Start your free team recap
          <br />
          in 2 minutes
        </h2>
        <p className="mt-4 text-lg text-slate-500">
          Connect your GitHub org, add your team, and get your first weekly
          report. No credit card, no commitment.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 transition-all"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              Work Intel
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Work Intel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ colorScheme: 'light' }}>
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}
