using { RentalService } from '../../srv/rental-service/rental-service';

/* ==========================================================================
   1. RENTAL SERVICE - FLEET EQUIPMENT & ASSET DETAIL (FR-004, FR-010, FR-020)
   ========================================================================== */

annotate RentalService.Equipment with @(
    UI.HeaderInfo: {
        TypeName: 'Equipment Asset',
        TypeNamePlural: 'Equipment Assets',
        Title: { Value: equipmentName }
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
        { Value: equipmentNo, Label: 'Equipment No' },
        { Value: serialNumber, Label: 'Serial Number' },
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
                    Label: 'Yard & Depot Details',
                    Target: '@UI.FieldGroup#LocationTelematics'
                }
            ]
        }
    ],
    UI.FieldGroup #TechSpecs: {
        Data: [
            { Value: equipmentNo, Label: 'Equipment No' },
            { Value: serialNumber, Label: 'Serial Number' },
            { Value: category, Label: 'Category' },
            { Value: equipmentType, Label: 'Type' },
            { Value: manufacturer, Label: 'Manufacturer' },
            { Value: model, Label: 'Model' },
            { Value: rentalRatePerDay, Label: 'Daily Rental Rate ($)' },
            { Value: purchaseDate, Label: 'Purchase Date' },
            { Value: currentMeterReading, Label: 'Meter Reading (Hours)' }
        ]
    },
    UI.FieldGroup #LocationTelematics: {
        Data: [
            { Value: location_ID, Label: 'Depot Location' },
            { Value: custodian, Label: 'Current Custodian' },
            { Value: nextServiceDate, Label: 'Next Scheduled Service' }
        ]
    }
);

annotate RentalService.Equipment with {
    equipmentNo         @readonly @title: 'Equipment No'        @Common.Label: 'Equipment No';
    serialNumber        @readonly @title: 'Serial Number'       @Common.Label: 'Serial Number';
    equipmentName       @mandatory @title: 'Equipment Name'     @Common.Label: 'Equipment Name';
    category            @title: 'Category'                      @Common.Label: 'Category';
    equipmentType       @title: 'Equipment Type'                @Common.Label: 'Equipment Type';
    manufacturer        @title: 'Manufacturer'                  @Common.Label: 'Manufacturer';
    model               @title: 'Model'                         @Common.Label: 'Model';
    rentalRatePerDay    @title: 'Daily Rental Rate ($)'         @Common.Label: 'Daily Rental Rate ($)';
    currentStatus       @title: 'Operational Status'            @Common.Label: 'Operational Status';
    currentGrade        @title: 'Condition Grade'               @Common.Label: 'Condition Grade';
    currentMeterReading @title: 'Meter Reading (Hours)'         @Common.Label: 'Meter Reading (Hours)';
    location            @mandatory @title: 'Depot Location'     @Common.Label: 'Depot Location' @Common.ValueList: {
        CollectionPath: 'Locations',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: location_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'locationName' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'city' }
        ]
    };
    custodian           @title: 'Current Custodian'             @Common.Label: 'Current Custodian';
    purchaseDate        @title: 'Purchase Date'                 @Common.Label: 'Purchase Date';
    nextServiceDate     @title: 'Next Service Date'             @Common.Label: 'Next Service Date';
    plant               @UI.Hidden: true;
    barcode             @UI.Hidden: true;
    latitude            @UI.Hidden: true;
    longitude           @UI.Hidden: true;
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
