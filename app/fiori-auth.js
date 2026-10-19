/**
 * SAP Fiori Enterprise Role-Based Access Control (RBAC) & Navigation Guard
 * Shared across all Fiori Elements applications in the Rental Equipment suite.
 */

const FIORI_ROLES_CONFIG = {
    'Admin': {
        name: 'Vikram Mehta',
        title: 'System Administrator',
        avatar: 'VM',
        color: '#0070f2',
        apps: ['customer-management', 'rentals', 'locations', 'fleet-overview', 'inspections', 'inspection-review', 'damage-management', 'damage-charge-approval', 'repair-jobs', 'maintenance-planner', 'configuration']
    },
    'Dispatcher': {
        name: 'Kavita Reddy',
        title: 'Rental Dispatcher & Coordinator',
        avatar: 'KR',
        color: '#00838f',
        apps: ['customer-management', 'rentals', 'locations', 'fleet-overview', 'inspections', 'inspection-review', 'damage-management']
    },
    'YardWorker': {
        name: 'Ramesh Patel',
        title: 'Senior Yard Inspector',
        avatar: 'RP',
        color: '#107e3e',
        apps: ['fleet-overview', 'locations', 'inspections', 'inspection-review', 'damage-management']
    },
    'BillingClerk': {
        name: 'Ananya Sharma',
        title: 'Billing & Dispute Specialist',
        avatar: 'AS',
        color: '#8e44ad',
        apps: ['rentals', 'damage-charge-approval', 'configuration', 'damage-management']
    },
    'Technician': {
        name: 'Mike D\'souza',
        title: 'Lead Workshop Technician',
        avatar: 'MD',
        color: '#e67e22',
        apps: ['repair-jobs', 'maintenance-planner', 'fleet-overview', 'locations', 'damage-management']
    },
    'Manager': {
        name: 'Sanjay Verma',
        title: 'Operations & Fleet Director',
        avatar: 'SV',
        color: '#2980b9',
        apps: ['customer-management', 'rentals', 'locations', 'fleet-overview', 'inspections', 'inspection-review', 'damage-management', 'damage-charge-approval', 'repair-jobs', 'maintenance-planner', 'configuration']
    },
    'Auditor': {
        name: 'Pooja Nair',
        title: 'Compliance & Quality Auditor',
        avatar: 'PN',
        color: '#d35400',
        apps: ['customer-management', 'rentals', 'locations', 'fleet-overview', 'inspections', 'inspection-review', 'damage-management', 'damage-charge-approval']
    }
};

const FIORI_USERS = {
    'admin': { role: 'Admin', pass: 'admin123' },
    'dispatcher': { role: 'Dispatcher', pass: 'disp123' },
    'inspector': { role: 'YardWorker', pass: 'yard123' },
    'finance': { role: 'BillingClerk', pass: 'finance123' },
    'technician': { role: 'Technician', pass: 'tech123' },
    'manager': { role: 'Manager', pass: 'mgr123' },
    'auditor': { role: 'Auditor', pass: 'audit123' }
};

// Check current user session
function getFioriSession() {
    try {
        const raw = localStorage.getItem('fiori_user_session');
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to read fiori_user_session', e);
    }
    return null;
}

