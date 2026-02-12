import { Camera } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeaderProps {
  qrScanned: boolean;
}

export function Header({ qrScanned }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-black border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <a
          href="https://www.google.com/search?sca_esv=75e8986f400cb436&rlz=1C1CHBF_enIN1108IN1108&q=yourphotocrew+reviews&uds=ADvngMhQICy4ADfwxI5HYerEUeZzTwEw3y0TCn0COFwjFc4PjlI-PTnLa5GhseEYsgrBcHEER_xTEntNhEKN0cWswjNw7iI05JOeq7SqQp9Z-cXd0Y_jE3eDUVsjPfL31JHnsrNVpAGk7egs_n40J3uXzdpjmYJ3YBhULSQOq0VmG4F1rtKDZMLJVprv9SA9T6-cLDRCdIXTrAHE3nkMNZ23afXfO5NNvjJUDavmYP_sYXAjDJjWVjJi2Ru7ytTPG_-oT77OYkh73QskYlCq-p6PeXob20vUFDLUwPn0EqNMaENc662WGtfJ5cYCAz86aTULt7h0wuEnXGkWEKAlZDOh6KFO4xPSE0KiusGesMenDyoWcaFO39wPlReSPLBi_nfnFb7MI1anZl8kxsaxL9822vFEordZfhv9StCV5arcLPr289GVd2c&si=ACC90nwjPmqJHrCEt6ewASzksVFQDX8zco_7MgBaIawvaF4-7pyxCdcpkh4veyb4vl2mGMxM_Amerk21pYCTa4iSix9MMaJvzN6oIMd5ikEXcj1EhpbG_EEB7HLREhKa-i_J_Fa_DXfM&sa=X&ved=2ahUKEwijlKSbmKSKAxXYiq8BHcbcGagQk8gLegQIIRAB&ictx=1&stq=1&cs=0&lei=r91bZ-OAJtiVvr0PxrnnwAo#ebo=3"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <ImageWithFallback
            src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
            alt="Google"
            className="h-5"
          />
          <span className="text-sm text-white font-bold" style={{ fontFamily: 'Roboto, sans-serif' }}>Reviews</span>
        </a>

        <a
          href="https://in.bookmyshow.com/events/professional-photoshoot-come-get-that-pic/ET00401389"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-sm text-white font-bold" style={{ fontFamily: 'Roboto, sans-serif' }}>Find us on</span>
          <ImageWithFallback
            src="https://in.bmscdn.com/webin/common/icons/logo.svg"
            alt="BookMyShow"
            className="h-5"
          />
        </a>
      </div>
    </header>
  );
}

