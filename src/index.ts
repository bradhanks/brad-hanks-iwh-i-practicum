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
        // Normalize contactIds to always be an array (Express sends single checkbox as string)
        let contactIds = req.body.contactIds;
        if (contactIds) {
            contactIds = Array.isArray(contactIds) ? contactIds : [contactIds];
        }

        if (contactIds && contactIds.length > 0) {
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:244',message:'Association route entry',data:{contactId:req.params.contactId,body:req.body,zipCodeId:req.body.zipCodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const { contactId } = req.params;
    const { zipCodeId } = req.body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:250',message:'After parsing params',data:{contactId,zipCodeId,zipCodeIdType:typeof zipCodeId,hasZipCodeId:!!zipCodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (!zipCodeId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:253',message:'Missing zipCodeId - redirecting',data:{zipCodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        res.redirect('/contacts');
        return;
    }

    try {
        // Get the correct association type ID from the schema
        const schemaUrl = `https://api.hubapi.com/crm/v4/associations/contacts/${CUSTOM_OBJECT_TYPE}/labels`;
        let associationTypeId = 1; // Default fallback

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:262',message:'Before schema fetch',data:{schemaUrl,CUSTOM_OBJECT_TYPE,defaultTypeId:associationTypeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        try {
            const schemaResponse = await axios.get(schemaUrl, { headers });
            const results = schemaResponse.data.results || [];
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:268',message:'Schema fetch success',data:{resultsCount:results.length,results,firstTypeId:results[0]?.typeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            if (results.length > 0) {
                // Use the first available association type
                associationTypeId = results[0].typeId;
                console.log(`Using association type ID: ${associationTypeId}`);
            }
        } catch (schemaError) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:275',message:'Schema fetch failed',data:{error:(schemaError as AxiosError).response?.data||(schemaError as Error).message,status:(schemaError as AxiosError).response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            console.log('Could not fetch association schema, using default');
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:279',message:'Final association type ID',data:{associationTypeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        // First, check if there's an existing association and remove it
        try {
            const existingAssociationsUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}`;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:284',message:'Checking existing associations',data:{existingAssociationsUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            const existingResponse = await axios.get(existingAssociationsUrl, { headers });
            const existingAssociations = existingResponse.data.results || [];
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:288',message:'Existing associations found',data:{count:existingAssociations.length,associations:existingAssociations},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
            // #endregion

            // Remove existing associations using DELETE endpoint
            if (existingAssociations.length > 0) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:293',message:'Removing existing associations',data:{count:existingAssociations.length,associations:existingAssociations.map((a: any) => a.toObjectId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                // #endregion
                // Delete each existing association individually
                await Promise.all(
                    existingAssociations.map((assoc: any) => {
                        const deleteUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}/${assoc.toObjectId}`;
                        return axios.delete(deleteUrl, { headers });
                    })
                );
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:301',message:'Delete associations success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                // #endregion
            }
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:305',message:'Error checking/removing existing',data:{error:(error as AxiosError).response?.data||(error as Error).message,status:(error as AxiosError).response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            // No existing associations, continue
            console.log('No existing associations to remove');
        }

        // Create new association using PUT endpoint with explicit association type ID
        // Use the association type ID we fetched from the schema (or default to 1)
        const associationUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}/${zipCodeId}`;
        const createPayload = {
            associationCategory: "USER_DEFINED",
            associationTypeId: associationTypeId
        };

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:330',message:'Before PUT association API call',data:{associationUrl,createPayload,associationTypeId,headers:Object.keys(headers)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        const createResponse = await axios.put(associationUrl, createPayload, { headers });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:330',message:'PUT association API success',data:{status:createResponse.status,statusText:createResponse.statusText,responseData:createResponse.data},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        res.redirect('/contacts');
    } catch (error) {
        const axiosError = error as AxiosError;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:336',message:'Association creation error caught',data:{error:axiosError.response?.data||axiosError.message,status:axiosError.response?.status,statusText:axiosError.response?.statusText,responseHeaders:axiosError.response?.headers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:365',message:'Disassociate route entry',data:{contactId,zipCodeId,body:req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
        // #endregion

        // Use DELETE endpoint for removing single association
        // Format: DELETE /crm/v4/objects/{fromObjectType}/{fromObjectId}/associations/{toObjectType}/{toObjectId}
        const deleteUrl = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${CUSTOM_OBJECT_TYPE}/${zipCodeId}`;

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:372',message:'Before DELETE association call',data:{deleteUrl,method:'DELETE',contactId,zipCodeId,CUSTOM_OBJECT_TYPE},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
        // #endregion

        const deleteResponse = await axios.delete(deleteUrl, { headers });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:378',message:'DELETE association success',data:{status:deleteResponse.status,statusText:deleteResponse.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
        // #endregion

        res.redirect('/contacts');
    } catch (error) {
        const axiosError = error as AxiosError;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/450c5a90-5aa6-4b45-a915-9810ffb39c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/index.ts:385',message:'DELETE association error',data:{error:axiosError.response?.data||axiosError.message,status:axiosError.response?.status,statusText:axiosError.response?.statusText,url:axiosError.config?.url,method:axiosError.config?.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
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