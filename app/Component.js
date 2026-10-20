sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (AppComponent) {
        "use strict";

        const APP_COMPONENTS = {
            "customer-management": "retcl.customermanagement.Component",
            "damage-charge-approval": "retcl.damagechargeapproval.Component",
            "fleet-overview": "retcl.fleetoverview.Component",
            "inspections": "retcl.inspections.Component",
            "locations": "retcl.locations.Component",
            "maintenance-planner": "retcl.maintenanceplanner.Component",
            "rentals": "retcl.rentals.Component",
            "repair-jobs": "retcl.repairjobs.Component"
        };

        // Pre-register every application's component class under its exact namespace
        const componentClasses = {};
        for (const [appId, fullClassName] of Object.entries(APP_COMPONENTS)) {
            componentClasses[appId] = AppComponent.extend(fullClassName, {
                metadata: {
                    manifest: "json"
                }
            });
        }

        // Determine current app from URL parameter or window context
        let currentAppId = null;
        if (typeof window !== "undefined") {
            const urlParams = window.location ? new URLSearchParams(window.location.search) : null;
            currentAppId = (urlParams && urlParams.get("app")) || window.__FIORI_CURRENT_APP_ID || null;
            if (!currentAppId && window.location) {
                // Check if path contains app name (e.g. /fleet-overview/webapp/...)
                for (const appId of Object.keys(APP_COMPONENTS)) {
                    if (window.location.pathname.includes(appId)) {
                        currentAppId = appId;
                        break;
                    }
                }
            }
        }

        if (currentAppId && componentClasses[currentAppId]) {
            return componentClasses[currentAppId];
        }

        // Generic fallback component
        return AppComponent.extend("retcl.shared.Component", {
            metadata: {
                manifest: "json"
            }
        });
    }
);
