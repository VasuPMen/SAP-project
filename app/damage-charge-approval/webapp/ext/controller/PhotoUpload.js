sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    "use strict";

    return {
        onCapturePhoto: function(oBindingContext, aSelectedContexts) {
            let repairBillId = null;
            if (oBindingContext && typeof oBindingContext.getProperty === 'function') {
                repairBillId = oBindingContext.getProperty("ID");
            }
            if (!repairBillId) {
                const hash = window.location.hash || '';
                const match = hash.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                if (match && match[1]) {
                    repairBillId = match[1];
                }
            }

            if (window.openEvidencePhotoCaptureDialog) {
                window.openEvidencePhotoCaptureDialog({
                    entityType: 'RepairBills',
                    entityId: repairBillId,
                    repairBill_ID: repairBillId,
                    defaultPhotoType: 'Settlement',
                    onSuccess: function() {
                        MessageToast.show("Bill evidence uploaded successfully!");
                        if (oBindingContext && oBindingContext.getModel) {
                            oBindingContext.getModel().refresh();
                        } else {
                            setTimeout(() => window.location.reload(), 1200);
                        }
                    }
                });
            } else {
                MessageToast.show("Opening Photo Capture...");
            }
        }
    };
});
