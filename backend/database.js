import axios from 'axios';

const API_URL = 'https://YOUR_SUPABASE_URL/rest/v1';
const API_KEY = 'YOUR_SUPABASE_API_KEY';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'apikey': API_KEY
};

export const leadExists = async (email) => {
    try {
        const response = await axios.get(`${API_URL}/leads?email=eq.${email}`, { headers });
        return response.data.length > 0;
    } catch (error) {
        console.error('Error checking lead existence:', error);
        throw error;
    }
};

export const saveLeadRecord = async (lead) => {
    try {
        const response = await axios.post(`${API_URL}/leads`, lead, { headers });
        return response.data;
    } catch (error) {
        console.error('Error saving lead record:', error);
        throw error;
    }
};

