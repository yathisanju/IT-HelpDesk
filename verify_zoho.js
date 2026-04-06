require('dotenv').config();
const axios = require('axios');

async function testZoho() {
    console.log("--- Zoho WorkDrive Connection Test ---");
    const domain = process.env.ZOHO_DOMAIN || 'in';
    
    try {
        // 1. Get Access Token
        console.log(`Step 1: Fetching access token for domain ${domain}...`);
        const tokenRes = await axios.post(`https://accounts.zoho.${domain}/oauth/v2/token`, null, {
            params: {
                refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        });
        
        const accessToken = tokenRes.data.access_token;
        if (!accessToken) {
            console.error("FAILED to get Access Token. Check your Client ID, Secret, and Refresh Token in .env");
            console.error("Response:", tokenRes.data);
            return;
        }
        console.log("SUCCESS: Access token retrieved.");

        // 2. Test Folder Access
        console.log(`Step 2: Checking access to Folder ID: ${process.env.ZOHO_FOLDER_ID}...`);
        const folderRes = await axios.get(`https://www.zohoapis.${domain}/workdrive/api/v1/folders/${process.env.ZOHO_FOLDER_ID}`, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        });

        if (folderRes.status === 200) {
            console.log("SUCCESS: WorkDrive folder is accessible!");
            console.log("Folder Name:", folderRes.data.data.attributes.name);
        } else {
            console.error("FAILED to access folder. Check Folder ID and Permissions.");
            console.error("Response status:", folderRes.status);
        }

    } catch (err) {
        console.error("ERROR during Zoho test:", err.response ? JSON.stringify(err.response.data) : err.message);
    }
    console.log("---------------------------------------");
}

testZoho();
