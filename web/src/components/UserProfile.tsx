import React from 'react';

interface UserProfileProps {
  profilePicture: string;
}

const UserProfile = ({ profilePicture }: UserProfileProps) => {
  return (
    <div>
      <img src={profilePicture} alt="Profile Picture" />
    </div>
  );
};

export default UserProfile;