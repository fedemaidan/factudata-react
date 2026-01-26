import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { styled } from '@mui/material/styles';
import { withAuthGuard } from 'src/hocs/with-auth-guard';
import { SideNav } from './side-nav';
import { TopNav } from './top-nav';
import { useVersionCheck } from 'src/hooks/use-version-check';
import { getRemoteVersionFromFirestore } from 'src/services/versionService';

const NAV_WIDTH_EXPANDED = 280;
const NAV_WIDTH_COLLAPSED = 72;

const LayoutRoot = styled('div', {
  shouldForwardProp: (prop) => prop !== 'navwidth'
})(({ theme, navwidth }) => ({
  display: 'flex',
  flex: '1 1 auto',
  maxWidth: '100%',
  // aplicá padding también en md/xl si querés
  [theme.breakpoints.up('lg')]: {
    paddingLeft: Number(navwidth) || NAV_WIDTH_EXPANDED
  }
}));


const LayoutContainer = styled('div')({
  display: 'flex',
  flex: '1 1 auto',
  flexDirection: 'column',
  width: '100%'
});

export const Layout = withAuthGuard((props) => {
  const { children, title, headerActions } = props;
  const pathname = usePathname();
  const [openNav, setOpenNav] = useState(false); // mobile
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sorby_nav_collapsed') === '1';
  });

  const { updateAvailable, triggerReload } = useVersionCheck({
    getRemoteVersion: getRemoteVersionFromFirestore, // o getRemoteVersionFromStorage
    pollMs: 5 * 60 * 1000, // 5 minutos
    // opcional: localVersion: process.env.NEXT_PUBLIC_APP_VERSION
  });
  
  const handlePathnameChange = useCallback(() => {
    if (openNav) setOpenNav(false);
  }, [openNav]);

  useEffect(() => {
    handlePathnameChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sorby_nav_collapsed', collapsed ? '1' : '0');
    }
  }, [collapsed]);

  const navWidth = useMemo(
    () => (collapsed ? NAV_WIDTH_COLLAPSED : NAV_WIDTH_EXPANDED),
    [collapsed]
  );

  return (
    <>
      {/* Opcional: pasá estos props al TopNav si querés un botón de colapso en el header */}
      <TopNav
        onNavOpen={() => setOpenNav(true)}
        onToggleNav={() => setCollapsed((v) => !v)}
        title={title || ""}
        collapsed={collapsed}
        navWidth={navWidth}
        updateAvailable={updateAvailable}   // boolean
        onUpdateClick={triggerReload}       // función que hace reload
        headerActions={headerActions}
      />
      <SideNav
        onClose={() => setOpenNav(false)}
        open={openNav}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        width={navWidth}
      />
      <LayoutRoot navwidth={navWidth}>
        <LayoutContainer>{children}</LayoutContainer>
      </LayoutRoot>
    </>
  );
});
