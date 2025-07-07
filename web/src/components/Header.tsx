import React from 'react';
import UserProfile from './UserProfile';

interface HeaderProps {
  profilePicture: string;
}

const Header = ({ profilePicture }: HeaderProps) => {
  return (
    <div>
      <UserProfile profilePicture={profilePicture} />
    </div>
  );
};

export default Header;
