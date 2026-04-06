require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function testZohoAuth() {
    const domain = process.env.ZOHO_DOMAIN || 'in';
    console.log("Fetching Zoho Access Token...");
    try {
        const tokenRes = await axios.post(`https://accounts.zoho.${domain}/oauth/v2/token`, null, {
            params: {
                refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        });
        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error('Failed to get Zoho Access Token');
        console.log("Successfully connected! Access token retrieved.");
        
        const FormData = require('form-data');
        const formData = new FormData();
        
        fs.writeFileSync('test_upload.txt', 'This is a test file for Zoho WorkDrive integration.');
        formData.append('content', fs.createReadStream('test_upload.txt'));
        formData.append('filename', 'test_upload.txt');
        formData.append('parent_id', process.env.ZOHO_FOLDER_ID);
        formData.append('override-name-exist', 'true');

        const uploadRes = await axios.post(`https://www.zohoapis.${domain}/workdrive/api/v1/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        });
        console.log("File uploaded successfully.");
        console.log("Permalink:", uploadRes.data.data[0].attributes.permalink);
        fs.unlinkSync('test_upload.txt');
    } catch (error) {
        console.error("Connection failed:");
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testZohoAuth();
