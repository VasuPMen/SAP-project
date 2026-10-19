import cds from '@sap/cds';

export default class BillingService extends cds.ApplicationService {
    async init() {
        const { RepairBills, PricingRules, DamageRecords, Rentals, Customers } = this.entities;

        // Clean up blank or abandoned repair bills drafts
        this.before('READ', 'RepairBills', async (req) => {
            if (!req.params?.length && !req.query?.SELECT?.one) {
                try {
                    await cds.db.run(
                        DELETE.from('BillingService.RepairBills.drafts').where`customer_ID is null and damage_ID is null`
                    );
                } catch (e) {}
            }
        });

        // Clean up blank or abandoned pricing rules drafts
        this.before('READ', 'PricingRules', async (req) => {
            if (!req.params?.length && !req.query?.SELECT?.one) {
                try {
                    await cds.db.run(
                        DELETE.from('BillingService.PricingRules.drafts').where`damageCategory is null or damageCategory = ''`
                    );
                } catch (e) {}
            }
        });

        // Automatically calculate totals on RepairBills manual entry or edit
        this.before(['CREATE', 'UPDATE'], 'RepairBills', (req) => {
            const data = req.data;
            const parts = Number(data.partsCost || 0);
            const labour = Number(data.labourCost || 0);
            const painting = Number(data.paintingCost || 0);
            const repair = parts + labour + painting;

            if (repair > 0) {
                data.repairAmount = repair;
                const tax = Number(data.taxAmount) || (repair * 0.18); // default 18% standard tax
                data.taxAmount = Number(tax.toFixed(2));
                data.totalAmount = Number((repair + data.taxAmount).toFixed(2));
            }
        });

        // Auto-generate invoice number and pre-populate defaults on new RepairBills draft
        this.before(['CREATE', 'NEW'], 'RepairBills.drafts', async (req) => {
            if (!req.data.invoiceNo) {
                const count = await cds.db.run(SELECT.from(RepairBills).columns('count(1) as total')) || [{ total: 0 }];
                const nextNum = (count[0]?.total || 0) + 1001;
                req.data.invoiceNo = `INV-2026-${nextNum}`;
            }
            if (!req.data.billDate) {
                req.data.billDate = new Date().toISOString().split('T')[0];
            }
            if (!req.data.billingStatus) {
                req.data.billingStatus = 'Draft';
            }
        });

        // Defaults on new PricingRules draft
        this.before(['CREATE', 'NEW'], 'PricingRules.drafts', async (req) => {
            if (!req.data.severity) req.data.severity = 'Medium';
            if (!req.data.taxPercent) req.data.taxPercent = 18.00;
            if (!req.data.baseCharge) req.data.baseCharge = 1000.00;
            if (!req.data.labourRate) req.data.labourRate = 2500.00;
            if (!req.data.partsCharge) req.data.partsCharge = 0.00;
            if (!req.data.paintingCharge) req.data.paintingCharge = 0.00;
            if (!req.data.autoApproveLimit) req.data.autoApproveLimit = 25000.00;
        });

        // When damage record is selected, auto-link its customer and rental contract
        this.before(['UPDATE', 'PATCH'], 'RepairBills.drafts', async (req) => {
            if (req.data.damage_ID) {
                const damage = await cds.db.run(
                    SELECT.one.from('RentalEquipmentTrackingApp.DamageRecords').where({ ID: req.data.damage_ID })
                );
                if (damage) {
                    if (damage.liableParty_ID) req.data.customer_ID = damage.liableParty_ID;
                    if (damage.conditionLog_ID) {
                        const log = await cds.db.run(
                            SELECT.one.from('RentalEquipmentTrackingApp.ConditionLogs').where({ ID: damage.conditionLog_ID })
                        );
                        if (log?.rental_ID) {
                            req.data.rental_ID = log.rental_ID;
                            if (!req.data.customer_ID) {
                                const rental = await cds.db.run(
                                    SELECT.one.from('RentalEquipmentTrackingApp.Rentals').where({ ID: log.rental_ID })
                                );
                                if (rental?.customer_ID) req.data.customer_ID = rental.customer_ID;
                            }
                        }
                    }
                    if (damage.repairEstimate && !req.data.repairAmount) {
                        const est = Number(damage.repairEstimate);
                        req.data.repairAmount = est;
                        req.data.partsCost = Number((est * 0.6).toFixed(2));
                        req.data.labourCost = Number((est * 0.4).toFixed(2));
                        req.data.paintingCost = 0.00;
                        req.data.taxAmount = Number((est * 0.18).toFixed(2));
                        req.data.totalAmount = Number((est + req.data.taxAmount).toFixed(2));
                    }
                }
            }
        });

        // Action: Automated Pricing Engine - calculate charge based on PricingRules
        this.on('calculateDamageCharge', async (req) => {
            const { damageId } = req.data;
            const damage = await SELECT.one.from(DamageRecords).where({ ID: damageId });
            if (!damage) return req.error(404, `Damage record ${damageId} not found`);

            // Trace ConditionLog -> Rental -> Customer
            const conditionLog = await SELECT.one.from('RentalEquipmentTrackingApp.ConditionLogs').where({ ID: damage.conditionLog_ID });
            const rental = conditionLog?.rental_ID
                ? await SELECT.one.from(Rentals).where({ ID: conditionLog.rental_ID })
                : null;
            const customerId = damage.liableParty_ID || rental?.customer_ID;

            if (!rental || !customerId) {
                return req.error(400, 'Cannot generate bill: Missing associated Rental or Customer for this damage');
            }

            // Find matching PricingRule
            let rule = await SELECT.one.from(PricingRules).where({
                damageType: damage.damageType,
                severity: damage.severity
            });

            // Default fallback if specific rule not found
            if (!rule) {
                rule = {
                    baseCharge: 150.00,
                    partsCharge: 200.00,
                    labourRate: 85.00,
                    paintingCharge: 50.00,
                    taxPercent: 18.00,
                    autoApproveLimit: 500.00
                };
            }

            const base = Number(rule.baseCharge || 0);
            const parts = Number(rule.partsCharge || 0);
            const labour = Number(rule.labourRate || 0) * 2; // standard 2 labour hours
            const painting = Number(rule.paintingCharge || 0);
            const repair = base + parts + labour + painting;
            const tax = Number((repair * (Number(rule.taxPercent || 18) / 100)).toFixed(2));
            const total = Number((repair + tax).toFixed(2));

            // Auto-approval check against threshold
            const autoApproved = rule.autoApproveLimit && total <= Number(rule.autoApproveLimit);
            const billingStatus = autoApproved ? 'Approved' : 'PendingApproval';

            const billId = cds.utils.uuid();
            await INSERT.into(RepairBills).entries({
                ID: billId,
                rental_ID: rental.ID,
                customer_ID: customerId,
                damage_ID: damageId,
                billDate: new Date().toISOString().split('T')[0],
                partsCost: parts,
                labourCost: labour + base,
                paintingCost: painting,
                repairAmount: repair,
                taxAmount: tax,
                totalAmount: total,
                billingStatus: billingStatus,
                approvalReason: autoApproved ? 'Auto-approved within threshold limit' : 'Pending clerk/manager review'
            });

            // Update damage status
            await UPDATE(DamageRecords).set({
                damageStatus: 'Billed',
                repairEstimate: total,
                customerLiable: true
            }).where({ ID: damageId });

            return await SELECT.one.from(RepairBills).where({ ID: billId });
        });

        // Action: Approve Repair Bill
        this.on('approveRepairBill', async (req) => {
            const { billId, approvalReason } = req.data;
            const bill = await SELECT.one.from(RepairBills).where({ ID: billId });
            if (!bill) return req.error(404, `Bill ${billId} not found`);

            await UPDATE(RepairBills).set({
                billingStatus: 'Approved',
                approvalReason: approvalReason || 'Approved by Billing Clerk'
            }).where({ ID: billId });

            return await SELECT.one.from(RepairBills).where({ ID: billId });
        });

        // Action: Adjust Repair Bill (editable cost lines)
        this.on('adjustRepairBill', async (req) => {
            const { billId, partsCost, labourCost, paintingCost, reason } = req.data;
            if (!reason) return req.error(400, 'Adjustment reason is mandatory');

            const bill = await SELECT.one.from(RepairBills).where({ ID: billId });
            if (!bill) return req.error(404, `Bill ${billId} not found`);

            const parts = Number(partsCost ?? bill.partsCost);
            const labour = Number(labourCost ?? bill.labourCost);
            const painting = Number(paintingCost ?? bill.paintingCost);
            const repair = parts + labour + painting;
            const tax = Number((repair * 0.18).toFixed(2));
            const total = Number((repair + tax).toFixed(2));

            await UPDATE(RepairBills).set({
                partsCost: parts,
                labourCost: labour,
                paintingCost: painting,
                repairAmount: repair,
                taxAmount: tax,
                totalAmount: total,
                billingStatus: 'Adjusted',
                approvalReason: reason
            }).where({ ID: billId });

            return await SELECT.one.from(RepairBills).where({ ID: billId });
        });

        // Action: Reject Repair Bill
        this.on('rejectRepairBill', async (req) => {
            const { billId, reason } = req.data;
            if (!reason) return req.error(400, 'Rejection reason is mandatory');

            await UPDATE(RepairBills).set({
                billingStatus: 'Rejected',
                approvalReason: reason
            }).where({ ID: billId });

            return await SELECT.one.from(RepairBills).where({ ID: billId });
        });

        // Action: Dispute Repair Bill
        this.on('disputeRepairBill', async (req) => {
            const { billId, reason } = req.data;
            if (!reason) return req.error(400, 'Dispute reason is mandatory');

            await UPDATE(RepairBills).set({
                billingStatus: 'Disputed',
                approvalReason: reason
            }).where({ ID: billId });

            return await SELECT.one.from(RepairBills).where({ ID: billId });
        });

        // Action: Post / Finalize Invoice
        this.on('postInvoice', async (req) => {
            const { billId } = req.data;
            const bill = await SELECT.one.from(RepairBills).where({ ID: billId });
            if (!bill) return req.error(404, `Bill ${billId} not found`);

            if (bill.billingStatus !== 'Approved' && bill.billingStatus !== 'Adjusted') {
                return req.error(400, `Only Approved or Adjusted bills can be invoiced. Current status: ${bill.billingStatus}`);
            }

            const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
            await UPDATE(RepairBills).set({
                billingStatus: 'Posted',
                invoiceNo: invoiceNo
            }).where({ ID: billId });

            // Create Outbox Integration Message for SAP S/4HANA
            const rental = await SELECT.one.from(Rentals).where({ ID: bill.rental_ID });
            await INSERT.into(IntegrationMessages).entries({
                messageType: 'Damage Billing Request',
                reference: rental ? rental.contractNo : billId,
                targetSystem: 'SAP S/4HANA',
                status: 'Success',
                billingDocument: invoiceNo,
                payload: JSON.stringify({ invoiceNo, billId, totalAmount: bill.totalAmount, date: new Date().toISOString() }),
                lastAttemptAt: new Date().toISOString()
            });

            return await SELECT.one.from(RepairBills).where({ ID: billId });
        });

        // Action: Retry Outbox Integration Message
        this.on('retryMessage', async (req) => {
            const { messageId } = req.data;
            const msg = await SELECT.one.from(IntegrationMessages).where({ ID: messageId });
            if (!msg) return req.error(404, `Message ${messageId} not found`);

            await UPDATE(IntegrationMessages).set({
                status: 'Success',
                errorMessage: null,
                retryCount: (msg.retryCount || 0) + 1,
                lastAttemptAt: new Date().toISOString()
            }).where({ ID: messageId });

            return await SELECT.one.from(IntegrationMessages).where({ ID: messageId });
        });

        await super.init();
    }
}
