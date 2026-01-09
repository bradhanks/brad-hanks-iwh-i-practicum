import 'dotenv/config';
import express, { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import path from 'path';
import type { HubSpotResponse } from './types/index.js';

// Resolve paths relative to project root (works in both dev and production)
const projectRoot = process.cwd();
const app = express();
const PORT = process.env.PORT || 3000;
app.set('view engine', 'pug');
app.set('views', path.join(projectRoot, 'views'));
app.locals.isProduction = process.env.NODE_ENV === 'production';
app.use(express.static(path.join(projectRoot, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// * Please DO NOT INCLUDE the private app access token in your repo. Don't do this practicum in your normal account.
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const CUSTOM_OBJECT_TYPE = process.env.CUSTOM_OBJECT_TYPE;

if (!ACCESS_TOKEN || !CUSTOM_OBJECT_TYPE) {
    console.error('ERROR: Missing required environment variables (ACCESS_TOKEN or CUSTOM_OBJECT_TYPE)');
    process.exit(1);
}

const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
};
// TODO: ROUTE 1 - Create a new app.get route for the homepage to call your custom object data. Pass this data along to the front-end and create a new pug template in the views folder.

app.get('/', async (_req: Request, res: Response): Promise<void> => {
    const url = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_TYPE}?properties=name,homeownership_rate,median_home_age&limit=100`;

    try {
        const response = await axios.get<HubSpotResponse>(url, { headers });
        const records = response.data.results || [];

        // Fetch associated contacts for each zip code
        const recordsWithContacts = await Promise.all(
            records.map(async (record: any) => {
                try {
                    const associationsUrl = `https://api.hubapi.com/crm/v4/objects/${CUSTOM_OBJECT_TYPE}/${record.id}/associations/contacts`;
                    const assocResponse = await axios.get(associationsUrl, { headers });

                    const contactIds = assocResponse.data.results?.map((r: any) => r.toObjectId) || [];

                    // Fetch contact details if associated
                    if (contactIds.length > 0) {
                        const contactUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contactIds[0]}?properties=firstname,lastname`;
                        const contactResponse = await axios.get(contactUrl, { headers });
                        record.contact = contactResponse.data;
                    }
                } catch (error) {
                    // No association exists, that's ok
                    record.contact = null;
                }
                return record;
            })
        );

        // Sort by zip code alphabetically
        recordsWithContacts.sort((a: { properties: { name?: string } }, b: { properties: { name?: string } }) => {
            const nameA = a.properties.name || '';
            const nameB = b.properties.name || '';
            return nameA.localeCompare(nameB);
        });


        res.render('home', {
            title: 'Ground Truth | Housing Data',
            records: recordsWithContacts
        });
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Error fetching records:', axiosError.response?.data || axiosError.message);
        res.render('home', {
            title: 'Ground Truth | Housing Data',
            records: [],
            error: 'Failed to load data. Check your ACCESS_TOKEN and CUSTOM_OBJECT_TYPE.'
        });
    }
});
// TODO: ROUTE 2 - Create a new app.get route for the form to create or update new custom object data. Send this data along in the next route.

app.get('/update-cobj', async (_req, res) => {
    try {
        // Fetch all contacts for the multi-select
        const contactsUrl = `https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname&limit=100`;
        const contactsResponse = await axios.get(contactsUrl, { headers });
        const contacts = contactsResponse.data.results || [];

        res.render('update', {
            title: 'Add Zip Code | Ground Truth',
            contacts: contacts
        });
    } catch (error) {
        // If contacts fetch fails, still render the form
        res.render('update', {
            title: 'Add Zip Code | Ground Truth',
            contacts: []
        });
    }
});

app.post('/update-cobj', async (req, res) => {
    const url = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_TYPE}`;
    const data = {
        properties: {
            name: req.body.name,
            homeownership_rate: parseFloat(req.body.homeownership_rate) || 0,
            median_home_age: parseInt(req.body.median_home_age) || 0
        }
    };
    try {
        // Create the zip code
        const createResponse = await axios.post(url, data, { headers });
        const newZipCodeId = createResponse.data.id;

        // Associate contacts if any were selected
        const contactIds = req.body.contactIds;
        if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
            try {
                // Get the correct association type ID
                const schemaUrl = `https://api.hubapi.com/crm/v4/associations/contacts/${CUSTOM_OBJECT_TYPE}/labels`;
                let associationTypeId = 1;

                try {
                    const schemaResponse = await axios.get(schemaUrl, { headers });
                    const results = schemaResponse.data.results || [];
                    if (results.length > 0) {
                        associationTypeId = results[0].typeId;
                    }
                } catch (schemaError) {
                    console.log('Using default association type ID');
                }

                // Create associations using batch API
                const associationUrl = `https://api.hubapi.com/crm/v4/associations/contacts/${CUSTOM_OBJECT_TYPE}/batch/create`;

                await axios.post(associationUrl, {
                    inputs: contactIds.map((contactId: string) => ({
                        from: { id: contactId },
                        to: { id: newZipCodeId },
                        types: [{
                            associationCategory: "USER_DEFINED",
                            associationTypeId: associationTypeId
                        }]
                    }))
                }, { headers });

                console.log(`Associated ${contactIds.length} contacts with zip code ${newZipCodeId}`);
            } catch (assocError) {
                console.error('Error creating associations:', assocError);
                // Don't fail the whole operation if associations fail
            }
        }

        res.redirect('/');
    }
    catch (error) {
        const axiosError = error as AxiosError;
        console.error('Error creating record:', axiosError.response?.data || axiosError.message);

        // Fetch contacts again for the error render
        let contacts = [];
        try {
            const contactsUrl = `https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname&limit=100`;
            const contactsResponse = await axios.get(contactsUrl, { headers });
            contacts = contactsResponse.data.results || [];
        } catch (e) {
            // Ignore
        }

        res.render('update', {
            title: 'Add Zip Code | Ground Truth',
            error: 'Failed to create record. Check your data and try again.',
            formData: req.body,
            contacts: contacts
        });
    }
});

// CONTACTS ROUTES - View contacts and manage zip code associations

app.get('/contacts', async (_req: Request, res: Response): Promise<void> => {
    const contactsUrl = `https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname,email,phone&limit=100`;

    try {
        const response = await axios.get(contactsUrl, { headers });
        const contacts = response.data.results || [];

        // Fetch associated zip codes for each contact
        const contactsWithZipCodes = await Promise.all(
            contacts.map(async (contact: any) => {
                try {
                    const associationsUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contact.id}/associations/${CUSTOM_OBJECT_TYPE}`;
                    const assocResponse = await axios.get(associationsUrl, { headers });

                    const zipCodeIds = assocResponse.data.results?.map((r: any) => r.toObjectId) || [];

                    // Fetch zip code details if associated
                    if (zipCodeIds.length > 0) {
                        const zipCodeUrl = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_TYPE}/${zipCodeIds[0]}?properties=name,homeownership_rate,median_home_age`;
                        const zipResponse = await axios.get(zipCodeUrl, { headers });
                        contact.zipCode = zipResponse.data;
                    }
                } catch (error) {
                    // No association exists, that's ok
                    contact.zipCode = null;
                }
                return contact;
            })
        );

        // Fetch all available zip codes for the association dropdown
        const zipCodesUrl = `https://api.hubapi.com/crm/v3/objects/${CUSTOM_OBJECT_TYPE}?properties=name&limit=100`;
        const zipCodesResponse = await axios.get(zipCodesUrl, { headers });
        const allZipCodes = zipCodesResponse.data.results || [];

        res.render('contacts', {
            title: 'Contacts | Ground Truth',
            contacts: contactsWithZipCodes,
            zipCodes: allZipCodes
        });
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Error fetching contacts:', axiosError.response?.data || axiosError.message);
        res.render('contacts', {
            title: 'Contacts | Ground Truth',
            contacts: [],
            zipCodes: [],
            error: 'Failed to load contacts. Please check your API credentials.'
        });
    }
});

