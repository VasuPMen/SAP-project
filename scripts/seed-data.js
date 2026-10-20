import cds from '@sap/cds';

async function seedData() {
    console.log('====================================================');
    console.log('  STARTING API DATA SEEDING TO SAP HANA CLOUD       ');
    console.log('  Scenario: XYZ Construction / CAT 320 Excavator    ');
    console.log('====================================================');

    const model = await cds.load(['db', 'srv']);
    cds.model = model;
    if (cds.service.bindings) await cds.service.bindings;
    const db = await cds.connect.to('db', { model });
    console.log(`[CONNECTED] Database kind: ${db.kind}`);

    const Customers = 'RentalEquipmentTrackingApp.Customers';
    const Locations = 'RentalEquipmentTrackingApp.Locations';
    const Equipment = 'RentalEquipmentTrackingApp.Equipment';
    const Rentals = 'RentalEquipmentTrackingApp.Rentals';
    const RentalItems = 'RentalEquipmentTrackingApp.RentalItems';
    const RentalStatusHistory = 'RentalEquipmentTrackingApp.RentalStatusHistory';
    const ConditionLogs = 'RentalEquipmentTrackingApp.ConditionLogs';
    const DamageRecords = 'RentalEquipmentTrackingApp.DamageRecords';
    const DamagePhotos = 'RentalEquipmentTrackingApp.DamagePhotos';
    const MaintenanceRecords = 'RentalEquipmentTrackingApp.MaintenanceRecords';
    const RepairJobs = 'RentalEquipmentTrackingApp.RepairJobs';
    const RepairBills = 'RentalEquipmentTrackingApp.RepairBills';
    const PricingRules = 'RentalEquipmentTrackingApp.PricingRules';
    const EquipmentTransfers = 'RentalEquipmentTrackingApp.EquipmentTransfers';
    const AssetStatusHistory = 'RentalEquipmentTrackingApp.AssetStatusHistory';
    const IntegrationMessages = 'RentalEquipmentTrackingApp.IntegrationMessages';

    // Clean existing data for fresh seed
    console.log('[CLEANUP] Clearing previous test data...');
    await db.run(DELETE.from(DamagePhotos));
    await db.run(DELETE.from(RepairBills));
    await db.run(DELETE.from(RepairJobs));
    await db.run(DELETE.from(DamageRecords));
    await db.run(DELETE.from(ConditionLogs));
    await db.run(DELETE.from(MaintenanceRecords));
    await db.run(DELETE.from(RentalStatusHistory));
    await db.run(DELETE.from(RentalItems));
    await db.run(DELETE.from(Rentals));
    await db.run(DELETE.from(EquipmentTransfers));
    await db.run(DELETE.from(AssetStatusHistory));
    await db.run(DELETE.from(Equipment));
    await db.run(DELETE.from(Locations));
    await db.run(DELETE.from(Customers));
    await db.run(DELETE.from(PricingRules));
    await db.run(DELETE.from(IntegrationMessages));

    // 1. LOCATIONS (STEP 2)
    console.log('[SEED] Creating Locations...');
    const locAhmedabadId = '10000000-0000-0000-0000-000000000001';
    const locMumbaiId    = '10000000-0000-0000-0000-000000000002';
    const locDelhiId     = '10000000-0000-0000-0000-000000000003';
    const locBangaloreId = '10000000-0000-0000-0000-000000000004';

    await db.run(INSERT.into(Locations).entries([
        {
            ID: locAhmedabadId,
            locationName: 'Ahmedabad Main Yard',
            locationType: 'Yard',
            plant: 'PLANT-AHMD',
            address: 'Ahmedabad Main Yard, SG Highway',
            city: 'Ahmedabad',
            latitude: 23.022505,
            longitude: 72.571362
        },
        {
            ID: locMumbaiId,
            locationName: 'Mumbai Central Depot',
            locationType: 'Depot',
            plant: '1020',
            address: 'Port Logistics Hub',
            city: 'Mumbai',
            latitude: 19.076090,
            longitude: 72.877426
        },
        {
            ID: locDelhiId,
            locationName: 'Delhi NCR Yard',
            locationType: 'Depot',
            plant: '1030',
            address: 'Industrial Area Phase 2',
            city: 'Delhi',
            latitude: 28.613939,
            longitude: 77.209021
        },
        {
            ID: locBangaloreId,
            locationName: 'Bangalore Tech Workshop',
            locationType: 'Workshop',
            plant: '1040',
            address: 'Electronic City Phase 1',
            city: 'Bangalore',
            latitude: 12.971598,
            longitude: 77.594563
        }
    ]));
    console.log('  -> 4 Locations created');

    // 2. CUSTOMERS (STEP 1)
    console.log('[SEED] Creating Customers...');
    const custXYZId      = '20000000-0000-0000-0000-000000000001';
    const custMetroId    = '20000000-0000-0000-0000-000000000002';
    const custTitanId    = '20000000-0000-0000-0000-000000000003';
    const custHighwaysId = '20000000-0000-0000-0000-000000000004';

    await db.run(INSERT.into(Customers).entries([
        {
            ID: custXYZId,
            companyName: 'XYZ Construction Pvt. Ltd.',
            contactPerson: 'Rahul Sharma',
            email: 'rahul@xyzconstruction.com',
            phone: '+91 98765 43210',
            address: '102 Commercial Hub, SG Highway, Ahmedabad'
        },
        {
            ID: custMetroId,
            companyName: 'Metro Rail Infrastructure Ltd',
            contactPerson: 'Priya Patel',
            email: 'p.patel@metrorail.in',
            phone: '+91 98220 11223',
            address: 'Metro Bhawan, Ring Road, Ahmedabad'
        },
        {
            ID: custTitanId,
            companyName: 'Titan Earthmovers Corp',
            contactPerson: 'Amitabh Verma',
            email: 'averma@titanearth.com',
            phone: '+91 98450 99887',
            address: 'BKC Complex, Bandra East, Mumbai'
        },
        {
            ID: custHighwaysId,
            companyName: 'National Highways Infra Consortium',
            contactPerson: 'Vikram Malhotra',
            email: 'v.malhotra@nh-infra.gov.in',
            phone: '+91 98100 55443',
            address: 'NHAI Complex, Dwarka, New Delhi'
        }
    ]));
    console.log('  -> 4 Customers created (including XYZ Construction Pvt. Ltd.)');

    // 3. PRICING RULES (CONFIGURATION - STEP 17 & 21)
    console.log('[SEED] Creating Pricing Rules...');
    await db.run(INSERT.into(PricingRules).entries([
        {
            ID: '70000000-0000-0000-0000-000000000001',
            damageType: 'Body Dent',
            severity: 'High',
            baseCharge: 5000.00,
            partsCharge: 8000.00,
            labourRate: 5000.00,
            paintingCharge: 0.00,
            taxPercent: 18.00,
            autoApproveLimit: 50000.00
        },
        {
            ID: '70000000-0000-0000-0000-000000000002',
            damageType: 'Hydraulic Hose Damage',
            severity: 'High',
            baseCharge: 3000.00,
            partsCharge: 6000.00,
            labourRate: 3000.00,
            paintingCharge: 0.00,
            taxPercent: 18.00,
            autoApproveLimit: 50000.00
        },
        {
            ID: '70000000-0000-0000-0000-000000000003',
            damageType: 'Track Chain Tear',
            severity: 'Critical',
            baseCharge: 15000.00,
            partsCharge: 35000.00,
            labourRate: 10000.00,
            paintingCharge: 0.00,
            taxPercent: 18.00,
            autoApproveLimit: 30000.00
        },
        {
            ID: '70000000-0000-0000-0000-000000000004',
            damageType: 'Windshield Crack',
            severity: 'Medium',
            baseCharge: 2000.00,
            partsCharge: 6500.00,
            labourRate: 1500.00,
            paintingCharge: 0.00,
            taxPercent: 18.00,
            autoApproveLimit: 25000.00
        },
        {
            ID: '70000000-0000-0000-0000-000000000005',
            damageType: 'Engine Overheat / Oil Contamination',
            severity: 'Critical',
            baseCharge: 20000.00,
            partsCharge: 45000.00,
            labourRate: 15000.00,
            paintingCharge: 0.00,
            taxPercent: 18.00,
            autoApproveLimit: 20000.00
        }
    ]));
    console.log('  -> 5 Pricing Rules created');

    // 4. FLEET EQUIPMENT (STEP 3)
    console.log('[SEED] Creating Equipment Fleet...');
    const eq1Id = '30000000-0000-0000-0000-000000000001';
    const eq2Id = '30000000-0000-0000-0000-000000000002';
    const eq3Id = '30000000-0000-0000-0000-000000000003';
    const eq4Id = '30000000-0000-0000-0000-000000000004';
    const eq5Id = '30000000-0000-0000-0000-000000000005';
    const eq6Id = '30000000-0000-0000-0000-000000000006';
    const eq7Id = '30000000-0000-0000-0000-000000000007';
    const eq8Id = '30000000-0000-0000-0000-000000000008';

    await db.run(INSERT.into(Equipment).entries([
        {
            ID: eq1Id,
            equipmentNo: 'EQ-1001',
            equipmentName: 'CAT 320 Excavator',
            serialNumber: 'CAT320-001',
            category: 'Heavy Machinery',
            equipmentType: 'Excavator',
            manufacturer: 'CAT',
            model: '320',
            plant: 'PLANT-AHMD',
            location_ID: locAhmedabadId,
            latitude: 23.022505,
            longitude: 72.571362,
            purchaseDate: '2024-02-15',
            rentalRatePerDay: 8000.00,
            currentStatus: 'Available',
            currentGrade: 'A',
            currentMeterReading: 1250.00,
            custodian: 'Yard Worker',
            barcode: 'BAR-CAT320-001',
            nextServiceDate: '2026-12-01'
        },
        {
            ID: eq2Id,
            equipmentNo: 'EQ-1002',
            equipmentName: 'Komatsu PC210LC Tracked Excavator',
            serialNumber: 'KOM-PC210-2023-088',
            category: 'Heavy Machinery',
            equipmentType: 'Excavator',
            manufacturer: 'Komatsu',
            model: 'PC210LC-11',
            plant: '1020',
            location_ID: locMumbaiId,
            latitude: 19.076090,
            longitude: 72.877426,
            purchaseDate: '2023-08-20',
            rentalRatePerDay: 7500.00,
            currentStatus: 'RentedOut',
            currentGrade: 'A',
            currentMeterReading: 890.00,
            custodian: 'Stefan Becker',
            barcode: 'BAR-KOM-210',
            nextServiceDate: '2026-11-15'
        },
        {
            ID: eq3Id,
            equipmentNo: 'EQ-1003',
            equipmentName: 'JCB 3CX Eco Backhoe Loader',
            serialNumber: 'JCB-3CX-2022-441',
            category: 'Earthmoving',
            equipmentType: 'Loader',
            manufacturer: 'JCB',
            model: '3CX Eco',
            plant: 'PLANT-AHMD',
            location_ID: locAhmedabadId,
            latitude: 23.022505,
            longitude: 72.571362,
            purchaseDate: '2022-11-10',
            rentalRatePerDay: 4500.00,
            currentStatus: 'ReturnedPendingInspection',
            currentGrade: 'B',
            currentMeterReading: 2150.80,
            custodian: 'Yard Worker',
            barcode: 'BAR-JCB-3CX',
            nextServiceDate: '2026-10-30'
        },
        {
            ID: eq4Id,
            equipmentNo: 'EQ-1004',
            equipmentName: 'Volvo L120H Wheel Loader',
            serialNumber: 'VOL-L120-2023-712',
            category: 'Heavy Machinery',
            equipmentType: 'Loader',
            manufacturer: 'Volvo',
            model: 'L120H',
            plant: '1030',
            location_ID: locDelhiId,
            latitude: 28.613939,
            longitude: 77.209021,
            purchaseDate: '2023-02-18',
            rentalRatePerDay: 6800.00,
            currentStatus: 'Damaged',
            currentGrade: 'C',
            currentMeterReading: 1675.20,
            custodian: 'Peter Schmidt',
            barcode: 'BAR-VOL-120',
            nextServiceDate: '2026-11-01'
        },
        {
            ID: eq5Id,
            equipmentNo: 'EQ-1005',
            equipmentName: 'Liebherr R 926 G8 Crawler Excavator',
            serialNumber: 'LIE-R926-2024-301',
            category: 'Heavy Machinery',
            equipmentType: 'Excavator',
            manufacturer: 'Liebherr',
            model: 'R 926 G8',
            plant: '1020',
            location_ID: locMumbaiId,
            latitude: 19.076090,
            longitude: 72.877426,
            purchaseDate: '2024-01-10',
            rentalRatePerDay: 9500.00,
            currentStatus: 'InRepair',
            currentGrade: 'C',
            currentMeterReading: 620.00,
            custodian: 'Stefan Becker',
            barcode: 'BAR-LIE-926',
            nextServiceDate: '2026-12-15'
        },
        {
            ID: eq6Id,
            equipmentNo: 'EQ-1006',
            equipmentName: 'Atlas Copco QAS 100 Diesel Generator',
            serialNumber: 'AC-QAS100-2023-559',
            category: 'Power Systems',
            equipmentType: 'Generator',
            manufacturer: 'Atlas Copco',
            model: 'QAS 100',
            plant: 'PLANT-AHMD',
            location_ID: locAhmedabadId,
            latitude: 23.022505,
            longitude: 72.571362,
            purchaseDate: '2023-06-25',
            rentalRatePerDay: 2800.00,
            currentStatus: 'Available',
            currentGrade: 'A',
            currentMeterReading: 3410.00,
            custodian: 'Yard Worker',
            barcode: 'BAR-AC-QAS100',
            nextServiceDate: '2027-01-10'
        },
        {
            ID: eq7Id,
            equipmentNo: 'EQ-1007',
            equipmentName: 'Wacker Neuson DPU6555 Reversible Plate',
            serialNumber: 'WN-DPU65-2023-112',
            category: 'Compaction',
            equipmentType: 'Compactor',
            manufacturer: 'Wacker Neuson',
            model: 'DPU6555He',
            plant: '1040',
            location_ID: locBangaloreId,
            latitude: 12.971598,
            longitude: 77.594563,
            purchaseDate: '2023-09-05',
            rentalRatePerDay: 1500.00,
            currentStatus: 'UnderMaintenance',
            currentGrade: 'B',
            currentMeterReading: 480.00,
            custodian: 'Klaus Wagner',
            barcode: 'BAR-WN-DPU65',
            nextServiceDate: '2026-10-25'
        },
        {
            ID: eq8Id,
            equipmentNo: 'EQ-1008',
            equipmentName: 'Bomag BW 120 AD-5 Tandem Roller',
            serialNumber: 'BOM-BW120-2022-990',
            category: 'Compaction',
            equipmentType: 'Roller',
            manufacturer: 'Bomag',
            model: 'BW 120 AD-5',
            plant: '1030',
            location_ID: locDelhiId,
            latitude: 28.613939,
            longitude: 77.209021,
            purchaseDate: '2022-07-14',
            rentalRatePerDay: 3500.00,
            currentStatus: 'Quarantined',
            currentGrade: 'D',
            currentMeterReading: 2890.40,
            custodian: 'Peter Schmidt',
            barcode: 'BAR-BOM-120',
            nextServiceDate: '2026-10-20'
        }
    ]));
    console.log('  -> 8 Equipment assets created (including EQ-1001 CAT 320 Excavator)');

    // 5. RENTALS & CONTRACTS (STEP 4 & 5)
    console.log('[SEED] Creating Rentals...');
    const rent1Id = '40000000-0000-0000-0000-000000000001';
    const rent2Id = '40000000-0000-0000-0000-000000000002';
    const rent3Id = '40000000-0000-0000-0000-000000000003';

    await db.run(INSERT.into(Rentals).entries([
        {
            ID: rent1Id,
            contractNo: 'RENT-10001',
            customer_ID: custXYZId,
            rentalDate: '2026-11-01',
            expectedReturnDate: '2026-11-08',
            actualReturnDate: '2026-11-08',
            rentalStatus: 'Returned',
            totalRentalAmount: 56000.00
        },
        {
            ID: rent2Id,
            contractNo: 'RC-2026-0901',
            customer_ID: custMetroId,
            rentalDate: '2026-10-01',
            expectedReturnDate: '2026-11-15',
            rentalStatus: 'Active',
            totalRentalAmount: 337500.00
        },
        {
            ID: rent3Id,
            contractNo: 'RC-2026-0815',
            customer_ID: custTitanId,
            rentalDate: '2026-08-15',
            expectedReturnDate: '2026-09-15',
            actualReturnDate: '2026-09-16',
            rentalStatus: 'Closed',
            totalRentalAmount: 210800.00
        }
    ]));

    // 6. RENTAL ITEMS
    console.log('[SEED] Creating Rental Items...');
    await db.run(INSERT.into(RentalItems).entries([
        {
            ID: '41000000-0000-0000-0000-000000000001',
            rental_ID: rent1Id,
            equipment_ID: eq1Id,
            dailyRentalRate: 8000.00,
            startDate: '2026-11-01',
            endDate: '2026-11-08',
            itemStatus: 'Returned'
        },
        {
            ID: '41000000-0000-0000-0000-000000000002',
            rental_ID: rent2Id,
            equipment_ID: eq2Id,
            dailyRentalRate: 7500.00,
            startDate: '2026-10-01',
            endDate: '2026-11-15',
            itemStatus: 'OutOnRent'
        }
    ]));
    console.log('  -> 3 Rentals and Rental Items created (including RENT-10001 for EQ-1001)');

    // 7. CONDITION LOGS: CHECK-OUT & RETURN (STEP 7, 11, 14, 15)
    console.log('[SEED] Creating Condition Logs (Check-Out vs Return Comparison)...');
    const checkOutLogId = '50000000-0000-0000-0000-000000000001';
    const checkInLogId  = '50000000-0000-0000-0000-000000000002';

    await db.run(INSERT.into(ConditionLogs).entries([
        // STEP 7: Check-Out Inspection
        {
            ID: checkOutLogId,
            equipment_ID: eq1Id,
            rental_ID: rent1Id,
            inspectionDate: '2026-11-01T09:00:00Z',
            inspectionType: 'CheckOut',
            conditionGrade: 'A',
            suggestedGrade: 'A',
            inspectionStatus: 'Completed',
            inspector: 'Yard Worker',
            meterReading: 1250.00,
            checklistJson: JSON.stringify({
                bodywork: 'OK - No Dents',
                hydraulicSystem: 'OK - No Leaks',
                tracks: 'OK - Standard Wear',
                fluids: 'Normal',
                safetyDevices: 'Functional'
            }),
            notes: 'Equipment is in good operating condition.',
            customerAck: true,
            signatureUrl: 'https://storage.btp.example/signatures/sig-checkout-rent10001.png',
            locked: true
        },
        // STEP 11 & 14: Return / Check-In Inspection
        {
            ID: checkInLogId,
            equipment_ID: eq1Id,
            rental_ID: rent1Id,
            inspectionDate: '2026-11-08T16:30:00Z',
            inspectionType: 'Return',
            conditionGrade: 'C',
            suggestedGrade: 'C',
            inspectionStatus: 'Submitted',
            inspector: 'Yard Worker',
            meterReading: 1310.00,
            checklistJson: JSON.stringify({
                bodywork: 'DAMAGED - Body Dent Found',
                hydraulicSystem: 'DAMAGED - Hydraulic Hose Leak',
                tracks: 'OK - Normal Wear',
                fluids: 'Low Hydraulic Oil',
                safetyDevices: 'Functional'
            }),
            notes: 'Return inspection: body dent on side panel and hydraulic hose leak detected.',
            customerAck: true,
            signatureUrl: 'https://storage.btp.example/signatures/sig-return-rent10001.png',
            locked: true
        }
    ]));
    console.log('  -> 2 Condition Logs created (Check-Out: Grade A/1250h vs Return: Grade C/1310h)');

    // 8. DAMAGE RECORDS (STEP 12, 15, 16)
    console.log('[SEED] Creating Damage Records...');
    const damage1Id = '60000000-0000-0000-0000-000000000001';
    const damage2Id = '60000000-0000-0000-0000-000000000002';

    await db.run(INSERT.into(DamageRecords).entries([
        // Damage 1: Body Dent
        {
            ID: damage1Id,
            conditionLog_ID: checkInLogId,
            area: 'Side Body Panel',
            damageType: 'Body Dent',
            description: 'Large dent on side body panel',
            severity: 'High',
            origin: 'NEW',
            billable: true,
            repairEstimate: 18000.00,
            customerLiable: true,
            liableParty_ID: custXYZId,
            preExisting: false,
            damageStatus: 'Billed'
        },
        // Damage 2: Hydraulic Hose Damage
        {
            ID: damage2Id,
            conditionLog_ID: checkInLogId,
            area: 'Hydraulic System',
            damageType: 'Hydraulic Hose Damage',
            description: 'Hydraulic hose damaged',
            severity: 'High',
            origin: 'NEW',
            billable: true,
            repairEstimate: 12000.00,
            customerLiable: true,
            liableParty_ID: custXYZId,
            preExisting: false,
            damageStatus: 'Billed'
        }
    ]));
    console.log('  -> 2 Damage Records created (Body Dent ₹18,000 + Hydraulic Hose ₹12,000 = Total ₹30,000)');

    // 9. DAMAGE PHOTOS (STEP 13, 17)
    console.log('[SEED] Creating Damage Photographs with SHA-256 Hashes...');
    await db.run(INSERT.into(DamagePhotos).entries([
        {
            ID: '61000000-0000-0000-0000-000000000001',
            damage_ID: damage1Id,
            conditionLog_ID: checkInLogId,
            fileName: 'body_dent_front.jpg',
            photoType: 'DamageEvidence',
            mediaType: 'image/jpeg',
            mediaUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
            sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
            latitude: 23.022505,
            longitude: 72.571362,
            uploadedBy: 'Yard Worker'
        },
        {
            ID: '61000000-0000-0000-0000-000000000002',
            damage_ID: damage1Id,
            conditionLog_ID: checkInLogId,
            fileName: 'body_dent_side.jpg',
            photoType: 'DamageEvidence',
            mediaType: 'image/jpeg',
            mediaUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
            sha256: 'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01',
            latitude: 23.022505,
            longitude: 72.571362,
            uploadedBy: 'Yard Worker'
        },
        {
            ID: '61000000-0000-0000-0000-000000000003',
            damage_ID: damage2Id,
            conditionLog_ID: checkInLogId,
            fileName: 'hydraulic_hose.jpg',
            photoType: 'DamageEvidence',
            mediaType: 'image/jpeg',
            mediaUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
            sha256: 'c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef012',
            latitude: 23.022505,
            longitude: 72.571362,
            uploadedBy: 'Yard Worker'
        },
        {
            ID: '61000000-0000-0000-0000-000000000004',
            damage_ID: damage2Id,
            conditionLog_ID: checkInLogId,
            fileName: 'hydraulic_connection.jpg',
            photoType: 'DamageEvidence',
            mediaType: 'image/jpeg',
            mediaUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
            sha256: 'd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123',
            latitude: 23.022505,
            longitude: 72.571362,
            uploadedBy: 'Yard Worker'
        }
    ]));
    console.log('  -> 4 Damage Photographs created with tamper-proof SHA-256 hashes');

    // 10. REPAIR BILLS & DAMAGE CHARGES (STEP 17, 18, 19, 25)
    console.log('[SEED] Creating Repair Bills (Invoice 9000123456)...');
    const bill1Id = '80000000-0000-0000-0000-000000000001';

    await db.run(INSERT.into(RepairBills).entries([
        {
            ID: bill1Id,
            rental_ID: rent1Id,
            customer_ID: custXYZId,
            damage_ID: damage1Id,
            billDate: '2026-11-08',
            partsCost: 14000.00,
            labourCost: 16000.00,
            paintingCost: 0.00,
            repairAmount: 30000.00,
            taxAmount: 5400.00,
            totalAmount: 35400.00,
            billingStatus: 'Posted',
            approvalReason: 'Approved: Damage occurred during rental by XYZ Construction Pvt. Ltd. Customer liable.',
            invoiceNo: '9000123456'
        }
    ]));
    console.log('  -> Repair Bill created (Invoice 9000123456: Net ₹30,000 + Tax ₹5,400 = Total ₹35,400)');

    // 11. REPAIR JOBS (STEP 21, 22, 23)
    console.log('[SEED] Creating Workshop Repair Jobs...');
    await db.run(INSERT.into(RepairJobs).entries([
        {
            ID: '90000000-0000-0000-0000-000000000001',
            equipment_ID: eq1Id,
            damage_ID: damage1Id,
            technician: 'Technician',
            labourHours: 8.00,
            actualCost: 28500.00,
            repairDetails: 'Replaced hydraulic hose line, pressure tested to 350 bar; repaired and spray-painted side body panel.',
            status: 'Completed',
            beforePhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
            afterPhotoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
            closedAt: '2026-11-12T17:00:00Z'
        }
    ]));
    console.log('  -> Repair Job created (Estimate ₹30,000 -> Actual Cost ₹28,500, Status: Completed)');

    // 12. MAINTENANCE RECORDS (STEP 29)
    console.log('[SEED] Creating Maintenance Records...');
    await db.run(INSERT.into(MaintenanceRecords).entries([
        {
            ID: '91000000-0000-0000-0000-000000000001',
            equipment_ID: eq1Id,
            maintenanceType: 'Preventive',
            maintenanceDate: '2026-11-15',
            nextMaintenanceDate: '2026-12-15',
            description: '250-hour scheduled lubrication, filter replacement and hydraulic system calibration.',
            serviceProvider: 'CAT Authorized Service Centre Ahmedabad',
            cost: 14500.00,
            status: 'Planned'
        },
        {
            ID: '91000000-0000-0000-0000-000000000002',
            equipment_ID: eq6Id,
            maintenanceType: 'Preventive',
            maintenanceDate: '2026-10-10',
            nextMaintenanceDate: '2027-01-10',
            description: 'Annual electrical alternator calibration and engine filter overhaul.',
            serviceProvider: 'Atlas Copco Field Support',
            cost: 8500.00,
            status: 'Completed'
        }
    ]));
    console.log('  -> 2 Maintenance Records created');

    // 13. INTEGRATION / OUTBOX MESSAGES (STEP 24, 25, 26)
    console.log('[SEED] Creating Outbox / Integration Messages...');
    await db.run(INSERT.into(IntegrationMessages).entries([
        {
            ID: '92000000-0000-0000-0000-000000000001',
            messageType: 'Damage Billing Request',
            reference: 'RENT-10001',
            targetSystem: 'SAP S/4HANA',
            status: 'Success',
            billingDocument: '9000123456',
            payload: JSON.stringify({
                contractNo: 'RENT-10001',
                customer: 'XYZ Construction Pvt. Ltd.',
                invoiceNo: '9000123456',
                repairEstimate: 30000.00,
                additionalCharges: 5400.00,
                totalCustomerCharge: 35400.00,
                status: 'Posted'
            }),
            lastAttemptAt: '2026-11-13T10:00:00Z',
            retryCount: 0
        }
    ]));
    console.log('  -> Integration Message created (Reference: RENT-10001, Status: Success, Doc: 9000123456)');

    console.log('====================================================');
    console.log('  ALL API DATA SEEDED SUCCESSFULLY TO SAP HANA CLOUD');
    console.log('====================================================');
}

seedData().catch(err => {
    console.error('ERROR SEEDING DATA:', err);
    process.exit(1);
});


