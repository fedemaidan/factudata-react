import React, { useCallback } from 'react';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/router';

const BackButton = ({ onClick, children = 'Volver', sx }) => {
  const router = useRouter();
  const handleBack = useCallback(() => {
    if (typeof onClick === 'function') return onClick();
    router.back();
  }, [onClick, router]);

  return (
    <Button
      variant="text"
      startIcon={<ArrowBackIcon />}
      onClick={handleBack}
      sx={{
        alignSelf: 'flex-start',
        color: 'text.secondary',
        '&:hover': { backgroundColor: 'action.hover', color: 'primary.main' },
        transition: 'all 0.2s ease-in-out',
        fontWeight: 500,
        ...(sx || {}),
      }}
    >
      {children}
    </Button>
  );
};

export default BackButton;