app.post('/contacts/:contactId/associate', async (req: Request, res: Response): Promise<void> => {
    const { contactId } = req.params;
    const { zipCodeId } = req.body;

    if (!zipCodeId) {
        res.redirect('/contacts');
        return;
    }

    try {
        // First, check if there's an existing association and remove it
        try {
            const existingAssociationsUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}`;
            const existingResponse = await axios.get(existingAssociationsUrl, { headers });
            const existingAssociations = existingResponse.data.results || [];

            // Remove existing associations
            for (const assoc of existingAssociations) {
                const deleteUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}/${assoc.toObjectId}`;
                await axios.delete(deleteUrl, { headers });
            }
        } catch (error) {
            // No existing associations, continue
        }

        // Create new association
        const associationUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}/${zipCodeId}`;

        await axios.put(associationUrl, [
            {
                associationCategory: "USER_DEFINED",
                associationTypeId: 1 // Default association type
            }
        ], { headers });

        res.redirect('/contacts');
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Error creating association:', axiosError.response?.data || axiosError.message);
        res.redirect('/contacts?error=association_failed');
    }
});

app.post('/contacts/:contactId/disassociate', async (req: Request, res: Response): Promise<void> => {
    const { contactId } = req.params;
    const { zipCodeId } = req.body;

    if (!zipCodeId) {
        res.redirect('/contacts');
        return;
    }

    try {
        const deleteUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}/${zipCodeId}`;
        await axios.delete(deleteUrl, { headers });

        res.redirect('/contacts');
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Error removing association:', axiosError.response?.data || axiosError.message);
        res.redirect('/contacts?error=disassociation_failed');
    }
});

// * Code for Route 3 goes here

/** 
* * This is sample code to give you a reference for how you should structure your calls. 

* * App.get sample
app.get('/contacts', async (req, res) => {
    const contacts = 'https://api.hubspot.com/crm/v3/objects/contacts';
    const headers = {
        Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
        'Content-Type': 'application/json'
    }
    try {
        const resp = await axios.get(contacts, { headers });
        const data = resp.data.results;
        res.render('contacts', { title: 'Contacts | HubSpot APIs', data });      
    } catch (error) {
        console.error(error);
    }
});

* * App.post sample
app.post('/update', async (req, res) => {
    const update = {
        properties: {
            "favorite_book": req.body.newVal
        }
    }

    const email = req.query.email;
    const updateContact = `https://api.hubapi.com/crm/v3/objects/contacts/${email}?idProperty=email`;
    const headers = {
        Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
        'Content-Type': 'application/json'
    };

    try { 
        await axios.patch(updateContact, update, { headers } );
        res.redirect('back');
    } catch(err) {
        console.error(err);
    }

});
*/


// Start the server
app.listen(PORT, () => {
    console.log(`
┌─────────────────────────────────────────┐
│                                         │
│   GROUND TRUTH                          │
│   Housing data tracker                  │
│                                         │
│   → http://localhost:${PORT}            │
│                                         │
└─────────────────────────────────────────┘
    `);
});