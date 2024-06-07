import React, { useState } from 'react';
import { Box, Button, Paper, CircularProgress } from '@mui/material';
import OnboardingPreview from 'src/sections/onboarding/onboardingPreview';
import { handleOnboarding } from 'src/services/onboardingService';
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';

const ReviewStep = ({ formData, handleBack }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateEmpresa = async () => {
    setLoading(true);
    const nuevaEmpresa = await handleOnboarding(formData, user.id);
    setLoading(false);

    if (nuevaEmpresa) {
        setTimeout(() => {
            router.push('/listaProyectos');
        }, 2000); 
      
    } else {
      console.error('Error al completar el onboarding');
      // Aquí puedes mostrar un mensaje de error
    }
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3 }}>
        <OnboardingPreview formData={formData} />
        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateEmpresa}
            fullWidth
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirmar y Enviar'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleBack}
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            Atrás
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ReviewStep;
