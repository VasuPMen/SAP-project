sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    "use strict";

    return {
        onCapturePhoto: function(oBindingContext, aSelectedContexts) {
            // Extract parent ConditionLog ID from binding context or current URL
            let conditionLogId = null;
            if (oBindingContext && typeof oBindingContext.getProperty === 'function') {
                conditionLogId = oBindingContext.getProperty("ID");
            }
            if (!conditionLogId) {
                const hash = window.location.hash || '';
                const match = hash.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                if (match && match[1]) {
                    conditionLogId = match[1];
                }
            }

            if (window.openEvidencePhotoCaptureDialog) {
                window.openEvidencePhotoCaptureDialog({
                    entityType: 'ConditionLogs',
                    entityId: conditionLogId,
                    conditionLog_ID: conditionLogId,
                    defaultPhotoType: 'Return',
                    onSuccess: function() {
                        MessageToast.show("Evidence photo uploaded successfully!");
                        // Refresh UI5 Model/Binding
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
