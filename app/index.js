document.addEventListener('DOMContentLoaded', async function() {
    if (window.__FIORI_APP_CONFIG) {
        return; // Sub-app runner handles its own UI lifecycle
    }

    // Always fetch fresh authenticated user session from backend XSUAA
    try {
        const res = await fetch('/api/user-info', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const roleCfg = window.FIORI_ROLES_CONFIG[data.role] || { title: data.role || 'User', color: '#0070f2' };
            const session = {
                username: data.id,
                role: data.role || 'Guest',
                name: data.name || data.id,
                title: roleCfg.title,
                avatar: data.name ? data.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US',
                plant: 'PLANT-AHMD (Ahmedabad Yard)',
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('fiori_user_session', JSON.stringify(session));
            renderLaunchpadForSession(session);
        } else {
            const fallbackSession = getFioriSession();
            if (fallbackSession) renderLaunchpadForSession(fallbackSession);
        }
    } catch (e) {
        console.warn('Could not fetch /api/user-info:', e.message);
        const fallbackSession = getFioriSession();
        if (fallbackSession) renderLaunchpadForSession(fallbackSession);
    }
    loadLiveKPIData();
});

function renderLaunchpadForSession(session) {
    const launchpad = document.getElementById('launchpad-view');
    if (launchpad) {
        launchpad.style.display = 'flex';
    }

    const roleCfg = window.FIORI_ROLES_CONFIG[session.role] || window.FIORI_ROLES_CONFIG['Admin'];

    // Header info
    const avatarEl = document.getElementById('shell-user-avatar');
    if (avatarEl) {
        avatarEl.textContent = session.avatar || 'AD';
        avatarEl.style.backgroundColor = roleCfg.color || '#0070f2';
    }
    const nameEl = document.getElementById('shell-user-name');
    if (nameEl) {
        nameEl.textContent = session.name;
    }
    const roleEl = document.getElementById('shell-user-role');
    if (roleEl) {
        roleEl.textContent = session.role;
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
