import React from 'react';

const App: React.FC = () => {
    return (
        <div>
            <h1>Welcome to Coldreach</h1>
            <p>Your centralized platform for managing leads, campaigns, and notifications.</p>
            <Authentication />
            <LeadManagement />
            <CampaignBuilder />
            <NotificationSystem />
        </div>
    );
};

const Authentication: React.FC = () => <div>Authentication Component</div>;
const LeadManagement: React.FC = () => <div>Lead Management Component</div>;
const CampaignBuilder: React.FC = () => <div>Campaign Builder Component</div>;
const NotificationSystem: React.FC = () => <div>Notification System Component</div>;

export default App;
