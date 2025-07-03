import React from 'react';

const UserProfile = ({ profilePicture }) => {
  return (
    <div>
      <img src={profilePicture} alt="Profile Picture" />
    </div>
  );
};

export default UserProfile;