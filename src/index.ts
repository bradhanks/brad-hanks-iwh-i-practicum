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

        // Sort by zip code alphabetically
        records.sort((a: { properties: { name?: string } }, b: { properties: { name?: string } }) => {
            const nameA = a.properties.name || '';
            const nameB = b.properties.name || '';
            return nameA.localeCompare(nameB);
        });


        res.render('home', {
            title: 'Ground Truth | Housing Data',
            records: records
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

// * Code for Route 2 goes here

// TODO: ROUTE 3 - Create a new app.post route for the custom objects form to create or update your custom object data. Once executed, redirect the user to the homepage.

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