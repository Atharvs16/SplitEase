import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import "./Notifications.css";

const CATEGORIES = [
  { id: "friend_requests", label: "Friend requests", icon: "👤" },
  { id: "friend_splits", label: "Friend split requests", icon: "↔" },
  { id: "group_splits", label: "Group split requests", icon: "👥" },
  { id: "other", label: "Other activity", icon: "🔔" },
];

const EMPTY_NOTIFICATIONS = {
  friend_requests: [],
  friend_splits: [],
  group_splits: [],
  other: [],
};

const READ_NOTIFICATIONS_KEY = "splitease-read-notifications";

function readNotificationIds() {
  try {
    const storedIds = window.localStorage.getItem(READ_NOTIFICATIONS_KEY);
    if (!storedIds) return new Set();
    const parsedIds = JSON.parse(storedIds);
    return Array.isArray(parsedIds) ? new Set(parsedIds) : new Set();
  } catch (error) {
    console.error("Could not read notification state:", error);
    return new Set();
  }
}

function notificationKey(category, notification) {
  return `${category}:${notification.request_id ?? notification.id}`;
}

async function getJson(authenticatedFetch, url) {
  const response = await authenticatedFetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || "Failed to load notifications.");
  }
  return data;
}

function formatDate(value) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function Notifications({ onClose }) {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("friend_requests");
  const [notifications, setNotifications] = useState(EMPTY_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [readIds, setReadIds] = useState(readNotificationIds);

  const fetchNotifications = useCallback(async () => {
    try {
      setError("");
      const [friendRequests, friendSplits, groupSplits, activity] = await Promise.all([
        getJson(authenticatedFetch, "/api/friends/requests"),
        getJson(
          authenticatedFetch,
          "/api/friends/settlement-requests?direction=incoming&status=requested"
        ),
        getJson(
          authenticatedFetch,
          "/api/groups/settlement-requests?direction=incoming&status=requested"
        ),
        getJson(authenticatedFetch, "/api/activity"),
      ]);

      const lists = [
        friendRequests.requests,
        friendSplits.requests,
        groupSplits.requests,
        activity.activities,
      ];
      if (lists.some((items) => !Array.isArray(items))) {
        throw new Error("The notifications response was not in the expected format.");
      }

      setNotifications({
        friend_requests: friendRequests.requests,
        friend_splits: friendSplits.requests,
        group_splits: groupSplits.requests,
        other: activity.activities.filter((item) =>
          item.activity_type === "expense" ||
          (item.activity_type === "settlement" && item.status === "accepted")
        ),
      });
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const selectedNotifications = notifications[activeCategory];

  useEffect(() => {
    if (loading || error) return undefined;

    const timer = window.setTimeout(() => {
      const nextReadIds = new Set(readIds);
      notifications[activeCategory].forEach((notification) => {
        nextReadIds.add(notificationKey(activeCategory, notification));
      });

      if (nextReadIds.size > readIds.size) {
        try {
          window.localStorage.setItem(
            READ_NOTIFICATIONS_KEY,
            JSON.stringify([...nextReadIds].slice(-1000))
          );
          setReadIds(nextReadIds);
        } catch (storageError) {
          console.error("Could not save notification read state:", storageError);
          setActionError("Could not save read status. Check your browser storage settings.");
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeCategory, error, loading, notifications, readIds]);

  async function respondToFriendRequest(requestId, action) {
    setPendingAction(requestId);
    setActionError("");
    try {
      const response = await authenticatedFetch(
        `/api/friends/requests/${encodeURIComponent(requestId)}/${action}`,
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok || data.message === "Friend request not found or already processed") {
        throw new Error(data.error || data.message || "Could not update friend request.");
      }
      setLoading(true);
      await fetchNotifications();
    } catch (actionRequestError) {
      setActionError(actionRequestError.message || "Could not update friend request.");
    } finally {
      setPendingAction("");
    }
  }

  function openConversation(url) {
    onClose();
    navigate(url);
  }

  function notificationDetails(notification) {
    if (activeCategory === "friend_requests") {
      return {
        id: notification.request_id,
        name: notification.name || notification.username || "Someone",
        message: `@${notification.username || "user"} wants to connect with you.`,
        createdAt: notification.created_at,
      };
    }
    if (activeCategory === "friend_splits") {
      return {
        id: notification.id,
        name: notification.payer_name || "A friend",
        message: `Requested ${formatMoney(notification.amount)} for ${notification.expense_description}.`,
        createdAt: notification.created_at,
        actionUrl: notification.payer_username
          ? `/friendchat/${encodeURIComponent(notification.payer_username)}`
          : null,
        actionLabel: "Open friend chat",
      };
    }
    if (activeCategory === "group_splits") {
      return {
        id: notification.id,
        name: notification.payer_name || "A group member",
        message: `Requested ${formatMoney(notification.amount)} for ${notification.expense_description} in ${notification.group_name}.`,
        createdAt: notification.created_at,
        actionUrl: notification.group_id
          ? `/groupchat/${encodeURIComponent(notification.group_id)}`
          : null,
        actionLabel: "Open group chat",
      };
    }

    const message = notification.activity_type === "settlement"
      ? `${notification.actor_is_current_user ? "You recorded" : `${notification.actor_name || "A friend"} recorded`} a ${formatMoney(notification.amount)} settlement for ${notification.title} · ${notification.context}`
      : `${notification.title} · ${formatMoney(notification.amount)} · ${notification.context}`;

    return {
      id: notification.id,
      name: notification.actor_name || "Expense activity",
      message,
      createdAt: notification.created_at,
    };
  }

  return (
    <div
      className="notifications-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="notifications-drawer" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
        <header className="notifications-header">
          <div>
            <h1 id="notifications-title">Notifications</h1>
            <p>Requests and recent activity.</p>
          </div>
          <div className="notifications-header-actions">
            <button
              className="refresh-button"
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchNotifications();
              }}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
            <button className="notifications-close" type="button" onClick={onClose} aria-label="Close notifications">
              ×
            </button>
          </div>
        </header>

        {error && (
          <div className="notifications-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchNotifications();
              }}
            >
              Try again
            </button>
          </div>
        )}
        {actionError && <p className="notification-action-error" role="alert">{actionError}</p>}

        <nav className="notifications-categories" aria-label="Notification categories">
          {CATEGORIES.map((category) => {
            const count = notifications[category.id].filter(
              (notification) =>
                !readIds.has(notificationKey(category.id, notification))
            ).length;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                className={`notification-category ${isActive ? "active" : ""}`}
                onClick={() => setActiveCategory(category.id)}
                aria-pressed={isActive}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-label">{category.label}</span>
                <span className="notification-badge">{count}</span>
              </button>
            );
          })}
        </nav>

        <main className="notifications-content">
          <div className="content-header">
            <h2>{CATEGORIES.find((category) => category.id === activeCategory)?.label}</h2>
            <span className="total-count">{selectedNotifications.length}</span>
          </div>

          {loading ? (
            <div className="notification-state">
              <div className="loading-spinner" />
              <p>Loading notifications...</p>
            </div>
          ) : !error && selectedNotifications.length === 0 ? (
            <div className="notification-state">
              <span className="empty-icon">🔔</span>
              <h3>You’re all caught up!</h3>
              <p>Nothing to show in this section.</p>
            </div>
          ) : !error ? (
            <div className="notification-list">
              {selectedNotifications.map((notification) => {
                const details = notificationDetails(notification);
                const isRead = readIds.has(
                  notificationKey(activeCategory, notification)
                );
                const content = (
                  <>
                    {!isRead && (
                      <span className="notification-unread-dot" aria-label="Unread" />
                    )}
                    <span className="notification-avatar">
                      {details.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="notification-details">
                      <span className="notification-title-row">
                        <strong>{details.name}</strong>
                      </span>
                      <span className="notification-message">{details.message}</span>
                      <span className="notification-date">{formatDate(details.createdAt)}</span>
                      {details.actionUrl && (
                        <span className="notification-action">{details.actionLabel} →</span>
                      )}
                    </span>
                  </>
                );

                if (activeCategory === "friend_requests") {
                  return (
                    <article
                      className={`notification-card ${isRead ? "" : "unread"}`}
                      key={details.id}
                    >
                      {content}
                      <span className="notification-request-actions">
                        <button
                          type="button"
                          className="notification-accept"
                          onClick={() => void respondToFriendRequest(details.id, "accept")}
                          disabled={pendingAction === details.id}
                        >
                          {pendingAction === details.id ? "Saving..." : "Accept"}
                        </button>
                        <button
                          type="button"
                          className="notification-reject"
                          onClick={() => void respondToFriendRequest(details.id, "reject")}
                          disabled={pendingAction === details.id}
                        >
                          Reject
                        </button>
                      </span>
                    </article>
                  );
                }

                if (details.actionUrl) {
                  return (
                    <button
                      type="button"
                      className={`notification-card notification-card-link ${isRead ? "" : "unread"}`}
                      key={details.id}
                      onClick={() => openConversation(details.actionUrl)}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <article
                    className={`notification-card ${isRead ? "" : "unread"}`}
                    key={details.id}
                  >
                    {content}
                  </article>
                );
              })}
            </div>
          ) : null}
        </main>
      </aside>
    </div>
  );
}
