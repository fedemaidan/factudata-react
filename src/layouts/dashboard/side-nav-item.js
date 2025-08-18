import NextLink from 'next/link';
import PropTypes from 'prop-types';
import { Box, ButtonBase } from '@mui/material';

export const SideNavItem = (props) => {
  const { active = false, disabled, external, icon, path, title, compact = false } = props;

  const linkProps = path
    ? external
      ? { component: 'a', href: path, target: '_blank', rel: 'noopener' }
      : { component: NextLink, href: path }
    : {};

  return (
    <li>
      <ButtonBase
        aria-label={compact ? title : undefined}
        disabled={disabled}
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          display: 'flex',
          justifyContent: compact ? 'center' : 'flex-start',
          position: 'relative',
          width: '100%',
          minHeight: 44,
          px: compact ? 0 : 2,
          py: compact ? 0.5 : 0.75,
          textAlign: 'left',
          ...(active && {
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 6,
              bottom: 6,
              width: 3,
              borderRadius: 2,
              backgroundColor: 'primary.main'
            }
          }),
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)'
          }
        }}
        {...linkProps}
      >
        {icon && (
          <Box
            component="span"
            sx={{
              alignItems: 'center',
              color: active ? 'primary.main' : 'neutral.400',
              display: 'inline-flex',
              justifyContent: 'center',
              mr: compact ? 0 : 2,
              width: compact ? 48 : 'auto',   // área clickeable pareja
              height: compact ? 40 : 'auto'
            }}
          >
            {icon}
          </Box>
        )}

        {/* Label: se oculta en modo compacto */}
        {!compact && (
          <Box
            component="span"
            sx={{
              color: disabled ? 'neutral.500' : (active ? 'common.white' : 'neutral.400'),
              flexGrow: 1,
              fontFamily: (theme) => theme.typography.fontFamily,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: '24px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {title}
          </Box>
        )}
      </ButtonBase>
    </li>
  );
};

SideNavItem.propTypes = {
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  external: PropTypes.bool,
  icon: PropTypes.node,
  path: PropTypes.string,
  title: PropTypes.string.isRequired,
  compact: PropTypes.bool
};
