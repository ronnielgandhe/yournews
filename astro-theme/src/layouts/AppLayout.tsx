import MacToolbar from '../components/global/MacToolbar';
import YourNewsTerminal from '../components/global/YourNewsTerminal';
import MobileDock from '../components/global/MobileDock';
import DesktopDock from '../components/global/DesktopDock';

interface AppLayoutProps {
  backgroundUrl: string;
}

export default function Desktop({ backgroundUrl }: AppLayoutProps) {
  return (
    <div className='relative w-screen h-screen overflow-hidden'>
      <div
        className='absolute inset-0 bg-cover bg-center'
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />

      <div className='relative z-10'>
        <MacToolbar onSettingsClick={() => {}} />
      </div>

      <div className='relative z-0 flex items-center justify-center' style={{ height: 'calc(100vh - 1.5rem)' }}>
        <YourNewsTerminal />
      </div>

      {/* Docks hidden for quadrant layout */}
      {/* <MobileDock /> */}
      {/* <DesktopDock /> */}
    </div>
  );
}
