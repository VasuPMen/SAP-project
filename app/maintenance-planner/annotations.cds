using { MaintenanceService } from '../../srv/maintenance-service/maintenance-service';

/* ==========================================================================
   MAINTENANCE PLANNER - SCHEDULES & RECORDS
   ========================================================================== */

annotate MaintenanceService.MaintenanceRecords with @(
    UI.HeaderInfo: {
        TypeName: 'Maintenance Record',
        TypeNamePlural: 'Maintenance Records',
        Title: { Value: equipment_ID },
        Description: { Value: maintenanceType }
    },
    UI.SelectionFields: [
        maintenanceType,
        status,
        equipment_ID,
        maintenanceDate,
        nextMaintenanceDate
    ],
    UI.LineItem: [
        { Value: equipment.equipmentName, Label: 'Asset' },
        { Value: maintenanceType, Label: 'Service Type' },
        { Value: maintenanceDate, Label: 'Service Date' },
        { Value: serviceProvider, Label: 'Service Provider' },
        { Value: cost, Label: 'Cost ($)' },
        {
            Value: status,
            Label: 'Status',
            Criticality: (
                status = 'Completed' ? 3 :
                status = 'InProgress' ? 2 : 1
            )
        },
        { Value: nextMaintenanceDate, Label: 'Next Due Date' },
        { Value: description, Label: 'Work Summary' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Maintenance Specifications & Planning',
            Target: '@UI.FieldGroup#MaintenanceDetails'
        }
    ],
    UI.FieldGroup #MaintenanceDetails: {
        Data: [
            { Value: equipment_ID, Label: 'Equipment Asset' },
            { Value: maintenanceType, Label: 'Maintenance Type' },
            { Value: status, Label: 'Maintenance Status' },
            { Value: maintenanceDate, Label: 'Service Date' },
            { Value: nextMaintenanceDate, Label: 'Next Due Date' },
            { Value: serviceProvider, Label: 'Service Provider / Workshop' },
            { Value: cost, Label: 'Estimated Service Cost ($)' },
            { Value: description, Label: 'Scope of Work / Description' }
        ]
    }
);

annotate MaintenanceService.MaintenanceRecords with {
    equipment           @title: 'Equipment Asset'              @Common.Label: 'Equipment Asset'
                        @Common.Text: equipment.equipmentName  @Common.TextArrangement: #TextFirst
                        @Common.ValueList: {
                            CollectionPath: 'Equipment',
                            Parameters: [
                                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: equipment_ID, ValueListProperty: 'ID' },
                                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'equipmentName' },
                                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'serialNumber' },
                                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'currentStatus' }
                            ]
                        };
    maintenanceType     @title: 'Maintenance Type'             @Common.Label: 'Maintenance Type'
                        @Common.ValueListWithFixedValues;
    status              @title: 'Maintenance Status'           @Common.Label: 'Maintenance Status'
                        @Common.ValueListWithFixedValues;
    maintenanceDate     @title: 'Service Date'                 @Common.Label: 'Service Date';
    nextMaintenanceDate @title: 'Next Due Date'                @Common.Label: 'Next Due Date';
    serviceProvider     @title: 'Service Provider / Workshop'  @Common.Label: 'Service Provider / Workshop';
    cost                @title: 'Estimated Service Cost ($)'   @Common.Label: 'Estimated Service Cost ($)';
    description         @title: 'Scope of Work / Description'  @Common.Label: 'Scope of Work / Description';
};
