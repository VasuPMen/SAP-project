document.addEventListener('DOMContentLoaded', async function () {
    if (window.__FIORI_APP_CONFIG) {
        return; // Sub-app runner handles its own UI lifecycle
    }

    try {
        const res = await fetch('/api/user-info', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const roleCfg = (window.FIORI_ROLES_CONFIG && window.FIORI_ROLES_CONFIG[data.role]) || { title: data.role || 'User', color: '#0070f2' };
            const session = {
                username: data.id || 'user',
                role: data.role || 'Guest',
                name: data.name || data.id || 'User',
                title: roleCfg.title || 'User',
                avatar: data.name ? data.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : (data.role ? data.role.substring(0, 2).toUpperCase() : 'US'),
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('fiori_user_session', JSON.stringify(session));
            renderLaunchpadForSession(session);
        } else {
            const cached = getFioriSession();
            if (cached) renderLaunchpadForSession(cached);
        }
    } catch (e) {
        console.warn('Could not fetch /api/user-info:', e.message);
        const cached = getFioriSession();
        if (cached) renderLaunchpadForSession(cached);
    }
    loadLiveKPIData();
});

function renderLaunchpadForSession(session) {
    const launchpad = document.getElementById('launchpad-view');
    if (launchpad) {
        launchpad.style.display = 'flex';
    }

    const roleCfg = window.FIORI_ROLES_CONFIG[session.role] || window.FIORI_ROLES_CONFIG['Admin'];

    // Header info (only show role badge, no user name)
    const capsuleEl = document.getElementById('shell-user-capsule');
    if (capsuleEl) {
        capsuleEl.style.opacity = '1';
    }
    const roleEl = document.getElementById('shell-user-role');
    if (roleEl) {
        roleEl.textContent = session.role;
        if (roleCfg && roleCfg.color) {
            roleEl.style.backgroundColor = roleCfg.color;
        }
    }

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

function handleLogout() {
    clearFioriSession();
    // Redirect through Approuter logout endpoint to clear XSUAA session and return to SAP login
    window.location.href = '/my/logout';
}

// Admin Executive KPI Definitions
const ADMIN_KPI_CONFIG = [
    {
        label: 'Available Fleet',
        icon: '🚜',
        theme: 'success',
        targetUrl: '/index.html?app=fleet-overview',
        getValue: (d) => `${d?.admin?.available ?? 0} Assets`
    },
    {
        label: 'Rented Out Fleet',
        icon: '📑',
        theme: 'primary',
        targetUrl: '/index.html?app=rentals',
        getValue: (d) => `${d?.admin?.rented ?? 0} Assets`
    },
    {
        label: 'Pending Damage Bill',
        icon: '💳',
        theme: 'warning',
        targetUrl: '/index.html?app=damage-charge-approval',
        getValue: (d) => '₹' + Math.round(d?.admin?.pendingAmount ?? 0).toLocaleString('en-IN')
    },
    {
        label: 'Quarantined / Damaged',
        icon: '🔧',
        theme: 'error',
        targetUrl: '/index.html?app=repair-jobs',
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
