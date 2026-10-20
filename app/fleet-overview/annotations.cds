using { RentalService } from '../../srv/rental-service/rental-service';

/* ==========================================================================
   1. RENTAL SERVICE - FLEET EQUIPMENT & ASSET DETAIL (FR-004, FR-010, FR-020)
   ========================================================================== */

annotate RentalService.Equipment with @(
    UI.HeaderInfo: {
        TypeName: 'Equipment Asset',
        TypeNamePlural: 'Equipment Assets',
        Title: { Value: equipmentName },
        Description: { Value: serialNumber }
    },
    UI.SelectionFields: [
        equipmentNo,
        category,
        equipmentType,
        currentStatus,
        currentGrade,
        location_ID
    ],
    UI.LineItem: [
        { Value: equipmentNo, Label: 'Asset ID' },
        { Value: equipmentName, Label: 'Equipment Name' },
        { Value: category, Label: 'Category' },
        { Value: manufacturer, Label: 'Manufacturer' },
        { Value: model, Label: 'Model' },
        {
            Value: currentStatus,
            Label: 'Status',
            Criticality: (
                currentStatus = 'Available' ? 3 :
                currentStatus = 'RentedOut' ? 2 :
                currentStatus = 'Damaged' ? 1 :
                currentStatus = 'Quarantined' ? 1 :
                currentStatus = 'InRepair' ? 2 : 0
            )
        },
        {
            Value: currentGrade,
            Label: 'Condition Grade',
            Criticality: (
                currentGrade = 'A' ? 3 :
                currentGrade = 'B' ? 2 :
                currentGrade = 'C' ? 2 : 1
            )
        },
        { Value: rentalRatePerDay, Label: 'Daily Rate ($)' },
        { Value: location.locationName, Label: 'Current Location' },
        { Value: nextServiceDate, Label: 'Next Service' }
    ],
    UI.HeaderFacets: [
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#Status'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#Grade'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#RentalRate'
        }
    ],
    UI.DataPoint #Status: {
        Value: currentStatus,
        Title: 'Operational Status',
        Criticality: (
            currentStatus = 'Available' ? 3 :
            currentStatus = 'RentedOut' ? 2 :
            currentStatus = 'Damaged' ? 1 : 0
        )
    },
    UI.DataPoint #Grade: {
        Value: currentGrade,
        Title: 'Condition Grade',
        Criticality: (
            currentGrade = 'A' ? 3 :
            currentGrade = 'B' ? 2 : 1
        )
    },
    UI.DataPoint #RentalRate: {
        Value: rentalRatePerDay,
        Title: 'Daily Rate'
    },
    UI.Facets: [
        {
            $Type: 'UI.CollectionFacet',
            ID: 'GeneralInfoFacet',
            Label: 'Asset Overview',
            Facets: [
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Technical Specifications',
                    Target: '@UI.FieldGroup#TechSpecs'
                },
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Yard & Telematics',
                    Target: '@UI.FieldGroup#LocationTelematics'
                }
            ]
        }
    ],
    UI.FieldGroup #TechSpecs: {
        Data: [
            { Value: equipmentNo, Label: 'Asset No' },
            { Value: serialNumber, Label: 'Serial Number' },
            { Value: equipmentName, Label: 'Equipment Name' },
            { Value: rentalRatePerDay, Label: 'Daily Rental Rate ($)' },
            { Value: category, Label: 'Category' },
            { Value: equipmentType, Label: 'Type' },
            { Value: manufacturer, Label: 'Manufacturer' },
            { Value: model, Label: 'Model' },
            { Value: purchaseDate, Label: 'Purchase Date' },
            { Value: currentMeterReading, Label: 'Meter Reading (Hours)' },
            { Value: barcode, Label: 'Barcode / NFC Tag' }
        ]
    },
    UI.FieldGroup #LocationTelematics: {
        Data: [
            { Value: plant, Label: 'Operating Plant' },
            { Value: location_ID, Label: 'Depot Location' },
            { Value: custodian, Label: 'Current Custodian' },
            { Value: latitude, Label: 'GPS Latitude' },
            { Value: longitude, Label: 'GPS Longitude' },
            { Value: nextServiceDate, Label: 'Next Scheduled Service' }
        ]
    }
);

annotate RentalService.Equipment with {
    equipmentNo         @title: 'Asset ID'              @Common.Label: 'Asset ID';
    serialNumber        @title: 'Serial Number'         @Common.Label: 'Serial Number';
    equipmentName       @title: 'Equipment Name'        @Common.Label: 'Equipment Name';
    category            @title: 'Category'              @Common.Label: 'Category';
    equipmentType       @title: 'Equipment Type'        @Common.Label: 'Equipment Type';
    manufacturer        @title: 'Manufacturer'          @Common.Label: 'Manufacturer';
    model               @title: 'Model'                 @Common.Label: 'Model';
    rentalRatePerDay    @title: 'Daily Rental Rate'     @Common.Label: 'Daily Rental Rate';
    currentStatus       @title: 'Operational Status'    @Common.Label: 'Operational Status';
    currentGrade        @title: 'Condition Grade'       @Common.Label: 'Condition Grade';
    currentMeterReading @title: 'Meter Reading (Hours)' @Common.Label: 'Meter Reading (Hours)';
    plant               @title: 'Operating Plant'       @Common.Label: 'Operating Plant';
    location            @title: 'Depot Location'        @Common.Label: 'Depot Location' @Common.ValueList: {
        CollectionPath: 'Locations',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: location_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'locationName' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'plant' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'city' }
        ]
    };
    custodian           @title: 'Current Custodian'     @Common.Label: 'Current Custodian';
    purchaseDate        @title: 'Purchase Date'         @Common.Label: 'Purchase Date';
    barcode             @title: 'Barcode / NFC Tag'     @Common.Label: 'Barcode / NFC Tag';
    latitude            @title: 'GPS Latitude'          @Common.Label: 'GPS Latitude';
    longitude           @title: 'GPS Longitude'         @Common.Label: 'GPS Longitude';
    nextServiceDate     @title: 'Next Service Date'     @Common.Label: 'Next Service Date';
};

annotate RentalService.EquipmentTransfers with @(
    UI.LineItem: [
        { Value: transferDate, Label: 'Transfer Date' },
        { Value: fromLocation.locationName, Label: 'From Location' },
        { Value: toLocation.locationName, Label: 'To Location' },
        { Value: reason, Label: 'Reason for Transfer' }
    ]
);

annotate RentalService.AssetStatusHistory with @(
    UI.LineItem: [
        { Value: changedAt, Label: 'Timestamp' },
        { Value: oldStatus, Label: 'Previous Status' },
        { Value: newStatus, Label: 'New Status' },
        { Value: changedBy, Label: 'Changed By' },
        { Value: reason, Label: 'Audit Reason' }
    ]
);
