import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { MdWifi } from 'react-icons/md';
import { FaApple } from 'react-icons/fa';
import {
  IoBatteryHalfOutline,
  IoCellular,
  IoSettingsOutline,
} from 'react-icons/io5';

interface MacToolbarProps {
  onSettingsClick: () => void;
}

export default function MacToolbar({ onSettingsClick }: MacToolbarProps) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  const toggleMenu = (menu: string, e: MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const formatMacDate = (date: Date) => {
    const weekday = date.toLocaleString('en-US', { weekday: 'short' });
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const hour = date.toLocaleString('en-US', {
      hour: 'numeric',
      hour12: true,
    });
    const minute = date.getMinutes().toString().padStart(2, '0');
    const period = date.getHours() >= 12 ? 'PM' : 'AM';

    return `${weekday} ${month} ${day} ${hour.replace(
      /\s?[AP]M/,
      ''
    )}:${minute} ${period}`;
  };

  const formatIPhoneTime = (date: Date) => {
    let hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, '0');

    hour = hour % 12;
    hour = hour ? hour : 12;

    return `${hour}:${minute}`;
  };

  return (
    <>
      <div className='sticky top-0 z-[1000] md:hidden bg-transparent text-white h-12 px-8 flex items-center justify-between text-base font-medium'>
        <span className='font-semibold'>
          {formatIPhoneTime(currentDateTime)}
        </span>
        <div className='flex items-center gap-1.5'>
          <IoCellular size={20} />
          <MdWifi size={20} />
          <IoBatteryHalfOutline size={24} />
        </div>
      </div>

      <div className='sticky top-0 z-[1000] hidden md:flex bg-black/40 backdrop-blur-xl text-white h-6 px-4 items-center justify-between text-sm'>
        <div className='flex items-center space-x-4'>
          {/* Apple Menu */}
          <div className='relative'>
            <button
              onClick={(e) => toggleMenu('apple', e)}
              className={`hover:bg-white/10 px-2 py-0.5 rounded transition-colors ${activeMenu === 'apple' ? 'bg-white/10' : ''}`}
            >
              <FaApple size={16} />
            </button>
            {activeMenu === 'apple' && (
              <div className='absolute top-full left-0 mt-1 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-lg shadow-2xl min-w-[200px] py-1 z-[100000]'>
                <div className='px-4 py-2 text-white/50 text-xs font-semibold border-b border-white/10'>YourNews</div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setActiveMenu(null); 
                    onSettingsClick(); 
                  }} 
                  className='w-full text-left px-4 py-1.5 hover:bg-white/10 text-sm'
                >
                  Settings...
                </button>
                <div className='border-t border-white/10 my-1'></div>
                <div className='px-4 py-1.5 text-sm text-white/40'>About YourNews</div>
              </div>
            )}
          </div>

          {/* YourNews Menu */}
          <div className='relative'>
            <button
              onClick={(e) => toggleMenu('yournews', e)}
              className={`font-semibold hover:bg-white/10 px-2 py-0.5 rounded transition-colors ${activeMenu === 'yournews' ? 'bg-white/10' : ''}`}
            >
              YourNews
            </button>
            {activeMenu === 'yournews' && (
              <div className='absolute top-full left-0 mt-1 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-lg shadow-2xl min-w-[200px] py-1 z-[100000]'>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setActiveMenu(null); 
                    onSettingsClick(); 
                  }} 
                  className='w-full text-left px-4 py-1.5 hover:bg-white/10 text-sm'
                >
                  Preferences...
                </button>
                <div className='border-t border-white/10 my-1'></div>
                <div className='px-4 py-1.5 text-sm text-white/40'>Clear All Windows</div>
                <div className='px-4 py-1.5 text-sm text-white/40'>New Search</div>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <button 
            onClick={onSettingsClick}
            className='cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded transition-colors'
            title='Settings (Cmd+,)'
          >
            Settings
          </button>
        </div>
        <div className='flex items-center space-x-4'>
          <IoSettingsOutline 
            size={16} 
            className='cursor-pointer hover:opacity-80 transition-opacity'
            onClick={() => {
              console.log('Settings icon clicked');
              onSettingsClick();
            }}
            title='Settings (Cmd+,)'
          />
          <MdWifi size={16} />
          <span className='cursor-default'>
            {formatMacDate(currentDateTime)}
          </span>
        </div>
      </div>
    </>
  );
}
