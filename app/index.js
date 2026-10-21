document.addEventListener('DOMContentLoaded', function() {
    if (window.__FIORI_APP_CONFIG) {
        return; // Sub-app runner handles its own UI lifecycle
    }
    const session = getFioriSession();
    if (session) {
        renderLaunchpadForSession(session);
    } else {
        showLoginView();
    }
    loadLiveKPIData();
});

function showLoginView() {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('launchpad-view').style.display = 'none';
}

function renderLaunchpadForSession(session) {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('launchpad-view').style.display = 'flex';

    const roleCfg = window.FIORI_ROLES_CONFIG[session.role] || window.FIORI_ROLES_CONFIG['Admin'];

    // Header info
    document.getElementById('shell-user-avatar').textContent = session.avatar || 'AD';
    document.getElementById('shell-user-avatar').style.backgroundColor = roleCfg.color || '#0070f2';
    document.getElementById('shell-user-name').textContent = session.name;
    document.getElementById('shell-user-role').textContent = session.role;


    // Filter tiles by role
    const tiles = document.querySelectorAll('.fiori-tile');
    tiles.forEach(tile => {
        const allowedRoles = (tile.getAttribute('data-roles') || '').split(',').map(s => s.trim());
        tile.style.display = (session.role === 'Admin' || allowedRoles.includes(session.role)) ? 'flex' : 'none';
    });

    // Display KPIs only for Admin role (hidden for other roles)
    const kpiBanner = document.getElementById('kpi-banner');
    if (kpiBanner) {
        kpiBanner.style.display = session.role === 'Admin' ? 'grid' : 'none';
    }

    if (session.role === 'Admin') {
        renderAdminKPIs();
    }
}

function handleFormLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value.trim();

    const userEntry = window.FIORI_USERS[usernameInput];
    if (!userEntry) {
        showLoginError('User "' + usernameInput + '" not found. Try: admin, inspector, finance, technician.');
        return;
    }

    if (userEntry.pass !== passwordInput && passwordInput !== 'password123' && passwordInput !== 'admin123') {
        showLoginError('Incorrect password for ' + usernameInput + '. (Demo password: ' + userEntry.pass + ')');
        return;
    }

    hideLoginError();
    const session = setFioriSession(usernameInput);
    renderLaunchpadForSession(session);
}

function quickLogin(username) {
    hideLoginError();
    const session = setFioriSession(username);
    renderLaunchpadForSession(session);
}

function handleLogout() {
    clearFioriSession();
    showLoginView();
}

function showLoginError(msg) {
    const errBox = document.getElementById('login-error-box');
    const errMsg = document.getElementById('login-error-msg');
    errMsg.textContent = msg;
    errBox.style.display = 'flex';
}

function hideLoginError() {
    document.getElementById('login-error-box').style.display = 'none';
}

function openSwitchModal() {
    document.getElementById('switch-modal').style.display = 'flex';
}

function closeSwitchModal() {
    document.getElementById('switch-modal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('switch-modal');
    if (event.target === modal) {
        closeSwitchModal();
    }
};

// Admin Executive KPI Definitions
const ADMIN_KPI_CONFIG = [
    {
        label: 'Available Fleet',
        icon: '🚜',
        theme: 'success',
        targetUrl: '/fleet-overview/webapp/index.html',
        getValue: (d) => `${d?.admin?.available ?? 0} Assets`
    },
    {
        label: 'Rented Out Fleet',
        icon: '📑',
        theme: 'primary',
        targetUrl: '/rentals/webapp/index.html',
        getValue: (d) => `${d?.admin?.rented ?? 0} Assets`
    },
    {
        label: 'Pending Damage Bill',
        icon: '💳',
        theme: 'warning',
        targetUrl: '/damage-charge-approval/webapp/index.html',
        getValue: (d) => '₹' + Math.round(d?.admin?.pendingAmount ?? 0).toLocaleString('en-IN')
    },
    {
        label: 'Quarantined / Damaged',
        icon: '🔧',
        theme: 'error',
        targetUrl: '/repair-jobs/webapp/index.html',
        getValue: (d) => `${d?.admin?.damaged ?? 0} Assets`
    }
];

let cachedKPIData = null;

function renderAdminKPIs() {
    for (let i = 0; i < 4; i++) {
        const slotIndex = i + 1;
        const config = ADMIN_KPI_CONFIG[i];
        const cardElem = document.getElementById(`kpi-slot-${slotIndex}`);
        const labelElem = document.getElementById(`kpi-label-${slotIndex}`);
        const iconElem = document.getElementById(`kpi-icon-${slotIndex}`);
        const valElem = document.getElementById(`kpi-value-${slotIndex}`);

        if (cardElem && config) {
            cardElem.classList.remove('success', 'warning', 'error');
            if (config.theme && config.theme !== 'primary') {
                cardElem.classList.add(config.theme);
            }
            cardElem.onclick = () => window.location.href = config.targetUrl;
            if (labelElem) labelElem.textContent = config.label;
            if (iconElem) iconElem.textContent = config.icon;
            if (valElem) {
                valElem.textContent = cachedKPIData ? config.getValue(cachedKPIData) : '...';
            }
        }
    }
}

async function loadLiveKPIData() {
    try {
        const res = await fetch('/api/live-kpis');
        if (res.ok) {
            cachedKPIData = await res.json();
            const session = getFioriSession();
            if (session && session.role === 'Admin') {
                renderAdminKPIs();
            }
        }
    } catch (err) {
        console.log('KPI load info:', err.message);
    }
}
