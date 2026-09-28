import React, { useState } from 'react';
import { publicApi } from '../../api/publicApi';

export const PublicFeedback: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Program Inquiry');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await publicApi.submitFeedback({
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
      });

      setSuccessMessage(res.message || 'Your feedback has been submitted successfully.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setErrorMessage(err?.response?.data?.error?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-12">
      {/* Header Section */}
      <section className="space-y-4">
        <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground dark:text-muted-foreground">
          Citizen Desk • Municipality of Talibon
        </div>
        <h1 className="text-3xl font-semibold text-foreground dark:text-foreground tracking-tight">
          Citizen Inquiries & Feedback
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground max-w-2xl leading-relaxed">
          Submit community suggestions, inquiries regarding GAD programs, or report localized gender issues to the Talibon Gender and Development Focal Point System (GFPS).
        </p>
      </section>

      <hr className="border-border dark:border-border" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Contact Information (1 Col) */}
        <div className="space-y-6 text-xs text-muted-foreground dark:text-muted-foreground">
          <div className="space-y-1">
            <h2 className="font-semibold text-foreground dark:text-foreground text-sm">
              GFPS Focal Desk
            </h2>
            <p>Municipal Hall of Talibon</p>
            <p>Executive Building, Poblacion, Talibon, Bohol 6325</p>
          </div>

          <div className="space-y-1">
            <span className="font-medium text-foreground dark:text-foreground block">Email</span>
            <p>gad.talibon@gmail.com</p>
          </div>

          <div className="space-y-1">
            <span className="font-medium text-foreground dark:text-foreground block">Telephone</span>
            <p>(038) 515-9000</p>
          </div>

          <div className="space-y-1">
            <span className="font-medium text-foreground dark:text-foreground block">Office Hours</span>
            <p>Monday – Friday, 8:00 AM – 5:00 PM</p>
          </div>
        </div>

        {/* Form (2 Cols) */}
        <div className="md:col-span-2 space-y-6">
          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="feedback-name" className="text-xs font-medium text-foreground dark:text-foreground">
                  Full Name
                </label>
                <input
                  id="feedback-name"
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground focus:outline-none focus:border-border"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="feedback-email" className="text-xs font-medium text-foreground dark:text-foreground">
                  Email Address
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  required
                  placeholder="e.g. maria@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground focus:outline-none focus:border-border"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="feedback-category" className="text-xs font-medium text-foreground dark:text-foreground">
                Topic
              </label>
              <select
                id="feedback-category"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground focus:outline-none focus:border-border"
              >
                <option value="Program Inquiry">Program Inquiry & Beneficiary Qualifications</option>
                <option value="Barangay Suggestion">Barangay GAD Project Suggestion</option>
                <option value="Gender Issue Report">Report Community Gender Issue</option>
                <option value="Transparency Question">Budget & Transparency Question</option>
                <option value="General Feedback">General Feedback</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="feedback-message" className="text-xs font-medium text-foreground dark:text-foreground">
                Message
              </label>
              <textarea
                id="feedback-message"
                required
                rows={5}
                placeholder="Enter details here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground focus:outline-none focus:border-border"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

