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

    // Display Role-Tailored KPIs
    const roleKpis = ROLE_KPI_CONFIGS[session.role];
    const kpiBanner = document.getElementById('kpi-banner');
    if (kpiBanner) {
        if (roleKpis && roleKpis.length > 0) {
            kpiBanner.style.display = 'grid';
            if (roleKpis.length === 1) {
                kpiBanner.classList.add('single-item');
            } else {
                kpiBanner.classList.remove('single-item');
            }
            renderRoleKPIs(session.role);
        } else {
            kpiBanner.style.display = 'none';
        }
    }
}

function handleLogout() {
    clearFioriSession();
    // Redirect through Approuter logout endpoint to clear XSUAA session and return to SAP login
    window.location.href = '/my/logout';
}

// SAP Fiori SVG Icons for KPI GenericTiles
const FIORI_ICONS = {
    customer: '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
    location: '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
    assets: '<svg viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    rented: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    contract: '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
    running: '<svg viewBox="0 0 24 24"><path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM12 11.5l-4-4V4h8v3.5l-4 4z"/></svg>',
    finished: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    repair: '<svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
    maintenance: '<svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>',
    checkin: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-7 14l-5-5h3V8h4v4h3l-5 5z"/></svg>',
    checkout: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-2 10h-3v4h-4v-4H7l5-5 5 5z"/></svg>'
};

// Role-tailored KPI definitions (Clean Fiori Tiles with titles, subtitles, and semantic icons)
const ROLE_KPI_CONFIGS = {
    Admin: [
        { key: 'customersCount', label: 'Customers', subtitle: 'Active Accounts', semantic: 'info', icon: 'customer', targetUrl: '/index.html?app=customer-management' },
        { key: 'yardLocationsCount', label: 'Yard Locations', subtitle: 'Operational Yards', semantic: 'info', icon: 'location', targetUrl: '/index.html?app=locations' },
        { key: 'totalAssets', label: 'Total Assets', subtitle: 'Fleet Inventory', semantic: 'info', icon: 'assets', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'rentedAssets', label: 'Rented Assets', subtitle: 'Currently On Rent', semantic: 'good', icon: 'rented', targetUrl: '/index.html?app=rentals' },
        { key: 'damagedAssets', label: 'Damaged Assets', subtitle: 'Requires Action', semantic: 'negative', icon: 'alert', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'totalContractsCreated', label: 'Contracts Created', subtitle: 'Total Agreements', semantic: 'info', icon: 'contract', targetUrl: '/index.html?app=rentals' },
        { key: 'runningContracts', label: 'Running Contracts', subtitle: 'Active Leases', semantic: 'good', icon: 'running', targetUrl: '/index.html?app=rentals' },
        { key: 'finishedContracts', label: 'Finished Contracts', subtitle: 'Completed Terms', semantic: 'info', icon: 'finished', targetUrl: '/index.html?app=rentals' },
        { key: 'equipmentInRepair', label: 'In Repair', subtitle: 'Workshop Bays', semantic: 'critical', icon: 'repair', targetUrl: '/index.html?app=repair-jobs' },
        { key: 'equipmentInMaintenance', label: 'In Maintenance', subtitle: 'Scheduled Service', semantic: 'critical', icon: 'maintenance', targetUrl: '/index.html?app=maintenance-planner' }
    ],
    Manager: [
        { key: 'customersCount', label: 'Customers', subtitle: 'Active Accounts', semantic: 'info', icon: 'customer', targetUrl: '/index.html?app=customer-management' },
        { key: 'yardLocationsCount', label: 'Yard Locations', subtitle: 'Operational Yards', semantic: 'info', icon: 'location', targetUrl: '/index.html?app=locations' },
        { key: 'totalAssets', label: 'Total Assets', subtitle: 'Fleet Inventory', semantic: 'info', icon: 'assets', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'rentedAssets', label: 'Rented Assets', subtitle: 'Currently On Rent', semantic: 'good', icon: 'rented', targetUrl: '/index.html?app=rentals' },
        { key: 'damagedAssets', label: 'Damaged Assets', subtitle: 'Requires Action', semantic: 'negative', icon: 'alert', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'totalContractsCreated', label: 'Contracts Created', subtitle: 'Total Agreements', semantic: 'info', icon: 'contract', targetUrl: '/index.html?app=rentals' },
        { key: 'runningContracts', label: 'Running Contracts', subtitle: 'Active Leases', semantic: 'good', icon: 'running', targetUrl: '/index.html?app=rentals' },
        { key: 'finishedContracts', label: 'Finished Contracts', subtitle: 'Completed Terms', semantic: 'info', icon: 'finished', targetUrl: '/index.html?app=rentals' }
    ],
    YardWorker: [
        { key: 'totalCheckIns', label: 'Daily Check-Ins', subtitle: 'Received Today', semantic: 'good', icon: 'checkin', targetUrl: '/index.html?app=inspections' },
        { key: 'totalCheckOuts', label: 'Daily Check-Outs', subtitle: 'Dispatched Today', semantic: 'info', icon: 'checkout', targetUrl: '/index.html?app=inspections' }
    ]
};

let cachedKPIData = null;

function renderRoleKPIs(role) {
    const kpiBanner = document.getElementById('kpi-banner');
    if (!kpiBanner) return;

    const configs = ROLE_KPI_CONFIGS[role];
    if (!configs || configs.length === 0) {
        kpiBanner.innerHTML = '';
        kpiBanner.style.display = 'none';
        return;
    }

    let html = '';
    configs.forEach(cfg => {
        const val = cachedKPIData ? (cachedKPIData[cfg.key] ?? 0) : '...';
        const semantic = cfg.semantic || 'info';
        const iconSvg = FIORI_ICONS[cfg.icon] || FIORI_ICONS.assets;

        html += `
            <div class="fiori-kpi-tile fiori-kpi-${semantic}" onclick="window.location.href='${cfg.targetUrl}'" title="${cfg.label} - ${cfg.subtitle}">
                <div class="fiori-kpi-top">
                    <div class="fiori-kpi-headings">
                        <span class="fiori-kpi-title">${cfg.label}</span>
                        <span class="fiori-kpi-subtitle">${cfg.subtitle}</span>
                    </div>
                    <div class="fiori-kpi-icon-wrap fiori-icon-${semantic}">
                        ${iconSvg}
                    </div>
                </div>
                <div class="fiori-kpi-bottom">
                    <span class="fiori-kpi-value fiori-val-${semantic}">${val}</span>
                </div>
            </div>
        `;
    });

    kpiBanner.innerHTML = html;
}

async function loadLiveKPIData() {
    try {
        const res = await fetch('/api/live-kpis');
        if (res.ok) {
            cachedKPIData = await res.json();
            const session = getFioriSession();
            if (session && ROLE_KPI_CONFIGS[session.role]) {
                renderRoleKPIs(session.role);
            }
        }
    } catch (err) {
        console.log('KPI load info:', err.message);
    }
}
