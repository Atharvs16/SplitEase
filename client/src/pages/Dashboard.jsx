import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from '../useAuth';
import { apiUrl } from "../api";
import "./Dashboard.css";
import "./Settlements.css";
import Notifications from "../components/Notifications";


const menuItems = [
    {
        label: "My Profile",
        description: "View your personal details",
        icon: "user",
        to: "/profile",
    },
    {
        label: "Account Settings",
        description: "Manage your preferences",
        icon: "settings",
        to: "/settings",
    },
    {
        label: "Help & Support",
        description: "We're here to help",
        icon: "help",
        to: "/Help",
    },
];

function MenuIcon({ name }) {
    if (name === "settings") {
        return (
            <svg className="account-menu-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9.6,3.32a3.86,3.86,0,1,0,3.86,3.85A3.85,3.85,0,0,0,9.6,3.32M16.35,11a.26.26,0,0,0-.25.21l-.18,1.27a4.63,4.63,0,0,0-.82.45l-1.2-.48a.3.3,0,0,0-.3.13l-1,1.66a.24.24,0,0,0,.06.31l1,.79a3.94,3.94,0,0,0,0,1l-1,.79a.23.23,0,0,0-.06.3l1,1.67c.06.13.19.13.3.13l1.2-.49a3.85,3.85,0,0,0,.82.46l.18,1.27a.24.24,0,0,0,.25.2h1.93a.24.24,0,0,0,.23-.2l.18-1.27a5,5,0,0,0,.81-.46l1.19.49c.12,0,.25,0,.32-.13l1-1.67a.23.23,0,0,0-.06-.3l-1-.79a4,4,0,0,0,0-.49,2.67,2.67,0,0,0,0-.48l1-.79a.25.25,0,0,0,.06-.31l-1-1.66c-.06-.13-.19-.13-.31-.13L19.5,13a4.07,4.07,0,0,0-.82-.45l-.18-1.27a.23.23,0,0,0-.22-.21H16.46M9.71,13C5.45,13,2,14.7,2,16.83v1.92h9.33a6.65,6.65,0,0,1,0-5.69A13.56,13.56,0,0,0,9.71,13m7.6,1.43a1.45,1.45,0,1,1,0,2.89,1.45,1.45,0,0,1,0-2.89Z" />
            </svg>
        );
    }

    const paths = {
        user: (
            <>
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-4 2.8-6 7-6s7 2 7 6" />
            </>
        ),
        settings: (
            <>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.4.1-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1v-3.6l.2-.1a1.7 1.7 0 0 0 1-1.5l-.1-.4-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.9-.3l.1-.1h3.6l.1.2a1.7 1.7 0 0 0 1.5 1l.4-.1.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .3 1.9l.1.1V15z" />
            </>
        ),
        wallet: (
            <>
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <path d="M3 10h18M16 15h.01M6 6V4h12v2" />
            </>
        ),
        help: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1 1-1.7 1.2-1.7 2.7M12 17h.01" />
            </>
        ),
        logout: (
            <>
                <path d="M10 17l5-5-5-5M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </>
        ),
    };

    return (
        <svg
            className="account-menu-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    );
}

function NavigationIcon({ name }) {
    if (name === "groups") {
        return (
            <svg className="se-nav-svg" viewBox="-3 0 32 32" fill="currentColor" aria-hidden="true">
                <path d="M20.906 20.75c1.313 0.719 2.063 2 1.969 3.281-0.063 0.781-0.094 0.813-1.094 0.938-0.625 0.094-4.563 0.125-8.625 0.125-4.594 0-9.406-0.094-9.75-0.188-1.375-0.344-0.625-2.844 1.188-4.031 1.406-0.906 4.281-2.281 5.063-2.438 1.063-0.219 1.188-0.875 0-3-0.281-0.469-0.594-1.906-0.625-3.406-0.031-2.438 0.438-4.094 2.563-4.906 0.438-0.156 0.875-0.219 1.281-0.219 1.406 0 2.719 0.781 3.25 1.938 0.781 1.531 0.469 5.625-0.344 7.094-0.938 1.656-0.844 2.188 0.188 2.469 0.688 0.188 2.813 1.188 4.938 2.344zM3.906 19.813c-0.5 0.344-0.969 0.781-1.344 1.219-1.188 0-2.094-0.031-2.188-0.063-0.781-0.188-0.344-1.625 0.688-2.25 0.781-0.5 2.375-1.281 2.813-1.375 0.563-0.125 0.688-0.469 0-1.656-0.156-0.25-0.344-1.063-0.344-1.906-0.031-1.375 0.25-2.313 1.438-2.719 1-0.375 2.125 0.094 2.531 0.938 0.406 0.875 0.188 3.125-0.25 3.938-0.5 0.969-0.406 1.219 0.156 1.375 0.125 0.031 0.375 0.156 0.719 0.313-1.375 0.563-3.25 1.594-4.219 2.188zM24.469 18.625c0.75 0.406 1.156 1.094 1.094 1.813-0.031 0.438-0.031 0.469-0.594 0.531-0.156 0.031-0.875 0.063-1.813 0.063-0.406-0.531-0.969-1.031-1.656-1.375-1.281-0.75-2.844-1.563-4-2.063 0.313-0.125 0.594-0.219 0.719-0.25 0.594-0.125 0.688-0.469 0-1.656-0.125-0.25-0.344-1.063-0.344-1.906-0.031-1.375 0.219-2.313 1.406-2.719 1.031-0.375 2.156 0.094 2.531 0.938 0.406 0.875 0.25 3.125-0.188 3.938-0.5 0.969-0.438 1.219 0.094 1.375 0.375 0.125 1.563 0.688 2.75 1.313z" />
            </svg>
        );
    }

    if (name === "friends") {
        return (
            <svg className="se-nav-svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <circle cx="22.83" cy="22.57" r="7.51" />
                <path d="M38,49.94a15.2,15.2,0,0,0-15.21-15.2h0a15.2,15.2,0,0,0-15.2,15.2Z" />
                <circle cx="44.13" cy="27.22" r="6.05" />
                <path d="M42.4,49.94h14A12.24,12.24,0,0,0,44.13,37.7h0a12.21,12.21,0,0,0-5.75,1.43" />
            </svg>
        );
    }

    return name;
}

const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Math.abs(amount));

