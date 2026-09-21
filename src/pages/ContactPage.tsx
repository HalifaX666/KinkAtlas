import { FormEvent, useState } from "react";
import { Accessibility, Bug, Handshake, Mail, MessageCircle, ShieldCheck } from "lucide-react";

export const CONTACT_TOPICS = [
  "General question or feedback",
  "Bug report",
  "Accessibility",
  "Privacy",
  "Press / collaboration",
] as const;

export const NAME_PLACEHOLDERS = [
  "Kinky Stranger", "Mysterious Switch", "Anonymous Brat", "Curious Creature", "Suspiciously Polite Deviant", "Friendly Menace", "Unsupervised Bottom", "Definitely Not a Gremlin", "Professional Button Pusher", "Chaos Consultant", "Shy Little Menace", "Consent Enthusiast", "Velvet Troublemaker", "Curious Human", "The One With Questions", "Your Local Brat", "Probably Overthinking This", "Mildly Feral Stranger", "Respectfully Unhinged", "Someone With Opinions", "Polite Little Menace", "Certified Overthinker", "Questionable Influence", "Well-Behaved Allegedly", "Chaotic Neutral-ish", "Enthusiastic Edge Case", "Very Normal Person", "Curious Trouble", "Definitely Reading the Instructions", "Soft-Spoken Menace",
] as const;

export const EMAIL_PLACEHOLDERS = [
  "you@somewhere.com", "probably.you@example.com", "reply.if.you.dare@example.com", "definitely.a.real.person@example.com", "your.inbox@example.com", "send.replies.here@example.com", "human.behind.screen@example.com", "not.a.burner@example.com", "totally.normal.email@example.com", "where.to.reply@example.com", "very.real.email@example.com", "definitely.not.a.bot@example.com", "inbox.with.boundaries@example.com", "consent.to.replies@example.com", "polite.reply.address@example.com",
] as const;

export const MESSAGE_PLACEHOLDERS = [
  "Tickle my nose and tell me what’s on your mind...", "I poked the thing and the thing poked back...", "I found a bug. It may or may not be into impact play.", "Something weird happened and I have receipts...", "I have thoughts. Possibly too many thoughts.", "The vibes are immaculate, but I have feedback...", "I clicked something I probably shouldn’t have...", "A tiny gremlin appears to be living in this feature...", "I come bearing feedback and questionable timing...", "This might be a bug, or I may simply be talented...", "Hear me out...", "So, funny story...", "I have a question that felt too weird for the FAQ...", "I noticed a thing. The thing now haunts me.", "Please explain why this button has chosen violence...", "I broke nothing. Allegedly.", "Something is behaving suspiciously...", "No emergency, just aggressively curious...", "The website and I have reached an impasse...", "I bring news from the land of edge cases...", "This is either brilliant or broken. Let’s discuss.", "A wild feedback appeared...", "Please accept this lovingly submitted chaos...", "My inner QA tester has escaped containment...", "Consider this a consensual bug report...", "I would like to negotiate with this interface...", "The interface and I need to have a conversation...", "I touched nothing and yet something happened...", "This bug refuses to respect negotiated boundaries...", "Someone left a gremlin in production...", "I’m not saying it’s haunted, but...", "I think I found an edge case wearing a trench coat...", "Something here is being a little bratty...", "I would like to file a strongly consensual complaint...", "The app and I are currently negotiating terms...", "I clicked responsibly. The outcome disagrees.", "I bring constructive chaos...", "There appears to be a disturbance in the kink matrix...",
] as const;

const contactTopics = [
  { title: "General questions & feedback", description: "Ask how KinkAtlas works, share thoughtful feedback, or suggest a clearer way to explain part of the experience.", Icon: MessageCircle },
  { title: "Bug reports", description: "Report something that did not work as expected. Browser, device, reproduction steps, and what you expected to happen are usually the most useful details.", Icon: Bug },
  { title: "Accessibility", description: "Share an access barrier, assistive-technology issue, readability concern, or another way KinkAtlas could be easier to use.", Icon: Accessibility },
  { title: "Privacy", description: "Ask about session data, storage, sharing, production boundaries, or the privacy model described across the site.", Icon: ShieldCheck },
  { title: "Press / collaboration", description: "Reach out about interviews, education, research, or responsible collaboration related to kink vocabulary and self-reflection.", Icon: Handshake },
] as const;

