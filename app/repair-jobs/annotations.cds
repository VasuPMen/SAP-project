using { MaintenanceService } from '../../srv/maintenance-service/maintenance-service';

/* ==========================================================================
   4. MAINTENANCE SERVICE - WORKSHOP & REPAIRS (FR-012, FR-013)
   ========================================================================== */

annotate MaintenanceService.RepairJobs with @(
    UI.HeaderInfo: {
        TypeName: 'Workshop Repair Job',
        TypeNamePlural: 'Workshop Repair Jobs',
        Title: { Value: damage_ID },
        Description: { Value: status }
    },
    UI.SelectionFields: [
        damage_ID,
        status,
        technician
    ],
    UI.LineItem: [
        { Value: damage.damageType, Label: 'Damage Classification' },
        { Value: damage.area, Label: 'Damaged Area' },
        { Value: damage.severity, Label: 'Severity' },
        { Value: equipment.equipmentName, Label: 'Asset' },
        { Value: status, Label: 'Job Status', Criticality: (status = 'Completed' ? 3 : (status = 'InProgress' ? 2 : 1)) },
        { Value: technician, Label: 'Lead Technician' },
        { Value: labourHours, Label: 'Labour Hours' },
        { Value: repairDetails, Label: 'Technician Work Log' },
        { Value: closedAt, Label: 'Completion Timestamp' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Repair Job Specifications',
            Target: '@UI.FieldGroup#RepairDetails'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Photographic Evidence & Hashes',
            Target: 'photos/@UI.LineItem'
        }
    ],
    Common.SideEffects #DamageSelected: {
        SourceProperties: [ damage_ID ],
        TargetProperties: [ equipment_ID, actualCost ]
    },
    UI.FieldGroup #RepairDetails: {
        Data: [
            { Value: damage_ID, Label: 'Damage Incident' },
            { Value: status, Label: 'Job Status' },
            { Value: technician, Label: 'Lead Technician' },
            { Value: labourHours, Label: 'Labour Hours' },
            { Value: repairDetails, Label: 'Technician Work Log' },
            { Value: closedAt, Label: 'Completion Timestamp' }
        ]
    }
);

annotate MaintenanceService.RepairJobs with {
    damage         @title: 'Damage Incident'          @Common.Label: 'Damage Incident'
                   @Common.Text: damage.description   @Common.TextArrangement: #TextOnly
                   @mandatory
                   @Common.ValueList: {
                       CollectionPath: 'DamageRecords',
                       Parameters: [
                           { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: damage_ID, ValueListProperty: 'ID' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'damageType' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'area' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'severity' }
                       ]
                   };
    status         @title: 'Job Status'               @Common.Label: 'Job Status'           @mandatory;
    technician     @title: 'Lead Technician'          @Common.Label: 'Lead Technician'      @mandatory;
    labourHours    @title: 'Labour Hours'             @Common.Label: 'Labour Hours'         @mandatory;
    repairDetails  @title: 'Technician Work Log'      @Common.Label: 'Technician Work Log'  @mandatory;
    closedAt       @title: 'Completion Timestamp'     @Common.Label: 'Completion Timestamp' @mandatory;
    equipment      @title: 'Equipment Asset'          @Common.Label: 'Equipment Asset'
                   @Common.Text: equipment.equipmentName @Common.TextArrangement: #TextFirst;
};

annotate MaintenanceService.DamagePhotos with @(
    Capabilities: {
        InsertRestrictions: { Insertable: true },
        DeleteRestrictions: { Deletable: true },
        UpdateRestrictions: { Updatable: true }
    },
    UI.LineItem: [
        { Value: mediaUrl, Label: 'Photo Preview' },
        { Value: fileName, Label: 'Photo Filename' },
        { Value: photoType, Label: 'Evidence Type' },
        { Value: sha256, Label: 'SHA-256 Tamper Hash' },
        { Value: uploadedAt, Label: 'Captured On' },
        { Value: uploadedBy, Label: 'Captured By' }
    ]
);

annotate MaintenanceService.DamagePhotos with {
    fileName  @title: 'Photo Filename' @Common.Label: 'Photo Filename';
    photoType @title: 'Evidence Type'  @Common.Label: 'Evidence Type' @Common.ValueListWithFixedValues: true;
    mediaUrl  @title: 'Photo Preview / URL' @Common.Label: 'Photo Preview / URL' @UI.IsImageURL: true;
    sha256    @title: 'SHA-256 Hash'   @Common.Label: 'SHA-256 Hash';
};

annotate MaintenanceService.DamageRecords with {
    description  @title: 'Invoice / Doc Ref'     @Common.Label: 'Invoice / Doc Ref';
    damageType   @title: 'Damage Classification' @Common.Label: 'Damage Classification';
    area         @title: 'Equipment Area'        @Common.Label: 'Equipment Area';
    severity     @title: 'Severity'              @Common.Label: 'Severity';
    damageStatus @title: 'Damage Status'         @Common.Label: 'Damage Status';
};
