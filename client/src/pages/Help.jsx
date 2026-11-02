import { Link } from "react-router-dom";
import "./Help.css";

const helpTopics = [
  {
    title: "Record a shared expense",
    description:
      "Open a friend or group conversation, choose Add expense, enter the total, and select how the cost should be split.",
  },
  {
    title: "Understand your balance",
    description:
      "The dashboard separates money owed to you from money you owe. Accepted settlements update the remaining balance.",
  },
  {
    title: "Settle an expense",
    description:
      "Open the related expense to record a payment or request a settlement. SplitEase tracks the payment; it does not transfer money.",
  },
  {
    title: "Manage your account",
    description:
      "Open your account menu and choose Account Settings to update your details, change your password, or delete your account.",
  },
];

export default function Help() {
  return (
    <main className="help-page">
      <header className="help-header">
        <Link className="help-brand" to="/">
          Split<span>Ease</span>
        </Link>
        <Link className="help-back" to="/workspace">
          Back to workspace
        </Link>
      </header>

      <section className="help-content">
        <p className="help-eyebrow">SPLITEASE SUPPORT</p>
        <h1>How can we help?</h1>
        <p className="help-intro">
          Quick guidance for tracking shared expenses and managing your account.
        </p>

        <div className="help-topics">
          {helpTopics.map((topic) => (
            <article className="help-topic" key={topic.title}>
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
            </article>
          ))}
        </div>

        <p className="help-note">
          Need more help? Return to your workspace to manage friends, groups, and
          expenses.
        </p>
      </section>
    </main>
  );
}