type ContactValues = {
  name: string;
  email: string;
  topic: string;
  message: string;
  website: string;
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [placeholders] = useState(() => ({
    name: pickRandom(NAME_PLACEHOLDERS),
    email: pickRandom(EMAIL_PLACEHOLDERS),
    message: pickRandom(MESSAGE_PLACEHOLDERS),
  }));
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"success" | "error" | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.checkValidity() || isSubmitting) {
      event.currentTarget.reportValidity();
      return;
    }

    const payload: ContactValues = { name, email, topic, message, website };
    setIsSubmitting(true);
    setStatus("");
    setStatusKind(undefined);

    try {
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ "form-name": "contact", ...payload }).toString(),
      });

      if (!response.ok) throw new Error("Contact request failed");

      setName("");
      setEmail("");
      setTopic("");
      setMessage("");
      setWebsite("");
      setStatus("Thanks — your message was sent.");
      setStatusKind("success");
    } catch {
      setStatus("Something went wrong while sending your message. Please try again.");
      setStatusKind("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-width article-page contact-page">
      <header>
        <span className="eyebrow">Contact</span>
        <h1>Get in touch</h1>
        <p className="lede">Questions, feedback, bug reports, accessibility issues, privacy questions, and collaboration inquiries are welcome.</p>
      </header>
      <section aria-labelledby="contact-topics-heading">
        <h2 id="contact-topics-heading" className="sr-only">Ways to contact KinkAtlas</h2>
        <div className="principle-grid contact-grid">
          {contactTopics.map(({ title, description, Icon }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="contact-form-section" aria-labelledby="contact-form-heading">
        <div>
          <span className="eyebrow">Send a note</span>
          <h2 id="contact-form-heading">Write a note</h2>
          <p>Contact messages are separate from your KinkAtlas assessment. When you send this form, only the information you enter here is submitted so we can receive and respond to your message.</p>
        </div>
        <form className="contact-form" name="contact" method="POST" data-netlify="true" netlify-honeypot="website" aria-labelledby="contact-form-heading" onSubmit={handleSubmit}>
          <input type="hidden" name="form-name" value="contact" />
          <div className="contact-form-grid">
            <div className="contact-field">
              <label htmlFor="contact-name">Name (optional)</label>
              <input id="contact-name" name="name" type="text" autoComplete="name" placeholder={placeholders.name} value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
            </div>
            <div className="contact-field">
              <label htmlFor="contact-email">Email (optional)</label>
              <input id="contact-email" name="email" type="email" autoComplete="email" placeholder={placeholders.email} value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
            </div>
          </div>
          <div className="contact-field">
            <label htmlFor="contact-topic">Topic</label>
            <select id="contact-topic" name="topic" required value={topic} onChange={(event) => setTopic(event.target.value)} disabled={isSubmitting}>
              <option value="" disabled>Choose a topic</option>
              {CONTACT_TOPICS.map((contactTopic) => <option key={contactTopic} value={contactTopic}>{contactTopic}</option>)}
            </select>
          </div>
          <div className="contact-field">
            <label htmlFor="contact-message">Message</label>
            <textarea id="contact-message" name="message" required maxLength={5000} placeholder={placeholders.message} value={message} onChange={(event) => setMessage(event.target.value)} disabled={isSubmitting} />
          </div>
          <div className="contact-honeypot" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" type="text" autoComplete="off" tabIndex={-1} value={website} onChange={(event) => setWebsite(event.target.value)} disabled={isSubmitting} />
          </div>
          <button className="button primary" type="submit" disabled={isSubmitting}><Mail size={18} aria-hidden="true" />{isSubmitting ? "Sending…" : "Send message"}</button>
          <p className="contact-status" data-status={statusKind} aria-live="polite">{status}</p>
        </form>
      </section>
      <aside className="disclaimer-panel contact-privacy-note" aria-labelledby="contact-privacy-heading">
        <ShieldCheck aria-hidden="true" />
        <h2 id="contact-privacy-heading">Protect your privacy</h2>
        <p>Please avoid including sensitive assessment details unless they’re necessary to explain your question or bug report.</p>
        <p>Contact submissions are processed through Netlify. Your KinkAtlas assessment answers, results, recommendations, readiness data, boundaries, blind spots, and role selections are never automatically attached.</p>
      </aside>
    </div>
  );
}
