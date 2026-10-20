using { RentalService } from '../../srv/rental-service/rental-service';

/* ==========================================================================
   0. CUSTOMER MANAGEMENT - MASTER DATA (STEP 1: CUSTOMER CREATION)
   ========================================================================== */

annotate RentalService.Customers with @(
    UI.HeaderInfo: {
        TypeName: 'Customer',
        TypeNamePlural: 'Corporate Customers',
        Title: { Value: companyName },
        Description: { Value: contactPerson }
    },
    UI.SelectionFields: [
        companyName,
        contactPerson,
        email,
        phone,
        address
    ],
    UI.LineItem: [
        { Value: companyName, Label: 'Company / Customer Name' },
        { Value: contactPerson, Label: 'Contact Person' },
        { Value: email, Label: 'Email' },
        { Value: phone, Label: 'Phone' },
        { Value: address, Label: 'Address / City' },
        { Value: createdAt, Label: 'Registered On' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.CollectionFacet',
            ID: 'CustomerGeneralInfo',
            Label: 'Customer Details',
            Facets: [
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Corporate Profile',
                    Target: '@UI.FieldGroup#CustomerProfile'
                },
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Contact Information',
                    Target: '@UI.FieldGroup#ContactInfo'
                }
            ]
        }
    ],
    UI.FieldGroup #CustomerProfile: {
        Data: [
            { Value: companyName, Label: 'Company / Business Name' },
            { Value: contactPerson, Label: 'Authorized Contact Person' },
            { Value: address, Label: 'Office / Yard Address' }
        ]
    },
    UI.FieldGroup #ContactInfo: {
        Data: [
            { Value: email, Label: 'Email Address' },
            { Value: phone, Label: 'Phone / Mobile No' },
            { Value: createdAt, Label: 'Created At' },
            { Value: createdBy, Label: 'Created By' }
        ]
    }
);
