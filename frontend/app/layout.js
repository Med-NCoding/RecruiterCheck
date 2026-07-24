import "./globals.css";

const productionHost = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata = {
  metadataBase: new URL(productionHost),
  title: {
    default: "RecruiterCheck | AI Job Scam Analyzer",
    template: "%s | RecruiterCheck",
  },
  description:
    "Analyze recruiter messages and job offers for scam signals with an AI-assisted risk assessment and educational scam playbook simulator.",
  applicationName: "RecruiterCheck",
  keywords: [
    "recruiter scam detector",
    "job offer scam",
    "recruitment fraud",
    "AI scam analysis",
    "phishing awareness",
  ],
  category: "technology",
  openGraph: {
    type: "website",
    title: "RecruiterCheck | AI Job Scam Analyzer",
    description: "A second opinion for the first message. Analyze recruiter outreach for fraud signals before you reply.",
    siteName: "RecruiterCheck",
    images: [
      {
        url: "/og.png",
        width: 1728,
        height: 909,
        alt: "RecruiterCheck — A second opinion for the first message.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RecruiterCheck | AI Job Scam Analyzer",
    description: "Analyze recruiter outreach for fraud signals before you reply.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
