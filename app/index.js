function getAvatarInitials(emailOrName) {
    if (!emailOrName) return 'US';
    if (emailOrName.includes('@')) {
        const localPart = emailOrName.split('@')[0];
        const segments = localPart.split(/[._-]/).filter(Boolean);
        if (segments.length >= 2) {
            return (segments[0][0] + segments[1][0]).toUpperCase();
        }
        return localPart.substring(0, 2).toUpperCase();
    }
    const parts = emailOrName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return emailOrName.substring(0, 2).toUpperCase();
}

document.addEventListener('DOMContentLoaded', async function () {
    if (window.__FIORI_APP_CONFIG) {
        return; // Sub-app runner handles its own UI lifecycle
    }

    try {
        const res = await fetch('/api/user-info', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const roleCfg = (window.FIORI_ROLES_CONFIG && window.FIORI_ROLES_CONFIG[data.role]) || { title: data.role || 'User', color: '#0070f2' };
            const userMail = data.email || data.name || data.id || 'User';
            const session = {
                username: data.id || userMail,
                email: userMail,
                role: data.role || 'Guest',
                name: userMail, // Show email ID in header for all roles
                title: roleCfg.title || 'User',
                avatar: getAvatarInitials(userMail),
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

    const roleCfg = (window.FIORI_ROLES_CONFIG && window.FIORI_ROLES_CONFIG[session.role]) || { title: session.role || 'User', color: '#0070f2' };

    // Header info (avatar, email ID, role pill)
    const capsuleEl = document.getElementById('shell-user-capsule');
    if (capsuleEl) {
        capsuleEl.style.opacity = '1';
    }
    const avatarEl = document.getElementById('shell-user-avatar');
    if (avatarEl) {
        avatarEl.textContent = session.avatar || getAvatarInitials(session.email || session.name || session.role);
    }
    const nameEl = document.getElementById('shell-user-name');
    if (nameEl) {
        const displayMail = session.email || session.name || session.username || 'User';
        nameEl.textContent = displayMail;
        nameEl.title = displayMail;
    }
    const roleEl = document.getElementById('shell-user-role');
    if (roleEl) {
        roleEl.textContent = session.role || 'User';
    }

    // Display Role-Tailored Business Application Cards (SAP Fiori GenericTiles)
    renderRoleAppTiles(session.role);

    // Display Role-Tailored KPIs
    const roleKpis = ROLE_KPI_CONFIGS[session.role];
    const kpiBanner = document.getElementById('kpi-banner');
    const kpiSectionHeader = document.getElementById('kpi-section-header');
    if (kpiBanner) {
        if (roleKpis && roleKpis.length > 0) {
            kpiBanner.style.display = 'grid';
            if (kpiSectionHeader) kpiSectionHeader.style.display = 'flex';
            renderRoleKPIs(session.role);
        } else {
            kpiBanner.style.display = 'none';
            if (kpiSectionHeader) kpiSectionHeader.style.display = 'none';
        }
    }
}

function handleLogout() {
    clearFioriSession();
    const host = window.location.host;
    if (host.includes('-srv.')) {
        window.location.href = window.location.protocol + '//' + host.replace('-srv.', '.') + '/my/logout';
    } else {
        window.location.href = '/my/logout';
    }
}

// Official SAP Fiori GenericTile Configuration
const ROLE_KPI_CONFIGS = {
    Admin: [
        { key: 'customersCount', label: 'Customers', subtitle: 'Active Accounts', valueColor: 'Neutral', sapIcon: 'sap-icon://customer', targetUrl: '/index.html?app=customer-management' },
        { key: 'yardLocationsCount', label: 'Yard Locations', subtitle: 'Operational Yards', valueColor: 'Neutral', sapIcon: 'sap-icon://functional-location', targetUrl: '/index.html?app=locations' },
        { key: 'totalAssets', label: 'Total Assets', subtitle: 'Fleet Inventory', valueColor: 'Neutral', sapIcon: 'sap-icon://product', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'rentedAssets', label: 'Rented Assets', subtitle: 'Currently On Rent', valueColor: 'Good', sapIcon: 'sap-icon://shipping-status', targetUrl: '/index.html?app=rentals' },
        { key: 'damagedAssets', label: 'Damaged Assets', subtitle: 'Requires Action', valueColor: 'Error', sapIcon: 'sap-icon://alert', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'totalContractsCreated', label: 'Contracts Created', subtitle: 'Total Agreements', valueColor: 'Neutral', sapIcon: 'sap-icon://document-text', targetUrl: '/index.html?app=rentals' },
        { key: 'runningContracts', label: 'Running Contracts', subtitle: 'Active Leases', valueColor: 'Good', sapIcon: 'sap-icon://in-progress', targetUrl: '/index.html?app=rentals' },
        { key: 'finishedContracts', label: 'Finished Contracts', subtitle: 'Completed Terms', valueColor: 'Neutral', sapIcon: 'sap-icon://accept', targetUrl: '/index.html?app=rentals' },
        { key: 'equipmentInRepair', label: 'In Repair', subtitle: 'Workshop Bays', valueColor: 'Critical', sapIcon: 'sap-icon://wrench', targetUrl: '/index.html?app=repair-jobs' },
        { key: 'equipmentInMaintenance', label: 'In Maintenance', subtitle: 'Scheduled Service', valueColor: 'Critical', sapIcon: 'sap-icon://calendar', targetUrl: '/index.html?app=maintenance-planner' }
    ],
    Manager: [
        { key: 'customersCount', label: 'Customers', subtitle: 'Active Accounts', valueColor: 'Neutral', sapIcon: 'sap-icon://customer', targetUrl: '/index.html?app=customer-management' },
        { key: 'yardLocationsCount', label: 'Yard Locations', subtitle: 'Operational Yards', valueColor: 'Neutral', sapIcon: 'sap-icon://functional-location', targetUrl: '/index.html?app=locations' },
        { key: 'totalAssets', label: 'Total Assets', subtitle: 'Fleet Inventory', valueColor: 'Neutral', sapIcon: 'sap-icon://product', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'rentedAssets', label: 'Rented Assets', subtitle: 'Currently On Rent', valueColor: 'Good', sapIcon: 'sap-icon://shipping-status', targetUrl: '/index.html?app=rentals' },
        { key: 'damagedAssets', label: 'Damaged Assets', subtitle: 'Requires Action', valueColor: 'Error', sapIcon: 'sap-icon://alert', targetUrl: '/index.html?app=fleet-overview' },
        { key: 'totalContractsCreated', label: 'Contracts Created', subtitle: 'Total Agreements', valueColor: 'Neutral', sapIcon: 'sap-icon://document-text', targetUrl: '/index.html?app=rentals' },
        { key: 'runningContracts', label: 'Running Contracts', subtitle: 'Active Leases', valueColor: 'Good', sapIcon: 'sap-icon://in-progress', targetUrl: '/index.html?app=rentals' },
        { key: 'finishedContracts', label: 'Finished Contracts', subtitle: 'Completed Terms', valueColor: 'Neutral', sapIcon: 'sap-icon://accept', targetUrl: '/index.html?app=rentals' }
    ],
    YardWorker: [
        { key: 'totalCheckIns', label: 'Daily Check-Ins', subtitle: 'Received Today', valueColor: 'Good', sapIcon: 'sap-icon://inventory', targetUrl: '/index.html?app=inspections' },
        { key: 'totalCheckOuts', label: 'Daily Check-Outs', subtitle: 'Dispatched Today', valueColor: 'Neutral', sapIcon: 'sap-icon://outbox', targetUrl: '/index.html?app=inspections' }
    ],
    Technician: [
        { key: 'equipmentInRepair', label: 'In Repair', subtitle: 'Workshop Bays', valueColor: 'Critical', sapIcon: 'sap-icon://wrench', targetUrl: '/index.html?app=repair-jobs' },
        { key: 'equipmentInMaintenance', label: 'In Maintenance', subtitle: 'Scheduled Service', valueColor: 'Critical', sapIcon: 'sap-icon://calendar', targetUrl: '/index.html?app=maintenance-planner' }
    ],
    BillingClerk: [
        { key: 'damagedAssets', label: 'Damage Record', subtitle: 'Pending Review', valueColor: 'Error', sapIcon: 'sap-icon://alert', targetUrl: '/index.html?app=damage-charge-approval' },
        { key: 'totalContractsCreated', label: 'Contracts', subtitle: 'Total Agreements', valueColor: 'Neutral', sapIcon: 'sap-icon://document-text', targetUrl: '/index.html?app=rentals' }
    ]
};

let cachedKPIData = null;
let activeFioriTiles = [];
let currentRenderedRole = null;

function renderRoleKPIs(role) {
    const kpiBanner = document.getElementById('kpi-banner');
    if (!kpiBanner) return;

    const configs = ROLE_KPI_CONFIGS[role];
    const kpiSectionHeader = document.getElementById('kpi-section-header');

    if (!configs || configs.length === 0) {
        destroyActiveKpiTiles();
        kpiBanner.innerHTML = '';
        kpiBanner.style.display = 'none';
        if (kpiSectionHeader) kpiSectionHeader.style.display = 'none';
        return;
    }

    if (kpiSectionHeader) kpiSectionHeader.style.display = 'flex';
    kpiBanner.style.display = 'grid';
    kpiBanner.className = 'kpi-banner kpi-count-' + configs.length;

    if (window.sap && sap.ui && sap.ui.require) {
        sap.ui.require([
            'sap/m/GenericTile',
            'sap/m/TileContent',
            'sap/m/NumericContent'
        ], function (GenericTile, TileContent, NumericContent) {
            if (activeFioriTiles.length === configs.length && currentRenderedRole === role) {
                configs.forEach((cfg, idx) => {
                    const item = activeFioriTiles[idx];
                    if (item && item.numericControl) {
                        const val = cachedKPIData ? String(cachedKPIData[cfg.key] ?? 0) : '0';
                        item.numericControl.setValue(val);
                    }
                });
                return;
            }

            destroyActiveKpiTiles();
            kpiBanner.innerHTML = '';

            configs.forEach(cfg => {
                const val = cachedKPIData ? String(cachedKPIData[cfg.key] ?? 0) : '...';
                
                const oNumericContent = new NumericContent({
                    value: val,
                    valueColor: cfg.valueColor || 'Neutral',
                    icon: cfg.sapIcon,
                    withMargin: false
                });

                const oTileContent = new TileContent({
                    footer: '',
                    content: oNumericContent
                });

                const oGenericTile = new GenericTile({
                    header: cfg.label,
                    subheader: cfg.subtitle,
                    frameType: 'OneByOne',
                    tileContent: [oTileContent],
                    press: function () {
                        window.location.href = cfg.targetUrl;
                    }
                });

                const semanticType = (cfg.valueColor || 'neutral').toLowerCase();
                oGenericTile.addStyleClass('fiori-enterprise-kpi');
                oGenericTile.addStyleClass('fiori-kpi-semantic-' + semanticType);
                oGenericTile.placeAt('kpi-banner');

                activeFioriTiles.push({
                    tile: oGenericTile,
                    numericControl: oNumericContent,
                    config: cfg
                });
            });

            currentRenderedRole = role;
        });
    }
}

function destroyActiveKpiTiles() {
    if (activeFioriTiles && activeFioriTiles.length > 0) {
        activeFioriTiles.forEach(item => {
            if (item.tile && item.tile.destroy) {
                item.tile.destroy();
            }
        });
        activeFioriTiles = [];
    }
    currentRenderedRole = null;
}

// ==========================================================================
// SAP FIORI APPLICATION LAUNCHER TILES (GenericTiles for All Roles)
// ==========================================================================
const APP_TILES_CONFIG = [
    {
        id: 'customer-management',
        title: 'Customer Management',
        subtitle: 'Master Data & Accounts',
        badge: 'Master Data',
        desc: 'Register new corporate rental customers, manage contact persons, view site addresses, and review active agreements.',
        sapIcon: 'sap-icon://customer-and-supplier',
        targetUrl: '/index.html?app=customer-management'
    },
    {
        id: 'locations',
        title: 'Depot & Yard Locations',
        subtitle: 'Depot & Yard Facilities',
        badge: 'Depot / Yard',
        desc: 'Maintain depot facilities, regional yard locations, on-site workshops, and GPS geo-fenced coordinates.',
        sapIcon: 'sap-icon://functional-location',
        targetUrl: '/index.html?app=locations'
    },
    {
        id: 'fleet-overview',
        title: 'Fleet Overview & Assets',
        subtitle: 'Fleet Inventory & Telemetry',
        badge: 'Fleet Overview',
        desc: 'Track equipment availability, operational telemetry, condition grades (A-D), and active allocations across depots.',
        sapIcon: 'sap-icon://shipping-status',
        targetUrl: '/index.html?app=fleet-overview'
    },
    {
        id: 'rentals',
        title: 'Rental Contracts & Allocations',
        subtitle: 'Contracts & Dispatch',
        badge: 'Contracts',
        desc: 'Create rental contracts, reserve equipment assets, schedule delivery periods, and trigger check-out dispatch.',
        sapIcon: 'sap-icon://document-text',
        targetUrl: '/index.html?app=rentals'
    },
    {
        id: 'inspections',
        title: 'Equipment Inspections',
        subtitle: 'Check-In/Out Audit & Return',
        badge: 'Audit & Return',
        desc: 'Capture check-out and return condition logs, record meter readings, assign grades (A-D), and lock audit reports.',
        sapIcon: 'sap-icon://survey',
        targetUrl: '/index.html?app=inspections'
    },
    {
        id: 'damage-charge-approval',
        title: 'Damage Record',
        subtitle: 'Assessments & Repair Billing',
        badge: 'Damage Worklist',
        desc: 'Review automated repair bills with damage particulars, inspect photo evidence, and approve customer repair charges.',
        sapIcon: 'sap-icon://money-bills',
        targetUrl: '/index.html?app=damage-charge-approval'
    },
    {
        id: 'repair-jobs',
        title: 'Workshop Repair Jobs',
        subtitle: 'Workshop Bays & Labor',
        badge: 'Workshop',
        desc: 'Dispatch damage repair jobs, capture technician hours & parts cost, and attach before/after photo evidence.',
        sapIcon: 'sap-icon://wrench',
        targetUrl: '/index.html?app=repair-jobs'
    },
    {
        id: 'maintenance-planner',
        title: 'Maintenance Planner',
        subtitle: 'Preventive PM Schedules',
        badge: 'Preventive PM',
        desc: 'Track scheduled 250h/500h preventive services, calibration routines, service intervals, and provider costs.',
        sapIcon: 'sap-icon://calendar',
        targetUrl: '/index.html?app=maintenance-planner'
    }
];

let activeFioriAppTiles = [];
let currentAppTilesRole = null;

function renderRoleAppTiles(role) {
    const grid = document.getElementById('apps-tiles-grid');
    if (!grid) return;

    const allowedApps = (window.FIORI_ROLES_CONFIG && window.FIORI_ROLES_CONFIG[role] && window.FIORI_ROLES_CONFIG[role].apps)
        || ['customer-management', 'rentals', 'locations', 'fleet-overview', 'inspections', 'damage-charge-approval', 'repair-jobs', 'maintenance-planner'];

    const filteredApps = APP_TILES_CONFIG.filter(app => role === 'Admin' || allowedApps.includes(app.id));

    if (window.sap && sap.ui && sap.ui.require) {
        sap.ui.require([
            'sap/m/GenericTile',
            'sap/m/TileContent',
            'sap/ui/core/Icon'
        ], function (GenericTile, TileContent, Icon) {
            if (activeFioriAppTiles.length === filteredApps.length && currentAppTilesRole === role) {
                return;
            }

            destroyActiveAppTiles();
            grid.innerHTML = '';
            grid.className = 'tiles-grid apps-count-' + filteredApps.length;

            filteredApps.forEach(cfg => {
                const oIcon = new Icon({
                    src: cfg.sapIcon,
                    size: '2.4rem',
                    color: '#0070f2'
                });
                oIcon.addStyleClass('fiori-app-tile-icon');

                const oTileContent = new TileContent({
                    footer: cfg.badge,
                    content: oIcon
                });

                const oGenericTile = new GenericTile({
                    header: cfg.title,
                    subheader: cfg.subtitle,
                    frameType: 'OneByOne',
                    tileContent: [oTileContent],
                    tooltip: cfg.desc,
                    press: function () {
                        window.location.href = cfg.targetUrl;
                    }
                });

                oGenericTile.addStyleClass('fiori-enterprise-app-tile');
                oGenericTile.placeAt('apps-tiles-grid');

                activeFioriAppTiles.push(oGenericTile);
            });

            currentAppTilesRole = role;
        });
    }
}

function destroyActiveAppTiles() {
    if (activeFioriAppTiles && activeFioriAppTiles.length > 0) {
        activeFioriAppTiles.forEach(tile => {
            if (tile && tile.destroy) {
                tile.destroy();
            }
        });
        activeFioriAppTiles = [];
    }
    currentAppTilesRole = null;
}

// Hook SAPUI5 Core lifecycle to automatically upgrade to GenericTiles as soon as UI5 initializes
function hookUi5Initialization() {
    function onInit() {
        const session = getFioriSession();
        const role = (session && session.role) || 'Admin';
        renderRoleKPIs(role);
        renderRoleAppTiles(role);
    }

    if (window.sap && sap.ui && sap.ui.getCore) {
        if (sap.ui.getCore().isInitialized()) {
            onInit();
        } else {
            sap.ui.getCore().attachInit(onInit);
        }
    } else {
        const timer = setInterval(() => {
            if (window.sap && sap.ui && sap.ui.getCore) {
                clearInterval(timer);
                sap.ui.getCore().attachInit(onInit);
            }
        }, 100);
        setTimeout(() => clearInterval(timer), 6000);
    }
}
hookUi5Initialization();

async function loadLiveKPIData() {
    try {
        const res = await fetch('/api/live-kpis', { cache: 'no-store' });
        if (res.ok) {
            cachedKPIData = await res.json();
            const session = getFioriSession();
            const role = (session && session.role) || 'Admin';
            renderRoleKPIs(role);
        }
    } catch (err) {
        console.log('KPI load info:', err.message);
    }
}
setInterval(loadLiveKPIData, 30000);

