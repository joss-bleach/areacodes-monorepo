import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 max-w-3xl mx-auto">
      <a href="/" className="text-sm uppercase tracking-widest text-neutral-400 hover:text-white mb-8 block">
        ← Areacodes
      </a>

      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-neutral-400 mb-10">Last updated: 17 June 2026</p>

      <section className="space-y-8 text-base leading-relaxed">
        <Section title="Who we are">
          <p>
            Areacodes is operated by AC Brighton Ltd, a company registered in England and Wales. We run
            the platform at map.acbrighton.com and the Areacodes mobile app ("Areacodes", "we", "us").
          </p>
          <p className="mt-2">
            Questions about this policy: <a href="mailto:hello@acbrighton.com" className="underline">hello@acbrighton.com</a>
          </p>
        </Section>

        <Section title="What data we collect">
          <ul className="list-disc pl-5 space-y-1 text-neutral-300">
            <li>
              <strong>Account data:</strong> email address, display name, and authentication tokens when you
              sign up via email, Google, or Apple.
            </li>
            <li>
              <strong>Voucher activity:</strong> which vouchers you have claimed, revealed, and redeemed.
            </li>
            <li>
              <strong>Follow data:</strong> which businesses you follow.
            </li>
            <li>
              <strong>Push tokens:</strong> an anonymous device token used to send you notifications
              when followed businesses publish new vouchers. We do not use this for advertising.
            </li>
            <li>
              <strong>Usage analytics:</strong> anonymised event data (app opens, voucher funnel steps)
              via PostHog, hosted in the EU. No advertising IDs or fingerprinting.
            </li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          <ul className="list-disc pl-5 space-y-1 text-neutral-300">
            <li>To provide the service: account management, wallet, voucher delivery.</li>
            <li>To send you push notifications you have opted in to.</li>
            <li>To understand how people use Areacodes so we can improve it.</li>
          </ul>
        </Section>

        <Section title="Legal basis (UK GDPR)">
          <ul className="list-disc pl-5 space-y-1 text-neutral-300">
            <li><strong>Contract:</strong> processing necessary to provide the service you signed up for.</li>
            <li><strong>Consent:</strong> push notifications (you can withdraw via device settings at any time).</li>
            <li><strong>Legitimate interests:</strong> anonymised analytics to improve the platform.</li>
          </ul>
        </Section>

        <Section title="Who we share data with">
          <ul className="list-disc pl-5 space-y-1 text-neutral-300">
            <li>
              <strong>Convex (database & backend):</strong> your account and voucher data is stored on
              Convex's infrastructure.
            </li>
            <li>
              <strong>Expo (push notifications):</strong> push tokens are relayed through Expo's push
              gateway to Apple APNs and Google FCM.
            </li>
            <li>
              <strong>PostHog (analytics):</strong> anonymised usage events, EU-hosted instance.
            </li>
          </ul>
          <p className="mt-2 text-neutral-400">We do not sell your data. We do not share it with advertisers.</p>
        </Section>

        <Section title="How long we keep it">
          <p className="text-neutral-300">
            Account data is retained while your account is active. If you delete your account we will
            remove your personal data within 30 days, except where we are required to retain it by law.
          </p>
        </Section>

        <Section title="Your rights">
          <p className="text-neutral-300">
            Under UK GDPR you have the right to access, correct, or delete your data, to object to
            processing, and to data portability. Email{" "}
            <a href="mailto:hello@acbrighton.com" className="underline">hello@acbrighton.com</a>{" "}
            to exercise any of these rights. You also have the right to complain to the ICO
            (ico.org.uk) if you believe we have mishandled your data.
          </p>
        </Section>

        <Section title="Cookies">
          <p className="text-neutral-300">
            The web app (map.acbrighton.com) uses a single functional cookie to maintain your
            login session. No advertising or tracking cookies are set.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p className="text-neutral-300">
            We will post any material changes here and update the date above. Continued use of Areacodes
            after changes constitutes acceptance.
          </p>
        </Section>
      </section>
    </main>
  );
}