function setFioriSession(username) {
    const userCfg = FIORI_USERS[username] || { role: 'Admin' };
    const roleCfg = FIORI_ROLES_CONFIG[userCfg.role] || FIORI_ROLES_CONFIG['Admin'];
    const session = {
        username: username,
        role: userCfg.role,
        name: roleCfg.name,
        title: roleCfg.title,
        avatar: roleCfg.avatar,
        plant: 'PLANT-AHMD (Ahmedabad Yard)',
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('fiori_user_session', JSON.stringify(session));
    return session;
}

function clearFioriSession() {
    localStorage.removeItem('fiori_user_session');
}

// In sub-apps: Guard access and render top Fiori navigation bar
function initSubAppGuard(currentAppId, currentAppTitle) {
    let session = getFioriSession();
    
    // Default to admin if no session exists yet for smooth local testing
    if (!session) {
        session = setFioriSession('admin');
    }

    const roleCfg = FIORI_ROLES_CONFIG[session.role];
    const isAllowed = roleCfg && (roleCfg.apps.includes(currentAppId) || session.role === 'Admin');

    if (!isAllowed) {
        // Render Access Denied Screen
        document.addEventListener('DOMContentLoaded', function () {
            document.body.innerHTML = `
                <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f5f6f7; font-family:'72', -apple-system, sans-serif; text-align:center; padding:2rem;">
                    <div style="background:#ffffff; border-radius:12px; padding:3rem; max-width:550px; box-shadow:0 10px 30px rgba(0,0,0,0.1); border-top:5px solid #bb0000;">
                        <div style="font-size:3.5rem; margin-bottom:1rem;">🚫</div>
                        <h2 style="color:#1d2d3e; font-size:1.6rem; margin-bottom:0.75rem;">Authorization Required</h2>
                        <p style="color:#556b82; font-size:0.95rem; line-height:1.5; margin-bottom:1.5rem;">
                            You are logged in as <strong>${session.name}</strong> (<span style="color:#0070f2; font-weight:600;">${roleCfg ? roleCfg.title : session.role}</span>).
                            Your current role does not have authorization to access <strong>${currentAppTitle || currentAppId}</strong>.
                        </p>
                        <div style="background:#fff3cd; color:#856404; padding:0.75rem 1rem; border-radius:6px; font-size:0.85rem; margin-bottom:1.75rem; border:1px solid #ffeeba;">
                            Allowed Roles: <strong>${getAllowedRolesForApp(currentAppId).join(', ')}</strong>
                        </div>
                        <a href="/index.html" style="display:inline-block; background:#0070f2; color:#fff; text-decoration:none; padding:0.75rem 1.75rem; border-radius:6px; font-weight:600; font-size:0.95rem; box-shadow:0 2px 6px rgba(0,112,242,0.3);">
                            &larr; Return to SAP Fiori Launchpad
                        </a>
                    </div>
                </div>
            `;
        });
        return false;
    }

    // Insert slim top Fiori Shell bar
    document.addEventListener('DOMContentLoaded', function () {
        const topBar = document.createElement('div');
        topBar.id = 'fiori-subapp-topbar';
        topBar.style.cssText = `
            height: 42px;
            background: linear-gradient(135deg, #1d2d3e 0%, #0d1926 100%);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.25rem;
            font-family: '72', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 0.85rem;
            position: relative;
            z-index: 99999;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            flex-shrink: 0;
        `;

        topBar.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                <a href="/index.html" style="color:#ffffff; text-decoration:none; display:flex; align-items:center; gap:0.4rem; font-weight:600; font-size:0.85rem; background:rgba(255,255,255,0.12); padding:0.25rem 0.65rem; border-radius:4px; border:1px solid rgba(255,255,255,0.2); transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.22)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">
                    <span>&larr;</span>
                    <span>Launchpad</span>
                </a>
                <span style="color:#9cb5cf;">|</span>
                <span style="font-weight:700; color:#fff; letter-spacing:0.2px;">${currentAppTitle || 'SAP Fiori Application'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
                <span style="background:#0070f2; color:#fff; font-size:0.7rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:10px; text-transform:uppercase;">
                    ${session.role}
                </span>
                <div style="width:26px; height:26px; border-radius:50%; background:${roleCfg ? roleCfg.color : '#0070f2'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">
                    ${session.avatar}
                </div>
                <span style="color:#e1e7ed; font-size:0.8rem; font-weight:500;">${session.name.split(' ')[0]}</span>
                <span style="color:#809fb8; font-size:0.75rem;">(${session.plant.split(' ')[0]})</span>
            </div>
        `;

        document.body.prepend(topBar);

        // Automatic draft discard mechanism for new unsaved records
        const APP_SERVICE_MAP = {
            'customer-management': '/rental/',
            'rentals': '/rental/',
            'locations': '/rental/',
            'fleet-overview': '/rental/',
            'inspections': '/inspection/',
            'damage-management': '/inspection/',
            'inspection-review': '/inspection/',
            'damage-charge-approval': '/billing/',
            'configuration': '/billing/',
            'repair-jobs': '/maintenance/',
            'maintenance-planner': '/maintenance/'
        };
        const currentServiceRoot = APP_SERVICE_MAP[currentAppId] || '/rental/';

        function getDraftPathFromHash(hash) {
            if (!hash || !hash.includes('IsActiveEntity=false')) return null;
            const cleanHash = hash.replace(/^[#/]+/, '').split('?')[0];
            const match = cleanHash.match(/([a-zA-Z0-9_]+)\(([^)]*IsActiveEntity=false[^)]*)\)/);
            if (match) {
                return `${match[1]}(${match[2]})`;
            }
            return null;
        }

        async function discardDraftUrl(draftPath) {
            if (!draftPath) return;
            try {
                const fullUrl = currentServiceRoot + draftPath;
                await fetch(fullUrl, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                console.warn('Draft cleanup notice:', err);
            }
        }

        function refreshUI5List() {
            try {
                if (window.sap && sap.ui && sap.ui.core) {
                    const compId = document.querySelector('[data-sap-ui-component]')?.getAttribute('data-id');
                    const comp = compId && sap.ui.core.Component.get(compId);
                    if (comp && comp.getModel()) {
                        comp.getModel().refresh();
                    }
                }
            } catch (e) {}
        }

        // 1. Discard draft when clicking "<- Launchpad"
        const launchpadLink = topBar.querySelector('a');
        if (launchpadLink) {
            launchpadLink.addEventListener('click', async function (e) {
                e.preventDefault();
                const currentDraft = getDraftPathFromHash(window.location.hash);
                if (currentDraft) {
                    await discardDraftUrl(currentDraft);
                }
                window.location.href = '/index.html';
            });
        }

        // 2. Discard draft if user navigates back to the List Report without saving/activating
        window.addEventListener('hashchange', async function (event) {
            const oldHash = event.oldURL ? event.oldURL.split('#')[1] || '' : '';
            const newHash = event.newURL ? event.newURL.split('#')[1] || '' : '';

            // If user was on a new draft and navigated away WITHOUT activating (active entity URL contains IsActiveEntity=true)
            if (oldHash.includes('IsActiveEntity=false') && !newHash.includes('IsActiveEntity=true')) {
                const draftPath = getDraftPathFromHash(oldHash);
                if (draftPath) {
                    await discardDraftUrl(draftPath);
                    setTimeout(refreshUI5List, 150);
                }
            }
        });

        // 3. Discard draft on browser tab close or refresh
        window.addEventListener('beforeunload', function () {
            const currentDraft = getDraftPathFromHash(window.location.hash);
            if (currentDraft) {
                fetch(currentServiceRoot + currentDraft, {
                    method: 'DELETE',
                    keepalive: true
                }).catch(() => {});
            }
        });

        // Ensure clean flex layout so the bottom footer bar (Create / Save) is never pushed below the screen
        document.documentElement.style.height = '100%';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        document.documentElement.style.overflow = 'hidden';

        document.body.style.height = '100vh';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
        document.body.style.display = 'flex';
        document.body.style.flexDirection = 'column';
        document.body.style.position = 'relative';
        document.body.style.top = '0';

        const comp = document.querySelector('[data-sap-ui-component]');
        if (comp) {
            comp.style.height = 'calc(100vh - 42px)';
            comp.style.flex = '1 1 auto';
            comp.style.position = 'relative';
            comp.style.overflow = 'hidden';
        }
    });

    return true;
}

function getAllowedRolesForApp(appId) {
    const allowed = [];
    for (const [role, cfg] of Object.entries(FIORI_ROLES_CONFIG)) {
        if (cfg.apps.includes(appId)) {
            allowed.push(role);
        }
    }
    return allowed;
}

// Export globals
window.FIORI_ROLES_CONFIG = FIORI_ROLES_CONFIG;
window.FIORI_USERS = FIORI_USERS;
window.getFioriSession = getFioriSession;
window.setFioriSession = setFioriSession;
window.clearFioriSession = clearFioriSession;
window.initSubAppGuard = initSubAppGuard;