async function readApiResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed (${response.status}).`);
    }
    return data;
}

const friendInitials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

const formatSettlementDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
};

function ActivityRow({ activity }) {
    const isSettlement = activity.activity_type === "settlement";
    const action = isSettlement
        ? activity.status === "requested"
            ? activity.actor_is_current_user
                ? "You requested settlement"
                : `${activity.actor_name} requested settlement`
            : activity.actor_is_current_user
                ? "You settled"
                : `${activity.actor_name} settled`
        : activity.actor_is_current_user
            ? "You paid"
            : `${activity.actor_name} paid`;
    const context = activity.counterparty_name
        ? `${activity.context} · ${activity.counterparty_name}`
        : activity.context;

    return (
        <div className="se-expense-row">
            <div className={`se-expense-icon ${isSettlement ? "mint" : "lavender"}`}>
                {isSettlement ? "↔" : "₹"}
            </div>
            <div className="se-expense-info">
                <strong>{activity.title}</strong>
                <span>{action} · {context}</span>
            </div>
            <div className="se-expense-amount">
                <strong>{formatMoney(Number(activity.amount))}</strong>
                <span>{formatSettlementDate(activity.created_at)}</span>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { accessToken, authenticatedFetch, setAccessToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [confirmLogout, setConfirmLogout] = useState(false);
    useEffect(() => {
        if (!accessToken) return;
        const fetchMe = async () => {
            try {
                setLoading(true);

                const res = await authenticatedFetch("/api/auth/getme", {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.message || "Failed to fetch user");
                }
                setData(result);
            } catch (error) {
                console.error("Fetch error:", error);
            }
            finally {
                setLoading(false);
            }
        };

        fetchMe();
    }, [accessToken, authenticatedFetch]);

    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "Dashboard";
    const handleTabChange = (tabName) => {
        setSearchParams({ tab: tabName });
    }
    const [isOpen, setIsOpen] = useState(false);
    const [isCompactLayout, setIsCompactLayout] = useState(
        () => window.matchMedia("(max-width: 900px)").matches
    );
    const [menuPortalTarget, setMenuPortalTarget] = useState(null);
    const menuRef = useRef(null);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const setMenuContainer = useCallback((node) => {
        menuRef.current = node;
        setMenuPortalTarget(node);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 900px)");
        const updateLayout = (event) => setIsCompactLayout(event.matches);

        mediaQuery.addEventListener("change", updateLayout);
        return () => mediaQuery.removeEventListener("change", updateLayout);
    }, []);

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                !menuRef.current?.contains(event.target) &&
                !dropdownRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                setIsOpen(false);
                setConfirmLogout(false);
                buttonRef.current?.focus();
            }
        }

        document.addEventListener("click", handleOutsideClick, true);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("click", handleOutsideClick, true);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);


    function closeMenu() {
        setIsOpen(false);
    }

    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(
        activeTab === "Activity" || activeTab === "Dashboard"
    );
    const [activitiesError, setActivitiesError] = useState("");
    const [groups, setGroups] = useState([]);
    const [dataRefresh, setDataRefresh] = useState(0);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [groupsError, setGroupsError] = useState("");
    const [activeNav, setActiveNav] = useState(activeTab);
    const [showNotificationTab, setShowNotificationTab] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [ShowAddGroupForm, setShowAddGroupForm] = useState(false);
    const [ShowAddFriendForm, setShowAddFriendForm] = useState(false);
    const [searchUserResults, setSearchUserResults] = useState([]);
    const [searchUserLoading, setSearchUserLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [searchFriend, setSearchFriend] = useState("");
    const [activeFriendTab, setActiveFriendTab] = useState("search");
    const [friendRequests, setFriendRequests] = useState([]);
    const [friendRequestsLoading, setFriendRequestsLoading] = useState(false);
    const [respondingToRequest, setRespondingToRequest] = useState(null);
    const [friendRequestError, setFriendRequestError] = useState("");
    const [people, setPeople] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [settlementsLoading, setSettlementsLoading] = useState(activeTab === "Settlements");
    const [settlementsError, setSettlementsError] = useState("");
    const [settlementsRefresh, setSettlementsRefresh] = useState(0);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [friendsError, setFriendsError] = useState("");
    const [notice, setNotice] = useState("");
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseTargetType, setExpenseTargetType] = useState("group");
    const [expenseGroupId, setExpenseGroupId] = useState("");
    const [expenseFriendId, setExpenseFriendId] = useState("");
    const [expenseCreationError, setExpenseCreationError] = useState("");
    const [creatingExpense, setCreatingExpense] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [selectedGroupFriendIds, setSelectedGroupFriendIds] = useState([]);
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [groupCreationError, setGroupCreationError] = useState("");
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const updateGreeting = () => {
            const currentHour = new Date().getHours();

            if (currentHour >= 5 && currentHour < 12) {
                setGreeting('Good Morning');
            } else if (currentHour >= 12 && currentHour < 17) {
                setGreeting('Good Afternoon');
            } else if (currentHour >= 17 && currentHour < 21) {
                setGreeting('Good Evening');
            } else {
                setGreeting('Good Night');
            }
        };

        updateGreeting();

        const timer = setInterval(updateGreeting, 60000);

        return () => clearInterval(timer);
    }, []);


    const validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone);

    const searchAddFriends = useCallback(async (identifier) => {
        const phone = validatePhone(identifier) ? identifier : "";
        const username = phone ? "" : identifier;
        const response = await authenticatedFetch("/api/friends/search-add-friend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, phone }),
        });
        return readApiResponse(response);
    }, [authenticatedFetch]);

    const fetchFriendRequests = useCallback(async () => {
        setFriendRequestsLoading(true);
        setFriendRequestError("");
        try {
            const response = await authenticatedFetch("/api/friends/requests");
            const result = await readApiResponse(response);
            setFriendRequests(result.requests ?? []);
        } catch (error) {
            console.error("Failed to load friend requests:", error);
            setFriendRequestError(error.message || "Failed to load friend requests.");
        } finally {
            setFriendRequestsLoading(false);
        }
    }, [authenticatedFetch]);

    useEffect(() => {
        const identifier = searchFriend.trim();

        if (!identifier) {
            const timer = setTimeout(() => {
                setSearchUserResults([]);
                setSearchUserLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        let cancelled = false;

        const timer = setTimeout(async () => {
            try {
                setSearchUserLoading(true);

                const results = await searchAddFriends(identifier);

                if (cancelled) return;

                setSearchUserResults((prevResults) =>
                    results.map((newUser) => {
                        const existingUser = prevResults.find(
                            (user) => user.id === newUser.id
                        );

                        // Preserve a locally updated status
                        if (
                            existingUser?.friendship_status === "request_sent"
                        ) {
                            return {
                                ...newUser,
                                friendship_status: "request_sent",
                            };
                        }

                        return newUser;
                    })
                );
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to search users:", error);
                    setSearchUserResults([]);
                }
            } finally {
                if (!cancelled) {
                    setSearchUserLoading(false);
                }
            }
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchAddFriends, searchFriend]);


    useEffect(() => {
        if (!ShowAddFriendForm || activeFriendTab !== "requests") {
            return;
        }

        const timer = setTimeout(() => {
            void fetchFriendRequests();
        }, 0);
        return () => clearTimeout(timer);
    }, [ShowAddFriendForm, activeFriendTab, fetchFriendRequests]);

    useEffect(() => {
        if (!accessToken) return;

        let cancelled = false;
        const fetchGroups = async () => {
            try {
                setLoadingGroups(true);
                setGroupsError("");
                const response = await authenticatedFetch("/api/groups");
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Could not load groups.");
                }
                if (!Array.isArray(result.groups)) {
                    throw new Error("The groups response was not a list.");
                }
                if (!cancelled) setGroups(result.groups);
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to load groups:", error);
                    setGroupsError(error.message || "Could not load groups.");
                }
            } finally {
                if (!cancelled) setLoadingGroups(false);
            }
        };

        fetchGroups();
        return () => {
            cancelled = true;
        };
    }, [accessToken, authenticatedFetch, dataRefresh]);

    useEffect(() => {
        if (!accessToken || !["Activity", "Dashboard"].includes(activeNav)) return;

        let cancelled = false;
        const fetchActivities = async () => {
            try {
                const response = await authenticatedFetch("/api/activity");
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Could not load recent activity.");
                }
                if (!Array.isArray(result.activities)) {
                    throw new Error("The activity response was not a list.");
                }
                if (!cancelled) {
                    setActivities(result.activities);
                    setActivitiesError("");
                }
            } catch (error) {
                if (!cancelled) {
                    setActivitiesError(error.message || "Could not load recent activity.");
                }
            } finally {
                if (!cancelled) setActivitiesLoading(false);
            }
        };

        void fetchActivities();
        return () => {
            cancelled = true;
        };
    }, [accessToken, activeNav, authenticatedFetch, dataRefresh]);

    useEffect(() => {
        if (!accessToken) return;

        let cancelled = false;
        const fetchFriends = async () => {
            try {
                setLoadingFriends(true);
                setFriendsError("");
                const response = await authenticatedFetch("/api/friends");
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Could not load friends.");
                }
                if (!Array.isArray(data)) {
                    throw new Error("The friends response was not a list.");
                }

                if (!cancelled) setPeople(data);
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to load friends:", error);
                    setFriendsError(error.message || "Could not load friends.");
                }
            } finally {
                if (!cancelled) setLoadingFriends(false);
            }
        };

        fetchFriends();
        return () => {
            cancelled = true;
        };
    }, [accessToken, authenticatedFetch, dataRefresh]);

    useEffect(() => {
        if (!accessToken || activeNav !== "Settlements") return;

        let cancelled = false;
        const fetchSettlements = async () => {
            try {
                setSettlementsError("");
                const response = await authenticatedFetch("/api/friends/settlements");
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Could not load settlements.");
                }
                if (!Array.isArray(result.settlements)) {
                    throw new Error("The settlements response was not a list.");
                }
                if (!cancelled) setSettlements(result.settlements);
            } catch (error) {
                if (!cancelled) {
                    setSettlementsError(error.message || "Could not load settlements.");
                }
            } finally {
                if (!cancelled) setSettlementsLoading(false);
            }
        };

        void fetchSettlements();
        return () => {
            cancelled = true;
        };
    }, [accessToken, activeNav, authenticatedFetch, settlementsRefresh]);

    const avatarColors = [
        "#FCA5A5",
        "#FDBA74",
        "#FDE68A",
        "#86EFAC",
        "#93C5FD",
        "#C4B5FD",
        "#F9A8D4",
        "#67E8F9",
    ];

    const getAvatarColor = (username = "") => {
        const hash = [...username].reduce(
            (sum, char) => sum + char.charCodeAt(0),
            0
        );

        return avatarColors[hash % avatarColors.length];

    };



    const filteredActivities = useMemo(
        () =>
            activities.filter((activity) =>
                `${activity.title} ${activity.context} ${activity.actor_name} ${activity.counterparty_name ?? ""}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
            ),
        [activities, search]
    );
    async function handleAddFriend(receiverId) {
        try {
            const response = await authenticatedFetch("/api/friends/add-friend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId
                })
            })

            const result = await readApiResponse(response);

            setSearchUserResults((prevResults) =>
                prevResults.map((user) =>
                    user.id === receiverId
                        ? { ...user, friendship_status: "request_sent" }
                        : user
                )
            );
            return result;
        }

        catch (error) {
            console.error(error);
            throw error;
        }
    }

    const handleFriendRequestResponse = async (requestId, action) => {
        if (respondingToRequest !== null) {
            return;
        }
        try {
            setRespondingToRequest(requestId);
            setFriendRequestError("");

            const response = await authenticatedFetch(
                `/api/friends/requests/${requestId}/${action}`,
                {
                    method: "POST",
                }
            );
            await readApiResponse(response);

            setFriendRequests((previousRequests) =>
                previousRequests.filter(
                    (request) => request.request_id !== requestId
                )
            );

            if (action === "accept") {
                setDataRefresh((value) => value + 1);
            }
        } catch (error) {
            console.error(error);
            setFriendRequestError(
                error.message || `Failed to ${action} friend request.`
            );
        } finally {
            setRespondingToRequest(null);
        }
    };

    async function handleLogout() {
        try {
            await fetch(apiUrl("/api/auth/logout"), {
                method: "POST",
                credentials: "include",
            });
            navigate("/auth");

        } catch (error) {
            console.error("Logout request failed:", error);
        } finally {
            setAccessToken(null)
        }
    }

    function openExpenseForm() {
        setExpenseCreationError("");
        setExpenseTargetType(
            activeNav === "Friends" ||
            (!loadingGroups && groups.length === 0 && people.length > 0)
                ? "friend"
                : "group"
        );
        setShowExpenseForm(true);
    }

    async function addExpense(event) {
        event.preventDefault();
        const amount = Number(expenseAmount);
        setExpenseCreationError("");
        setCreatingExpense(true);

        try {
            if (!expenseTitle.trim() || !Number.isSafeInteger(amount) || amount <= 0) {
                throw new Error("Enter a description and a whole-number amount greater than zero.");
            }

            let path;
            let payload;

            if (expenseTargetType === "group") {
                const groupId = expenseGroupId || groups[0]?.id;
                if (!groupId) {
                    throw new Error("Create or join a group before adding a group expense.");
                }

                const groupResponse = await authenticatedFetch(`/api/groups/${encodeURIComponent(groupId)}`);
                const groupData = await groupResponse.json();
                if (!groupResponse.ok) {
                    throw new Error(groupData.error || "Could not load group members.");
                }
                if (!Array.isArray(groupData.group?.members) || groupData.group.members.length === 0) {
                    throw new Error("This group has no members available for the expense split.");
                }

                path = `/api/groups/${encodeURIComponent(groupId)}/expenses`;
                payload = {
                    description: expenseTitle.trim(),
                    amount,
                    split: {
                        type: "equal",
                        userIds: groupData.group.members.map((member) => member.id),
                    },
                };
            } else {
                const friendId = expenseFriendId || people[0]?.friend_id;
                if (!friendId) {
                    throw new Error("Add an accepted friend before creating a personal expense.");
                }

                path = `/api/friends/${encodeURIComponent(friendId)}/expenses`;
                payload = {
                    description: expenseTitle.trim(),
                    amount,
                    split: { type: "half" },
                };
            }

            const response = await authenticatedFetch(path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Could not create the expense.");
            }

            setExpenseTitle("");
            setExpenseAmount("");
            setShowExpenseForm(false);
            setNotice("Expense added successfully.");
            setDataRefresh((value) => value + 1);
        } catch (error) {
            setExpenseCreationError(error.message || "Could not create the expense.");
        } finally {
            setCreatingExpense(false);
        }
    }

    async function createGroup(event) {
        event.preventDefault();
        setGroupCreationError("");
        setCreatingGroup(true);

        try {
            const response = await authenticatedFetch("/api/groups/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: groupName.trim(),
                    description: groupDescription.trim(),
                    memberIds: selectedGroupFriendIds,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Could not create group.");
            }
            if (!result.group?.id) {
                throw new Error("The group was created but the response was invalid.");
            }

            const createdGroup = {
                ...result.group,
                member_count: selectedGroupFriendIds.length + 1,
                net_balance: result.group.net_balance ?? 0,
            };
            setGroups((currentGroups) => [createdGroup, ...currentGroups]);
            setShowAddGroupForm(false);
            setGroupName("");
            setGroupDescription("");
            setSelectedGroupFriendIds([]);
            setNotice(
                `“${createdGroup.name}” created with ${selectedGroupFriendIds.length} friend${selectedGroupFriendIds.length === 1 ? "" : "s"}.`
            );
        } catch (error) {
            console.error("Failed to create group:", error);
            setGroupCreationError(error.message || "Could not create group.");
        } finally {
            setCreatingGroup(false);
        }
    }

    function toggleGroupFriend(friendId) {
        setSelectedGroupFriendIds((selectedIds) =>
            selectedIds.includes(friendId)
                ? selectedIds.filter((id) => id !== friendId)
                : [...selectedIds, friendId]
        );
    }

    const groupColors = ["mint", "peach", "lavender", "yellow"];
    const getGroupBalance = (group) => Number(group.net_balance) || 0;
    const getGroupMemberCount = (group) => Number(group.member_count) || 0;
    const friendBalances = people.map((person) => {
        const amount = Number(person.amount) || 0;
        if (person.status === "Owes you") return amount;
        if (person.status === "You owe") return -amount;
        return 0;
    });
    const groupBalances = groups.map(getGroupBalance);
    const allBalances = [...friendBalances, ...groupBalances];
    const incomingTotal = allBalances.reduce(
        (total, balance) => total + Math.max(balance, 0),
        0
    );
    const outgoingTotal = allBalances.reduce(
        (total, balance) => total + Math.max(-balance, 0),
        0
    );
    const netTotal = incomingTotal - outgoingTotal;
    const balancesLoading = loadingFriends || loadingGroups;
    const balancesError = friendsError || groupsError;
    const incomingCount = allBalances.filter((balance) => balance > 0).length;
    const outgoingCount = allBalances.filter((balance) => balance < 0).length;

    const navItems = [
        { label: "Dashboard", icon: "⌂" },
        { label: "Groups", icon: "groups" },
        { label: "Friends", icon: "friends" },
        { label: "Settlements", icon: "⇄" },
        { label: "Activity", icon: "↗" },
    ];

    if (loading) {
        return (
            <div className="loadcontainer">
                <div className="dash uno"></div>
                <div className="dash dos"></div>
                <div className="dash tres"></div>
                <div className="dash cuatro"></div>
            </div>
        );
    }

    return (
        <div className="se-app">
            <aside className="se-sidebar">
                <a href="/workspace" className="se-brand" >
                    <span className="se-brand-mark">
                        <img src="/favicon.svg" alt="" width="40" height="40" />
                    </span>

                    <span >
                        Split<span className="se-brand-light">Ease</span>
                    </span>
                </a>

                <div className="se-workspace-label">WORKSPACE</div>

                <nav className="se-nav">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            className={`se-nav-item ${activeNav === item.label ? "active" : ""
                                }`}
                            onClick={() => {
                                setActiveNav(item.label);
                                if (item.label === "Activity") {
                                    setActivitiesLoading(true);
                                }
                                if (item.label === "Settlements") {
                                    setSettlementsLoading(true);
                                }
                                handleTabChange(item.label)
                                setNotice("");
                            }}
                        >
                            <span className="se-nav-icon"><NavigationIcon name={item.icon} /></span>
                            <span className="se-nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="se-sidebar-bottom">

                    <div className="se-profile" ref={setMenuContainer}>
                        <button
                            ref={buttonRef}
                            type="button"
                            className="se-avatar se-avatar-trigger avatar-green account-menu-trigger"
                            aria-label="Open account menu"
                            aria-haspopup="menu"
                            aria-expanded={isOpen}
                            onClick={() => setIsOpen((prev) => !prev)}
                        >
                            {data?.user?.name?.[0] || "?"}
                        </button>
                        <span className="se-mobile-account-label">Account</span>
                        <div className="se-profile-info">
                            <strong>{data?.user?.name || "Loading account..."}</strong>
                            <span>Personal account</span>
                        </div>
                        <button
                            type="button"
                            className={`se-more account-menu-trigger ${isOpen ? "active" : ""}`}
                            aria-label="Open account menu"
                            aria-haspopup="menu"
                            aria-expanded={isOpen}
                            onClick={() => setIsOpen((prev) => !prev)}
                        >
                            ···
                        </button>
                        {isOpen && menuPortalTarget && createPortal(<div ref={dropdownRef} className="account-dropdown" role="menu">
                            <div className="dropdown-heading">
                                <span className="dropdown-heading-title">Your account</span>
                                <span className="dropdown-heading-subtitle">
                                    Manage your SplitEase account
                                </span>
                            </div>

                            <div className="dropdown-divider" />

                            <nav className="account-menu-links" aria-label="Account options">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.label}
                                        className="account-menu-item"
                                        role="menuitem"
                                        onClick={() => {
                                            closeMenu();
                                            if (item.label === "My Profile" && data?.user?.username) {
                                                navigate(`/${encodeURIComponent(data.user.username)}`);
                                            } else if (item.label === "Account Settings" && data?.user?.username) {
                                                navigate(`/${encodeURIComponent(data.user.username)}#settings`);
                                            } else if (item.label === "Help & Support") {
                                                navigate("/Help");
                                            }
                                        }}
                                    >
                                        <span className="menu-item-icon">
                                            <MenuIcon name={item.icon} />
                                        </span>

                                        <span className="menu-item-content">
                                            <span className="menu-item-label">{item.label}</span>
                                            <span className="menu-item-description">
                                                {item.description}
                                            </span>
                                        </span>

                                        <span className="menu-item-arrow">›</span>
                                    </button>
                                ))}
                            </nav>

                            <div className="dropdown-divider" />

                            <button
                                type="button"
                                className="account-logout-button"
                                role="menuitem"
                                onClick={() => setConfirmLogout(true)}
                            >
                                <span className="menu-item-icon logout-icon">
                                    <MenuIcon name="logout" />
                                </span>
                                <span>Log Out</span>
                            </button>

                            <div className="dropdown-footer">
                                Made for sharing, built for simplicity.
                            </div>
                            {confirmLogout && <div className="logout-overlay1">
                                <div
                                    className="logout-box1"
                                >
                                    <div className="logout-icon1">↗</div>

                                    <h3>Confirm logout?</h3>
                                    <p>
                                        Are you sure you want to log out of SplitEase?
                                    </p>

                                    <div className="logout-actions1">
                                        <button
                                            className="logout-cancel1"
                                            onClick={() => setConfirmLogout(false)}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            className="logout-confirm1"
                                            onClick={handleLogout}
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </div>}
                        </div>, isCompactLayout ? document.body : menuPortalTarget)}
                    </div>
                </div>
            </aside>

            <main className="se-main" id="dashboard">
                <header className="se-topbar">
                    <div className="se-breadcrumb">
                        Workspace <span>/</span> {activeNav}
                    </div>
                    <div className="se-topbar-right">
                        <span className="se-date">Personal finances, simplified.</span>
                        <button
                            className="se-notification"
                            aria-label="Notifications"
                            onClick={() => setShowNotificationTab(true)}
                        >
                            <svg width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M6.31317 12.463C6.20006 9.29213 8.60976 6.6252 11.701 6.5C14.7923 6.6252 17.202 9.29213 17.0889 12.463C17.0889 13.78 18.4841 15.063 18.525 16.383C18.525 16.4017 18.525 16.4203 18.525 16.439C18.5552 17.2847 17.9124 17.9959 17.0879 18.029H13.9757C13.9786 18.677 13.7404 19.3018 13.3098 19.776C12.8957 20.2372 12.3123 20.4996 11.701 20.4996C11.0897 20.4996 10.5064 20.2372 10.0923 19.776C9.66161 19.3018 9.42346 18.677 9.42635 18.029H6.31317C5.48869 17.9959 4.84583 17.2847 4.87602 16.439C4.87602 16.4203 4.87602 16.4017 4.87602 16.383C4.91795 15.067 6.31317 13.781 6.31317 12.463Z" stroke="#666666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M9.42633 17.279C9.01212 17.279 8.67633 17.6148 8.67633 18.029C8.67633 18.4432 9.01212 18.779 9.42633 18.779V17.279ZM13.9757 18.779C14.3899 18.779 14.7257 18.4432 14.7257 18.029C14.7257 17.6148 14.3899 17.279 13.9757 17.279V18.779ZM12.676 5.25C13.0902 5.25 13.426 4.91421 13.426 4.5C13.426 4.08579 13.0902 3.75 12.676 3.75V5.25ZM10.726 3.75C10.3118 3.75 9.97601 4.08579 9.97601 4.5C9.97601 4.91421 10.3118 5.25 10.726 5.25V3.75ZM9.42633 18.779H13.9757V17.279H9.42633V18.779ZM12.676 3.75H10.726V5.25H12.676V3.75Z" fill="#666666"></path> </g></svg>
                            <span />
                        </button>
                    </div>
                </header>

                <div className="se-content">
                    <section className="se-welcome">
                        <div>
                            <div className="se-eyebrow">{
                                new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })
                            }</div>
                            <h1>
                                {activeNav === "Dashboard"
                                    ? greeting + ', ' + (data?.user?.name?.split(' ')[0] || "there")
                                    : activeNav}
                                <span className="se-wave"> ✳</span>
                            </h1>
                            <p>
                                {activeNav === "Dashboard"
                                    ? "Here's what's happening with your shared expenses."
                                    : `Keep track of your ${activeNav.toLowerCase()} in one place.`}
                            </p>
                        </div>

                        <div className="se-actions">
                            <button
                                className="se-btn se-btn-primary"
                                onClick={openExpenseForm}
                            >
                                <span>＋</span> Add expense
                            </button>
                            <button
                                className="se-btn se-btn-secondary"
                                onClick={() => {
                                    setActiveNav("Settlements");
                                    setSettlementsLoading(true);
                                    handleTabChange("Settlements");
                                }}
                            >
                                ↔ Settle up
                            </button>
                            {(activeNav === "Friends" || activeNav === "Groups") && <button
                                className="se-btn se-btn-secondary"
                                onClick={() => {
                                    if (activeNav === "Friends") {
                                        setShowAddFriendForm(true);
                                    } else {
                                        setGroupCreationError("");
                                        setShowAddGroupForm(true);
                                    }
                                }}
                            >
                                <span>＋</span> {activeNav === "Friends" ? "Add friend" : "Add group"}
                            </button>}
                        </div>
                    </section>

                    {notice && (
                        <div className="se-notice" role="status">
                            <span>{notice}</span>
                            <button onClick={() => setNotice("")}>×</button>
                        </div>
                    )}

                    {activeNav === "Dashboard" ? (
                        <>
                            <section className="se-balance-grid">
                                <article className="se-balance-card se-balance-owed">
                                    <div className="se-card-top">
                                        <span className="se-card-icon">↙</span>
                                        <span className="se-card-caption">INCOMING</span>
                                    </div>
                                    <p className="se-card-label">You are owed</p>
                                    <h2>{balancesLoading ? "..." : balancesError ? "—" : formatMoney(incomingTotal)}</h2>
                                    <div className="se-card-foot">
                                        <span className="se-status-dot" />
                                        {balancesError
                                            ? "Could not load balances"
                                            : `Across ${incomingCount} friend${incomingCount === 1 ? "" : "s"} or group${incomingCount === 1 ? "" : "s"}`}
                                    </div>
                                </article>

                                <article className="se-balance-card se-balance-owe">
                                    <div className="se-card-top">
                                        <span className="se-card-icon">↗</span>
                                        <span className="se-card-caption">OUTGOING</span>
                                    </div>
                                    <p className="se-card-label">You owe</p>
                                    <h2>{balancesLoading ? "..." : balancesError ? "—" : formatMoney(outgoingTotal)}</h2>
                                    <div className="se-card-foot">
                                        <span className="se-status-dot" />
                                        {balancesError
                                            ? "Could not load balances"
                                            : `Across ${outgoingCount} friend${outgoingCount === 1 ? "" : "s"} or group${outgoingCount === 1 ? "" : "s"}`}
                                    </div>
                                </article>

                                <article className="se-balance-card se-balance-total">
                                    <div className="se-card-top">
                                        <span className="se-card-icon">◎</span>
                                        <span className="se-card-caption">NET BALANCE</span>
                                        <span className={`se-total-pill ${netTotal < 0 ? "negative" : ""}`}>
                                            {netTotal > 0 ? "Positive" : netTotal < 0 ? "Negative" : "Even"}
                                        </span>
                                    </div>
                                    <p className="se-card-label">Total</p>
                                    <h2 className={netTotal < 0 ? "negative" : ""}>
                                        {balancesLoading
                                            ? "..."
                                            : balancesError
                                                ? "—"
                                                : `${netTotal > 0 ? "+" : netTotal < 0 ? "−" : ""}${formatMoney(netTotal)}`}
                                    </h2>
                                    <div className="se-card-foot">
                                        <span className={`se-status-dot ${netTotal < 0 ? "negative" : ""}`} />
                                        {balancesError
                                            ? "Could not load balances"
                                            : netTotal > 0
                                                ? "You're owed more than you owe"
                                                : netTotal < 0
                                                    ? <span className="negative">You owe more than you're owed</span>
                                                    : "You're all settled up"}
                                    </div>
                                </article>
                            </section>

                            <section className="se-dashboard-grid">
                                <article className="se-panel se-activity-panel">
                                    <div className="se-panel-header">
                                        <div>
                                            <h3>Recent activity</h3>
                                            <p>Your latest activity</p>
                                        </div>
                                        <button
                                            className="se-text-button"
                                            onClick={() => {
                                                setActiveNav("Activity");
                                                setActivitiesLoading(true);
                                                handleTabChange("Activity");
                                            }
                                            }
                                        >
                                            View all <span>↗</span>
                                        </button>
                                    </div>

                                    <label className="se-search">
                                        <span>⌕</span>
                                        <input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search activity..."
                                            aria-label="Search expenses"
                                        />
                                        {search && (
                                            <button
                                                onClick={() => setSearch("")}
                                                aria-label="Clear search"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </label>

                                    <div className="se-expense-list">
                                        {activitiesLoading ? (
                                            <div className="se-empty">Loading recent activity...</div>
                                        ) : activitiesError ? (
                                            <div className="se-empty" role="alert">{activitiesError}</div>
                                        ) : filteredActivities.length ? (
                                            filteredActivities.slice(0, 4).map((activity) => (
                                                <ActivityRow
                                                    key={`${activity.activity_type}:${activity.id}`}
                                                    activity={activity}
                                                />
                                            ))
                                        ) : (
                                            <div className="se-empty">
                                                No activity matches your search.
                                            </div>
                                        )}
                                    </div>
                                </article>

                                <article className="se-panel se-groups-panel">
                                    <div className="se-panel-header">
                                        <div>
                                            <h3>Your groups</h3>
                                            <p>Expenses with your people</p>
                                        </div>
                                        <button
                                            className="se-icon-button"
                                            aria-label="Add group"
                                            onClick={() => {
                                                setGroupCreationError("");
                                                setShowAddGroupForm(true);
                                            }}
                                        >
                                            ＋
                                        </button>
                                    </div>

                                    <div className="se-groups-list">
                                        {loadingGroups ? (
                                            <div className="se-empty">Loading groups...</div>
                                        ) : groupsError ? (
                                            <div className="se-empty" role="alert">{groupsError}</div>
                                        ) : groups.length === 0 ? (
                                            <div className="se-empty">You haven't created any groups yet.</div>
                                        ) : groups.slice(0, 4).map((group, index) => (
                                            <button
                                                className="se-group-row"
                                                key={group.id}
                                                onClick={() => navigate(`/groupchat/${group.id}`)}
                                            >
                                                <span
                                                    className={`se-group-icon ${groupColors[index % groupColors.length]}`}
                                                >
                                                    👥
                                                </span>
                                                <span className="se-group-info">
                                                    <strong>{group.name}</strong>
                                                    <span>{getGroupMemberCount(group)} members</span>
                                                </span>
                                                <span className={`se-group-balance ${getGroupBalance(group) < 0 ? "negative" : ""}`}>
                                                    <strong>
                                                        {getGroupBalance(group) >= 0 ? "+" : "-"}
                                                        {formatMoney(getGroupBalance(group))}
                                                    </strong>
                                                    <span>Your balance</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        className="se-create-group"
                                        onClick={() => setNotice("Group creation coming soon.")}
                                    >
                                        <span>＋</span> Create a new group
                                    </button>
                                </article>
                            </section>

                            <section className="se-panel se-people-panel">
                                <div className="se-panel-header">
                                    <div>
                                        <h3>People & balances</h3>
                                        <p>A quick look at who owes whom</p>
                                    </div>
                                    <button
                                        className="se-text-button"
                                        onClick={() => {
                                            setActiveNav("Friends");
                                            handleTabChange("Friends")
                                        }
                                        }
                                    >
                                        All friends <span>↗</span>
                                    </button>
                                </div>

                                <div className="se-people-grid">
                                    {people.map((person, index) => (
                                        <button
                                            type="button"
                                            className="se-person"
                                            key={person.friend_id}
                                            onClick={() => navigate(`/friendchat/${encodeURIComponent(person.username)}`)}
                                            aria-label={`Open expenses with ${person.friend_name}`}
                                        >
                                            <div
                                                className={`se-avatar ${index % 2 === 0 ? "avatar-green" : "avatar-peach"
                                                    }`}
                                            >
                                                {friendInitials(person.friend_name)}
                                            </div>
                                            <div className="se-person-info">
                                                <strong>{person.friend_name}</strong>
                                                <span>{person.status}</span>
                                            </div>
                                            <div
                                                className={`se-person-amount ${person.status === "Owes you" ? "positive" : person.status === "You owe" ? "negative" : ""
                                                    }`}
                                            >
                                                {formatMoney(person.amount)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                        </>
                    ) : (
                        <section className="se-panel se-section-panel">
                            <div className="se-panel-header">
                                <div>
                                    <h3>{activeNav}</h3>
                                    <p>
                                        {activeNav === "Activity"
                                            ? "Browse your 10 most recent expenses and settlement events."
                                            : activeNav === "Groups"
                                                ? "Explore expenses shared with your groups."
                                                : activeNav === "Friends"
                                                    ? "See your balances with friends."
                                                    : "Review recent settlements and outstanding friend balances."}
                                    </p>
                                </div>
                                {activeNav === "Activity" && (
                                    <button
                                        className="se-btn se-btn-primary"
                                        onClick={openExpenseForm}
                                    >
                                        ＋ Add expense
                                    </button>
                                )}
                            </div>

                            {activeNav === "Activity" && (
                                <>
                                    <label className="se-search">
                                        <span>⌕</span>
                                        <input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search activity..."
                                        />
                                    </label>
                                    {activitiesLoading ? (
                                        <div className="se-empty">Loading recent activity...</div>
                                    ) : activitiesError ? (
                                        <div className="se-empty" role="alert">{activitiesError}</div>
                                    ) : filteredActivities.length ? (
                                        filteredActivities.map((activity) => (
                                            <ActivityRow
                                                key={`${activity.activity_type}:${activity.id}`}
                                                activity={activity}
                                            />
                                        ))
                                    ) : (
                                        <div className="se-empty">No activity matches your search.</div>
                                    )}
                                </>
                            )}

                            {activeNav === "Groups" && (
                                loadingGroups ? (
                                    <div className="se-empty">Loading groups...</div>
                                ) : groupsError ? (
                                    <div className="se-empty" role="alert">{groupsError}</div>
                                ) : groups.length === 0 ? (
                                    <div className="se-empty">You haven't created any groups yet. Create one to get started.</div>
                                ) : (
                                    groups.map((group, index) => (
                                        <button
                                            type="button"
                                            className="se-expense-row"
                                            key={group.id}
                                            onClick={() => navigate(`/groupchat/${group.id}`)}
                                        >
                                            <div className={`se-expense-icon ${groupColors[index % groupColors.length]}`}>
                                                👥
                                            </div>
                                            <div className="se-expense-info">
                                                <strong>{group.name}</strong>
                                                <span>{getGroupMemberCount(group)} members</span>
                                            </div>
                                            <div className="se-expense-amount">
                                                <strong className={getGroupBalance(group) < 0 ? "negative" : ""}>
                                                    {getGroupBalance(group) >= 0 ? "+" : "-"}
                                                    {formatMoney(getGroupBalance(group))}
                                                </strong>
                                                <span>Your balance</span>
                                            </div>
                                        </button>
                                    ))
                                )
                            )}

                            {activeNav === "Friends" && (
                                <div>
                                    {loadingFriends ? (
                                        <p>Loading friends...</p>
                                    ) : friendsError ? (
                                        <p>{friendsError}</p>
                                    ) : people.length === 0 ? (
                                        <p>You haven't added any friends yet.</p>
                                    ) : (
                                        people.map((person) => (
                                            <div className="se-friend-row" key={person.friend_id}>
                                                <button
                                                    type="button"
                                                    className="se-expense-row"
                                                    onClick={() => navigate(`/friendchat/${encodeURIComponent(person.username)}`)}
                                                    aria-label={`Open expenses with ${person.friend_name}`}
                                                >
                                                    <div className="se-avatar avatar-green">
                                                        {friendInitials(person.friend_name)}
                                                    </div>

                                                    <div className="se-expense-info">
                                                        <strong>{person.friend_name}</strong>
                                                        <span>{person.status}</span>
                                                    </div>

                                                    <div className="se-expense-amount">
                                                        <strong className={person.status === "Owes you" ? "negative" : ""}>
                                                            {formatMoney(Math.abs(person.amount))}
                                                        </strong>
                                                    </div>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeNav === "Settlements" && (
                                <div className="settlements-tab-content">
                                    <section className="settlements-section">
                                        <div className="settlements-section-heading">
                                            <div>
                                                <h2>Balances with friends</h2>
                                                <p>Choose a friend to review shared expenses and settle up.</p>
                                            </div>
                                        </div>

                                        {loadingFriends ? (
                                            <p className="settlements-empty">Loading balances...</p>
                                        ) : friendsError ? (
                                            <p className="settlements-empty" role="alert">{friendsError}</p>
                                        ) : people.length === 0 ? (
                                            <p className="settlements-empty">You don’t have any friends to settle with yet.</p>
                                        ) : (
                                            <div className="settlements-friends">
                                                {people.map((friend) => {
                                                    const amount = Number(friend.amount) || 0;
                                                    const owesYou = friend.status === "Owes you";
                                                    const youOwe = friend.status === "You owe";

                                                    return (
                                                        <article className="settlement-friend" key={friend.friend_id}>
                                                            <div className="settlement-friend-avatar" aria-hidden="true">
                                                                {friendInitials(friend.friend_name).charAt(0) || "?"}
                                                            </div>
                                                            <div className="settlement-friend-details">
                                                                <strong>{friend.friend_name}</strong>
                                                                <span>
                                                                    {owesYou ? "Owes you" : youOwe ? "You owe" : "All settled"}
                                                                </span>
                                                            </div>
                                                            <strong className={`settlement-balance ${owesYou ? "is-positive" : youOwe ? "is-negative" : ""}`}>
                                                                {formatMoney(amount)}
                                                            </strong>
                                                            {amount > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    className="settlement-action"
                                                                    onClick={() => navigate(`/friendchat/${encodeURIComponent(friend.username)}`)}
                                                                    disabled={!friend.username}
                                                                >
                                                                    {youOwe ? "Settle up" : "Review"}
                                                                    <span aria-hidden="true">↗</span>
                                                                </button>
                                                            ) : (
                                                                <span className="settlement-complete">✓ Settled</span>
                                                            )}
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>

                                    <section className="settlements-section">
                                        <div className="settlements-section-heading">
                                            <div>
                                                <h2>Recent settlements</h2>
                                                <p>Your latest settlement activity, including requests awaiting confirmation.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="se-text-button"
                                                onClick={() => {
                                                    setSettlementsLoading(true);
                                                    setSettlementsRefresh((value) => value + 1);
                                                }}
                                                disabled={settlementsLoading}
                                            >
                                                Refresh
                                            </button>
                                        </div>

                                        {settlementsLoading ? (
                                            <p className="settlements-empty">Loading settlement history...</p>
                                        ) : settlementsError ? (
                                            <div className="settlements-error" role="alert">
                                                <span>{settlementsError}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSettlementsLoading(true);
                                                        setSettlementsRefresh((value) => value + 1);
                                                    }}
                                                >
                                                    Try again
                                                </button>
                                            </div>
                                        ) : settlements.length === 0 ? (
                                            <p className="settlements-empty">No settlements or settlement requests yet.</p>
                                        ) : (
                                            <div className="settlements-history">
                                                {settlements.map((settlement) => {
                                                    const paidByUser = settlement.direction === "paid";
                                                    const statusText = settlement.status === "accepted"
                                                        ? "Completed"
                                                        : paidByUser
                                                            ? "Awaiting confirmation"
                                                            : "Needs your confirmation";

                                                    return (
                                                        <article className="settlement-history-row" key={settlement.id}>
                                                            <span className={`settlement-history-icon ${settlement.status === "accepted" ? "is-complete" : ""}`}>
                                                                {settlement.status === "accepted" ? "✓" : "◷"}
                                                            </span>
                                                            <div className="settlement-history-details">
                                                                <strong>{settlement.friend_name}</strong>
                                                                <span>{settlement.expense_description} · {formatSettlementDate(settlement.created_at)}</span>
                                                            </div>
                                                            <div className="settlement-history-amount">
                                                                <strong>{formatMoney(Number(settlement.amount))}</strong>
                                                                <span>{statusText}</span>
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}

                        </section>
                    )}

                    <footer className="se-footer">
                        <span>SplitEase</span>
                        <span>Less awkward money talks. More good times.</span>
                    </footer>
                </div>
            </main>

            {showExpenseForm && (
                <div
                    className="se-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !creatingExpense) {
                            setShowExpenseForm(false);
                        }
                    }}
                >
                    <form className="se-modal" onSubmit={addExpense}>
                        <div className="se-modal-header">
                            <div>
                                <h2>Add an expense</h2>
                                <p>Choose a group or friend to share this expense with.</p>
                            </div>
                            <button
                                type="button"
                                className="se-modal-close"
                                onClick={() => setShowExpenseForm(false)}
                                disabled={creatingExpense}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        {expenseCreationError && (
                            <div className="se-empty" role="alert">{expenseCreationError}</div>
                        )}

                        <label className="se-field">
                            Expense name
                            <input
                                required
                                autoFocus
                                value={expenseTitle}
                                onChange={(event) => {
                                    setExpenseTitle(event.target.value);
                                    setExpenseCreationError("");
                                }}
                                placeholder="e.g. Dinner, groceries"
                                maxLength={255}
                            />
                        </label>

                        <label className="se-field">
                            Total amount (₹)
                            <input
                                required
                                min="1"
                                step="1"
                                type="number"
                                value={expenseAmount}
                                onChange={(event) => {
                                    setExpenseAmount(event.target.value);
                                    setExpenseCreationError("");
                                }}
                                placeholder="0"
                            />
                        </label>

                        <label className="se-field">
                            Expense type
                            <select
                                value={expenseTargetType}
                                onChange={(event) => {
                                    setExpenseTargetType(event.target.value);
                                    setExpenseCreationError("");
                                }}
                            >
                                <option value="group">Group expense</option>
                                <option value="friend">Personal expense with a friend</option>
                            </select>
                        </label>

                        {expenseTargetType === "group" ? (
                            <label className="se-field">
                                Group
                                <select
                                    required
                                    value={expenseGroupId || groups[0]?.id || ""}
                                    onChange={(event) => setExpenseGroupId(event.target.value)}
                                    disabled={loadingGroups || groups.length === 0}
                                >
                                    {groups.length === 0
                                        ? <option value="">No groups available</option>
                                        : groups.map((group) => (
                                            <option key={group.id} value={group.id}>{group.name}</option>
                                        ))}
                                </select>
                            </label>
                        ) : (
                            <label className="se-field">
                                Friend
                                <select
                                    required
                                    value={expenseFriendId || people[0]?.friend_id || ""}
                                    onChange={(event) => setExpenseFriendId(event.target.value)}
                                    disabled={loadingFriends || people.length === 0}
                                >
                                    {people.length === 0
                                        ? <option value="">No friends available</option>
                                        : people.map((friend) => (
                                            <option key={friend.friend_id} value={friend.friend_id}>
                                                {friend.friend_name}
                                            </option>
                                        ))}
                                </select>
                            </label>
                        )}

                        <p className="se-field-hint">
                            {expenseTargetType === "group"
                                ? "This expense will be split equally among all group members."
                                : "This expense will be split equally between you and your friend."}
                        </p>

                        <button
                            className="se-btn se-btn-primary se-submit"
                            type="submit"
                            disabled={creatingExpense || (
                                expenseTargetType === "group"
                                    ? loadingGroups || groups.length === 0
                                    : loadingFriends || people.length === 0
                            )}
                        >
                            {creatingExpense ? "Saving..." : "Save expense"}
                        </button>
                    </form>
                </div>
            )}

            {ShowAddGroupForm && (
                <div
                    className="se-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !creatingGroup) {
                            setShowAddGroupForm(false);
                        }
                    }}
                >
                    <form className="se-modal" onSubmit={createGroup}>
                        <div className="se-modal-header">
                            <div>
                                <h2>Create a group</h2>
                                <p>Add a name and choose friends to include.</p>
                            </div>
                            <button
                                type="button"
                                className="se-modal-close"
                                onClick={() => setShowAddGroupForm(false)}
                                disabled={creatingGroup}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <label className="se-field">
                            Group name
                            <input
                                required
                                autoFocus
                                minLength="2"
                                maxLength="50"
                                value={groupName}
                                onChange={(event) => setGroupName(event.target.value)}
                                placeholder="e.g. Flatmates, Goa trip"
                            />
                        </label>

                        <label className="se-field">
                            Description (optional)
                            <input
                                maxLength="200"
                                value={groupDescription}
                                onChange={(event) => setGroupDescription(event.target.value)}
                                placeholder="What is this group for?"
                            />
                        </label>

                        <fieldset className="se-group-friends">
                            <legend>
                                Add friends
                                {selectedGroupFriendIds.length > 0 &&
                                    ` (${selectedGroupFriendIds.length} selected)`}
                            </legend>
                            {loadingFriends ? (
                                <p className="group-friends-message">Loading friends...</p>
                            ) : friendsError ? (
                                <p className="group-friends-message" role="alert">{friendsError}</p>
                            ) : people.length === 0 ? (
                                <p className="group-friends-message">You don't have any friends to add yet.</p>
                            ) : (
                                <div className="se-group-friend-list">
                                    {people.map((friend) => (
                                        <label className="se-group-friend" key={friend.friend_id}>
                                            <input
                                                type="checkbox"
                                                checked={selectedGroupFriendIds.includes(friend.friend_id)}
                                                onChange={() => toggleGroupFriend(friend.friend_id)}
                                            />
                                            <span className="se-avatar avatar-green">
                                                {friendInitials(friend.friend_name)}
                                            </span>
                                            <span className="se-group-friend-info">
                                                <strong>{friend.friend_name}</strong>
                                                <span>@{friend.username}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </fieldset>

                        {groupCreationError && (
                            <p className="se-form-error" role="alert">{groupCreationError}</p>
                        )}

                        <button
                            className="se-btn se-btn-primary se-submit"
                            type="submit"
                            disabled={creatingGroup}
                        >
                            {creatingGroup ? "Creating group..." : "Create group"}
                        </button>
                    </form>
                </div>
            )}

            {ShowAddFriendForm && (
                <div className="se-modal-backdrop">
                    <div className="se-modal">
                        {/* Header */}
                        <div className="se-modal-header">
                            <div>
                                <h2>Add a friend</h2>
                                <p>Find friends or manage your friend requests.</p>
                            </div>

                            <button
                                type="button"
                                className="se-modal-close"
                                onClick={() => setShowAddFriendForm(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="friend-tabs">
                            <button
                                type="button"
                                className={`friend-tab ${activeFriendTab === "search" ? "active" : ""
                                    }`}
                                onClick={() => setActiveFriendTab("search")}
                            >
                                Find Friends
                            </button>

                            <button
                                type="button"
                                className={`friend-tab ${activeFriendTab === "requests" ? "active" : ""
                                    }`}
                                onClick={() => setActiveFriendTab("requests")}
                            >
                                Friend Requests
                                {friendRequests?.length > 0 && (
                                    <span className="friend-request-badge">
                                        {friendRequests.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Section 1: Find Friends */}
                        {activeFriendTab === "search" && (
                            <div className="friend-tab-content">
                                <div className="friend-search">
                                    <span className="search-icon" aria-hidden="true">
                                        <svg
                                            width="20px"
                                            height="20px"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M16.6725 16.6412L21 21M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
                                                stroke="#6b7280"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </span>

                                    <input
                                        type="text"
                                        placeholder="Search by name or username..."
                                        value={searchFriend}
                                        onChange={(e) => setSearchFriend(e.target.value)}
                                        aria-label="Search friends"
                                    />

                                    {searchFriend && (
                                        <button
                                            type="button"
                                            className="clear-search"
                                            onClick={() => setSearchFriend("")}
                                            aria-label="Clear search"
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>

                                {searchUserLoading && (
                                    <p className="friend-status-message">
                                        Searching users...
                                    </p>
                                )}

                                {!searchUserLoading &&
                                    searchFriend.trim() &&
                                    searchUserResults.length === 0 && (
                                        <p className="friend-status-message">
                                            No users found.
                                        </p>
                                    )}

                                {!searchUserLoading &&
                                    !searchFriend.trim() && (
                                        <p className="friend-status-message">
                                            Search for people by name or username.
                                        </p>
                                    )}

                                <div className="search-friend-results">
                                    {searchUserResults.map((user) => (
                                        <div

                                            key={user.username}
                                            className="search-friend-result"
                                        >
                                            <div
                                                className="search-friend-avatar"
                                                style={{
                                                    backgroundColor: getAvatarColor(
                                                        user.name
                                                    ),
                                                }}
                                            >
                                                {(user.name || user.username || "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="search-friend-info" 
                                            onClick={() => navigate(`/${encodeURIComponent(user.username)}`)}>
                                                <span>{user.username}</span>
                                                <span>{user.name}</span>
                                            </div>

                                            {user.friendship_status === "friends" ? (
                                                <button disabled>Friends ✓</button>
                                            ) : user.friendship_status === "request_sent" ? (
                                                <button disabled>Request Sent</button>
                                            ) : user.friendship_status === "request_received" ? (
                                                <button onClick={() => setActiveFriendTab("requests")}>Accept Request</button>
                                            ) : (<button onClick={() => handleAddFriend(user.id)}>
                                                Add Friend
                                            </button>
                                            )
                                            }
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section 2: Friend Requests */}
                        {activeFriendTab === "requests" && (
                            <div className="friend-tab-content">
                                {friendRequestsLoading && (
                                    <p className="friend-status-message">
                                        Loading friend requests...
                                    </p>
                                )}

                                {friendRequestError && (
                                    <p className="friend-error-message">
                                        {friendRequestError}
                                    </p>
                                )}

                                {!friendRequestsLoading &&
                                    !friendRequestError &&
                                    friendRequests.length === 0 && (
                                        <p className="friend-status-message">
                                            You don't have any pending friend requests.
                                        </p>
                                    )}

                                <div className="search-friend-results">
                                    {friendRequests.map((request) =>
                                    (
                                        <div
                                            key={request.request_id}
                                            className="search-friend-result"
                                        >
                                            <div
                                                className="search-friend-avatar"
                                                style={{
                                                    backgroundColor: getAvatarColor(
                                                        request.name
                                                    ),
                                                }}
                                            >
                                                {(request.name || request.username || "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="search-friend-info">
                                                <span>{request.username}</span>
                                                <span>{request.name}</span>
                                            </div>

                                            <div className="friend-request-actions">
                                                <button
                                                    type="button"
                                                    className="accept-request-btn"
                                                    disabled={
                                                        respondingToRequest === request.request_id
                                                    }
                                                    onClick={() =>
                                                        handleFriendRequestResponse(
                                                            request.request_id,
                                                            "accept"
                                                        )
                                                    }
                                                >
                                                    {respondingToRequest === request.request_id ? "Please wait..." : "Accept"}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="decline-request-btn"
                                                    disabled={
                                                        respondingToRequest === request.request_id
                                                    }
                                                    onClick={() =>
                                                        handleFriendRequestResponse(
                                                            request.request_id,
                                                            "reject"
                                                        )
                                                    }
                                                >
                                                    {respondingToRequest === request.request_id ? "Please wait..." : "Reject"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showNotificationTab && (
                <Notifications onClose={() => setShowNotificationTab(false)} />
            )}
        </div>
    );
}
