import PageMeta from "../components/PageMeta"

export default function Legal() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-[#1F2937]">
      <PageMeta title="Legal & Policies" />

      <h1 className="text-3xl font-bold mb-6 text-[#D0A242]">Legal & Policies</h1>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
        <p className="text-sm leading-relaxed">
          Fantasy Endurance is an entertainment platform for friendly competition
          around endurance sports. By using the platform, you agree to the policies
          outlined on this page. These policies may be updated periodically, and
          continued use of the platform means you accept the latest version.
        </p>
      </section>

      {/* Terms of Use */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">2. Terms of Use</h2>
        <p className="text-sm leading-relaxed mb-3">
          You must be at least 13 years old to use Fantasy Endurance. If you are
          under 18, you should use the platform only with parental or guardian
          permission.
        </p>

        <h3 className="font-medium mb-1">Acceptable Use</h3>
        <ul className="list-disc ml-6 text-sm leading-relaxed mb-3">
          <li>Do not misuse or attempt to disrupt the platform.</li>
          <li>Do not create multiple accounts to gain unfair advantages.</li>
          <li>Do not scrape or harvest data using automated tools.</li>
          <li>Do not harass, impersonate, or threaten other users.</li>
        </ul>

        <h3 className="font-medium mb-1">Account Responsibility</h3>
        <p className="text-sm leading-relaxed mb-3">
          You are responsible for maintaining the confidentiality of your login
          credentials and for all activity under your account.
        </p>

        <h3 className="font-medium mb-1">Platform Availability</h3>
        <p className="text-sm leading-relaxed">
          Fantasy Endurance may experience downtime, maintenance windows, or
          unexpected outages. We do not guarantee uninterrupted service.
        </p>
      </section>

      {/* Privacy Policy */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">3. Privacy Policy</h2>

        <h3 className="font-medium mb-1">Information We Collect</h3>
        <ul className="list-disc ml-6 text-sm leading-relaxed mb-3">
          <li>Account information (name, email, password)</li>
          <li>Optional profile details (avatar, bio, preferences)</li>
          <li>Activity data (picks, leagues, race interactions)</li>
        </ul>

        <h3 className="font-medium mb-1">How We Use Your Information</h3>
        <ul className="list-disc ml-6 text-sm leading-relaxed mb-3">
          <li>To create and manage your account</li>
          <li>To provide platform features</li>
          <li>To improve user experience</li>
          <li>To maintain security and prevent abuse</li>
          <li>To communicate important updates</li>
        </ul>

        <h3 className="font-medium mb-1">What We Do Not Do</h3>
        <ul className="list-disc ml-6 text-sm leading-relaxed mb-3">
          <li>We do not sell your personal information.</li>
          <li>We do not share your data with advertisers.</li>
          <li>We do not track you across unrelated websites.</li>
        </ul>

        <h3 className="font-medium mb-1">Data Storage</h3>
        <p className="text-sm leading-relaxed">
          Your data is stored securely and retained only as long as necessary to
          operate the platform.
        </p>
      </section>

      {/* Cookies */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">4. Cookies & Tracking</h2>
        <p className="text-sm leading-relaxed">
          Fantasy Endurance uses cookies for authentication, session management,
          and basic analytics. Disabling cookies may affect platform functionality.
        </p>
      </section>

      {/* Disclaimer */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">5. Disclaimer</h2>

        <h3 className="font-medium mb-1">Not Professional Advice</h3>
        <p className="text-sm leading-relaxed mb-3">
          Fantasy Endurance provides entertainment and informational content only.
          Nothing on the platform should be considered professional training,
          medical, or performance advice.
        </p>

        <h3 className="font-medium mb-1">Accuracy of Data</h3>
        <p className="text-sm leading-relaxed mb-3">
          Race data, athlete stats, and scoring information may contain errors,
          delays, or inaccuracies. We do not guarantee the completeness or
          correctness of any data displayed.
        </p>

        <h3 className="font-medium mb-1">Third‑Party Services</h3>
        <p className="text-sm leading-relaxed">
          Some features rely on third‑party APIs or data sources. We are not
          responsible for outages, changes, or inaccuracies from those services.
        </p>
      </section>

      {/* Liability */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">6. Limitation of Liability</h2>
        <p className="text-sm leading-relaxed">
          To the fullest extent permitted by law, Fantasy Endurance is not liable
          for losses resulting from platform use. You use the platform at your own
          risk. We are not responsible for user‑generated content.
        </p>
      </section>

      {/* Contact */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
        <p className="text-sm leading-relaxed">
          For questions about these policies, contact us at:
          <br />
          <span className="font-medium">fantasyendurance@gmail.com</span>
        </p>
      </section>
    </div>
  )
}
