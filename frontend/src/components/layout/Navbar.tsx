import React from 'react';

const Navbar: React.FC = () => {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-8 justify-between shrink-0">
      <h2 className="text-sm font-semibold text-foreground">Municipality of Talibon — Gender and Development System</h2>
      <div className="flex items-center gap-4">
        {/* Potentially notifications or user profile shortcut */}
      </div>
    </header>
  );
};

export default Navbar;
