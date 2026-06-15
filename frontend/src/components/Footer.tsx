import { Link } from 'react-router-dom';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Trading', href: '/spot-trading' },
    { label: 'Security', href: '/security' },
    { label: 'API', href: '/api' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Press', href: '#' },
  ],
  Support: [
    { label: 'Help Center', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'API Docs', href: '/api' },
  ],
};

const socialLinks = [
  { label: 'X', href: '#', ariaLabel: 'Follow us on X' },
  { label: 'GH', href: '#', ariaLabel: 'View our GitHub' },
  { label: 'Li', href: '#', ariaLabel: 'Connect on LinkedIn' },
  { label: 'IG', href: '#', ariaLabel: 'Follow us on Instagram' },
];

export default function Footer() {
  return (
    <footer className="bg-primary border-t border-card-border">
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full gradient-btn flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-white font-semibold text-lg">Cruse X</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs mb-6">
              Next generation digital asset trading platform for everyone.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link
                        to={link.href}
                        className="text-text-muted text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-text-muted text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-card-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-sm">
            &copy; 2026 Cruse X Platforms, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="w-9 h-9 rounded-full bg-card-bg border border-card-border flex items-center justify-center text-text-muted hover:text-white hover:border-accent-teal/30 transition-colors text-xs font-medium"
                aria-label={social.ariaLabel}
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
