import React from 'react';
import UserProfile from './UserProfile';

const Header = ({ profilePicture }) => {
  return (
    <div>
      <UserProfile profilePicture={profilePicture} />
    </div>
  );
};

export default Header;
