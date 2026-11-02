import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../useAuth";
import "./Profile.css";

const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || data.message || "The request could not be completed.");
    }
    return data;
}

export default function Profile() {
    const { username = "" } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { authenticatedFetch, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [balances, setBalances] = useState(null);
    const [mutualGroups, setMutualGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [working, setWorking] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteOpen, setDeleteOpen] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await readResponse(
                await authenticatedFetch(`/api/users/${encodeURIComponent(username)}`)
            );
            setProfile(data.profile);
            setBalances(data.balances);
            setMutualGroups(data.mutualGroups || []);
            setName(data.profile.name || "");
            setPhone(data.profile.phone || "");
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, username]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadProfile();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadProfile]);

    useEffect(() => {
        if (!loading && profile?.is_self && location.hash === "#settings") {
            document.getElementById("profile-settings")?.scrollIntoView({ behavior: "smooth" });
        }
    }, [loading, location.hash, profile?.is_self]);

    async function updateProfile(event) {
        event.preventDefault();
        setWorking(true);
        setError("");
        setNotice("");
        try {
            const data = await readResponse(await authenticatedFetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone }),
            }));
            setProfile((current) => ({ ...current, ...data.user }));
            setNotice("Your profile details were updated.");
        } catch (updateError) {
            setError(updateError.message);
        } finally {
            setWorking(false);
        }
    }

    async function updatePassword(event) {
        event.preventDefault();
        if (new TextEncoder().encode(newPassword).length > 72) {
            setError("New password must be at most 72 UTF-8 bytes.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("The new passwords do not match.");
            return;
        }
        setWorking(true);
        setError("");
        setNotice("");
        try {
            const data = await readResponse(await authenticatedFetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    phone,
                    currentPassword,
                    newPassword,
                }),
            }));
            setProfile((current) => ({ ...current, ...data.user }));
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setNotice("Your password was changed.");
        } catch (passwordError) {
            setError(passwordError.message);
        } finally {
            setWorking(false);
        }
    }

    async function handleDeleteAccount(event) {
        event.preventDefault();
        setWorking(true);
        setError("");
        try {
            await readResponse(await authenticatedFetch("/api/users/me", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: deletePassword }),
            }));
            logout();
            navigate("/auth", { replace: true });
        } catch (deleteError) {
            setError(deleteError.message);
            setWorking(false);
        }
    }

    async function handleFriendAction(action) {
        setWorking(true);
        setError("");
        setNotice("");
        try {
            if (action === "accept") {
                await readResponse(await authenticatedFetch(
                    `/api/friends/requests/${encodeURIComponent(profile.friend_request_id)}/accept`,
                    { method: "POST" }
                ));
            } else {
                const result = await readResponse(await authenticatedFetch("/api/friends/add-friend", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ receiverId: profile.id }),
                }));
                if (result.success === false) {
                    throw new Error(result.message || "Friend request could not be sent.");
                }
            }
            await loadProfile();
            setNotice(action === "accept" ? "Friend request accepted." : "Friend request sent.");
        } catch (friendError) {
            setError(friendError.message);
        } finally {
            setWorking(false);
        }
    }

    return (
        <main className="profile-page">
            <header className="profile-topbar">
                <a href="/workspace" className="profile-brand">
                    <img src="/favicon.svg" alt="" width="34" height="34" />
                    <span>Split<span>Ease</span></span>
                </a>
                <button type="button" className="profile-back" onClick={() => navigate("/workspace")}>
                    Back to workspace
                </button>
            </header>

            <div className="profile-content">
                {loading ? (
                    <section className="profile-card profile-loading" aria-live="polite">
                        Loading profile...
                    </section>
                ) : error && !profile ? (
                    <section className="profile-card profile-message" role="alert">
                        <h1>Profile unavailable</h1>
                        <p>{error}</p>
                    </section>
                ) : profile ? (
                    <>
                        <section className="profile-card profile-identity">
                            <div className="profile-avatar" aria-hidden="true">
                                {(profile.name || profile.username || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="profile-identity-copy">
                                <span className="profile-eyebrow">{profile.is_self ? "Your profile" : "profile"}</span>
                                <h1>{profile.name}</h1>
                                <p>@{profile.username}</p>
                            </div>
                            {!profile.is_self && (
                                <div className="profile-friend-action">
                                    {profile.friendship_status === "friends" ? (
                                        <button
                                            type="button"
                                            className="profile-primary-button"
                                            onClick={() => navigate(`/friendchat/${encodeURIComponent(profile.username)}`)}
                                        >
                                            Open friend chat
                                        </button>
                                    ) : profile.friendship_status === "request_received" ? (
                                        <button
                                            type="button"
                                            className="profile-primary-button"
                                            disabled={working}
                                            onClick={() => handleFriendAction("accept")}
                                        >
                                            Accept friend request
                                        </button>
                                    ) : profile.friendship_status === "request_sent" ? (
                                        <button type="button" className="profile-secondary-button" disabled>
                                            Request sent
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="profile-primary-button"
                                            disabled={working}
                                            onClick={() => handleFriendAction("add")}
                                        >
                                            Add friend
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>

                        {(error || notice) && (
                            <p className={`profile-feedback ${error ? "is-error" : "is-success"}`} role={error ? "alert" : "status"}>
                                {error || notice}
                            </p>
                        )}

                        {profile.is_self ? (
                            <div className="profile-settings-grid" id="profile-settings">
                                <section className="profile-card">
                                    <div className="profile-section-heading">
                                        <h2>Personal details</h2>
                                        <p>Update the name and phone number on your account.</p>
                                    </div>
                                    <form className="profile-form" onSubmit={updateProfile}>
                                        <label>
                                            Name
                                            <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={50} required />
                                        </label>
                                        <label>
                                            Phone number
                                            <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} required />
                                        </label>
                                        <button type="submit" className="profile-primary-button" disabled={working}>
                                            Save changes
                                        </button>
                                    </form>
                                </section>

                                <section className="profile-card">
                                    <div className="profile-section-heading">
                                        <h2>Change password</h2>
                                        <p>Confirm your current password before choosing a new one.</p>
                                    </div>
                                    <form className="profile-form" onSubmit={updatePassword}>
                                        <label>
                                            Current password
                                            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                                        </label>
                                        <label>
                                            New password
                                            <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={72} required />
                                        </label>
                                        <label>
                                            Confirm new password
                                            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} required />
                                        </label>
                                        <button type="submit" className="profile-primary-button" disabled={working}>
                                            Update password
                                        </button>
                                    </form>
                                </section>

                                <section className="profile-card profile-danger-zone">
                                    <div>
                                        <h2>Delete account</h2>
                                        <p>Your profile will be anonymized. Shared expenses, settlements, and group history will remain available to other members.</p>
                                    </div>
                                    {!deleteOpen ? (
                                        <button type="button" className="profile-danger-button" onClick={() => setDeleteOpen(true)}>
                                            Delete my account
                                        </button>
                                    ) : (
                                        <form className="profile-delete-form" onSubmit={handleDeleteAccount}>
                                            <label>
                                                Enter your password to confirm
                                                <input type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} required />
                                            </label>
                                            <div>
                                                <button type="button" className="profile-secondary-button" onClick={() => { setDeleteOpen(false); setDeletePassword(""); }}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="profile-danger-button" disabled={working}>
                                                    Permanently delete account
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </section>
                            </div>
                        ) : profile.friendship_status === "friends" ? (
                            <div className="profile-friend-details">
                                <section className="profile-card">
                                    <div className="profile-section-heading">
                                        <h2>Your balance</h2>
                                        <p>Direct expenses and accepted settlements between you and {profile.name}.</p>
                                    </div>
                                    <div className="profile-balance-grid">
                                        <div>
                                            <span>Incoming from {profile.name.split(' ')[0]}</span>
                                            <strong className="profile-incoming">{formatMoney(balances?.incoming)}</strong>
                                        </div>
                                        <div>
                                            <span>Outgoing to {profile.name.split(' ')[0]}</span>
                                            <strong className="profile-outgoing">{formatMoney(balances?.outgoing)}</strong>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="profile-primary-button"
                                        onClick={() => navigate(`/friendchat/${encodeURIComponent(profile.username)}`)}
                                    >
                                        Go to friend chat
                                    </button>
                                </section>

                                <section className="profile-card">
                                    <div className="profile-section-heading">
                                        <h2>Mutual groups</h2>
                                        <p>Groups that both of you are members of.</p>
                                    </div>
                                    {mutualGroups.length ? (
                                        <ul className="profile-group-list">
                                            {mutualGroups.map((group) => (
                                                <li key={group.id}>
                                                    <span>{group.name}</span>
                                                    <button type="button" onClick={() => navigate(`/groupchat/${encodeURIComponent(group.id)}`)}>
                                                        Open group
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="profile-empty">You don’t share any groups yet.</p>
                                    )}
                                </section>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </div>
        </main>
    );
}
